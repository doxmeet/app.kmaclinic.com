import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
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
import { AuthGuard } from "#/components/auth/auth-guard.tsx";
import {
	SectionCard,
	SectionTitleRow,
} from "#/components/common/section-card.tsx";
import { AdminShell } from "#/components/layout/admin-shell.tsx";
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import { type AdminSubscription, adminApi } from "#/lib/api/admin.ts";
import { toastApiError } from "#/lib/api-error-message.ts";
import { cn } from "#/lib/utils.ts";

export const Route = createFileRoute("/admin/institutions/$id")({
	component: InstitutionDetailRoute,
});

const STATUS_LABEL: Record<string, string> = {
	active: "이용중",
	canceled: "해지",
	expired: "만료",
	past_due: "결제 지연",
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

function InstitutionDetailPage() {
	const { id } = useParams({ from: "/admin/institutions/$id" });
	const no = Number(id);
	const validNo = Number.isFinite(no) && no > 0;

	const query = useQuery<AdminSubscription>({
		queryKey: ["admin", "subscription", no],
		queryFn: () => adminApi.getSubscription(no),
		enabled: validNo,
	});

	const data = query.data;
	const statusValue = data ? str(getField(data, ["status"])) : "-";
	const statusLabel = STATUS_LABEL[statusValue] ?? statusValue;

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
							<p className="text-base text-body-soft sm:text-[17px]">
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
				) : query.isPending ? (
					<SectionCard className="flex flex-col items-center gap-3 py-20 text-center">
						<Loader2 className="size-7 animate-spin text-brand" />
						<p className="text-[15px] text-body-soft">
							구독 상세 정보를 불러오는 중입니다…
						</p>
					</SectionCard>
				) : query.isError ? (
					<SectionCard className="flex flex-col items-center gap-3 py-20 text-center">
						<AlertCircle className="size-7 text-danger" />
						<p className="text-[15px] text-ink">
							구독 상세 정보를 불러오지 못했습니다.
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
									value={str(
										getField(data, ["hospital_name", "name", "title"]),
									)}
								/>
								<ReadField
									label="병원 번호"
									value={str(getField(data, ["hospital_no"]))}
								/>
								<ReadField
									label="구독 번호"
									value={str(getField(data, ["no", "id"]))}
								/>
								<ReadField
									label="등록된 주소"
									value={str(getField(data, ["address", "location"]))}
									className="sm:col-span-2"
								/>
								<ReadField
									label="담당자 연락처"
									value={str(getField(data, ["phone", "manager_phone"]))}
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
													: statusValue === "expired" ||
															statusValue === "past_due"
														? "destructive"
														: "warning"
											}
											className="rounded-full"
										>
											{statusLabel}
										</Badge>
									}
								/>
								<ReadField
									label="결제 금액"
									value={formatAmount(
										getField(data, ["amount", "price", "last_amount"]),
									)}
								/>
								<ReadField
									label="구독 유형"
									value={str(getField(data, ["plan", "type", "interval"]))}
								/>
								<ReadField
									label="시작일"
									value={str(getField(data, ["started_at", "created_at"]))}
								/>
								<ReadField
									label="다음 결제일"
									value={str(
										getField(data, ["next_payment_at", "current_period_end"]),
									)}
								/>
								<ReadField
									label="만료일"
									value={str(getField(data, ["expires_at", "ends_at"]))}
								/>
							</div>
						</SectionCard>
					</>
				)}
			</div>
		</AdminShell>
	);
}

function InstitutionDetailRoute() {
	return (
		<AuthGuard admin>
			<InstitutionDetailPage />
		</AuthGuard>
	);
}
