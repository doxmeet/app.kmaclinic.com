import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	AlertCircle,
	ChevronLeft,
	ChevronRight,
	Home,
	Inbox,
	Loader2,
	RotateCcw,
	Search,
} from "lucide-react";
import { useState } from "react";
import { AuthGuard } from "#/components/auth/auth-guard.tsx";
import { AdminShell } from "#/components/layout/admin-shell.tsx";
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table.tsx";
import {
	type AdminPayment,
	adminApi,
	type Paginated,
	type PaymentFilters,
} from "#/lib/api/admin.ts";
import { toastApiError } from "#/lib/api-error-message.ts";

export const Route = createFileRoute("/admin/payments")({
	component: PaymentsRoute,
});

const PAGE_SIZE = 10;

/** 결제 상태 필터(문서 §6.6 payment.status). "전체"는 status 미전송. */
const STATUS_FILTERS = [
	{ value: "", label: "전체" },
	{ value: "paid", label: "결제완료" },
	{ value: "pending", label: "대기" },
	{ value: "failed", label: "실패" },
	{ value: "canceled", label: "취소" },
	{ value: "refunded", label: "환불" },
	{ value: "partial_refunded", label: "부분환불" },
] as const;

const STATUS_BADGE: Record<
	string,
	{ label: string; variant: "success" | "warning" | "destructive" | "soft" }
> = {
	paid: { label: "결제완료", variant: "success" },
	pending: { label: "대기", variant: "warning" },
	failed: { label: "실패", variant: "destructive" },
	canceled: { label: "취소", variant: "soft" },
	refunded: { label: "환불", variant: "soft" },
	partial_refunded: { label: "부분환불", variant: "warning" },
};

function str(v: unknown): string {
	if (v === null || v === undefined || v === "") return "-";
	return String(v);
}

function getField(row: AdminPayment, keys: string[]): unknown {
	for (const key of keys) {
		const value = row[key];
		if (value !== undefined && value !== null && value !== "") return value;
	}
	return undefined;
}

/** 금액(원) → ₩ 표기. */
function formatAmount(value: unknown): string {
	if (value === undefined || value === null || value === "") return "-";
	const n = Number(value);
	if (Number.isNaN(n)) return str(value);
	return `₩ ${n.toLocaleString("ko-KR")}`;
}

/** ISO 문자열 → ko-KR 일시. 값 없으면 "-". */
function formatDateTime(value: unknown): string {
	if (value === undefined || value === null || value === "") return "-";
	const d = new Date(String(value));
	if (Number.isNaN(d.getTime())) return str(value);
	return d.toLocaleString("ko-KR");
}

function StatusBadge({ status }: { status: string }) {
	const meta = STATUS_BADGE[status];
	if (!meta) {
		return (
			<Badge size="lg" variant="secondary" className="rounded-full">
				{status === "-" ? "상태 미상" : status}
			</Badge>
		);
	}
	return (
		<Badge size="lg" variant={meta.variant} className="rounded-full">
			{meta.label}
		</Badge>
	);
}

function StateRow({ children }: { children: React.ReactNode }) {
	return (
		<TableRow className="hover:bg-transparent">
			<TableCell colSpan={7} className="py-16">
				<div className="flex flex-col items-center justify-center gap-3 text-center">
					{children}
				</div>
			</TableCell>
		</TableRow>
	);
}

function PaymentsPage() {
	// 입력 중 상태(검색 버튼 클릭 시에만 쿼리 파라미터로 반영).
	const [statusInput, setStatusInput] =
		useState<(typeof STATUS_FILTERS)[number]["value"]>("");
	const [methodInput, setMethodInput] = useState("");
	const [subscriptionInput, setSubscriptionInput] = useState("");
	const [dateFromInput, setDateFromInput] = useState("");
	const [dateToInput, setDateToInput] = useState("");

	// 실제 쿼리에 적용된 상태.
	const [status, setStatus] =
		useState<(typeof STATUS_FILTERS)[number]["value"]>("");
	const [method, setMethod] = useState("");
	const [subscriptionNo, setSubscriptionNo] = useState("");
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");
	const [page, setPage] = useState(1);

	// 서버 필터(문서 §10.3). 빈 값은 adminApi.qs가 제거.
	const filters: PaymentFilters = {
		status: status || undefined,
		method: method || undefined,
		subscription_no: subscriptionNo ? Number(subscriptionNo) : undefined,
		date_from: dateFrom || undefined,
		date_to: dateTo || undefined,
		page,
	};

	const query = useQuery<Paginated<AdminPayment>>({
		queryKey: [
			"admin",
			"payments",
			{ status, method, subscriptionNo, dateFrom, dateTo, page },
		],
		queryFn: () => adminApi.listPayments(filters),
	});

	const items = query.data?.items ?? [];
	const pagination = query.data?.pagination;
	const total = pagination?.total ?? items.length;
	const limit = pagination?.limit ?? PAGE_SIZE;
	const totalPages = Math.max(1, Math.ceil(total / limit));

	const runSearch = () => {
		setStatus(statusInput);
		setMethod(methodInput.trim());
		setSubscriptionNo(subscriptionInput.trim());
		setDateFrom(dateFromInput);
		setDateTo(dateToInput);
		setPage(1);
	};

	const resetFilters = () => {
		setStatusInput("");
		setMethodInput("");
		setSubscriptionInput("");
		setDateFromInput("");
		setDateToInput("");
		setStatus("");
		setMethod("");
		setSubscriptionNo("");
		setDateFrom("");
		setDateTo("");
		setPage(1);
	};

	const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
	const rangeEnd = Math.min(page * limit, total);

	return (
		<AdminShell active="payments">
			<div className="flex flex-col gap-8">
				<header className="flex flex-col gap-3">
					<nav
						aria-label="현재 위치"
						className="flex items-center gap-1 text-[15px] text-ink"
					>
						<Home className="size-4" />
						<span>홈</span>
						<ChevronRight className="size-3.5 text-muted-fg" />
						<span>결제 관리</span>
					</nav>
					<h1 className="text-2xl font-bold text-ink sm:text-[28px]">
						결제 관리
					</h1>
					<p className="text-base text-body-soft sm:text-[17px]">
						병원 구독 정기결제의 개별 결제 내역을 상태·수단·기간으로 조회합니다.
					</p>
				</header>

				<section className="flex flex-col gap-6 rounded-xl bg-[#eef2f7] p-6 sm:p-8">
					<h2 className="border-b border-line-strong/60 pb-4 text-[17px] text-ink">
						세부 검색조건
					</h2>

					<div className="flex flex-wrap items-center gap-x-5 gap-y-3">
						<span className="text-[15px] text-ink">결제 상태</span>
						<div className="flex flex-wrap items-center gap-2">
							{STATUS_FILTERS.map((filter) => (
								<Button
									key={filter.value || "all"}
									type="button"
									variant={
										statusInput === filter.value ? "brand" : "neutral-outline"
									}
									className="h-12 rounded-md px-5 text-[15px] font-medium"
									onClick={() => setStatusInput(filter.value)}
								>
									{filter.label}
								</Button>
							))}
						</div>
					</div>

					<div className="flex flex-wrap items-end gap-x-5 gap-y-3">
						<div className="flex flex-col gap-2">
							<span className="text-[15px] text-ink">결제수단</span>
							<Input
								value={methodInput}
								onChange={(e) => setMethodInput(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") runSearch();
								}}
								placeholder="카드 / 간편결제 …"
								className="h-12 w-44 rounded-md border-body-soft bg-surface text-[15px]"
							/>
						</div>
						<div className="flex flex-col gap-2">
							<span className="text-[15px] text-ink">구독번호</span>
							<Input
								value={subscriptionInput}
								inputMode="numeric"
								onChange={(e) =>
									setSubscriptionInput(e.target.value.replace(/[^0-9]/g, ""))
								}
								onKeyDown={(e) => {
									if (e.key === "Enter") runSearch();
								}}
								placeholder="예: 3"
								className="h-12 w-32 rounded-md border-body-soft bg-surface text-[15px]"
							/>
						</div>
						<div className="flex flex-col gap-2">
							<span className="text-[15px] text-ink">결제일</span>
							<div className="flex items-center gap-2">
								<Input
									type="date"
									value={dateFromInput}
									max={dateToInput || undefined}
									onChange={(e) => setDateFromInput(e.target.value)}
									className="h-12 w-44 rounded-md border-body-soft bg-surface text-[15px]"
								/>
								<span className="text-muted-fg">~</span>
								<Input
									type="date"
									value={dateToInput}
									min={dateFromInput || undefined}
									onChange={(e) => setDateToInput(e.target.value)}
									className="h-12 w-44 rounded-md border-body-soft bg-surface text-[15px]"
								/>
							</div>
						</div>
						<Button
							variant="brand"
							className="h-12 rounded-md px-6 text-[15px] font-medium"
							onClick={runSearch}
						>
							<Search className="size-4" />
							검색하기
						</Button>
						<Button
							variant="neutral-outline"
							className="h-12 rounded-md px-5 text-[15px] font-medium"
							onClick={resetFilters}
						>
							<RotateCcw className="size-4" />
							초기화
						</Button>
					</div>
				</section>

				<section className="flex flex-col gap-4">
					<p className="text-[15px] text-body">
						전체 <span className="font-bold text-ink">{total}</span>건
					</p>

					<div className="overflow-hidden rounded-xl border border-line-soft bg-surface shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
						<Table className="min-w-[900px]">
							<TableHeader>
								<TableRow className="border-t-2 border-t-ink bg-[#eef2f7] hover:bg-[#eef2f7]">
									<TableHead className="text-[17px] font-medium text-ink">
										주문번호
									</TableHead>
									<TableHead className="text-[17px] font-medium text-ink">
										구독
									</TableHead>
									<TableHead className="text-[17px] font-medium text-ink">
										금액
									</TableHead>
									<TableHead className="text-[17px] font-medium text-ink">
										결제수단
									</TableHead>
									<TableHead className="text-[17px] font-medium text-ink">
										상태
									</TableHead>
									<TableHead className="text-[17px] font-medium text-ink">
										결제일시
									</TableHead>
									<TableHead className="text-[17px] font-medium text-ink">
										실패사유
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{query.isPending ? (
									<StateRow>
										<Loader2 className="size-6 animate-spin text-brand" />
										<p className="text-[15px] text-body-soft">
											결제 내역을 불러오는 중입니다…
										</p>
									</StateRow>
								) : query.isError ? (
									<StateRow>
										<AlertCircle className="size-7 text-danger" />
										<p className="text-[15px] text-ink">
											결제 내역을 불러오지 못했습니다.
										</p>
										<Button
											variant="neutral-outline"
											size="sm"
											onClick={() => {
												toastApiError(query.error);
												query.refetch();
											}}
										>
											<RotateCcw className="size-4" />
											다시 시도
										</Button>
									</StateRow>
								) : items.length === 0 ? (
									<StateRow>
										<Inbox className="size-7 text-muted-fg" />
										<p className="text-[15px] text-body-soft">
											조건에 맞는 결제 내역이 없습니다.
										</p>
									</StateRow>
								) : (
									items.map((row, idx) => {
										const orderId = str(getField(row, ["order_id", "no"]));
										const subscription = str(
											getField(row, ["subscription_no"]),
										);
										const amount = formatAmount(getField(row, ["amount"]));
										const methodValue = str(getField(row, ["method"]));
										const statusValue = str(getField(row, ["status"]));
										const paidAt = formatDateTime(
											getField(row, ["paid_at", "created_at"]),
										);
										const failure = str(
											getField(row, ["failure_reason", "failure_code"]),
										);
										const rowKey =
											getField(row, ["no", "order_id"]) ?? `row-${idx}`;
										return (
											<TableRow
												key={String(rowKey)}
												className="border-b-line-strong/50"
											>
												<TableCell className="font-mono text-[13px] text-body">
													{orderId}
												</TableCell>
												<TableCell className="text-body-soft">
													{subscription}
												</TableCell>
												<TableCell className="text-[15px] text-ink">
													{amount}
												</TableCell>
												<TableCell className="text-body">
													{methodValue}
												</TableCell>
												<TableCell>
													<StatusBadge status={statusValue} />
												</TableCell>
												<TableCell className="text-body">{paidAt}</TableCell>
												<TableCell className="max-w-[220px] truncate text-body">
													{failure}
												</TableCell>
											</TableRow>
										);
									})
								)}
							</TableBody>
						</Table>
						<div className="flex flex-col items-start gap-3 border-t border-line-soft px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
							<p className="text-[15px] text-body-soft">
								{rangeStart} - {rangeEnd} / {total}건
							</p>
							<nav aria-label="페이지" className="flex items-center gap-1">
								<Button
									variant="neutral-outline"
									size="icon-lg"
									aria-label="이전 페이지"
									disabled={page <= 1}
									onClick={() => setPage((p) => Math.max(1, p - 1))}
								>
									<ChevronLeft className="size-4" />
								</Button>
								<span className="px-3 text-[15px] text-body-soft">
									{page} / {totalPages}
								</span>
								<Button
									variant="neutral-outline"
									size="icon-lg"
									aria-label="다음 페이지"
									disabled={page >= totalPages}
									onClick={() => setPage((p) => p + 1)}
								>
									<ChevronRight className="size-4" />
								</Button>
							</nav>
						</div>
					</div>
				</section>
			</div>
		</AdminShell>
	);
}

function PaymentsRoute() {
	return (
		<AuthGuard admin>
			<PaymentsPage />
		</AuthGuard>
	);
}
