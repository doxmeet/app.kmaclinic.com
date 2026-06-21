import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	AlertCircle,
	ChevronLeft,
	ChevronRight,
	ChevronsUpDown,
	Download,
	Home,
	Inbox,
	Loader2,
	RotateCcw,
	Search,
	X,
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
	type AdminSubscription,
	adminApi,
	type Paginated,
} from "#/lib/api/admin.ts";
import { toastApiError } from "#/lib/api-error-message.ts";

export const Route = createFileRoute("/admin/institutions/")({
	component: InstitutionsRoute,
});

const PAGE_SIZE = 10;

/**
 * 구독 상태 필터(문서 §3 구독 상태값).
 * "전체"는 status 쿼리 미전송.
 */
const STATUS_FILTERS = [
	{ value: "", label: "전체" },
	{ value: "active", label: "이용중" },
	{ value: "canceled", label: "해지" },
	{ value: "expired", label: "만료" },
] as const;

const STATUS_BADGE: Record<
	string,
	{ label: string; variant: "success" | "warning" | "destructive" | "soft" }
> = {
	active: { label: "이용중", variant: "success" },
	canceled: { label: "해지", variant: "warning" },
	expired: { label: "만료", variant: "destructive" },
};

/** 결제 방법 필터·엑셀 다운로드·메모 편집은 문서상 미구현 → UI만 노출하고 비활성. */
const PAYMENT_FILTERS = ["전체", "토스페이", "계좌이체", "신용카드"] as const;

function str(v: unknown): string {
	if (v === null || v === undefined || v === "") return "-";
	return String(v);
}

function getField(row: AdminSubscription, keys: string[]): unknown {
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

/** 페이지 전용 페이지네이션 (앞/뒤 화살표 + 번호 윈도우) */
function Pagination({
	page,
	totalPages,
	onChange,
}: {
	page: number;
	totalPages: number;
	onChange: (next: number) => void;
}) {
	const windowSize = 5;
	const start = Math.max(1, Math.min(page - 2, totalPages - windowSize + 1));
	const pages = Array.from(
		{ length: Math.min(windowSize, totalPages) },
		(_, i) => start + i,
	).filter((p) => p >= 1 && p <= totalPages);

	return (
		<nav aria-label="페이지" className="flex items-center gap-1">
			<Button
				variant="neutral-outline"
				size="icon-lg"
				aria-label="이전 페이지"
				disabled={page <= 1}
				onClick={() => onChange(page - 1)}
			>
				<ChevronLeft className="size-4" />
			</Button>
			{pages.map((p) => (
				<Button
					key={p}
					variant={p === page ? "brand" : "neutral-outline"}
					size="icon-lg"
					aria-current={p === page ? "page" : undefined}
					onClick={() => onChange(p)}
				>
					{p}
				</Button>
			))}
			{totalPages > 0 && pages[pages.length - 1] < totalPages ? (
				<>
					<span className="px-2 text-muted-fg">…</span>
					<Button
						variant={totalPages === page ? "brand" : "neutral-outline"}
						size="icon-lg"
						onClick={() => onChange(totalPages)}
					>
						{totalPages}
					</Button>
				</>
			) : null}
			<Button
				variant="neutral-outline"
				size="icon-lg"
				aria-label="다음 페이지"
				disabled={page >= totalPages}
				onClick={() => onChange(page + 1)}
			>
				<ChevronRight className="size-4" />
			</Button>
		</nav>
	);
}

/** 표 본문의 상태 행(로딩/에러/빈) 공통 래퍼. */
function StateRow({ children }: { children: React.ReactNode }) {
	return (
		<TableRow className="hover:bg-transparent">
			<TableCell colSpan={6} className="py-16">
				<div className="flex flex-col items-center justify-center gap-3 text-center">
					{children}
				</div>
			</TableCell>
		</TableRow>
	);
}

function InstitutionsPage() {
	// 입력 중 상태(검색 버튼 클릭 시에만 쿼리 파라미터로 반영)
	const [keywordInput, setKeywordInput] = useState("");
	const [statusInput, setStatusInput] =
		useState<(typeof STATUS_FILTERS)[number]["value"]>("");

	// 실제 쿼리에 적용된 상태
	const [keyword, setKeyword] = useState("");
	const [status, setStatus] =
		useState<(typeof STATUS_FILTERS)[number]["value"]>("");
	const [page, setPage] = useState(1);

	const query = useQuery<Paginated<AdminSubscription>>({
		queryKey: ["admin", "subscriptions", { status, page }],
		queryFn: () =>
			adminApi.listSubscriptions({ status: status || undefined, page }),
	});

	const items = query.data?.items ?? [];
	// 문서상 키워드 전용 엔드포인트가 없어 클라이언트 측에서 보조 필터링.
	const filtered = keyword
		? items.filter((row) => {
				const name = str(
					getField(row, ["hospital_name", "name", "title"]),
				).toLowerCase();
				return name.includes(keyword.toLowerCase());
			})
		: items;

	const pagination = query.data?.pagination;
	const total = pagination?.total ?? filtered.length;
	const limit = pagination?.limit ?? PAGE_SIZE;
	const totalPages = Math.max(1, Math.ceil(total / limit));

	const runSearch = () => {
		setKeyword(keywordInput.trim());
		setStatus(statusInput);
		setPage(1);
	};

	const resetFilters = () => {
		setKeywordInput("");
		setStatusInput("");
		setKeyword("");
		setStatus("");
		setPage(1);
	};

	const activeFilters = [
		status ? STATUS_FILTERS.find((f) => f.value === status)?.label : null,
		keyword ? `검색: ${keyword}` : null,
	].filter(Boolean) as string[];

	const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
	const rangeEnd = Math.min(page * limit, total);

	return (
		<AdminShell active="institutions">
			<div className="flex flex-col gap-8">
				<header className="flex flex-col gap-3">
					<nav
						aria-label="현재 위치"
						className="flex items-center gap-1 text-[15px] text-ink"
					>
						<Home className="size-4" />
						<span>홈</span>
						<ChevronRight className="size-3.5 text-muted-fg" />
						<span>요양기관 현황</span>
					</nav>
					<h1 className="text-2xl font-bold text-ink sm:text-[28px]">
						요양기관 현황 관리
					</h1>
					<p className="text-base text-body-soft sm:text-[17px]">
						서비스를 구독 및 이용 중인 전체 요양기관(병원)의 구독 현황을
						실시간으로 관리합니다.
					</p>
				</header>

				<section className="flex flex-col gap-6 rounded-xl bg-[#eef2f7] p-6 sm:p-8">
					<h2 className="border-b border-line-strong/60 pb-4 text-[17px] text-ink">
						세부 검색조건
					</h2>

					<div className="flex flex-col gap-5 border-b border-line-strong/60 pb-6">
						<div className="flex flex-wrap items-center gap-x-5 gap-y-3">
							<span className="text-[15px] text-ink">구독 상태</span>
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

						<div className="flex flex-wrap items-center gap-x-5 gap-y-3">
							<span className="text-[15px] text-ink">결제 방법</span>
							<div className="flex flex-wrap items-center gap-2">
								{PAYMENT_FILTERS.map((label) => (
									<Button
										key={label}
										type="button"
										variant="neutral-outline"
										disabled
										title="준비중"
										className="h-12 rounded-md px-5 text-[15px] font-medium"
									>
										{label}
									</Button>
								))}
								<Badge variant="secondary" className="rounded-full">
									준비중
								</Badge>
							</div>
							<div className="relative">
								<Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-fg" />
								<Input
									value={keywordInput}
									onChange={(e) => setKeywordInput(e.target.value)}
									onKeyDown={(e) => {
										if (e.key === "Enter") runSearch();
									}}
									placeholder="요양기관명을 검색하세요."
									className="h-12 w-72 rounded-md border-body-soft bg-surface pl-9 text-[15px]"
								/>
							</div>
							<Button
								variant="brand"
								className="h-12 rounded-md px-6 text-[15px] font-medium"
								onClick={runSearch}
							>
								검색하기
							</Button>
						</div>
					</div>

					<div className="flex flex-wrap items-center gap-x-4 gap-y-2">
						<span className="text-[15px] text-ink">
							선택된 필터{" "}
							<span className="font-semibold text-brand-700">
								{activeFilters.length}
							</span>
						</span>
						<Button
							variant="neutral-outline"
							size="icon-lg"
							aria-label="필터 초기화"
							className="rounded-full"
							onClick={resetFilters}
						>
							<RotateCcw className="size-4" />
						</Button>
						{activeFilters.map((label) => (
							<span
								key={label}
								className="flex h-10 items-center gap-1.5 rounded-full border border-line-strong bg-surface px-4 text-[15px] text-ink"
							>
								{label}
								<X className="size-3.5 text-muted-fg" />
							</span>
						))}
					</div>
				</section>

				<section className="flex flex-col gap-4">
					<div className="flex items-center justify-between gap-4">
						<p className="text-[15px] text-body">
							전체 <span className="font-bold text-ink">{total}</span>개 기관
						</p>
						<Button
							variant="brand-outline"
							disabled
							title="준비중"
							className="h-10 rounded-md px-4 text-[15px] font-medium"
						>
							<Download className="size-4" />
							엑셀 다운로드 (준비중)
						</Button>
					</div>

					<div className="overflow-hidden rounded-xl border border-line-soft bg-surface shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
						<Table className="min-w-[900px]">
							<TableHeader>
								<TableRow className="border-t-2 border-t-ink bg-[#eef2f7] hover:bg-[#eef2f7]">
									<TableHead className="text-[17px] font-medium text-ink">
										<span className="inline-flex items-center gap-1">
											NO
											<ChevronsUpDown className="size-3.5 text-muted-fg" />
										</span>
									</TableHead>
									<TableHead className="text-[17px] font-medium text-ink">
										<span className="inline-flex items-center gap-1">
											요양기관명
											<ChevronsUpDown className="size-3.5 text-muted-fg" />
										</span>
									</TableHead>
									<TableHead className="text-[17px] font-medium text-ink">
										구독 상태
									</TableHead>
									<TableHead className="text-[17px] font-medium text-ink">
										결제 금액
									</TableHead>
									<TableHead className="text-[17px] font-medium text-ink">
										메모 (비고)
									</TableHead>
									<TableHead className="text-center text-[15px] font-medium text-ink">
										관리
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{query.isPending ? (
									<StateRow>
										<Loader2 className="size-6 animate-spin text-brand" />
										<p className="text-[15px] text-body-soft">
											구독 현황을 불러오는 중입니다…
										</p>
									</StateRow>
								) : query.isError ? (
									<StateRow>
										<AlertCircle className="size-7 text-danger" />
										<p className="text-[15px] text-ink">
											구독 현황을 불러오지 못했습니다.
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
								) : filtered.length === 0 ? (
									<StateRow>
										<Inbox className="size-7 text-muted-fg" />
										<p className="text-[15px] text-body-soft">
											조건에 맞는 요양기관(구독)이 없습니다.
										</p>
									</StateRow>
								) : (
									filtered.map((row, idx) => {
										const no = getField(row, ["no", "id"]);
										const subscriptionNo = getField(row, ["no", "id"]);
										const name = str(
											getField(row, ["hospital_name", "name", "title"]),
										);
										const location = str(
											getField(row, ["address", "location", "region"]),
										);
										const statusValue = str(getField(row, ["status"]));
										const amount = formatAmount(
											getField(row, ["amount", "price", "last_amount"]),
										);
										const memo = str(getField(row, ["memo", "note"]));
										const rowKey = subscriptionNo ?? `row-${idx}`;
										return (
											<TableRow
												key={String(rowKey)}
												className="border-b-line-strong/50"
											>
												<TableCell className="text-body-soft">
													{str(no)}
												</TableCell>
												<TableCell>
													<div className="flex flex-col gap-0.5">
														<span className="text-[15px] text-ink">{name}</span>
														{location !== "-" ? (
															<span className="text-[13px] text-muted-fg">
																{location}
															</span>
														) : null}
													</div>
												</TableCell>
												<TableCell>
													<StatusBadge status={statusValue} />
												</TableCell>
												<TableCell className="text-[17px] text-ink">
													{amount}
												</TableCell>
												<TableCell className="text-body">{memo}</TableCell>
												<TableCell>
													<div className="flex items-center justify-center gap-2">
														<Button
															variant="neutral-outline"
															size="sm"
															disabled
															title="준비중"
														>
															삭제
														</Button>
														{subscriptionNo !== undefined ? (
															<Button
																render={
																	<Link
																		to="/admin/institutions/$id"
																		params={{ id: String(subscriptionNo) }}
																	/>
																}
																variant="brand-outline"
																size="sm"
															>
																상세
															</Button>
														) : (
															<Button
																variant="brand-outline"
																size="sm"
																disabled
															>
																상세
															</Button>
														)}
													</div>
												</TableCell>
											</TableRow>
										);
									})
								)}
							</TableBody>
						</Table>
						<div className="flex flex-col items-start gap-3 border-t border-line-soft px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
							<p className="text-[15px] text-body-soft">
								{rangeStart} - {rangeEnd} / {total}개 기관
							</p>
							<Pagination
								page={page}
								totalPages={totalPages}
								onChange={setPage}
							/>
						</div>
					</div>
				</section>
			</div>
		</AdminShell>
	);
}

function InstitutionsRoute() {
	return (
		<AuthGuard admin>
			<InstitutionsPage />
		</AuthGuard>
	);
}
