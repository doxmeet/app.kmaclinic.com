import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	AlertTriangle,
	ArrowLeft,
	CreditCard,
	Loader2,
	RotateCcw,
} from "lucide-react";
import { type ReactNode, useId, useState } from "react";
import { toast } from "sonner";
import { AuthGuard } from "#/components/auth/auth-guard.tsx";
import { InfoRows } from "#/components/common/data-list.tsx";
import {
	DataTable,
	type DataTableColumn,
} from "#/components/common/data-table.tsx";
import { InfoCallout } from "#/components/common/info-callout.tsx";
import { CardShell, SectionCard } from "#/components/common/section-card.tsx";
import { AppShell } from "#/components/layout/app-shell.tsx";
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
import { Textarea } from "#/components/ui/textarea.tsx";
import { ApiError } from "#/lib/api";
import {
	type BillingKey,
	cancelSubscription,
	createSubscription,
	getHospitalSubscription,
	listBilling,
	listPayments,
	type Payment,
	type Subscription,
} from "#/lib/api/billing.ts";
import { toastApiError } from "#/lib/api-error-message.ts";
import { useSession } from "#/lib/auth/use-session.ts";
import { env } from "#/lib/env.ts";
import { customerKeyForUser, startCardBillingAuth } from "#/lib/toss.ts";

/**
 * 구독 관리 — 특정 병원의 구독 상태/결제수단/결제내역 조회 + 해지·카드변경·재구독 (문서 §8.6~8.8, §9.5/§9.6).
 * 대시보드의 공개 병원 카드 또는 내 계정에서 진입한다.
 */
export const Route = createFileRoute("/subscription/$hospitalNo")({
	component: SubscriptionManageRoute,
});

const SUB_STATUS: Record<
	string,
	{ label: string; variant: "success" | "warning" | "destructive" | "soft" }
> = {
	active: { label: "이용 중", variant: "success" },
	past_due: { label: "결제 연체", variant: "warning" },
	canceled: { label: "해지됨", variant: "soft" },
	expired: { label: "만료됨", variant: "destructive" },
};

const PAY_STATUS: Record<
	string,
	{ label: string; variant: "success" | "warning" | "destructive" | "soft" }
> = {
	paid: { label: "결제완료", variant: "success" },
	pending: { label: "대기", variant: "warning" },
	failed: { label: "실패", variant: "destructive" },
	canceled: { label: "취소", variant: "soft" },
	refunded: { label: "환불", variant: "soft" },
	partial_refunded: { label: "부분환불", variant: "soft" },
};

function money(amount: number | null | undefined): string {
	if (typeof amount !== "number" || Number.isNaN(amount)) return "-";
	return `${amount.toLocaleString("ko-KR")}원`;
}

function formatDate(value: string | null | undefined): string {
	if (!value) return "-";
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return "-";
	return new Intl.DateTimeFormat("ko-KR", {
		year: "numeric",
		month: "long",
		day: "numeric",
	}).format(d);
}

/** 마스킹된 카드번호를 4자리마다 "-"로 묶어 보여준다(기존 구분자는 제거 후 재정렬). */
function formatCardNumber(value: string | null | undefined): string {
	const compact = value?.trim().replace(/[\s-]/g, "");
	if (!compact) return "****-****-****-****";
	return compact.match(/.{1,4}/g)?.join("-") ?? compact;
}

function SubscriptionManagePage({ hospitalNo }: { hospitalNo: number }) {
	const qc = useQueryClient();
	const { user, account } = useSession();
	const [cancelOpen, setCancelOpen] = useState(false);
	const [cardStarting, setCardStarting] = useState(false);

	// 백엔드는 id를 문자열로 보낼 수 있어(예: "12") 라우트 파라미터(number)와
	// strict 비교하면 매칭이 실패한다. 양쪽을 number로 맞춰 비교한다.
	const hospital =
		account?.hospitals?.find((h) => Number(h.no) === hospitalNo) ?? null;
	const hospitalName = hospital?.name?.trim() || "내 병원";

	const subQuery = useQuery({
		queryKey: ["subscription", "hospital", hospitalNo],
		queryFn: () => getHospitalSubscription(hospitalNo),
	});
	const billingQuery = useQuery({
		queryKey: ["billing", "list"],
		queryFn: () => listBilling(),
	});
	const paymentsQuery = useQuery({
		queryKey: ["payment", "list"],
		queryFn: () => listPayments({ limit: 50 }),
	});

	const subscription = subQuery.data?.subscription ?? null;
	const subNo = subscription?.no ?? null;
	const status = subscription?.status ?? null;
	// active 빌링키(현재 등록된 카드).
	const activeCard: BillingKey | null =
		billingQuery.data?.items?.find((b) => b.status === "active") ??
		billingQuery.data?.items?.[0] ??
		null;
	// 이 구독의 결제만 추려서 보여준다(여러 병원 보유 시 혼선 방지).
	const payments: Payment[] = (paymentsQuery.data?.items ?? []).filter((p) =>
		subNo == null ? true : p.subscription_no === subNo,
	);

	const refetchAll = () => {
		qc.invalidateQueries({
			queryKey: ["subscription", "hospital", hospitalNo],
		});
		qc.invalidateQueries({ queryKey: ["payment", "list"] });
		qc.invalidateQueries({ queryKey: ["account", "me"] });
	};

	// ── 구독 해지 ──────────────────────────────────────────────────
	const cancelMutation = useMutation({
		mutationFn: (reason: string) =>
			cancelSubscription(subNo as number, reason || undefined),
		onSuccess: () => {
			setCancelOpen(false);
			toast.success(
				"구독을 해지했어요. 현재 결제 기간이 끝날 때까지는 계속 이용할 수 있어요.",
			);
			refetchAll();
		},
		onError: (err) => toastApiError(err),
	});

	// ── 재구독(해지/만료) — 저장된 빌링키로 즉시 재구독, 없으면 카드 등록(toss)으로 폴백 ──
	const resubscribeMutation = useMutation({
		mutationFn: () => createSubscription(hospitalNo),
		onSuccess: () => {
			toast.success("재구독이 완료됐어요.");
			refetchAll();
		},
		onError: (err) => {
			const code = err instanceof ApiError ? err.errorCode : null;
			if (code === "ERROR_400_BILLING_KEY_REQUIRED") {
				// 빌링키가 없으면 카드 등록 위젯 → /billing/callback?mode=resubscribe 에서 발급+재구독.
				void startCardFlow("resubscribe");
				return;
			}
			if (code === "ERROR_409_SUBSCRIPTION_ALREADY_ACTIVE") {
				toast.success("이미 이용 중인 구독이에요.");
				refetchAll();
				return;
			}
			toastApiError(err);
		},
	});

	/**
	 * 결제수단(카드) 등록 위젯 시작 — 빌링키 발급용 authKey를 toss에서 받는다.
	 * clientKey는 env 폴백(VITE_TOSS_CLIENT_KEY), customerKey는 `kclinic-u<no>` 규약(문서 §9.2).
	 * 성공 시 successUrl(/billing/callback?mode=…)로 리다이렉트되어 발급/재구독을 마무리한다.
	 */
	async function startCardFlow(mode: "card" | "resubscribe") {
		const clientKey = env.VITE_TOSS_CLIENT_KEY;
		if (!clientKey) {
			toast.error(
				"결제 설정이 없어 카드 등록을 시작할 수 없습니다. 잠시 후 다시 시도해 주세요.",
			);
			return;
		}
		if (!user) return;
		setCardStarting(true);
		try {
			const customerKey = customerKeyForUser(user.no);
			const origin = window.location.origin;
			// toss는 successUrl의 예약 파라미터를 떼므로 customerKey는 예약 안 된 이름(ck)으로 넘긴다.
			const successUrl = `${origin}/billing/callback?mode=${mode}&hospital_no=${hospitalNo}&ck=${encodeURIComponent(
				customerKey,
			)}`;
			const failUrl = `${origin}/billing/callback?fail=1&mode=${mode}&hospital_no=${hospitalNo}`;
			await startCardBillingAuth({
				clientKey,
				customerKey,
				successUrl,
				failUrl,
			});
			// 성공 시 리다이렉트되므로 아래는 보통 실행 안 됨.
		} catch (err) {
			toast.error(
				err instanceof Error && err.message
					? err.message
					: "결제 모듈을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
			);
			setCardStarting(false);
		}
	}

	const loading =
		subQuery.isPending || billingQuery.isPending || paymentsQuery.isPending;

	return (
		<AppShell userName={user?.name ?? undefined} maxWidth="820px">
			<div className="flex flex-col gap-6">
				<header className="flex flex-col gap-3">
					<Link
						to="/onboarding"
						className="flex w-fit items-center gap-1.5 text-sm font-medium text-body-soft transition-colors hover:text-brand"
					>
						<ArrowLeft className="size-4" />
						대시보드
					</Link>
					<div className="flex flex-col gap-1">
						<h1 className="text-2xl font-bold text-ink sm:text-[28px]">
							구독 관리
						</h1>
						<p className="text-base text-body-soft sm:text-[17px]">
							{hospitalName} · 병원 홈페이지 구독과 결제수단을 관리합니다.
						</p>
					</div>
				</header>

				{loading ? (
					<SectionCard className="flex items-center justify-center py-20">
						<Loader2 className="size-6 animate-spin text-brand" />
					</SectionCard>
				) : subQuery.isError ? (
					<SectionCard className="flex flex-col items-center gap-4 py-16 text-center">
						<AlertTriangle className="size-7 text-danger" />
						<p className="text-[15px] text-ink">
							구독 정보를 불러오지 못했습니다.
						</p>
						<Button
							variant="neutral-outline"
							size="sm"
							onClick={() => {
								toastApiError(subQuery.error);
								subQuery.refetch();
							}}
						>
							<RotateCcw className="size-4" />
							다시 시도
						</Button>
					</SectionCard>
				) : !subscription ? (
					<SectionCard className="flex flex-col items-center gap-3 py-16 text-center">
						<p className="text-[15px] text-ink">
							이 병원에는 아직 구독이 없습니다.
						</p>
						<p className="text-sm text-body-soft">
							병원 홈페이지를 공개하려면 대시보드에서 결제를 진행해 주세요.
						</p>
						<Button
							nativeButton={false}
							render={<Link to="/onboarding" />}
							variant="brand"
							size="xl"
						>
							대시보드로 가기
						</Button>
					</SectionCard>
				) : (
					<>
						<StatusSection
							subscription={subscription}
							onChangeCard={() => startCardFlow("card")}
							cardStarting={cardStarting}
						/>

						<CardSection
							card={activeCard}
							status={status}
							onChangeCard={() => startCardFlow("card")}
							cardStarting={cardStarting}
						/>

						<PaymentsSection payments={payments} />

						<ActionsSection
							status={status}
							canceledAt={subscription.canceled_at ?? null}
							periodEnd={subscription.current_period_end ?? null}
							onCancel={() => setCancelOpen(true)}
							onResubscribe={() => resubscribeMutation.mutate()}
							resubscribing={resubscribeMutation.isPending || cardStarting}
						/>
					</>
				)}
			</div>

			<CancelDialog
				open={cancelOpen}
				onOpenChange={setCancelOpen}
				pending={cancelMutation.isPending}
				hospitalName={hospitalName}
				periodEnd={subscription?.current_period_end ?? null}
				onConfirm={(reason) => cancelMutation.mutate(reason)}
			/>
		</AppShell>
	);
}

// ─────────────────────────────────────────────────────────────────────
// 섹션들
// ─────────────────────────────────────────────────────────────────────

/** 결제 내역 표 컬럼 — 모바일에선 결제수단·상태 컬럼을 숨기고 날짜/금액 셀에 보조 노출. */
const paymentColumns: Array<DataTableColumn<Payment>> = [
	{
		key: "date",
		header: "날짜",
		cellClassName: "text-body",
		render: (p) => (
			<div className="flex flex-col gap-0.5">
				<span>{formatDate(p.paid_at ?? p.created_at)}</span>
				<span className="text-[13px] text-body-soft sm:hidden">
					{p.method?.trim() || "-"}
				</span>
			</div>
		),
	},
	{
		key: "amount",
		header: "금액",
		cellClassName: "text-[17px]",
		render: (p) => {
			const meta = p.status ? PAY_STATUS[p.status] : undefined;
			return (
				<div className="flex flex-col items-start gap-1.5">
					<span>{money(p.amount)}</span>
					<Badge
						variant={meta?.variant ?? "outline"}
						className="rounded-full sm:hidden"
					>
						{meta?.label ?? p.status ?? "-"}
					</Badge>
				</div>
			);
		},
	},
	{
		key: "method",
		header: "결제수단",
		hideOnMobile: true,
		cellClassName: "text-body-soft",
		render: (p) => p.method?.trim() || "-",
	},
	{
		key: "status",
		header: "상태",
		hideOnMobile: true,
		render: (p) => {
			const meta = p.status ? PAY_STATUS[p.status] : undefined;
			return (
				<Badge variant={meta?.variant ?? "outline"} className="rounded-full">
					{meta?.label ?? p.status ?? "-"}
				</Badge>
			);
		},
	},
];

function StatusSection({
	subscription,
	onChangeCard,
	cardStarting,
}: {
	subscription: Subscription;
	onChangeCard: () => void;
	cardStarting: boolean;
}) {
	const status = subscription.status ?? "";
	const meta = SUB_STATUS[status];
	const isPastDue = status === "past_due";

	const statusBadge = meta ? (
		<Badge size="lg" variant={meta.variant} className="rounded-full">
			{meta.label}
		</Badge>
	) : (
		<Badge size="lg" variant="outline" className="rounded-full">
			{status || "상태 미상"}
		</Badge>
	);

	const rows: Array<{ label: string; value: ReactNode }> = [
		{ label: "상태", value: statusBadge },
		{ label: "금액", value: `${money(subscription.amount)} / 월` },
		{
			label: "이용 기간",
			value: `${formatDate(subscription.current_period_start)} ~ ${formatDate(
				subscription.current_period_end,
			)}`,
		},
	];
	if (status === "canceled") {
		rows.push({
			label: "이용 종료 예정",
			value: formatDate(subscription.current_period_end),
		});
	} else {
		rows.push({
			label: "다음 결제 예정",
			value: formatDate(subscription.next_billing_at),
		});
	}

	return (
		<CardShell title="구독 상태">
			{isPastDue ? (
				<div className="border-b border-line-soft p-5 sm:p-8">
					<InfoCallout tone="warning">
						<div className="flex flex-col gap-3">
							<p className="text-sm">
								정기 결제에 실패해 구독이 연체 상태입니다. 결제수단을 변경하면
								다음 재시도에 정상 결제됩니다.
								{subscription.last_payment_error
									? ` (사유: ${subscription.last_payment_error})`
									: ""}
							</p>
							<div>
								<Button
									variant="brand"
									size="xl"
									disabled={cardStarting}
									onClick={onChangeCard}
								>
									{cardStarting ? (
										<Loader2 className="size-4 animate-spin" />
									) : (
										<CreditCard className="size-4" />
									)}
									결제 카드 갱신하기
								</Button>
							</div>
						</div>
					</InfoCallout>
				</div>
			) : null}

			<InfoRows rows={rows} />
		</CardShell>
	);
}

function CardSection({
	card,
	status,
	onChangeCard,
	cardStarting,
}: {
	card: BillingKey | null;
	status: string | null;
	onChangeCard: () => void;
	cardStarting: boolean;
}) {
	// 해지/만료 상태에서는 카드 변경 대신 재구독으로 안내(아래 ActionsSection).
	const canChange = status === "active" || status === "past_due";

	const cardRows: Array<{ label: string; value: ReactNode }> = [];
	if (card) {
		cardRows.push({
			label: "카드사",
			value: card.card_company_name?.trim() || "등록된 카드",
		});
		if (card.card_type?.trim()) {
			cardRows.push({ label: "카드 종류", value: card.card_type });
		}
		cardRows.push({
			label: "카드 번호",
			value: formatCardNumber(card.card_number_masked),
		});
	}

	const changeButton = canChange ? (
		<Button
			variant="neutral-outline"
			size="xl"
			className="w-full"
			disabled={cardStarting}
			onClick={onChangeCard}
		>
			{cardStarting ? (
				<Loader2 className="size-4 animate-spin" />
			) : (
				<CreditCard className="size-4" />
			)}
			결제 카드 변경
		</Button>
	) : null;

	return (
		<CardShell title="결제 수단">
			{card ? (
				<>
					<InfoRows rows={cardRows} />
					{changeButton ? (
						<div className="p-5 pt-0 sm:p-8 sm:pt-6">{changeButton}</div>
					) : null}
				</>
			) : (
				<div className="flex flex-col gap-5 p-5 sm:p-8">
					<p className="text-sm text-body-soft">등록된 결제 카드가 없습니다.</p>
					{changeButton}
				</div>
			)}
		</CardShell>
	);
}

function PaymentsSection({ payments }: { payments: Payment[] }) {
	return (
		<CardShell title="결제 내역">
			<div className="p-5 sm:p-8">
				<DataTable
					columns={paymentColumns}
					data={payments}
					getRowKey={(p, idx) => p.no ?? p.order_id ?? `pay-${idx}`}
					emptyText="결제 내역이 없습니다."
				/>
			</div>
		</CardShell>
	);
}

function ActionsSection({
	status,
	canceledAt,
	periodEnd,
	onCancel,
	onResubscribe,
	resubscribing,
}: {
	status: string | null;
	canceledAt: string | null;
	periodEnd: string | null;
	onCancel: () => void;
	onResubscribe: () => void;
	resubscribing: boolean;
}) {
	const cancelable = status === "active" || status === "past_due";
	const resubscribable = status === "canceled" || status === "expired";

	if (!cancelable && !resubscribable) return null;

	return (
		<CardShell title="구독 관리">
			<div className="flex flex-col gap-4 p-5 sm:p-8">
				{resubscribable ? (
					<div className="flex flex-col gap-3">
						<InfoCallout tone="info">
							<p className="text-sm">
								{status === "canceled"
									? canceledAt
										? `${formatDate(periodEnd)}까지 이용할 수 있어요. 계속 이용하려면 재구독하세요.`
										: "해지된 구독이에요. 계속 이용하려면 재구독하세요."
									: "구독이 만료됐어요. 다시 구독하면 병원 홈페이지를 이어서 운영할 수 있어요."}
							</p>
						</InfoCallout>
						<div>
							<Button
								variant="brand"
								size="xl"
								disabled={resubscribing}
								onClick={onResubscribe}
							>
								{resubscribing ? (
									<Loader2 className="size-4 animate-spin" />
								) : (
									<RotateCcw className="size-4" />
								)}
								재구독하기
							</Button>
						</div>
					</div>
				) : null}

				{cancelable ? (
					<div className="flex flex-col gap-5 sm:gap-8">
						<p className="text-sm text-body-soft sm:text-base">
							구독을 해지하면 현재 결제 기간이 끝난 뒤 자동 결제가 중단되고 병원
							홈페이지가 비공개로 전환될 수 있어요.
						</p>
						<Button
							variant="destructive"
							size="xl"
							className="w-full border-[#fee2e2] bg-white text-[#f87171] hover:bg-[#fef2f2]"
							onClick={onCancel}
						>
							구독 해지
						</Button>
					</div>
				) : null}
			</div>
		</CardShell>
	);
}

// ─────────────────────────────────────────────────────────────────────
// 해지 다이얼로그
// ─────────────────────────────────────────────────────────────────────

function CancelDialog({
	open,
	onOpenChange,
	pending,
	hospitalName,
	periodEnd,
	onConfirm,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	pending: boolean;
	hospitalName: string;
	periodEnd: string | null;
	onConfirm: (reason: string) => void;
}) {
	const [reason, setReason] = useState("");
	const reasonId = useId();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>구독을 해지할까요?</DialogTitle>
					<DialogDescription>
						{hospitalName}의 정기 결제가 중단됩니다.
						{periodEnd
							? ` ${formatDate(periodEnd)}까지는 계속 이용할 수 있어요.`
							: " 현재 결제 기간 종료까지는 계속 이용할 수 있어요."}
					</DialogDescription>
				</DialogHeader>

				<DialogBody>
					<div className="flex flex-col gap-2">
						<label
							htmlFor={reasonId}
							className="text-[15px] font-medium text-ink"
						>
							해지 사유 <span className="text-body-soft">(선택)</span>
						</label>
						<Textarea
							id={reasonId}
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							placeholder="해지 사유를 남겨주시면 서비스 개선에 참고하겠습니다."
							rows={3}
						/>
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
						돌아가기
					</Button>
					<Button
						type="button"
						variant="destructive"
						size="2xl"
						disabled={pending}
						onClick={() => onConfirm(reason.trim())}
					>
						{pending ? <Loader2 className="size-5 animate-spin" /> : null}
						해지하기
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function SubscriptionManageRoute() {
	const { hospitalNo } = Route.useParams();
	const parsed = Number(hospitalNo);

	if (!Number.isFinite(parsed)) {
		return (
			<AuthGuard>
				<AppShell maxWidth="560px">
					<SectionCard className="flex flex-col items-center gap-4 py-16 text-center">
						<AlertTriangle className="size-7 text-danger" />
						<p className="text-[15px] text-ink">잘못된 병원 번호입니다.</p>
						<Button
							nativeButton={false}
							render={<Link to="/onboarding" />}
							variant="brand"
							size="xl"
						>
							대시보드로 가기
						</Button>
					</SectionCard>
				</AppShell>
			</AuthGuard>
		);
	}

	return (
		<AuthGuard>
			<SubscriptionManagePage hospitalNo={parsed} />
		</AuthGuard>
	);
}
