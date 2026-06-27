import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	CheckCircle2,
	ExternalLink,
	Loader2,
	Paperclip,
	SendHorizontal,
} from "lucide-react";
import { useEffect, useId, useMemo, useReducer, useRef, useState } from "react";
import { toast } from "sonner";
import { SectionCard } from "#/components/common/section-card.tsx";
import {
	Autocomplete,
	type AutocompleteOption,
} from "#/components/form/autocomplete.tsx";
import { FieldInput } from "#/components/form/field-input.tsx";
import { CommitComplete } from "#/components/onboarding/commit-complete.tsx";
import { DesignPreviewScreen } from "#/components/onboarding/design-preview.tsx";
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
	Dialog,
	DialogBody,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog.tsx";
import { ScrollArea } from "#/components/ui/scroll-area.tsx";
import { useDebouncedValue } from "#/hooks/use-debounced-value.ts";
import { ApiError } from "#/lib/api";
import {
	type CommitResult,
	commitSession,
	getSession,
	type OnboardingMode,
	patchDraft,
	type SessionView,
	sendMessage,
	startSession,
} from "#/lib/api/onboarding.ts";
import { type RefSearchItem, searchRef } from "#/lib/api/ref.ts";
import { toastApiError } from "#/lib/api-error-message.ts";
import { buildPreviewPayloadFromDraft } from "#/lib/preview.ts";
import { uploadFileToStorage } from "#/lib/upload.ts";
import { cn } from "#/lib/utils.ts";

/**
 * 대화형 온보딩 화면 — 대시보드(`/onboarding`)에서 "대화형으로 만들기" 또는
 * draft "이어서 작성"으로 진입한다.
 *
 * ⚠ 대시보드 오케스트레이터가 소유하게 된 분기는 여기서 제거됨:
 *  - pending_payment 자동 진입(결제 위젯) → 대시보드가 카드로 처리
 *  - resumable "이어하기/새로 시작" 다이얼로그 → 대시보드 draft 카드가 처리
 * 진입 시에는 항상 startSession으로 첫 질문(또는 진행중 draft 이어서)을 받아 시작한다.
 *
 * commit 성공 → CommitComplete(결제/무료 완료). 결제는 toss → /billing/callback → 대시보드 복귀.
 */

/** history 항목 타입(view의 history는 looseObject라 좁혀 사용). */
type ChatMessage = {
	role: string;
	text?: string | null;
	files?: string[] | null;
};

/** conflicts 항목을 화면용으로 좁힌 타입(불일치 또는 이상점). */
type Conflict = {
	field: string;
	current?: unknown;
	from_file?: unknown;
	note?: string;
	question?: string;
	asked?: boolean;
};

const LOGIN_ID_HINT = "영문 소문자·숫자 4~20자";
/** 관리자 아이디 형식: 영문 소문자·숫자 4~20자. */
const LOGIN_ID_RE = /^[a-z0-9]{4,20}$/;

/** 대기 구간 폴링 주기/최대 시간(문서 2026-06 §1). */
const HOLDING_POLL_MS = 2000;
const HOLDING_POLL_MAX_MS = 60000;

/** 첨부 파일 용량 상한(서버가 막기 전 클라이언트 사전 체크). */
const MAX_UPLOAD_MB = 300;

/** 온보딩 개요 쿼리 키 — 메시지/파일/충돌/commit이 바꾸는 상태(대시보드와 동일). */
const OVERVIEW_KEY = ["onboarding", "overview"] as const;

/**
 * 파일 허용 확장자 폴백 — 질문이 accept를 안 줄 때(구버전/누락)만 쓴다.
 * 정상 경로는 서버가 질문별로 내려주는 question.accept가 권위(이미지만/문서만 등).
 */
const FALLBACK_FILE_EXTENSIONS: readonly string[] = [
	"txt",
	"md",
	"csv",
	"rtf",
	"doc",
	"docx",
	"xls",
	"xlsx",
	"hwp",
	"hwpx",
	"pdf",
	"zip",
];

/** 세션 진행 상태 묶음(단일 진실원 + 시작/완료/대기·다이얼로그 흐름). */
type ConvState = {
	/** 진행중 세션 뷰(폴링/메시지 응답으로 갱신). null=아직 시작 전. */
	session: SessionView | null;
	/** 세션 시작 실패. */
	startError: unknown;
	/** commit 결과(있으면 완료 화면). */
	commitResult: CommitResult | null;
	/** 관리자 계정 다이얼로그 열림 여부. */
	adminDialogOpen: boolean;
	/** 대기 폴링이 안전장치(최대 시간)에 걸려 멈췄는지 — 멈추면 수동 새로고침 버튼 노출. */
	pollExpired: boolean;
};

type ConvAction =
	/** 새 세션 뷰 반영 + 폴링 안전장치 플래그 리셋(새 대기 구간을 위해). */
	| { type: "applySession"; view: SessionView }
	/** 폴링이 받은 뷰만 반영(플래그는 유지). */
	| { type: "setSession"; view: SessionView }
	| { type: "setStartError"; error: unknown }
	| { type: "setCommitResult"; result: CommitResult }
	| { type: "setAdminDialogOpen"; open: boolean }
	| { type: "setPollExpired"; value: boolean }
	/** commit 성공: 결과 저장 + 다이얼로그 닫기. */
	| { type: "commitSucceeded"; result: CommitResult };

function convReducer(state: ConvState, action: ConvAction): ConvState {
	switch (action.type) {
		case "applySession":
			return { ...state, session: action.view, pollExpired: false };
		case "setSession":
			return { ...state, session: action.view };
		case "setStartError":
			return { ...state, startError: action.error };
		case "setCommitResult":
			return { ...state, commitResult: action.result };
		case "setAdminDialogOpen":
			return { ...state, adminDialogOpen: action.open };
		case "setPollExpired":
			return { ...state, pollExpired: action.value };
		case "commitSucceeded":
			return {
				...state,
				commitResult: action.result,
				adminDialogOpen: false,
			};
		default:
			return state;
	}
}

const initialConvState: ConvState = {
	session: null,
	startError: null,
	commitResult: null,
	adminDialogOpen: false,
	pollExpired: false,
};

export function OnboardingConversation({
	mode,
	onBackToDashboard,
}: {
	/** 세션 모드 — 'hospital'(병원) | 'profile'(프로필). startSession에 그대로 전달. */
	mode: OnboardingMode;
	/** 상단 "← 대시보드" — 클릭 시 대시보드 모드 복귀 + overview refetch. */
	onBackToDashboard: () => void;
}) {
	const conv = useOnboardingConversation(mode);
	const { session, startError, commitResult, adminDialogOpen, pollExpired } =
		conv.state;

	if (commitResult) {
		return (
			<CommitCompleteView
				result={commitResult}
				onBackToDashboard={onBackToDashboard}
			/>
		);
	}

	if (startError) {
		return (
			<StartErrorState
				error={startError}
				onBack={onBackToDashboard}
				onRetry={conv.retryStart}
			/>
		);
	}

	if (!session) {
		return <LoadingState onBack={onBackToDashboard} />;
	}

	// 결제 전 전체화면 디자인 시안 선택(병원 완료하기 → 시안 → 관리자 계정 → commit).
	// "이 디자인으로 계속" → 미리보기 화면을 닫지 않고 그 위로 관리자 계정 다이얼로그를 띄운다.
	// 입력 완료(commit) 시 commitResult가 채워져 위의 결제 화면으로 전환된다.
	if (conv.designOpen) {
		return (
			<>
				<DesignPreviewScreen
					payload={conv.previewPayload}
					templateKey={conv.templateKey}
					onTemplateChange={conv.setTemplateKey}
					onBack={conv.closeDesign}
					onConfirm={conv.confirmDesign}
					confirming={conv.designConfirming}
					confirmLabel="이 디자인으로 계속"
				/>
				<AdminCredentialsDialog
					open={adminDialogOpen}
					onOpenChange={conv.setAdminDialogOpen}
					pending={conv.isCommitting}
					defaultLoginId={conv.draftLoginId}
					onSubmit={conv.submitAdminCredentials}
				/>
			</>
		);
	}

	return (
		<div className="flex flex-col gap-5">
			<BackToDashboardLink onClick={onBackToDashboard} />

			<ProgressHeader
				progress={conv.progress}
				isClinicOwner={conv.isClinicOwner}
			/>

			{/* 채팅 영역 */}
			<SectionCard className="flex flex-col gap-4 p-4 sm:p-5">
				<ChatScroll
					viewportRef={conv.viewportRef}
					history={conv.history}
					questionBubble={conv.questionBubble}
					interrupt={conv.interrupt}
					isSending={conv.isSending}
					isUploading={conv.isUploading}
					isAnalyzing={conv.isAnalyzing}
					waiting={conv.waiting}
					pollExpired={pollExpired}
					pendingMessage={conv.pendingMessage}
					processingFile={conv.processingFile}
					uploadingFileName={conv.uploadingFileName}
					onManualRefresh={conv.handleManualRefresh}
				/>

				<Composer
					inputRef={conv.inputRef}
					fileInputRef={conv.fileInputRef}
					pickConflicts={conv.pickConflicts}
					isSelect={conv.isSelect}
					selectOptions={conv.selectOptions}
					isSearch={conv.isSearch}
					search={conv.search}
					showSkip={conv.showSkip}
					allowText={conv.allowText}
					allowFile={conv.allowFile}
					fileAccept={conv.fileAccept}
					text={conv.text}
					pending={{
						sending: conv.isSending,
						uploading: conv.isUploading,
						conflict: conv.conflictPending,
					}}
					onTextChange={conv.setText}
					onSubmit={conv.handleSubmit}
					onPickFile={conv.handlePickFile}
					onOpenFilePicker={conv.openFilePicker}
					onSendOption={conv.sendOption}
					onPickConflict={conv.pickConflict}
					onPickSearchItem={conv.pickSearchItem}
					onSubmitSearchText={conv.submitSearchText}
				/>
			</SectionCard>

			<CommitSection
				readyToCommit={conv.readyToCommit}
				isClinicOwner={conv.isClinicOwner}
				isCommitting={conv.isCommitting}
				processingFile={conv.processingFile}
				adminDialogOpen={adminDialogOpen}
				draftLoginId={conv.draftLoginId}
				onCommit={conv.handleCommit}
				onAdminDialogChange={conv.setAdminDialogOpen}
				onAdminSubmit={conv.submitAdminCredentials}
			/>
		</div>
	);
}

/**
 * 대화 화면의 데이터 오케스트레이션을 담당하는 훅:
 *  - 세션 reducer + 시작/재시도, 텍스트/파일/충돌 해소/commit 4종 mutation,
 *  - 진행률·waiting·옵션 등 파생값, 자동 스크롤/포커스/폴링 부수효과,
 *  - 입력/파일/완료 핸들러까지 한 곳에서 묶어 컴포넌트는 JSX만 담당.
 */
function useOnboardingConversation(mode: OnboardingMode) {
	const queryClient = useQueryClient();
	// 세션 진행 상태 묶음(시작/세션뷰/완료/다이얼로그/폴링). 단일 진실원.
	const [state, dispatch] = useReducer(convReducer, initialConvState);
	const { session, pollExpired } = state;
	const [text, setText] = useState("");

	const fileInputRef = useRef<HTMLInputElement>(null);
	// 채팅 스크롤 컨테이너(ScrollArea의 Viewport) — 자동 하단 스크롤 제어용.
	const viewportRef = useRef<HTMLDivElement>(null);
	// 답변 입력창 — 응답 수신 후 자동 포커스용.
	const inputRef = useRef<HTMLInputElement>(null);
	const started = useRef(false);

	// ── 진입 시 1회: 새 세션 시작(또는 진행중 draft 이어서) ──────────────
	// pending_payment 자동 진입/이어하기 다이얼로그는 대시보드가 처리하므로 여기서는 제거.
	useEffect(() => {
		if (started.current) return;
		started.current = true;
		startSession(mode)
			.then((view) => dispatch({ type: "setSession", view }))
			.catch((err) => dispatch({ type: "setStartError", error: err }));
	}, [mode]);

	// 새 메시지/응답을 받으면 폴링 안전장치 플래그를 리셋(새 대기 구간을 위해).
	function applySession(view: SessionView) {
		dispatch({ type: "applySession", view });
	}

	// ── 텍스트 전송 ─────────────────────────────────────────────────
	const textMutation = useMutation({
		mutationFn: (value: string) => sendMessage({ text: value }),
		onSuccess: (view) => {
			applySession(view);
			setText("");
			queryClient.invalidateQueries({ queryKey: OVERVIEW_KEY });
		},
		onError: (err) => toastApiError(err),
	});

	// ── 파일 첨부 → 업로드 후 전송 ──────────────────────────────────
	const fileMutation = useMutation({
		mutationFn: async (file: File) => {
			const purpose = inferPurpose(file);
			const subdir = purpose
				? purpose === "logo"
					? "hospital"
					: "profile"
				: "misc";
			const url = await uploadFileToStorage(file, subdir);
			return sendMessage(
				purpose ? { file_urls: [url], purpose } : { file_urls: [url] },
			);
		},
		onSuccess: (view) => {
			applySession(view);
			queryClient.invalidateQueries({ queryKey: OVERVIEW_KEY });
		},
		onError: (err) =>
			err instanceof ApiError
				? toastApiError(err)
				: toast.error("파일 업로드에 실패했습니다."),
	});

	// ── 충돌 해소: 선택한 값을 다시 텍스트로 전송 ───────────────────
	const conflictMutation = useMutation({
		mutationFn: (value: string) => sendMessage({ text: value }),
		onSuccess: (view) => {
			applySession(view);
			queryClient.invalidateQueries({ queryKey: OVERVIEW_KEY });
		},
		onError: (err) => toastApiError(err),
	});

	// ── 검색형(type="search") 선택: 고른 항목을 selection으로 전송 ───
	// 백엔드가 레지스트리에서 빈 필드(주소·전화 등)를 자동 채운다(문서 §6.2.2 search).
	const selectionMutation = useMutation({
		mutationFn: (selection: RefSearchItem) => sendMessage({ selection }),
		onSuccess: (view) => {
			applySession(view);
			setText("");
			queryClient.invalidateQueries({ queryKey: OVERVIEW_KEY });
		},
		onError: (err) => toastApiError(err),
	});

	// ── commit ──────────────────────────────────────────────────────
	// 관리자 계정(아이디·비밀번호)은 이 단계에서만 받는다(문서 2026-06 §2).
	const commitMutation = useMutation({
		mutationFn: (args?: { login_id?: string; password?: string }) =>
			commitSession(args),
		onSuccess: (result) => {
			dispatch({ type: "commitSucceeded", result });
			queryClient.invalidateQueries({ queryKey: OVERVIEW_KEY });
		},
		onError: (err) => toastApiError(err),
	});

	// ── 결제 전 디자인 시안 선택(전체화면) ──────────────────────────
	// 병원 commit 직전, 세션 draft로 홈페이지를 미리보며 시안(template_key)을 고른다.
	// 고른 시안은 draft에 PATCH로 저장돼 commit이 그 값으로 병원을 생성한다(생성 후 변경 API 없음).
	const [designOpen, setDesignOpen] = useState(false);
	const [templateKey, setTemplateKey] = useState("t1");
	const draft = (session?.draft as Record<string, unknown> | null) ?? null;
	// 미리보기 payload — draft + 현재 선택 시안(스와치 실시간 반영).
	const previewPayload = useMemo(
		() => buildPreviewPayloadFromDraft(draft, templateKey),
		[draft, templateKey],
	);

	const patchDraftMutation = useMutation({
		mutationFn: (tk: string) => patchDraft({ hospital: { template_key: tk } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: OVERVIEW_KEY });
			// 시안 화면은 그대로 둔 채 그 위로 관리자 계정 다이얼로그를 띄운다.
			// (닫지 않으므로 입력 완료 → commit → 결제까지 미리보기 위에서 이어진다.)
			dispatch({ type: "setAdminDialogOpen", open: true });
		},
		onError: (err) => toastApiError(err),
	});

	// ── 파생 상태 ───────────────────────────────────────────────────
	// 백그라운드 분석 진행 수(표시등 전용). waiting과 별개 — 폴링 트리거 아님(문서 2026-06 §1).
	const processingText = session?.processing_text ?? 0;
	const processingFile = session?.processing_file ?? 0;
	const history = (session?.history as ChatMessage[] | undefined) ?? [];
	const historyLength = history.length;
	// 세션 모드는 시작 시 확정됨(startSession에 전달). 백엔드 응답 mode를 우선하되
	// 아직 없으면 호출 시 넘긴 prop으로 판단한다(인텐트 미확정 단계는 제거됨).
	const isClinicOwner = (session?.mode ?? mode) === "hospital";
	// 관리자 아이디 prefill: 대화 중 언급했다면 draft에 있을 수 있음(비밀번호는 절대 안 옴).
	const draftLoginId =
		(
			session?.draft as
				| { hospital_admin?: { login_id?: string | null } }
				| null
				| undefined
		)?.hospital_admin?.login_id?.trim() ?? "";
	const conflicts = (session?.conflicts as Conflict[] | undefined) ?? [];
	const progress = clampPercent(session?.progress_percent);
	const nextQuestion = session?.next_question ?? null;
	// interrupt=true면 next_question이 백그라운드 분석의 이상점/충돌 확인 질문(문서 §7.6).
	const interrupt = session?.interrupt === true;
	// 입력값 vs 분석값 불일치(current/from_file 둘 다 존재)만 빠른 선택 카드로 노출.
	// 이상점(note/question)은 interrupt 질문으로 처리되므로 카드로는 안 띄움.
	const pickConflicts = conflicts.filter(
		(c) => c.current != null && c.from_file != null && c.asked !== true,
	);
	const isCommitting = commitMutation.isPending;
	const isSending =
		textMutation.isPending ||
		conflictMutation.isPending ||
		selectionMutation.isPending;
	const isUploading = fileMutation.isPending;
	// 대기 구간(폴링 트리거): 답할 게 없고 백엔드가 마지막 답변/파일을 처리 중.
	const waiting = session?.waiting === true;
	// 분석 표시등(폴링과 무관): 진행중 답변/파일 추출이 있으면 "분석 중" 안내만.
	const isAnalyzing = processingText > 0 || processingFile > 0;

	// 입력 UI 메타(문서 §6.2.2). question이 없으면(구버전 호환) 텍스트+파일 항상 허용.
	// type="search"면 자동완성(search 메타)로 입력하고, 고른 항목은 selection으로 보낸다.
	const {
		selectOptions,
		isSelect,
		isSearch,
		search,
		allowText,
		allowFile,
		allowSkip,
		fileAccept,
		acceptExtensions,
		fileAcceptLabel,
	} = deriveQuestionMeta(session?.question);

	// 전송 중일 때 낙관적으로 보여줄, 유저가 방금 보낸 메시지(React Query variables).
	// 검색 선택은 객체라 label_field(없으면 name)로 표시 텍스트를 뽑는다.
	const pendingMessage = textMutation.isPending
		? textMutation.variables
		: conflictMutation.isPending
			? conflictMutation.variables
			: selectionMutation.isPending
				? selectionLabel(selectionMutation.variables, search?.labelField) ||
					"선택한 항목"
				: null;
	// 전송/업로드 중에는 건너뛰기를 숨긴다 — 이미 답한 것과 마찬가지라 중복.
	// 성공하면 다음 질문으로 넘어가고, 실패하면 mutation이 idle로 돌아와 자동 복귀한다.
	const showSkip = allowSkip && !isSending && !isUploading;

	// next_question을 채팅 흐름 안의 마지막 어시스턴트 말풍선으로 표시한다.
	// (하단에 항상 고정되던 별도 안내 박스는 제거 — 같은 내용이 history에 있으면 중복 표시 방지)
	const questionBubble = deriveQuestionBubble(history, nextQuestion);

	// 자동 하단 스크롤 · 입력창 포커스 · 대기 구간 폴링(문서 2026-06 §1).
	useConversationEffects({
		viewportRef,
		inputRef,
		dispatch,
		historyLength,
		isSending,
		isUploading,
		isAnalyzing,
		waiting,
		pollExpired,
		nextQuestion,
	});

	// 완료 버튼 노출은 progress 100(ready)으로만 판단한다(문서 §6.2.2/§6.2.4/§7.4 —
	// 완료 안내 문구는 상황별로 달라 문구 매칭 금지).
	const readyToCommit = isReadyToCommit(progress);

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const value = text.trim();
		if (!value || isSending) return;
		textMutation.mutate(value);
	}

	function handlePickFile(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		e.target.value = ""; // 같은 파일 재선택 허용
		if (!file) return;
		// accept attr는 선택 다이얼로그만 거른다("모든 파일"로 우회 가능) → 여기서 다시 검증.
		// 질문별 허용 확장자(서버 권위)로 막아 가격표·이력서 칸에 이미지가 올라오지 않게 한다.
		const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
		if (!acceptExtensions.includes(ext)) {
			toast.error(
				`지원하지 않는 파일 형식입니다. ${fileAcceptLabel} 파일만 첨부할 수 있습니다.`,
			);
			return;
		}
		if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
			toast.error(
				`파일이 너무 큽니다. 최대 ${MAX_UPLOAD_MB}MB까지 첨부할 수 있습니다.`,
			);
			return;
		}
		fileMutation.mutate(file);
	}

	function handleCommit() {
		// 병원 소유면: 결제 전 디자인 시안 선택(전체화면) → 관리자 계정 설정 → commit.
		// 프로필만이면 결제가 없으므로 바로 commit.
		if (isClinicOwner) {
			const draftHospital = draft?.hospital as
				| { template_key?: string | null }
				| undefined;
			setTemplateKey(
				(draftHospital?.template_key?.trim() || "t1").toLowerCase(),
			);
			setDesignOpen(true);
		} else {
			commitMutation.mutate(undefined);
		}
	}

	// 대기 폴링이 안전장치(최대 시간)에 걸려 멈춘 뒤 수동 새로고침. 여전히 waiting이면 폴링 재개.
	async function handleManualRefresh() {
		dispatch({ type: "setPollExpired", value: false });
		try {
			dispatch({ type: "setSession", view: await getSession() });
		} catch (err) {
			toastApiError(err);
		}
	}

	function retryStart() {
		dispatch({ type: "setStartError", error: null });
		started.current = false;
		startSession(mode)
			.then((view) => dispatch({ type: "setSession", view }))
			.catch((err) => dispatch({ type: "setStartError", error: err }));
	}

	return {
		state,
		text,
		setText,
		viewportRef,
		inputRef,
		fileInputRef,
		history,
		questionBubble,
		interrupt,
		progress,
		isClinicOwner,
		pickConflicts,
		processingFile,
		pendingMessage,
		isSending,
		isUploading,
		isCommitting,
		isAnalyzing,
		waiting,
		selectOptions,
		isSelect,
		isSearch,
		search,
		allowText,
		allowFile,
		fileAccept,
		showSkip,
		conflictPending: conflictMutation.isPending,
		draftLoginId,
		readyToCommit,
		uploadingFileName: fileMutation.variables?.name,
		// 결제 전 디자인 시안 선택(전체화면)
		designOpen,
		previewPayload,
		templateKey,
		setTemplateKey,
		closeDesign: () => setDesignOpen(false),
		confirmDesign: () => patchDraftMutation.mutate(templateKey),
		designConfirming: patchDraftMutation.isPending,
		handleSubmit,
		handlePickFile,
		handleCommit,
		handleManualRefresh,
		retryStart,
		openFilePicker: () => fileInputRef.current?.click(),
		sendOption: (value: string) => textMutation.mutate(value),
		pickConflict: (value: string) => conflictMutation.mutate(value),
		// 검색형: 목록에서 고른 항목은 selection으로, 직접 입력은 text로 전송.
		// 이미 전송 중이면 무시(중복 전송 방지).
		pickSearchItem: (item: RefSearchItem) => {
			if (!isSending) selectionMutation.mutate(item);
		},
		submitSearchText: (raw: string) => {
			const value = raw.trim();
			if (value && !isSending) textMutation.mutate(value);
		},
		setAdminDialogOpen: (open: boolean) =>
			dispatch({ type: "setAdminDialogOpen", open }),
		submitAdminCredentials: (login_id: string, password: string) =>
			commitMutation.mutate({ login_id, password }),
	};
}

/**
 * 완료(commit) 영역: 진행률 100%일 때 강조되는 완료 버튼 + 병원 관리자 계정 설정 다이얼로그.
 * 관리자 계정(아이디·비밀번호)은 commit 단계에서만 받는다(문서 2026-06 §2).
 */
function CommitSection({
	readyToCommit,
	isClinicOwner,
	isCommitting,
	processingFile,
	adminDialogOpen,
	draftLoginId,
	onCommit,
	onAdminDialogChange,
	onAdminSubmit,
}: {
	readyToCommit: boolean;
	isClinicOwner: boolean;
	isCommitting: boolean;
	processingFile: number;
	adminDialogOpen: boolean;
	draftLoginId: string;
	onCommit: () => void;
	onAdminDialogChange: (open: boolean) => void;
	onAdminSubmit: (loginId: string, password: string) => void;
}) {
	return (
		<>
			{/* 완료 버튼(준비됐을 때만 강조 노출) */}
			{readyToCommit ? (
				<CommitButton
					isClinicOwner={isClinicOwner}
					disabled={isCommitting || processingFile > 0}
					isCommitting={isCommitting}
					onClick={onCommit}
				/>
			) : null}

			{/* 병원 관리자 아이디/비밀번호 설정(commit 단계에서만 받음) */}
			<AdminCredentialsDialog
				open={adminDialogOpen}
				onOpenChange={onAdminDialogChange}
				pending={isCommitting}
				defaultLoginId={draftLoginId}
				onSubmit={onAdminSubmit}
			/>
		</>
	);
}

// ─────────────────────────────────────────────────────────────────────
// 하위 컴포넌트
// ─────────────────────────────────────────────────────────────────────

/** commit 완료 화면(무료 또는 결제 유도). 결제는 toss → /billing/callback → 대시보드 복귀. */
function CommitCompleteView({
	result,
	onBackToDashboard,
}: {
	result: CommitResult;
	onBackToDashboard: () => void;
}) {
	return (
		<div className="flex flex-col gap-4">
			<BackToDashboardLink onClick={onBackToDashboard} />
			<CommitComplete result={result} onComplete={onBackToDashboard} />
		</div>
	);
}

/**
 * 대화 화면의 부수효과 묶음:
 *  - 메시지 전송/수신·파일 분석·대기 상태가 바뀌면 채팅 영역을 맨 아래로 스크롤(rAF).
 *  - history가 늘어나면 입력창으로 자동 포커스(연속 입력 편의).
 *  - waiting 동안만 GET /session 을 ~2s 간격 폴링(최대 시간 초과 시 pollExpired로 멈춤).
 */
function useConversationEffects({
	viewportRef,
	inputRef,
	dispatch,
	historyLength,
	isSending,
	isUploading,
	isAnalyzing,
	waiting,
	pollExpired,
	nextQuestion,
}: {
	viewportRef: React.RefObject<HTMLDivElement | null>;
	inputRef: React.RefObject<HTMLInputElement | null>;
	dispatch: React.Dispatch<ConvAction>;
	historyLength: number;
	isSending: boolean;
	isUploading: boolean;
	isAnalyzing: boolean;
	waiting: boolean;
	pollExpired: boolean;
	nextQuestion: string | null;
}) {
	// 메시지 전송("전송 중…" 표시)·수신(history 증가)·파일 분석 상태가 바뀌면
	// 채팅 영역을 맨 아래로 스크롤. rAF로 DOM 반영 후 스크롤해 안정적으로 동작.
	useEffect(() => {
		// 아래 값들은 스크롤 트리거로만 사용(값 자체는 계산에 불필요).
		void historyLength;
		void isSending;
		void isUploading;
		void isAnalyzing;
		void waiting;
		void nextQuestion;
		const el = viewportRef.current;
		if (!el) return;
		const id = requestAnimationFrame(() => {
			el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
		});
		return () => cancelAnimationFrame(id);
	}, [
		historyLength,
		isSending,
		isUploading,
		isAnalyzing,
		waiting,
		nextQuestion,
		viewportRef,
	]);

	// 응답이 도착해 history가 늘어나면 입력창으로 자동 포커스(연속 입력 편의).
	useEffect(() => {
		if (historyLength === 0) return;
		inputRef.current?.focus();
	}, [historyLength, inputRef]);

	// ── 대기 구간 폴링 (문서 2026-06 §1) ────────────────────────────
	// waiting=true 동안만 GET /session 을 ~2s 간격으로 조회해 화면을 자동 갱신한다.
	// 응답에 waiting=false가 오면 setSession→재렌더로 이 effect가 정리된다.
	// 최대 시간 초과 시 멈추고 수동 새로고침 버튼(pollExpired)으로 전환.
	useEffect(() => {
		if (!waiting || pollExpired) return;
		const startedAt = Date.now();
		let cancelled = false;
		const timer = setInterval(async () => {
			if (Date.now() - startedAt > HOLDING_POLL_MAX_MS) {
				dispatch({ type: "setPollExpired", value: true }); // deps 변경 → cleanup이 타이머 정리
				return;
			}
			try {
				const view = await getSession();
				if (!cancelled) dispatch({ type: "setSession", view });
			} catch {
				// 일시 오류는 무시하고 다음 주기에 재시도.
			}
		}, HOLDING_POLL_MS);
		return () => {
			cancelled = true;
			clearInterval(timer);
		};
	}, [waiting, pollExpired, dispatch]);
}

function BackToDashboardLink({ onClick }: { onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex w-fit items-center gap-1.5 text-sm font-medium text-body-soft transition-colors hover:text-brand"
		>
			<ArrowLeft className="size-4" />
			대시보드
		</button>
	);
}

/** 세션 시작 실패 화면(재시도 버튼 포함). */
function StartErrorState({
	error,
	onBack,
	onRetry,
}: {
	error: unknown;
	onBack: () => void;
	onRetry: () => void;
}) {
	return (
		<div className="flex flex-col gap-4">
			<BackToDashboardLink onClick={onBack} />
			<SectionCard className="flex flex-col items-center gap-5 text-center">
				<p className="text-lg font-semibold text-ink">
					대화형 작성을 시작하지 못했습니다.
				</p>
				<p className="text-sm text-body">
					{error instanceof ApiError
						? error.message
						: "네트워크 상태를 확인한 뒤 다시 시도해 주세요."}
				</p>
				<Button variant="brand" size="2xl" onClick={onRetry}>
					다시 시도
				</Button>
			</SectionCard>
		</div>
	);
}

/** 세션 로딩 중 화면. */
function LoadingState({ onBack }: { onBack: () => void }) {
	return (
		<div className="flex flex-col gap-4">
			<BackToDashboardLink onClick={onBack} />
			<div className="flex flex-col items-center gap-4 py-24 text-center">
				<Loader2 className="size-7 animate-spin text-brand" />
				<p className="text-base text-body">대화형 작성을 준비하고 있어요…</p>
			</div>
		</div>
	);
}

/** 진행바 + "한 번에 입력하기" 링크 + 소유 유형 배지(모드는 시작 시 확정되므로 항상 노출). */
function ProgressHeader({
	progress,
	isClinicOwner,
}: {
	progress: number;
	isClinicOwner: boolean;
}) {
	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center justify-between text-sm">
				<span className="font-semibold text-ink">대화로 작성하기</span>
				<div className="flex items-center gap-3">
					<span className="text-body-soft">{progress}% 완료</span>
					{/* 한 번에 입력하기 — 프로필만 직접 편집기로 이동(병원 직접 입력 폼은 제거됨). */}
					{!isClinicOwner && (
						<Link
							to="/doctor/profile"
							className="text-xs font-medium text-brand transition-colors hover:underline"
						>
							한 번에 입력하기
						</Link>
					)}
				</div>
			</div>
			<div className="h-2 w-full overflow-hidden rounded-full bg-line-soft">
				<div
					className="h-full rounded-full bg-brand transition-all duration-500"
					style={{ width: `${progress}%` }}
				/>
			</div>
			<div>
				<Badge variant="soft">
					{isClinicOwner ? "병원 홈페이지" : "프로필"}
				</Badge>
			</div>
		</div>
	);
}

/** 완료(commit) 버튼 — 진행률 100%일 때만 노출. */
function CommitButton({
	isClinicOwner,
	disabled,
	isCommitting,
	onClick,
}: {
	isClinicOwner: boolean;
	disabled: boolean;
	isCommitting: boolean;
	onClick: () => void;
}) {
	return (
		<Button
			variant="brand"
			size="cta"
			className="w-full"
			disabled={disabled}
			onClick={onClick}
		>
			{isCommitting ? (
				<Loader2 className="size-5 animate-spin" />
			) : (
				<CheckCircle2 className="size-5" />
			)}
			{isClinicOwner ? "디자인 선택하고 완료하기" : "프로필 생성 완료하기"}
		</Button>
	);
}

/** 채팅 흐름(말풍선 + 낙관적 전송/업로드/분석·대기 표시등 + 폴링 만료 새로고침). */
function ChatScroll({
	viewportRef,
	history,
	questionBubble,
	interrupt,
	isSending,
	isUploading,
	isAnalyzing,
	waiting,
	pollExpired,
	pendingMessage,
	processingFile,
	uploadingFileName,
	onManualRefresh,
}: {
	viewportRef: React.RefObject<HTMLDivElement | null>;
	history: ChatMessage[];
	questionBubble: string | null;
	interrupt: boolean;
	isSending: boolean;
	isUploading: boolean;
	isAnalyzing: boolean;
	waiting: boolean;
	pollExpired: boolean;
	pendingMessage: string | null;
	processingFile: number;
	uploadingFileName?: string;
	onManualRefresh: () => void;
}) {
	const isEmpty =
		history.length === 0 &&
		!questionBubble &&
		!isAnalyzing &&
		!waiting &&
		!isSending &&
		!isUploading;
	return (
		<ScrollArea
			viewportRef={viewportRef}
			viewportClassName="flex max-h-[52vh] min-h-[280px] flex-col gap-3 pr-3"
		>
			{isEmpty ? (
				<p className="m-auto text-center text-sm text-muted-fg">
					대화를 시작하면 여기에 표시됩니다.
				</p>
			) : (
				<>
					{keyHistory(history).map((m) => (
						<ChatBubble
							key={m.key}
							from={m.role}
							text={m.text}
							files={m.files}
						/>
					))}

					{/* 다음 질문(어시스턴트) — 같은 내용이 history에 없을 때만 흐름 안 말풍선으로 */}
					{questionBubble ? (
						<ChatBubble
							from="assistant"
							text={questionBubble}
							interrupt={interrupt}
						/>
					) : null}

					{/* 전송 중: 유저 텍스트를 낙관적으로(실제 말풍선과 동일 크기) */}
					{isSending ? (
						<div className="ml-auto flex max-w-[85%] items-end gap-2">
							<div className="whitespace-pre-wrap wrap-break-word rounded-2xl rounded-br-sm bg-brand px-4 py-3 text-[15px] leading-relaxed text-brand-foreground opacity-70">
								{pendingMessage?.trim() ? pendingMessage : "전송 중…"}
							</div>
							<Loader2 className="size-4 shrink-0 animate-spin text-muted-fg" />
						</div>
					) : null}

					{/* 파일 전송 상황: 업로드/전송 중인 파일명을 낙관적으로 표시 */}
					{isUploading && uploadingFileName ? (
						<div className="ml-auto flex max-w-[85%] items-end gap-2">
							<div className="flex items-center gap-2 rounded-2xl rounded-br-sm bg-brand px-4 py-3 text-[15px] leading-relaxed text-brand-foreground opacity-70">
								<Paperclip className="size-4 shrink-0" />
								<span className="truncate">{uploadingFileName}</span>
								<span className="shrink-0 text-xs opacity-80">업로드 중…</span>
							</div>
							<Loader2 className="size-4 shrink-0 animate-spin text-muted-fg" />
						</div>
					) : null}

					{/* 분석/대기 표시등: 막지 않음. waiting이면 폴링이 자동으로 다음 단계로 넘긴다(§1). */}
					{isAnalyzing || waiting ? (
						<div className="mr-auto flex max-w-[90%] items-center gap-2 rounded-2xl rounded-bl-sm bg-app-bg px-4 py-2.5 text-xs text-body-soft">
							<Loader2 className="size-3.5 shrink-0 animate-spin" />
							{processingFile > 0
								? `올려주신 파일을 분석하고 있어요 (${processingFile}개)`
								: "입력하신 내용을 정리하고 있어요"}
							{waiting
								? " · 잠시만 기다려 주세요"
								: " · 계속 답변하셔도 됩니다"}
						</div>
					) : null}

					{/* 대기 폴링이 안전장치(최대 시간)에 걸려 멈춘 경우: 수동 새로고침 */}
					{pollExpired ? (
						<button
							type="button"
							onClick={onManualRefresh}
							className="mr-auto inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-xs font-medium text-body transition-colors hover:bg-muted"
						>
							<Loader2 className="size-3.5 shrink-0" />
							아직 처리 중이에요. 새로고침해서 확인하기
						</button>
					) : null}
				</>
			)}
		</ScrollArea>
	);
}

/** 충돌 비교 카드 + 보기(select)/건너뛰기 + 직접입력/파일 입력창 + 안내문. */
function Composer({
	inputRef,
	fileInputRef,
	pickConflicts,
	isSelect,
	selectOptions,
	isSearch,
	search,
	showSkip,
	allowText,
	allowFile,
	fileAccept,
	text,
	pending,
	onTextChange,
	onSubmit,
	onPickFile,
	onOpenFilePicker,
	onSendOption,
	onPickConflict,
	onPickSearchItem,
	onSubmitSearchText,
}: {
	inputRef: React.RefObject<HTMLInputElement | null>;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	pickConflicts: Conflict[];
	isSelect: boolean;
	selectOptions: Array<{ label?: string | null; value?: string | null }>;
	/** type="search"면 직접입력 대신 자동완성(SearchAnswerField)을 띄운다. */
	isSearch: boolean;
	/** 자동완성 메타(endpoint·labelField·valueField). isSearch일 때만 존재. */
	search: SearchMeta | null;
	showSkip: boolean;
	allowText: boolean;
	allowFile: boolean;
	/** input[type=file]의 accept 속성값(질문별 허용 확장자, 서버 권위). */
	fileAccept: string;
	text: string;
	/** 진행 중 상태 묶음 — 전송/업로드/충돌해소 mutation의 pending 플래그. */
	pending: { sending: boolean; uploading: boolean; conflict: boolean };
	onTextChange: (value: string) => void;
	onSubmit: (e: React.FormEvent) => void;
	onPickFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onOpenFilePicker: () => void;
	onSendOption: (value: string) => void;
	onPickConflict: (value: string) => void;
	/** 자동완성에서 항목 선택 → message { selection: item }. */
	onPickSearchItem: (item: RefSearchItem) => void;
	/** 자동완성에서 직접 입력 → message { text }. */
	onSubmitSearchText: (raw: string) => void;
}) {
	return (
		<>
			{/* 충돌 비교 카드: 입력값 vs 분석값 불일치 빠른 선택.
			    단, 백엔드가 충돌을 select 질문(options)으로 내려주면 아래 보기 버튼이 처리하므로 중복 노출 방지. */}
			{pickConflicts.length > 0 && !isSelect ? (
				<div className="flex flex-col gap-3">
					<p className="text-sm font-semibold text-ink">
						입력하신 값과 분석 결과가 다릅니다. 사용할 값을 선택해 주세요.
					</p>
					{pickConflicts.map((c) => (
						<ConflictCard
							key={c.field}
							conflict={c}
							disabled={pending.conflict}
							onPick={onPickConflict}
						/>
					))}
				</div>
			) : null}

			{/* 보기(select) 옵션 + 건너뛰기 버튼 — 같은 줄에 묶어 입력창 위에 노출.
			    select가 있으면 [보기…][건너뛰기], 없으면 건너뛰기만 단독으로.
			    클릭 시 value(또는 "건너뛰기")를 그대로 답변으로 전송(문서 §6.2.2)
			    건너뛰기는 전송/업로드 중 숨김(showSkip) — skip만 있을 땐 줄 자체를 숨긴다. */}
			{isSelect || showSkip ? (
				<div className="flex flex-wrap justify-end gap-2">
					{selectOptions.map((o) => (
						<Button
							key={o.value ?? o.label}
							type="button"
							variant="brand-outline"
							size="xl"
							disabled={pending.sending}
							onClick={() => {
								const v = (o.value ?? "").trim();
								if (v) onSendOption(v);
							}}
						>
							{o.label ?? o.value}
						</Button>
					))}
					{showSkip ? (
						<Button
							type="button"
							variant="brand-outline"
							size="xl"
							onClick={() => onSendOption("건너뛰기")}
						>
							건너뛰기
						</Button>
					) : null}
				</div>
			) : null}

			{/* 검색형(type="search")이면 직접입력 대신 자동완성을 띄운다.
			    항목 선택 → selection, 직접 입력 → text(allow_text일 때). */}
			{isSearch && search ? (
				<SearchAnswerField
					search={search}
					allowText={allowText}
					value={text}
					onChange={onTextChange}
					onPick={onPickSearchItem}
					onSubmitText={onSubmitSearchText}
				/>
			) : allowText || allowFile ? (
				<form onSubmit={onSubmit} className="flex items-end gap-2">
					<input
						ref={fileInputRef}
						type="file"
						className="hidden"
						onChange={onPickFile}
						accept={fileAccept}
						aria-label="파일 선택"
					/>
					{allowFile ? (
						<Button
							type="button"
							variant="neutral-outline"
							size="2xl"
							className="shrink-0 px-0 w-14"
							disabled={pending.uploading}
							onClick={onOpenFilePicker}
							aria-label="파일 첨부"
						>
							{pending.uploading ? (
								<Loader2 className="size-5 animate-spin" />
							) : (
								<Paperclip className="size-5" />
							)}
						</Button>
					) : null}
					{allowText ? (
						<>
							<FieldInput
								ref={inputRef}
								value={text}
								onChange={(e) => onTextChange(e.target.value)}
								placeholder={isSelect ? "직접 입력하기" : "답변을 입력하세요"}
								disabled={pending.sending}
								autoFocus
							/>
							<Button
								type="submit"
								variant="brand"
								size="2xl"
								className="shrink-0 px-0 w-14"
								disabled={!text.trim() || pending.sending}
								aria-label="전송"
							>
								<SendHorizontal className="size-5" />
							</Button>
						</>
					) : null}
				</form>
			) : null}
		</>
	);
}

/**
 * 검색형(type="search") 답변 입력 — 자동완성 드롭다운.
 * search.endpoint(공개 GET, 예: /ref/clinic)로 250ms 디바운스 질의하고,
 *  - 항목 선택 → onPick(item) → message { selection: item }(백엔드가 빈 필드 자동채움)
 *  - 목록에 없으면 "직접 입력" → onSubmitText(raw) → message { text }(allow_text일 때만)
 * 표시는 label_field, 식별은 value_field 기준(문서 §6.2.2 search).
 */
function SearchAnswerField({
	search,
	allowText,
	value,
	onChange,
	onPick,
	onSubmitText,
}: {
	search: SearchMeta;
	allowText: boolean;
	value: string;
	onChange: (value: string) => void;
	onPick: (item: RefSearchItem) => void;
	onSubmitText: (raw: string) => void;
}) {
	const { endpoint, labelField, valueField } = search;
	// 입력값 '그대로' 250ms 디바운스(문서 §2-③). trim은 빈 입력 스킵용일 뿐
	// 조합 중 자모("강ㄴ")·단일 자모("ㄱ")는 가공 없이 그대로 keyword로 보낸다.
	const keyword = useDebouncedValue(value.trim(), 250);
	const { data } = useQuery({
		queryKey: ["onboarding-search", endpoint, keyword],
		// signal: 새 입력이 오면 React Query가 이전 요청을 abort(문서 §2-④).
		queryFn: ({ signal }) =>
			searchRef(endpoint, { keyword, limit: 20 }, signal),
		// 최소 글자수 게이트 없음 — 빈 문자열만 스킵(자모 1자부터 검색, 문서 §2-②).
		enabled: keyword.length >= 1,
		staleTime: 60_000,
		// 새 keyword 응답이 오기 전까지 직전 결과 유지(빈 화면 깜빡임 방지).
		// queryKey에 keyword가 있어 최신 응답만 반영된다(latest-wins, 문서 §2-④).
		placeholderData: keepPreviousData,
	});
	const items = data?.items ?? [];
	const options: AutocompleteOption[] = items.map((it) => ({
		value: searchItemValue(it, labelField, valueField),
		label: String(it[labelField] ?? ""),
		description: searchItemDescription(it),
	}));
	return (
		<Autocomplete
			options={options}
			value={value}
			onChange={onChange}
			onSelect={(opt) => {
				const picked = items.find(
					(it) => searchItemValue(it, labelField, valueField) === opt.value,
				);
				if (picked) onPick(picked);
			}}
			// 직접 입력은 allow_text일 때만 — 목록에 없으면 타이핑한 값을 그대로 전송.
			onManualEntry={
				allowText
					? () => {
							const raw = value.trim();
							if (raw) onSubmitText(raw);
						}
					: undefined
			}
			placeholder="이름을 입력해 검색하세요"
		/>
	);
}

function ChatBubble({
	from,
	text,
	files,
	interrupt,
}: {
	from: string;
	text?: string | null;
	files?: string[] | null;
	interrupt?: boolean;
}) {
	const isUser = from === "user";
	const hasFiles = Array.isArray(files) && files.length > 0;
	if (!text && !hasFiles) return null;

	const bubbleClass = isUser
		? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-brand px-4 py-3 text-[15px] leading-relaxed text-brand-foreground"
		: interrupt
			? "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm border border-amber-300 bg-amber-50 px-4 py-3 text-[15px] leading-relaxed text-ink"
			: "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm bg-app-bg px-4 py-3 text-[15px] leading-relaxed text-body";

	return (
		<div className={bubbleClass}>
			{interrupt ? (
				<p className="mb-1 text-xs font-bold text-amber-700">확인이 필요해요</p>
			) : null}
			{text ? (
				<p className="whitespace-pre-wrap wrap-break-word">{text}</p>
			) : null}
			{hasFiles ? (
				<div
					className={cn("flex flex-wrap gap-1.5", text ? "mt-2" : undefined)}
				>
					{files?.map((url) => {
						const name = fileLabel(url);
						return (
							<a
								key={url}
								href={url}
								target="_blank"
								rel="noreferrer"
								title={`${name} (새 탭에서 열기)`}
								className={cn(
									"inline-flex max-w-[220px] items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition-colors",
									isUser
										? "bg-white/15 text-brand-foreground hover:bg-white/25"
										: "border border-line bg-surface text-body hover:bg-muted",
								)}
							>
								<Paperclip className="size-3.5 shrink-0" />
								<span className="truncate">{name}</span>
								<ExternalLink className="size-3 shrink-0 opacity-70" />
							</a>
						);
					})}
				</div>
			) : null}
		</div>
	);
}

function ConflictCard({
	conflict,
	disabled,
	onPick,
}: {
	conflict: Conflict;
	disabled: boolean;
	onPick: (value: string) => void;
}) {
	const current = formatValue(conflict.current);
	const fromFile = formatValue(conflict.from_file);
	return (
		<div className="rounded-xl border border-line bg-surface p-4">
			<p className="mb-3 text-xs font-medium text-body-soft">
				{conflict.field}
			</p>
			<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
				<button
					type="button"
					disabled={disabled || !current}
					onClick={() => onPick(current)}
					className="flex flex-col items-start gap-1 rounded-lg border border-line p-3 text-left transition-colors hover:border-brand hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<span className="text-xs text-muted-fg">입력한 값</span>
					<span className="text-sm font-medium text-ink">{current || "—"}</span>
				</button>
				<button
					type="button"
					disabled={disabled || !fromFile}
					onClick={() => onPick(fromFile)}
					className="flex flex-col items-start gap-1 rounded-lg border border-line p-3 text-left transition-colors hover:border-brand hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<span className="text-xs text-muted-fg">파일에서 추출한 값</span>
					<span className="text-sm font-medium text-ink">
						{fromFile || "—"}
					</span>
				</button>
			</div>
		</div>
	);
}

function AdminCredentialsDialog({
	open,
	onOpenChange,
	pending,
	defaultLoginId,
	onSubmit,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	pending: boolean;
	defaultLoginId?: string;
	onSubmit: (loginId: string, password: string) => void;
}) {
	// 사용자가 직접 입력했는지 여부 — 입력 전엔 draft(defaultLoginId)로 prefill.
	const [typedLoginId, setTypedLoginId] = useState<string | null>(null);
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const loginIdId = useId();
	const pwId = useId();
	const confirmId = useId();

	// 다이얼로그 draft 아이디 prefill을 effect 없이 렌더 중 계산:
	// 사용자가 한 번이라도 입력하면 그 값을, 아니면 draft를 사용(편집은 그대로 유지).
	const loginId = typedLoginId ?? defaultLoginId ?? "";

	const loginIdValid = LOGIN_ID_RE.test(loginId);
	const loginIdInvalid = loginId.length > 0 && !loginIdValid;
	const mismatch = confirm.length > 0 && password !== confirm;
	const canSubmit =
		loginIdValid && password.length >= 4 && password === confirm && !pending;

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!canSubmit) return;
		onSubmit(loginId, password);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>병원 관리자 계정 설정</DialogTitle>
					<DialogDescription>
						병원 홈페이지를 관리할 관리자 아이디와 비밀번호를 설정합니다.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="contents">
					<DialogBody>
						<div className="flex flex-col gap-2">
							<label
								htmlFor={loginIdId}
								className="text-[15px] font-medium text-ink"
							>
								관리자 아이디
							</label>
							<FieldInput
								id={loginIdId}
								value={loginId}
								onChange={(e) => setTypedLoginId(e.target.value)}
								placeholder="아이디"
								autoComplete="username"
								autoCapitalize="off"
								spellCheck={false}
								aria-invalid={loginIdInvalid || undefined}
							/>
							<p
								className={
									loginIdInvalid
										? "text-sm text-danger-strong"
										: "text-sm text-body-soft"
								}
							>
								{LOGIN_ID_HINT}
							</p>
						</div>
						<div className="flex flex-col gap-2">
							<label
								htmlFor={pwId}
								className="text-[15px] font-medium text-ink"
							>
								관리자 비밀번호
							</label>
							<FieldInput
								id={pwId}
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="비밀번호"
								autoComplete="new-password"
							/>
						</div>
						<div className="flex flex-col gap-2">
							<label
								htmlFor={confirmId}
								className="text-[15px] font-medium text-ink"
							>
								비밀번호 확인
							</label>
							<FieldInput
								id={confirmId}
								type="password"
								value={confirm}
								onChange={(e) => setConfirm(e.target.value)}
								placeholder="비밀번호 확인"
								autoComplete="new-password"
								aria-invalid={mismatch || undefined}
							/>
							{mismatch ? (
								<p className="text-sm text-danger-strong">
									비밀번호가 일치하지 않습니다.
								</p>
							) : null}
						</div>
					</DialogBody>

					<DialogFooter>
						<Button
							type="button"
							variant="neutral-outline"
							size="2xl"
							onClick={() => onOpenChange(false)}
							disabled={pending}
						>
							취소
						</Button>
						<Button
							type="submit"
							variant="brand"
							size="2xl"
							disabled={!canSubmit}
						>
							{pending ? <Loader2 className="size-5 animate-spin" /> : null}
							완료하기
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

// ─────────────────────────────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────────────────────────────

/** view.question(looseObject)을 입력 UI 메타로 좁힌 타입. */
type QuestionMeta = {
	type?: string | null;
	options?: Array<{ label?: string | null; value?: string | null }> | null;
	allow_text?: boolean | null;
	allow_skip?: boolean | null;
	allow_file?: boolean | null;
	// allow_file=true일 때 항목별 허용 확장자(서버 권위). 예: ".png", ".pdf".
	accept?: string[] | null;
	// type="search"일 때만: 자동완성 메타(공개 GET endpoint + 표시/식별 필드).
	search?: {
		endpoint?: string | null;
		label_field?: string | null;
		value_field?: string | null;
	} | null;
};

/** 자동완성에 필요한 값만 추린 search 메타(필수값 보장). */
type SearchMeta = {
	endpoint: string;
	labelField: string;
	valueField: string;
};

/**
 * 입력 UI 메타 계산(문서 §6.2.2). question이 없으면(구버전 호환) 텍스트+파일 항상 허용.
 * - 보기(select)는 value가 비지 않은 옵션만.
 * - 검색(search)은 endpoint가 있을 때만 — 자동완성으로 입력하고 고른 항목은 selection으로 전송.
 * - 직접 입력은 allow_text가 명시되면 그 값(false면 type:"text"여도 숨김), 미지정이면 type="text"일 때만.
 * - 파일 업로드는 백엔드가 요청한 질문(allow_file)에서만.
 */
function deriveQuestionMeta(raw: unknown): {
	selectOptions: Array<{ label?: string | null; value?: string | null }>;
	isSelect: boolean;
	isSearch: boolean;
	search: SearchMeta | null;
	allowText: boolean;
	allowFile: boolean;
	allowSkip: boolean;
	/** input[type=file]의 accept 속성값(예: ".pdf,.docx"). */
	fileAccept: string;
	/** 클라 검증용 정규화 확장자 목록(점 없는 소문자, 예: ["pdf","docx"]). */
	acceptExtensions: readonly string[];
	/** 거부 토스트용 확장자 표기(예: "PDF, DOCX"). */
	fileAcceptLabel: string;
} {
	const question = raw as QuestionMeta | null | undefined;
	const selectOptions =
		question?.type === "select" && Array.isArray(question.options)
			? question.options.filter((o) => (o?.value ?? "").trim().length > 0)
			: [];
	const endpoint = question?.search?.endpoint?.trim();
	// endpoint가 있어야 자동완성을 띄울 수 있다. label/value 필드는 기본값(name/no)으로 보강.
	const search: SearchMeta | null =
		question?.type === "search" && endpoint
			? {
					endpoint,
					labelField: question.search?.label_field?.trim() || "name",
					valueField: question.search?.value_field?.trim() || "no",
				}
			: null;
	// 파일 허용 확장자: 서버(question.accept)가 권위. 점 없는 소문자로 정규화하고,
	// 미지정(구버전/누락)일 때만 폴백 목록을 쓴다. accept attr/검증/안내 표기를 여기서 일괄 도출.
	const serverExts = Array.isArray(question?.accept)
		? question.accept.reduce<string[]>((acc, e) => {
				const ext = typeof e === "string" ? e.trim() : "";
				if (ext) acc.push(ext.replace(/^\./, "").toLowerCase());
				return acc;
			}, [])
		: [];
	const acceptExtensions: readonly string[] = serverExts.length
		? serverExts
		: FALLBACK_FILE_EXTENSIONS;
	return {
		selectOptions,
		isSelect: selectOptions.length > 0,
		isSearch: search != null,
		search,
		fileAccept: acceptExtensions.map((ext) => `.${ext}`).join(","),
		acceptExtensions,
		fileAcceptLabel: acceptExtensions
			.map((ext) => ext.toUpperCase())
			.join(", "),
		// allow_text가 명시(boolean)되면 그 값이 우선 — false면 type:"text"여도 직접입력을 숨긴다
		// (대기 상태 등 백엔드가 답변 입력을 막는 경우). 미지정일 때만 type==="text"를 허용 신호로 폴백.
		allowText: question
			? typeof question.allow_text === "boolean"
				? question.allow_text
				: question.type === "text"
			: true,
		allowFile: question ? question.allow_file === true : true,
		allowSkip: question?.allow_skip === true,
	};
}

/** 자동완성 항목의 식별값 — value_field 우선, 없으면 label_field. */
function searchItemValue(
	item: RefSearchItem,
	labelField: string,
	valueField: string,
): string {
	return String(item[valueField] ?? item[labelField] ?? "");
}

/**
 * 자동완성 항목의 보조 표시(부제). 병의원 레지스트리 기준 종별·지역(시도/시군구)·주소.
 * 다른 endpoint에서 해당 필드가 없으면 자연히 빈 값이 되어 표시되지 않는다.
 */
function searchItemDescription(item: RefSearchItem): string | undefined {
	const str = (v: unknown) =>
		typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
	const region = [str(item.sido_name), str(item.sigungu_name)]
		.filter(Boolean)
		.join(" ");
	const parts = [str(item.type_name), region || str(item.address)].filter(
		Boolean,
	);
	return parts.length ? parts.join(" · ") : undefined;
}

/** 검색 선택(객체)의 낙관적 표시 텍스트 — label_field(없으면 name) 값. */
function selectionLabel(
	selection: RefSearchItem | undefined,
	labelField: string | undefined,
): string {
	if (!selection) return "";
	const value = selection[labelField ?? "name"] ?? selection.name;
	return typeof value === "string" ? value : "";
}

/**
 * next_question을 채팅 흐름 안의 마지막 어시스턴트 말풍선으로 표시할지 계산.
 * 같은 내용이 이미 history 마지막 어시스턴트 메시지에 있으면 중복이라 표시하지 않는다.
 */
function deriveQuestionBubble(
	history: ChatMessage[],
	nextQuestion: string | null,
): string | null {
	let lastAssistantText = "";
	for (let i = history.length - 1; i >= 0; i--) {
		if (history[i].role === "assistant") {
			lastAssistantText = history[i].text?.trim() ?? "";
			break;
		}
	}
	const questionText = nextQuestion?.trim() ?? "";
	return questionText && questionText !== lastAssistantText
		? questionText
		: null;
}

/**
 * 채팅 history에 안정적인 key 부여.
 * 동일 (role,text) 메시지가 여러 번 와도 등장 횟수로 구분하여
 * 배열 인덱스를 key로 쓰지 않는다(append-only 이므로 안정적).
 */
function keyHistory(
	history: ChatMessage[],
): Array<ChatMessage & { key: string }> {
	const seen = new Map<string, number>();
	return history.map((m) => {
		const filesKey = m.files?.length ? m.files.join(",") : "";
		const base = `${m.role}:${m.text ?? ""}:${filesKey}`;
		const n = seen.get(base) ?? 0;
		seen.set(base, n + 1);
		return { ...m, key: `${base}#${n}` };
	});
}

/**
 * 첨부 URL에서 표시용 파일명 추출.
 * 쿼리 제거 → 디코드 → 스토리지 키 접두 해시("<hex>_원본이름.ext") 제거.
 * (길이 제한은 CSS truncate로 처리하고 여기선 원본 이름을 그대로 돌려준다.)
 */
function fileLabel(url: string): string {
	try {
		const path = url.split("?")[0];
		const seg = decodeURIComponent(path.substring(path.lastIndexOf("/") + 1));
		const cleaned = seg.replace(/^[0-9a-fA-F]{8,}[_-]/, "");
		return cleaned || "첨부파일";
	} catch {
		return "첨부파일";
	}
}

function inferPurpose(file: File): "logo" | "photo" | undefined {
	if (!file.type.startsWith("image/")) return undefined;
	const name = file.name.toLowerCase();
	if (name.includes("logo") || name.includes("로고")) return "logo";
	return "photo";
}

function clampPercent(value: number | undefined): number {
	if (typeof value !== "number" || Number.isNaN(value)) return 0;
	return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * 완료(ready) 판정 — 진행률 100%일 때만 완료 버튼을 노출한다.
 * 완료 안내 문구는 상황별로 달라(문서 §6.2.4) next_question 텍스트를 매칭하지 않는다.
 */
function isReadyToCommit(progress: number): boolean {
	return progress >= 100;
}

function formatValue(value: unknown): string {
	if (value == null) return "";
	if (typeof value === "string") return value;
	if (typeof value === "number" || typeof value === "boolean")
		return String(value);
	try {
		return JSON.stringify(value);
	} catch {
		return "";
	}
}
