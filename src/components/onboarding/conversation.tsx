import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
	ArrowLeft,
	CheckCircle2,
	Loader2,
	Paperclip,
	SendHorizontal,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { InfoCallout } from "#/components/common/info-callout.tsx";
import { SectionCard } from "#/components/common/section-card.tsx";
import { FieldInput } from "#/components/form/field-input.tsx";
import { CommitComplete } from "#/components/onboarding/commit-complete.tsx";
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog.tsx";
import { ApiError } from "#/lib/api";
import {
	type CommitResult,
	commitSession,
	type SessionView,
	sendMessage,
	startSession,
} from "#/lib/api/onboarding.ts";
import { toastApiError } from "#/lib/api-error-message.ts";
import { uploadFileToStorage } from "#/lib/upload.ts";

/**
 * 대화형 온보딩 화면 — 대시보드(`/onboarding`)에서 "대화형으로 만들기" 또는
 * draft "이어서 작성"으로 진입한다.
 *
 * ⚠ 대시보드 오케스트레이터가 소유하게 된 분기는 여기서 제거됨:
 *  - pending_payment 자동 진입(결제 위젯) → 대시보드가 카드로 처리
 *  - resumable "이어하기/새로 시작" 다이얼로그 → 대시보드 draft 카드가 처리
 * 진입 시에는 항상 startSession으로 첫 질문(또는 진행중 draft 이어서)을 받아 시작한다.
 *
 * commit 성공 → CommitComplete(결제/무료 완료). 결제는 Toss → /billing/callback → 대시보드 복귀.
 */

/** history 항목 타입(view의 history는 looseObject라 좁혀 사용). */
type ChatMessage = { role: string; text?: string };

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

	const fileInputRef = useRef<HTMLInputElement>(null);
	const scrollRef = useRef<HTMLDivElement>(null);
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

	// 파일/긴 답변은 백그라운드 깊은 분석으로 처리되고, 그 결과는 **다음 메시지 턴**에 병합됩니다.
	// (문서 §7.5 — 폴링하지 않음. 분석 중에는 인디케이터만 표시하고, 다음 답변을 보내면 반영됨)
	const processingFiles = session?.processing_files ?? 0;

	const history = (session?.history as ChatMessage[] | undefined) ?? [];
	const historyLength = history.length;

	// ── 텍스트 전송 ─────────────────────────────────────────────────
	const textMutation = useMutation({
		mutationFn: (value: string) => sendMessage({ text: value }),
		onSuccess: (view) => {
			setSession(view);
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
		onSuccess: (view) => setSession(view),
		onError: (err) =>
			err instanceof ApiError
				? toastApiError(err)
				: toast.error("파일 업로드에 실패했습니다."),
	});

	// ── 충돌 해소: 선택한 값을 다시 텍스트로 전송 ───────────────────
	const conflictMutation = useMutation({
		mutationFn: (value: string) => sendMessage({ text: value }),
		onSuccess: (view) => setSession(view),
		onError: (err) => toastApiError(err),
	});

	// ── commit ──────────────────────────────────────────────────────
	const commitMutation = useMutation({
		mutationFn: (password?: string) => commitSession(password),
		onSuccess: (result) => {
			setCommitResult(result);
			setAdminDialogOpen(false);
		},
		onError: (err) => toastApiError(err),
	});

	// ── 파생 상태 ───────────────────────────────────────────────────
	const isClinicOwner = session?.is_clinic_owner === true;
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
	const isProcessing = processingFiles > 0;
	// 전송 중일 때 낙관적으로 보여줄, 유저가 방금 보낸 메시지(React Query variables).
	const pendingMessage = textMutation.isPending
		? textMutation.variables
		: conflictMutation.isPending
			? conflictMutation.variables
			: null;

	// 메시지 전송("전송 중…" 표시)·수신(history 증가)·파일 분석 상태가 바뀌면
	// 채팅 영역을 맨 아래로 스크롤. rAF로 DOM 반영 후 스크롤해 안정적으로 동작.
	useEffect(() => {
		// 아래 값들은 스크롤 트리거로만 사용(값 자체는 계산에 불필요).
		void historyLength;
		void isSending;
		void isUploading;
		void isProcessing;
		const el = scrollRef.current;
		if (!el) return;
		const id = requestAnimationFrame(() => {
			el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
		});
		return () => cancelAnimationFrame(id);
	}, [historyLength, isSending, isUploading, isProcessing]);

	// commit 완료 화면(무료 또는 결제 유도). 결제는 Toss → /billing/callback → 대시보드 복귀.
	if (commitResult) {
		return (
			<div className="flex flex-col gap-4">
				<BackToDashboardLink onClick={onBackToDashboard} />
				<CommitComplete result={commitResult} />
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
						대화형 온보딩을 시작하지 못했습니다.
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
						대화형 온보딩을 준비하고 있어요…
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
		// 병원 소유면 관리자 계정 모달, 프로필만이면 비번 없이 바로 commit
		if (isClinicOwner) {
			setAdminDialogOpen(true);
		} else {
			commitMutation.mutate("");
		}
	}

	// "완료" 유도 여부: 질문 AI가 완료 안내로 전환했는지 휴리스틱 + 진행률.
	const readyToCommit = isReadyToCommit(nextQuestion, progress);

	return (
		<div className="flex flex-col gap-5">
			<BackToDashboardLink onClick={onBackToDashboard} />

			{/* 진행바 */}
			<div className="flex flex-col gap-2">
				<div className="flex items-center justify-between text-sm">
					<span className="font-semibold text-ink">대화형 온보딩</span>
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
				<div
					ref={scrollRef}
					className="flex max-h-[52vh] min-h-[280px] flex-col gap-3 overflow-y-auto pr-1"
				>
					{history.length === 0 ? (
						<p className="m-auto text-center text-sm text-muted-fg">
							대화를 시작하면 여기에 표시됩니다.
						</p>
					) : (
						keyHistory(history).map((m) => (
							<ChatBubble key={m.key} role={m.role} text={m.text} />
						))
					)}

					{/* 파일 분석 중 스피너 */}
					{isProcessing ? (
						<div className="mr-auto flex max-w-[85%] items-center gap-2 rounded-2xl rounded-bl-sm bg-brand-50 px-4 py-3 text-sm text-brand">
							<Loader2 className="size-4 animate-spin" />
							파일 분석 중… ({processingFiles}개)
						</div>
					) : null}

					{/* 전송 중: 유저가 보낸 메시지를 낙관적으로 표시(응답 도착 시 history 버블로 교체) */}
					{isSending ? (
						<div className="ml-auto flex max-w-[85%] items-end gap-2">
							<p className="whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-brand px-4 py-2.5 text-sm text-brand-foreground opacity-80">
								{pendingMessage?.trim() ? pendingMessage : "전송 중…"}
							</p>
							<Loader2 className="size-4 shrink-0 animate-spin text-muted-fg" />
						</div>
					) : null}
				</div>

				{/* 다음 질문 강조 (interrupt면 분석이 찾은 확인 질문으로 강조) */}
				{nextQuestion ? (
					<InfoCallout tone={interrupt ? "warning" : "info"}>
						{interrupt ? (
							<p className="mb-1 text-xs font-bold text-amber-700">
								확인이 필요해요
							</p>
						) : null}
						<p className="text-[15px] font-medium text-ink">{nextQuestion}</p>
					</InfoCallout>
				) : null}

				{/* 충돌 비교 카드: 입력값 vs 분석값 불일치만 빠른 선택으로 노출.
				    이상점(note/question)은 위 확인 질문(interrupt)으로 처리됨 */}
				{pickConflicts.length > 0 ? (
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

				{/* 입력창 */}
				<form onSubmit={handleSubmit} className="flex items-end gap-2">
					<input
						ref={fileInputRef}
						type="file"
						className="hidden"
						onChange={handlePickFile}
						accept="image/*,application/pdf,.doc,.docx,.hwp,.xlsx,.xls"
					/>
					<Button
						type="button"
						variant="neutral-outline"
						size="2xl"
						className="shrink-0 px-0 w-14"
						disabled={isUploading || isProcessing}
						onClick={() => fileInputRef.current?.click()}
						aria-label="파일 첨부"
					>
						{isUploading ? (
							<Loader2 className="size-5 animate-spin" />
						) : (
							<Paperclip className="size-5" />
						)}
					</Button>
					<FieldInput
						value={text}
						onChange={(e) => setText(e.target.value)}
						placeholder="답변을 입력하세요"
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
				</form>

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
					disabled={isCommitting || isProcessing}
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

			{/* 병원 관리자 아이디/비밀번호 모달 */}
			<AdminCredentialsDialog
				open={adminDialogOpen}
				onOpenChange={setAdminDialogOpen}
				pending={isCommitting}
				onSubmit={(password) => commitMutation.mutate(password)}
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

function ChatBubble({ role, text }: { role: string; text?: string }) {
	const isUser = role === "user";
	if (!text) return null;
	return (
		<div
			className={
				isUser
					? "ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-brand px-4 py-3 text-[15px] leading-relaxed text-brand-foreground"
					: "mr-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-app-bg px-4 py-3 text-[15px] leading-relaxed text-body"
			}
		>
			{text}
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
	onSubmit,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	pending: boolean;
	onSubmit: (password: string) => void;
}) {
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const pwId = useId();
	const confirmId = useId();

	const mismatch = confirm.length > 0 && password !== confirm;
	const canSubmit = password.length >= 4 && password === confirm && !pending;

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!canSubmit) return;
		onSubmit(password);
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="text-lg font-bold text-ink">
						병원 관리자 계정 설정
					</DialogTitle>
					<DialogDescription className="text-sm text-body">
						병원 홈페이지를 관리할 관리자 비밀번호를 설정합니다. 아이디는
						대화에서 입력한 값({LOGIN_ID_HINT})이 사용됩니다.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div className="flex flex-col gap-2">
						<label htmlFor={pwId} className="text-sm font-medium text-ink">
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
						<label htmlFor={confirmId} className="text-sm font-medium text-ink">
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

					<div className="mt-1 flex flex-col gap-2 sm:flex-row sm:justify-end">
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
					</div>
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
		const base = `${m.role}:${m.text ?? ""}`;
		const n = seen.get(base) ?? 0;
		seen.set(base, n + 1);
		return { ...m, key: `${base}#${n}` };
	});
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

/** 다음 질문 문구가 완료 안내로 바뀌었거나 진행률이 충분하면 완료 버튼 노출. */
function isReadyToCommit(
	nextQuestion: string | null,
	progress: number,
): boolean {
	if (nextQuestion) {
		const q = nextQuestion.replace(/\s/g, "");
		if (q.includes("완료")) return true;
	}
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
