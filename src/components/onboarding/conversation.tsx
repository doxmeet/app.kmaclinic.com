import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	CheckCircle2,
	ExternalLink,
	Loader2,
	Paperclip,
	SendHorizontal,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { SectionCard } from "#/components/common/section-card.tsx";
import { FieldInput } from "#/components/form/field-input.tsx";
import { CommitComplete } from "#/components/onboarding/commit-complete.tsx";
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
import { ApiError } from "#/lib/api";
import {
	type CommitResult,
	commitSession,
	getSession,
	type SessionView,
	sendMessage,
	startSession,
} from "#/lib/api/onboarding.ts";
import { toastApiError } from "#/lib/api-error-message.ts";
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

export function OnboardingConversation({
	onBackToDashboard,
}: {
	/** 상단 "← 대시보드" — 클릭 시 대시보드 모드 복귀 + overview refetch. */
	onBackToDashboard: () => void;
}) {
	// 첫 진입 시 세션 시작. 이후 폴링/메시지 응답으로 갱신되는 단일 진실원.
	const [session, setSession] = useState<SessionView | null>(null);
	const [startError, setStartError] = useState<unknown>(null);
	const [text, setText] = useState("");
	const [commitResult, setCommitResult] = useState<CommitResult | null>(null);
	const [adminDialogOpen, setAdminDialogOpen] = useState(false);
	// 대기 폴링이 안전장치(최대 시간)에 걸려 멈췄는지 — 멈추면 수동 새로고침 버튼 노출.
	const [pollExpired, setPollExpired] = useState(false);

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
		startSession()
			.then(setSession)
			.catch((err) => setStartError(err));
	}, []);

	// 백그라운드 분석 진행 수(표시등 전용). waiting과 별개 — 폴링 트리거 아님(문서 2026-06 §1).
	const processingText = session?.processing_text ?? 0;
	const processingFile = session?.processing_file ?? 0;

	const history = (session?.history as ChatMessage[] | undefined) ?? [];
	const historyLength = history.length;

	// 새 메시지/응답을 받으면 폴링 안전장치 플래그를 리셋(새 대기 구간을 위해).
	function applySession(view: SessionView) {
		setSession(view);
		setPollExpired(false);
	}

	// ── 텍스트 전송 ─────────────────────────────────────────────────
	const textMutation = useMutation({
		mutationFn: (value: string) => sendMessage({ text: value }),
		onSuccess: (view) => {
			applySession(view);
			setText("");
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
		onSuccess: (view) => applySession(view),
		onError: (err) =>
			err instanceof ApiError
				? toastApiError(err)
				: toast.error("파일 업로드에 실패했습니다."),
	});

	// ── 충돌 해소: 선택한 값을 다시 텍스트로 전송 ───────────────────
	const conflictMutation = useMutation({
		mutationFn: (value: string) => sendMessage({ text: value }),
		onSuccess: (view) => applySession(view),
		onError: (err) => toastApiError(err),
	});

	// ── commit ──────────────────────────────────────────────────────
	// 관리자 계정(아이디·비밀번호)은 이 단계에서만 받는다(문서 2026-06 §2).
	const commitMutation = useMutation({
		mutationFn: (args?: { login_id?: string; password?: string }) =>
			commitSession(args),
		onSuccess: (result) => {
			setCommitResult(result);
			setAdminDialogOpen(false);
		},
		onError: (err) => toastApiError(err),
	});

	// ── 파생 상태 ───────────────────────────────────────────────────
	const isClinicOwner = session?.is_clinic_owner === true;
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
	const isSending = textMutation.isPending || conflictMutation.isPending;
	const isUploading = fileMutation.isPending;
	// 대기 구간(폴링 트리거): 답할 게 없고 백엔드가 마지막 답변/파일을 처리 중.
	const waiting = session?.waiting === true;
	// 분석 표시등(폴링과 무관): 진행중 답변/파일 추출이 있으면 "분석 중" 안내만.
	const isAnalyzing = processingText > 0 || processingFile > 0;
	// 전송 중일 때 낙관적으로 보여줄, 유저가 방금 보낸 메시지(React Query variables).
	const pendingMessage = textMutation.isPending
		? textMutation.variables
		: conflictMutation.isPending
			? conflictMutation.variables
			: null;

	// 입력 UI 메타(문서 §6.2.2). question이 없으면(구버전 호환) 텍스트+파일 항상 허용.
	const question = session?.question as
		| {
				type?: string | null;
				options?: Array<{
					label?: string | null;
					value?: string | null;
				}> | null;
				allow_text?: boolean | null;
				allow_skip?: boolean | null;
				allow_file?: boolean | null;
		  }
		| null
		| undefined;
	const selectOptions =
		question?.type === "select" && Array.isArray(question.options)
			? question.options.filter((o) => (o?.value ?? "").trim().length > 0)
			: [];
	const isSelect = selectOptions.length > 0;
	// 클릭 보기로 답할 수 있어도 직접 입력은 allow_text로만. type="text"면 당연히 허용. question 없으면 허용.
	const allowText = question
		? question.type === "text" || question.allow_text === true
		: true;
	// 파일 업로드는 백엔드가 요청한 질문(allow_file)에서만. question 없으면 항상 허용.
	const allowFile = question ? question.allow_file === true : true;
	const allowSkip = question?.allow_skip === true;
	// 전송/업로드 중에는 건너뛰기를 숨긴다 — 이미 답한 것과 마찬가지라 중복.
	// 성공하면 다음 질문으로 넘어가고, 실패하면 mutation이 idle로 돌아와 자동 복귀한다.
	const showSkip = allowSkip && !isSending && !isUploading;

	// next_question을 채팅 흐름 안의 마지막 어시스턴트 말풍선으로 표시한다.
	// (하단에 항상 고정되던 별도 안내 박스는 제거 — 같은 내용이 history에 있으면 중복 표시 방지)
	let lastAssistantText = "";
	for (let i = history.length - 1; i >= 0; i--) {
		if (history[i].role === "assistant") {
			lastAssistantText = history[i].text?.trim() ?? "";
			break;
		}
	}
	const questionText = nextQuestion?.trim() ?? "";
	const questionBubble =
		questionText && questionText !== lastAssistantText ? questionText : null;

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
	]);

	// 응답이 도착해 history가 늘어나면 입력창으로 자동 포커스(연속 입력 편의).
	useEffect(() => {
		if (historyLength === 0) return;
		inputRef.current?.focus();
	}, [historyLength]);

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
				setPollExpired(true); // deps 변경 → cleanup이 타이머 정리
				return;
			}
			try {
				const view = await getSession();
				if (!cancelled) setSession(view);
			} catch {
				// 일시 오류는 무시하고 다음 주기에 재시도.
			}
		}, HOLDING_POLL_MS);
		return () => {
			cancelled = true;
			clearInterval(timer);
		};
	}, [waiting, pollExpired]);

	// commit 완료 화면(무료 또는 결제 유도). 결제는 toss → /billing/callback → 대시보드 복귀.
	if (commitResult) {
		return (
			<div className="flex flex-col gap-4">
				<BackToDashboardLink onClick={onBackToDashboard} />
				<CommitComplete result={commitResult} onComplete={onBackToDashboard} />
			</div>
		);
	}

	// 세션 시작 실패
	if (startError) {
		return (
			<div className="flex flex-col gap-4">
				<BackToDashboardLink onClick={onBackToDashboard} />
				<SectionCard className="flex flex-col items-center gap-5 text-center">
					<p className="text-lg font-semibold text-ink">
						대화형 작성을 시작하지 못했습니다.
					</p>
					<p className="text-sm text-body">
						{startError instanceof ApiError
							? startError.message
							: "네트워크 상태를 확인한 뒤 다시 시도해 주세요."}
					</p>
					<Button
						variant="brand"
						size="2xl"
						onClick={() => {
							setStartError(null);
							started.current = false;
							startSession()
								.then(setSession)
								.catch((err) => setStartError(err));
						}}
					>
						다시 시도
					</Button>
				</SectionCard>
			</div>
		);
	}

	// 세션 로딩 중
	if (!session) {
		return (
			<div className="flex flex-col gap-4">
				<BackToDashboardLink onClick={onBackToDashboard} />
				<div className="flex flex-col items-center gap-4 py-24 text-center">
					<Loader2 className="size-7 animate-spin text-brand" />
					<p className="text-base text-body">
						대화형 작성을 준비하고 있어요…
					</p>
				</div>
			</div>
		);
	}

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const value = text.trim();
		if (!value || isSending) return;
		textMutation.mutate(value);
	}

	function handlePickFile(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		e.target.value = ""; // 같은 파일 재선택 허용
		if (file) fileMutation.mutate(file);
	}

	function handleCommit() {
		// 병원 소유면 관리자 계정(아이디+비번) 모달, 프로필만이면 본문 없이 바로 commit
		if (isClinicOwner) {
			setAdminDialogOpen(true);
		} else {
			commitMutation.mutate(undefined);
		}
	}

	// 대기 폴링이 안전장치(최대 시간)에 걸려 멈춘 뒤 수동 새로고침. 여전히 waiting이면 폴링 재개.
	async function handleManualRefresh() {
		setPollExpired(false);
		try {
			setSession(await getSession());
		} catch (err) {
			toastApiError(err);
		}
	}

	// 완료 버튼 노출은 progress 100(ready)으로만 판단한다(문서 §6.2.2/§6.2.4/§7.4 —
	// 완료 안내 문구는 상황별로 달라 문구 매칭 금지).
	const readyToCommit = isReadyToCommit(progress);

	return (
		<div className="flex flex-col gap-5">
			<BackToDashboardLink onClick={onBackToDashboard} />

			{/* 진행바 */}
			<div className="flex flex-col gap-2">
				<div className="flex items-center justify-between text-sm">
					<span className="font-semibold text-ink">대화로 작성하기</span>
					<div className="flex items-center gap-3">
						<span className="text-body-soft">{progress}% 완료</span>
						<Link
							to="/onboarding/direct"
							className="text-xs font-medium text-brand transition-colors hover:underline"
						>
							한 번에 입력하기
						</Link>
					</div>
				</div>
				<div className="h-2 w-full overflow-hidden rounded-full bg-line-soft">
					<div
						className="h-full rounded-full bg-brand transition-all duration-500"
						style={{ width: `${progress}%` }}
					/>
				</div>
				{session.is_clinic_owner != null ? (
					<div>
						<Badge variant="soft">
							{isClinicOwner ? "병원 홈페이지까지" : "프로필만"}
						</Badge>
					</div>
				) : null}
			</div>

			{/* 채팅 영역 */}
			<SectionCard className="flex flex-col gap-4 p-4 sm:p-5">
				<ScrollArea
					viewportRef={viewportRef}
					viewportClassName="flex max-h-[52vh] min-h-[280px] flex-col gap-3 pr-3"
				>
					{history.length === 0 &&
					!questionBubble &&
					!isAnalyzing &&
					!waiting &&
					!isSending &&
					!isUploading ? (
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
							{isUploading && fileMutation.variables ? (
								<div className="ml-auto flex max-w-[85%] items-end gap-2">
									<div className="flex items-center gap-2 rounded-2xl rounded-br-sm bg-brand px-4 py-3 text-[15px] leading-relaxed text-brand-foreground opacity-70">
										<Paperclip className="size-4 shrink-0" />
										<span className="truncate">
											{fileMutation.variables.name}
										</span>
										<span className="shrink-0 text-xs opacity-80">
											업로드 중…
										</span>
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
									onClick={handleManualRefresh}
									className="mr-auto inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-xs font-medium text-body transition-colors hover:bg-muted"
								>
									<Loader2 className="size-3.5 shrink-0" />
									아직 처리 중이에요. 새로고침해서 확인하기
								</button>
							) : null}
						</>
					)}
				</ScrollArea>

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
								disabled={conflictMutation.isPending}
								onPick={(value) => conflictMutation.mutate(value)}
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
								disabled={isSending}
								onClick={() => {
									const v = (o.value ?? "").trim();
									if (v) textMutation.mutate(v);
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
								onClick={() => textMutation.mutate("건너뛰기")}
							>
								건너뛰기
							</Button>
						) : null}
					</div>
				) : null}

				{/* 입력창(직접입력/파일) — question.allow_* 에 따라 노출 */}
				{allowText || allowFile ? (
					<form onSubmit={handleSubmit} className="flex items-end gap-2">
						<input
							ref={fileInputRef}
							type="file"
							className="hidden"
							onChange={handlePickFile}
							accept="image/*,application/pdf,.doc,.docx,.hwp,.xlsx,.xls"
						/>
						{allowFile ? (
							<Button
								type="button"
								variant="neutral-outline"
								size="2xl"
								className="shrink-0 px-0 w-14"
								disabled={isUploading}
								onClick={() => fileInputRef.current?.click()}
								aria-label="파일 첨부"
							>
								{isUploading ? (
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
									onChange={(e) => setText(e.target.value)}
									placeholder={isSelect ? "직접 입력하기" : "답변을 입력하세요"}
									disabled={isSending}
									autoFocus
								/>
								<Button
									type="submit"
									variant="brand"
									size="2xl"
									className="shrink-0 px-0 w-14"
									disabled={!text.trim() || isSending}
									aria-label="전송"
								>
									<SendHorizontal className="size-5" />
								</Button>
							</>
						) : null}
					</form>
				) : null}

				<p className="text-xs text-muted-fg">
					이력서·면허증을 올리면 학력·경력·면허·논문이 자동으로 채워집니다.
					로고/사진은 그대로 저장됩니다.
				</p>
			</SectionCard>

			{/* 완료 버튼(준비됐을 때만 강조 노출) */}
			{readyToCommit ? (
				<Button
					variant="brand"
					size="cta"
					className="w-full"
					disabled={isCommitting || processingFile > 0}
					onClick={handleCommit}
				>
					{isCommitting ? (
						<Loader2 className="size-5 animate-spin" />
					) : (
						<CheckCircle2 className="size-5" />
					)}
					{isClinicOwner
						? "관리자 계정 설정 후 완료하기"
						: "프로필 생성 완료하기"}
				</Button>
			) : null}

			{/* 병원 관리자 아이디/비밀번호 설정(commit 단계에서만 받음) */}
			<AdminCredentialsDialog
				open={adminDialogOpen}
				onOpenChange={setAdminDialogOpen}
				pending={isCommitting}
				defaultLoginId={draftLoginId}
				onSubmit={(login_id, password) =>
					commitMutation.mutate({ login_id, password })
				}
			/>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────
// 하위 컴포넌트
// ─────────────────────────────────────────────────────────────────────

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
	const [loginId, setLoginId] = useState(defaultLoginId ?? "");
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const loginIdId = useId();
	const pwId = useId();
	const confirmId = useId();

	// 다이얼로그가 열릴 때 draft 아이디로 prefill(사용자가 이미 입력했다면 유지).
	useEffect(() => {
		if (open && defaultLoginId) setLoginId((v) => v || defaultLoginId);
	}, [open, defaultLoginId]);

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
								onChange={(e) => setLoginId(e.target.value)}
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
										: "text-xs text-body-soft"
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
