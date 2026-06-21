import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	CheckCircle2,
	Loader2,
	Paperclip,
	PartyPopper,
	SendHorizontal,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { AuthGuard } from "#/components/auth/auth-guard.tsx";
import { InfoCallout } from "#/components/common/info-callout.tsx";
import {
	SectionCard,
	SectionTitle,
} from "#/components/common/section-card.tsx";
import { FieldInput } from "#/components/form/field-input.tsx";
import { AppShell } from "#/components/layout/app-shell.tsx";
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
	getSession,
	type SessionView,
	sendMessage,
	startSession,
} from "#/lib/api/onboarding.ts";
import { toastApiError } from "#/lib/api-error-message.ts";
import { useSession } from "#/lib/auth/use-session.ts";
import { uploadFileToStorage } from "#/lib/upload.ts";

export const Route = createFileRoute("/onboarding")({
	component: OnboardingPage,
});

function OnboardingPage() {
	return (
		<AuthGuard>
			<OnboardingChat />
		</AuthGuard>
	);
}

/** history 항목 타입(view의 history는 looseObject라 좁혀 사용). */
type ChatMessage = { role: string; text?: string };

/** conflicts 항목을 화면용으로 좁힌 타입. */
type Conflict = {
	field: string;
	current?: unknown;
	from_file?: unknown;
};

const LOGIN_ID_HINT = "영문 소문자·숫자 4~20자";

function OnboardingChat() {
	const { account } = useSession();
	const queryClient = useQueryClient();

	// 첫 진입 시 세션 시작. 이후 폴링/메시지 응답으로 갱신되는 단일 진실원.
	const [session, setSession] = useState<SessionView | null>(null);
	const [startError, setStartError] = useState<unknown>(null);
	const [text, setText] = useState("");
	const [commitResult, setCommitResult] = useState<CommitResult | null>(null);
	const [adminDialogOpen, setAdminDialogOpen] = useState(false);

	const fileInputRef = useRef<HTMLInputElement>(null);
	const scrollRef = useRef<HTMLDivElement>(null);
	const started = useRef(false);

	// ── 세션 시작(1회) ──────────────────────────────────────────────
	useEffect(() => {
		if (started.current) return;
		started.current = true;
		startSession()
			.then(setSession)
			.catch((err) => setStartError(err));
	}, []);

	// ── 처리 중 파일이 있으면 getSession 폴링 ────────────────────────
	const processingFiles = session?.processing_files ?? 0;
	const pollQuery = useQuery({
		queryKey: ["onboarding", "session", "poll"],
		queryFn: getSession,
		enabled: processingFiles > 0 && !commitResult,
		refetchInterval: 2500,
	});

	useEffect(() => {
		if (pollQuery.data) setSession(pollQuery.data);
	}, [pollQuery.data]);

	// ── 새 메시지가 들어오면 맨 아래로 스크롤 ────────────────────────
	const history = (session?.history as ChatMessage[] | undefined) ?? [];
	const historyLength = history.length;
	useEffect(() => {
		// historyLength / processingFiles 변화를 트리거로 사용(값 자체는 스크롤 계산에 불필요).
		void historyLength;
		void processingFiles;
		scrollRef.current?.scrollTo({
			top: scrollRef.current.scrollHeight,
			behavior: "smooth",
		});
	}, [historyLength, processingFiles]);

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
			queryClient.invalidateQueries({ queryKey: ["account", "me"] });
		},
		onError: (err) => toastApiError(err),
	});

	// ── 파생 상태 ───────────────────────────────────────────────────
	const isClinicOwner = session?.is_clinic_owner === true;
	const conflicts = (session?.conflicts as Conflict[] | undefined) ?? [];
	const progress = clampPercent(session?.progress_percent);
	const nextQuestion = session?.next_question ?? null;
	const isCommitting = commitMutation.isPending;
	const isSending = textMutation.isPending || conflictMutation.isPending;
	const isUploading = fileMutation.isPending;
	const isProcessing = processingFiles > 0;

	// commit 완료 화면(무료 또는 결제 유도)
	if (commitResult) {
		return (
			<AppShell userName={account?.name ?? "원장님"} maxWidth="720px">
				<CommitComplete result={commitResult} />
			</AppShell>
		);
	}

	// 세션 시작 실패
	if (startError) {
		return (
			<AppShell userName={account?.name ?? "원장님"} maxWidth="720px">
				<SectionCard className="flex flex-col items-center gap-5 text-center">
					<p className="text-lg font-semibold text-ink">
						온보딩 세션을 시작하지 못했습니다.
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
			</AppShell>
		);
	}

	// 세션 로딩 중
	if (!session) {
		return (
			<AppShell userName={account?.name ?? "원장님"} maxWidth="720px">
				<div className="flex flex-col items-center gap-4 py-24 text-center">
					<Loader2 className="size-7 animate-spin text-brand" />
					<p className="text-base text-body">온보딩을 준비하고 있어요…</p>
				</div>
			</AppShell>
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
			commitMutation.mutate(undefined);
		}
	}

	// "완료" 유도 여부: 질문 AI가 완료 안내로 전환했는지 휴리스틱 + 진행률.
	const readyToCommit = isReadyToCommit(nextQuestion, progress);

	return (
		<AppShell userName={account?.name ?? "원장님"} maxWidth="720px">
			<div className="flex flex-col gap-5">
				{/* 진행바 */}
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between text-sm">
						<span className="font-semibold text-ink">대화형 온보딩</span>
						<span className="text-body-soft">{progress}% 완료</span>
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

						{/* 전송 중(낙관적 표시) */}
						{isSending ? (
							<div className="ml-auto flex max-w-[85%] items-center gap-2 rounded-2xl rounded-br-sm bg-brand px-4 py-3 text-sm text-brand-foreground opacity-70">
								<Loader2 className="size-4 animate-spin" />
								전송 중…
							</div>
						) : null}
					</div>

					{/* 다음 질문 강조 */}
					{nextQuestion ? (
						<InfoCallout tone="info">
							<p className="text-[15px] font-medium text-ink">{nextQuestion}</p>
						</InfoCallout>
					) : null}

					{/* 충돌 비교 카드 */}
					{conflicts.length > 0 ? (
						<div className="flex flex-col gap-3">
							<p className="text-sm font-semibold text-ink">
								입력값과 파일에서 추출한 값이 다릅니다. 사용할 값을 선택해
								주세요.
							</p>
							{conflicts.map((c) => (
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
			</div>

			{/* 병원 관리자 아이디/비밀번호 모달 */}
			<AdminCredentialsDialog
				open={adminDialogOpen}
				onOpenChange={setAdminDialogOpen}
				pending={isCommitting}
				onSubmit={(password) => commitMutation.mutate(password)}
			/>
		</AppShell>
	);
}

// ─────────────────────────────────────────────────────────────────────
// 하위 컴포넌트
// ─────────────────────────────────────────────────────────────────────

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
						병원 홈페이지를 관리할 관리자 비밀번호를 설정합니다.
						아이디(login_id)는 대화에서 입력한 값({LOGIN_ID_HINT})이 사용됩니다.
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

function CommitComplete({ result }: { result: CommitResult }) {
	const payment = result.payment;
	const slug = extractSlug(result);

	// 병원 결제 필요 → 결제 단계
	if (payment?.required === true) {
		return <PaymentStep payment={payment} slug={slug} />;
	}

	// 프로필만 → 무료 완료 축하
	return (
		<SectionCard className="flex flex-col items-center gap-6 text-center">
			<div className="flex size-16 items-center justify-center rounded-full bg-success-bg">
				<PartyPopper className="size-8 text-success" />
			</div>
			<div className="flex flex-col gap-2">
				<h1 className="text-2xl font-bold text-ink">
					프로필 생성이 완료됐어요!
				</h1>
				<p className="text-[15px] leading-7 text-body-soft">
					의사 프로필이 무료로 만들어졌습니다.
					<br />
					이제 본인 프로필 도메인에서 자유롭게 편집할 수 있어요.
				</p>
			</div>
			<InfoCallout tone="success" className="w-full text-left">
				<p className="text-sm">
					프로필 관리:{" "}
					<span className="font-semibold text-ink">
						{slug ? `${slug}.kmadoc.com` : "<slug>.kmadoc.com"}
					</span>
				</p>
			</InfoCallout>
			<div className="flex w-full flex-col gap-3 sm:flex-row">
				<Button
					nativeButton={false}
					render={<Link to="/doctor/preview" />}
					variant="brand"
					size="xl"
					className="w-full"
				>
					공개 프로필 예시 보기
				</Button>
				<Button
					nativeButton={false}
					render={<Link to="/" />}
					variant="neutral-outline"
					size="xl"
					className="w-full"
				>
					홈으로
				</Button>
			</div>
		</SectionCard>
	);
}

// ─────────────────────────────────────────────────────────────────────
// 결제(Toss) 단계 — commit 후 병원이면 카드(빌링키) 등록으로 유도
// ─────────────────────────────────────────────────────────────────────

/** Toss SDK v2 standard 의 최소 인터페이스(좁은 타입). */
type TossPaymentsInstance = {
	payment: (options: { customerKey: string }) => {
		requestBillingAuth: (options: {
			method: "CARD";
			successUrl: string;
			failUrl: string;
		}) => Promise<void>;
	};
};
type TossPaymentsFactory = (clientKey: string) => TossPaymentsInstance;

declare global {
	interface Window {
		TossPayments?: TossPaymentsFactory;
	}
}

const TOSS_SDK_URL = "https://js.tosspayments.com/v2/standard";

/** Toss SDK 동적 로드(CDN script). 새 의존성 추가 없이 window.TossPayments 사용. */
function loadTossSdk(): Promise<TossPaymentsFactory> {
	return new Promise((resolve, reject) => {
		if (window.TossPayments) {
			resolve(window.TossPayments);
			return;
		}
		const existing = document.querySelector<HTMLScriptElement>(
			`script[src="${TOSS_SDK_URL}"]`,
		);
		if (existing) {
			existing.addEventListener("load", () => {
				window.TossPayments
					? resolve(window.TossPayments)
					: reject(new Error("Toss SDK 로드 실패"));
			});
			existing.addEventListener("error", () =>
				reject(new Error("Toss SDK 로드 실패")),
			);
			return;
		}
		const script = document.createElement("script");
		script.src = TOSS_SDK_URL;
		script.async = true;
		script.onload = () =>
			window.TossPayments
				? resolve(window.TossPayments)
				: reject(new Error("Toss SDK 로드 실패"));
		script.onerror = () => reject(new Error("Toss SDK 로드 실패"));
		document.head.appendChild(script);
	});
}

function PaymentStep({
	payment,
	slug,
}: {
	payment: NonNullable<CommitResult["payment"]>;
	slug: string | null;
}) {
	const [loading, setLoading] = useState(false);
	const clientKey = payment.toss_client_key;
	const customerKey = payment.customer_key;
	const hospitalNo = payment.hospital_no;
	const amount = payment.amount;

	const ready = Boolean(clientKey && customerKey && hospitalNo != null);

	async function handlePay() {
		if (!ready || !clientKey || !customerKey || hospitalNo == null) return;
		setLoading(true);
		try {
			const factory = await loadTossSdk();
			const toss = factory(clientKey);
			const origin = window.location.origin;
			const successUrl = `${origin}/billing/callback?hospital_no=${hospitalNo}&customerKey=${encodeURIComponent(
				customerKey,
			)}`;
			const failUrl = `${origin}/billing/callback?fail=1`;
			await toss.payment({ customerKey }).requestBillingAuth({
				method: "CARD",
				successUrl,
				failUrl,
			});
			// requestBillingAuth 성공 시 successUrl 로 리다이렉트되므로 이 아래는 보통 실행 안 됨.
		} catch (err) {
			toast.error(
				err instanceof Error && err.message
					? err.message
					: "결제 모듈을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
			);
			setLoading(false);
		}
	}

	return (
		<SectionCard className="flex flex-col gap-6">
			<div className="flex flex-col gap-2">
				<SectionTitle>병원 홈페이지 결제</SectionTitle>
				<p className="text-[15px] leading-7 text-body-soft">
					프로필과 병원이 생성됐어요. 병원 홈페이지를 공개하려면 정기 결제용
					카드를 등록해 주세요.
				</p>
			</div>

			<div className="rounded-xl border border-line bg-app-bg p-5">
				<div className="flex items-center justify-between">
					<span className="text-sm text-body-soft">월 정기 결제</span>
					<span className="text-lg font-bold text-ink">
						{typeof amount === "number"
							? `${amount.toLocaleString("ko-KR")}원 / 월`
							: "월 정기 결제"}
					</span>
				</div>
			</div>

			{ready ? (
				<Button
					variant="brand"
					size="cta"
					className="w-full"
					disabled={loading}
					onClick={handlePay}
				>
					{loading ? <Loader2 className="size-5 animate-spin" /> : null}
					카드 등록하고 결제하기
				</Button>
			) : (
				<InfoCallout tone="warning">
					<p className="text-sm">
						결제 정보(클라이언트 키·고객 키·병원 번호)가 충분하지 않아 결제를
						시작할 수 없습니다. 백엔드 응답을 확인해 주세요.
					</p>
				</InfoCallout>
			)}

			<p className="text-center text-sm text-muted-fg">
				결제가 완료되면 병원 홈페이지가 공개됩니다
				{slug ? ` (${slug}.kmaclinic.com)` : " (<slug>.kmaclinic.com)"}.
			</p>
		</SectionCard>
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

/** commit 결과에서 slug 후보를 best-effort 추출(타입은 looseObject). */
function extractSlug(result: CommitResult): string | null {
	const profile = result.profile as Record<string, unknown> | null | undefined;
	const hospital = result.hospital as
		| Record<string, unknown>
		| null
		| undefined;
	const candidate =
		(hospital?.slug as string | undefined) ??
		(profile?.slug as string | undefined);
	return typeof candidate === "string" && candidate ? candidate : null;
}
