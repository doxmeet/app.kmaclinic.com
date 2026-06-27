import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import {
	AlertCircle,
	ArrowLeft,
	ChevronRight,
	Home,
	Loader2,
	Lock,
	RotateCcw,
} from "lucide-react";
import type * as React from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AuthGuard } from "#/components/auth/auth-guard.tsx";
import { SectionCard } from "#/components/common/section-card.tsx";
import { SectionTitleRow } from "#/components/common/section-title-row.tsx";
import { AdminShell } from "#/components/layout/admin-shell.tsx";
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import {
	type AdminPayment,
	type AdminSubscription,
	type AdminSubscriptionDetail,
	adminApi,
} from "#/lib/api/admin.ts";
import {
	ADMIN_ERROR_OVERRIDES,
	toastApiError,
} from "#/lib/api-error-message.ts";
import { cn } from "#/lib/utils.ts";

const STATUS_LABEL: Record<string, string> = {
	active: "이용중",
	past_due: "결제지연",
	canceled: "해지",
	expired: "만료",
};

const BILLING_CYCLE_LABEL: Record<string, string> = {
	monthly: "월간",
	annual: "연간",
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
	paid: "완료",
	pending: "대기",
	failed: "실패",
	canceled: "취소",
	refunded: "환불",
};

function str(v: unknown): string {
	if (v === null || v === undefined || v === "") return "-";
	return String(v);
}

function getField(row: AdminSubscription | undefined, keys: string[]): unknown {
	if (!row) return undefined;
	for (const key of keys) {
		const value = row[key];
		if (value !== undefined && value !== null && value !== "") return value;
	}
	return undefined;
}

function formatAmount(value: unknown): string {
	if (value === undefined || value === null || value === "") return "-";
	const n = Number(value);
	if (Number.isNaN(n)) return str(value);
	return `₩ ${n.toLocaleString("ko-KR")}`;
}

/** ISO 문자열 → ko-KR 날짜. 값 없으면 "-". */
function formatDate(value: unknown): string {
	if (value === undefined || value === null || value === "") return "-";
	const d = new Date(String(value));
	if (Number.isNaN(d.getTime())) return str(value);
	return d.toLocaleDateString("ko-KR");
}

/** 읽기 전용 정보 필드 (라벨 + 입력형 박스) — 상세 페이지 전용 소품 */
function ReadField({
	label,
	value,
	className,
	valueClassName,
}: {
	label: string;
	value: React.ReactNode;
	className?: string;
	valueClassName?: string;
}) {
	return (
		<div className={cn("flex min-w-0 flex-col gap-2", className)}>
			<span className="text-sm text-body">{label}</span>
			<div
				className={cn(
					"flex min-h-14 items-center rounded-lg border border-line-soft bg-app-bg px-4 text-base text-ink sm:px-5 sm:text-[17px]",
					valueClassName,
				)}
			>
				{value}
			</div>
		</div>
	);
}

function Breadcrumb({ id }: { id: string }) {
	return (
		<nav
			aria-label="현재 위치"
			className="flex items-center gap-1 text-[15px] text-ink"
		>
			<Home className="size-4" />
			<span>홈</span>
			<ChevronRight className="size-3.5 text-muted-fg" />
			<Link to="/admin/institutions" className="underline">
				요양기관 현황
			</Link>
			<ChevronRight className="size-3.5 text-muted-fg" />
			<span className="text-brand">요양기관 상세 정보</span>
			<span className="sr-only">(구독 번호 {id})</span>
		</nav>
	);
}

/** 결제 이력 테이블(문서 §10.2 payments[]). */
function PaymentsTable({ payments }: { payments: AdminPayment[] }) {
	return (
		<div className="overflow-x-auto">
			<Table className="min-w-[760px]">
				<TableHeader>
					<TableRow className="border-t-2 border-t-ink bg-[#eef2f7] hover:bg-[#eef2f7]">
						<TableHead className="text-[15px] font-medium text-ink">
							주문번호
						</TableHead>
						<TableHead className="text-[15px] font-medium text-ink">
							금액
						</TableHead>
						<TableHead className="text-[15px] font-medium text-ink">
							결제수단
						</TableHead>
						<TableHead className="text-[15px] font-medium text-ink">
							상태
						</TableHead>
						<TableHead className="text-[15px] font-medium text-ink">
							결제일
						</TableHead>
						<TableHead className="text-[15px] font-medium text-ink">
							실패사유
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{payments.length === 0 ? (
						<TableRow className="hover:bg-transparent">
							<TableCell
								colSpan={6}
								className="py-10 text-center text-[15px] text-body-soft"
							>
								결제 이력이 없습니다.
							</TableCell>
						</TableRow>
					) : (
						payments.map((p, idx) => {
							const statusValue = str(p.status);
							const failure =
								str(p.failure_reason) !== "-"
									? str(p.failure_reason)
									: str(p.failure_code);
							return (
								<TableRow
									key={String(p.no ?? p.order_id ?? `pay-${idx}`)}
									className="border-b-line-strong/50"
								>
									<TableCell className="text-body">{str(p.order_id)}</TableCell>
									<TableCell className="text-[15px] text-ink">
										{formatAmount(p.amount)}
									</TableCell>
									<TableCell className="text-body">{str(p.method)}</TableCell>
									<TableCell>
										<Badge
											size="lg"
											variant={
												statusValue === "paid"
													? "success"
													: statusValue === "failed"
														? "destructive"
														: statusValue === "refunded" ||
																statusValue === "canceled"
															? "soft"
															: "warning"
											}
											className="rounded-full"
										>
											{PAYMENT_STATUS_LABEL[statusValue] ?? statusValue}
										</Badge>
									</TableCell>
									<TableCell className="text-body">
										{formatDate(p.paid_at)}
									</TableCell>
									<TableCell className="text-body">{failure}</TableCell>
								</TableRow>
							);
						})
					)}
				</TableBody>
			</Table>
		</div>
	);
}

function InstitutionDetailPage() {
	const { id } = useParams({ from: "/admin/institutions/$id" });
	const qc = useQueryClient();
	const no = Number(id);
	const validNo = Number.isFinite(no) && no > 0;

	const { data, isPending, isError, error, refetch } =
		useQuery<AdminSubscriptionDetail>({
			queryKey: ["admin", "subscription", no],
			queryFn: () => adminApi.getSubscription(no),
			enabled: validNo,
		});

	const subscription = data?.subscription;
	const payments = data?.payments ?? [];

	const [memo, setMemo] = useState("");
	// 데이터 로드 시 메모 초기값 동기화(편집 중 갱신 충돌 회피 위해 fetchStatus idle일 때만).
	useEffect(() => {
		if (subscription)
			setMemo(
				str(subscription.memo) === "-" ? "" : String(subscription.memo ?? ""),
			);
	}, [subscription]);

	const memoMutation = useMutation({
		mutationFn: (value: string) => adminApi.updateMemo(no, value),
		onSuccess: () => {
			toast.success("메모를 저장했습니다.");
			qc.invalidateQueries({ queryKey: ["admin", "subscription", no] });
			qc.invalidateQueries({ queryKey: ["admin", "subscriptions"] });
		},
		onError: (err) => toastApiError(err, ADMIN_ERROR_OVERRIDES),
	});

	const statusValue = subscription
		? str(getField(subscription, ["status"]))
		: "-";
	const statusLabel = STATUS_LABEL[statusValue] ?? statusValue;
	const cycleValue = subscription
		? str(getField(subscription, ["billing_cycle"]))
		: "-";
	const cycleLabel = BILLING_CYCLE_LABEL[cycleValue] ?? cycleValue;

	return (
		<AdminShell active="institutions">
			<div className="flex flex-col gap-6">
				<header className="flex flex-col gap-3">
					<Breadcrumb id={id} />
					<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
						<div className="flex flex-col gap-3">
							<h1 className="text-2xl font-bold text-ink sm:text-[28px]">
								요양기관 상세 정보
							</h1>
							<p className="text-[15px] text-body-soft sm:text-[17px]">
								선택된 요양기관(구독)의 상세 정보를 조회합니다. 모든 항목은 읽기
								전용입니다.
							</p>
						</div>
						<Button
							nativeButton={false}
							render={<Link to="/admin/institutions" />}
							variant="neutral-outline"
							size="xl"
						>
							<ArrowLeft className="size-4" />
							리스트로 돌아가기
						</Button>
					</div>
				</header>

				{!validNo ? (
					<SectionCard className="flex flex-col items-center gap-3 py-16 text-center">
						<AlertCircle className="size-7 text-danger" />
						<p className="text-[15px] text-ink">
							유효하지 않은 구독 번호입니다.
						</p>
						<Button
							nativeButton={false}
							render={<Link to="/admin/institutions" />}
							variant="neutral-outline"
							size="sm"
						>
							목록으로
						</Button>
					</SectionCard>
				) : isPending ? (
					<SectionCard className="flex flex-col items-center gap-3 py-20 text-center">
						<Loader2 className="size-7 animate-spin text-brand" />
						<p className="text-[15px] text-body-soft">
							구독 상세 정보를 불러오는 중입니다…
						</p>
					</SectionCard>
				) : isError ? (
					<SectionCard className="flex flex-col items-center gap-3 py-20 text-center">
						<AlertCircle className="size-7 text-danger" />
						<p className="text-[15px] text-ink">
							구독 상세 정보를 불러오지 못했습니다.
						</p>
						<Button
							variant="neutral-outline"
							size="sm"
							onClick={() => {
								toastApiError(error, ADMIN_ERROR_OVERRIDES);
								refetch();
							}}
						>
							<RotateCcw className="size-4" />
							다시 시도
						</Button>
					</SectionCard>
				) : (
					<>
						<SectionCard className="p-0">
							<SectionTitleRow className="border-b border-line-strong/40 bg-[#eef2f7] px-6 py-5 sm:px-8">
								<h2 className="text-[18px] font-bold text-ink">
									기본 기관 정보
								</h2>
								<Badge size="lg" variant="soft" className="rounded-full">
									<Lock className="size-3" />
									읽기 전용
								</Badge>
							</SectionTitleRow>
							<div className="grid gap-6 p-6 sm:grid-cols-3 sm:p-8">
								<ReadField
									label="요양기관명 (병원명)"
									value={str(getField(subscription, ["hospital_name"]))}
								/>
								<ReadField
									label="대표자"
									value={str(getField(subscription, ["owner_name"]))}
								/>
								<ReadField
									label="병원 번호"
									value={str(getField(subscription, ["hospital_no"]))}
								/>
								<ReadField
									label="구독 번호"
									value={str(getField(subscription, ["no"]))}
								/>
							</div>
						</SectionCard>

						<SectionCard className="p-0">
							<div className="border-b border-line-strong/40 bg-[#eef2f7] px-6 py-5 sm:px-8">
								<h2 className="text-[18px] font-bold text-ink">
									구독 / 결제 정보
								</h2>
							</div>
							<div className="grid gap-6 p-6 sm:grid-cols-3 sm:p-8">
								<ReadField
									label="구독 상태"
									value={
										<Badge
											size="lg"
											variant={
												statusValue === "active"
													? "success"
													: statusValue === "expired"
														? "destructive"
														: statusValue === "past_due"
															? "warning"
															: "soft"
											}
											className="rounded-full"
										>
											{statusLabel}
										</Badge>
									}
								/>
								<ReadField label="구독 유형" value={cycleLabel} />
								<ReadField
									label="결제 금액"
									value={formatAmount(getField(subscription, ["amount"]))}
								/>
								<ReadField
									label="가입일"
									value={formatDate(getField(subscription, ["created_at"]))}
								/>
								<ReadField
									label="갱신 예정일"
									value={formatDate(
										getField(subscription, [
											"current_period_end",
											"next_billing_at",
										]),
									)}
								/>
								<ReadField
									label="다음 결제일"
									value={formatDate(
										getField(subscription, ["next_billing_at"]),
									)}
								/>
								<ReadField
									label="최근 결제수단"
									value={str(getField(subscription, ["last_payment_method"]))}
								/>
								<ReadField
									label="최근 결제금액"
									value={formatAmount(
										getField(subscription, ["last_payment_amount"]),
									)}
								/>
								<ReadField
									label="최근 결제일"
									value={formatDate(getField(subscription, ["last_paid_at"]))}
								/>
							</div>
						</SectionCard>

						<SectionCard className="p-0">
							<div className="border-b border-line-strong/40 bg-[#eef2f7] px-6 py-5 sm:px-8">
								<h2 className="text-[18px] font-bold text-ink">운영자 메모</h2>
							</div>
							<div className="flex flex-col gap-4 p-6 sm:p-8">
								<Textarea
									value={memo}
									onChange={(e) => setMemo(e.target.value)}
									placeholder="운영 메모를 입력하세요."
									className="min-h-28 rounded-lg border-line-soft bg-app-bg text-[15px]"
								/>
								<div className="flex justify-end">
									<Button
										variant="brand"
										disabled={memoMutation.isPending}
										onClick={() => memoMutation.mutate(memo)}
									>
										{memoMutation.isPending ? (
											<Loader2 className="size-4 animate-spin" />
										) : null}
										메모 저장
									</Button>
								</div>
							</div>
						</SectionCard>

						<SectionCard className="p-0">
							<div className="border-b border-line-strong/40 bg-[#eef2f7] px-6 py-5 sm:px-8">
								<h2 className="text-[18px] font-bold text-ink">결제 이력</h2>
							</div>
							<div className="p-6 sm:p-8">
								<PaymentsTable payments={payments} />
							</div>
						</SectionCard>
					</>
				)}
			</div>
		</AdminShell>
	);
}

export function InstitutionDetailRoute() {
	return (
		<AuthGuard admin>
			<InstitutionDetailPage />
		</AuthGuard>
	);
}
