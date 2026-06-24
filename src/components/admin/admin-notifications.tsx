import { useQuery } from "@tanstack/react-query";
import {
	AlertCircle,
	ChevronLeft,
	ChevronRight,
	Home,
	Inbox,
	Loader2,
	RotateCcw,
} from "lucide-react";
import { useState } from "react";
import { AuthGuard } from "#/components/auth/auth-guard.tsx";
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
import {
	adminApi,
	type NotificationLog,
	type Paginated,
} from "#/lib/api/admin.ts";
import { toastApiError } from "#/lib/api-error-message.ts";

const PAGE_SIZE = 10;

/** 채널 필터(문서 §6.8 notification_log.channel). */
const CHANNEL_FILTERS = [
	{ value: "", label: "전체" },
	{ value: "alimtalk", label: "알림톡" },
	{ value: "sms", label: "SMS" },
	{ value: "email", label: "이메일" },
] as const;

/** 상태 필터(문서 §6.8 notification_log.status). */
const STATUS_FILTERS = [
	{ value: "", label: "전체" },
	{ value: "sent", label: "발송완료" },
	{ value: "pending", label: "대기" },
	{ value: "failed", label: "실패" },
] as const;

const CHANNEL_LABEL: Record<string, string> = {
	alimtalk: "알림톡",
	sms: "SMS",
	email: "이메일",
};

const STATUS_BADGE: Record<
	string,
	{ label: string; variant: "success" | "warning" | "destructive" }
> = {
	sent: { label: "발송완료", variant: "success" },
	pending: { label: "대기", variant: "warning" },
	failed: { label: "실패", variant: "destructive" },
};

function str(v: unknown): string {
	if (v === null || v === undefined || v === "") return "-";
	return String(v);
}

function getField(row: NotificationLog, keys: string[]): unknown {
	for (const key of keys) {
		const value = row[key];
		if (value !== undefined && value !== null && value !== "") return value;
	}
	return undefined;
}

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
			<TableCell colSpan={6} className="py-16">
				<div className="flex flex-col items-center justify-center gap-3 text-center">
					{children}
				</div>
			</TableCell>
		</TableRow>
	);
}

function FilterRow<T extends string>({
	label,
	filters,
	value,
	onChange,
}: {
	label: string;
	filters: readonly { value: T; label: string }[];
	value: T;
	onChange: (next: T) => void;
}) {
	return (
		<div className="flex flex-wrap items-center gap-x-5 gap-y-3">
			<span className="w-16 text-[15px] text-ink">{label}</span>
			<div className="flex flex-wrap items-center gap-2">
				{filters.map((filter) => (
					<Button
						key={filter.value || "all"}
						type="button"
						variant={value === filter.value ? "brand" : "neutral-outline"}
						className="h-11 rounded-md px-5 text-[15px] font-medium"
						onClick={() => onChange(filter.value)}
					>
						{filter.label}
					</Button>
				))}
			</div>
		</div>
	);
}

function NotificationsPage() {
	const [channel, setChannel] =
		useState<(typeof CHANNEL_FILTERS)[number]["value"]>("");
	const [status, setStatus] =
		useState<(typeof STATUS_FILTERS)[number]["value"]>("");
	const [page, setPage] = useState(1);

	const { data, isPending, isError, error, refetch } = useQuery<
		Paginated<NotificationLog>
	>({
		queryKey: ["admin", "notifications", { channel, status, page }],
		queryFn: () =>
			adminApi.notificationLog({
				channel: channel || undefined,
				status: status || undefined,
				page,
			}),
	});

	const items = data?.items ?? [];
	const pagination = data?.pagination;
	const total = pagination?.total ?? items.length;
	const limit = pagination?.limit ?? PAGE_SIZE;
	const totalPages = Math.max(1, Math.ceil(total / limit));

	const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
	const rangeEnd = Math.min(page * limit, total);

	return (
		<AdminShell active="notifications">
			<div className="flex flex-col gap-8">
				<header className="flex flex-col gap-3">
					<nav
						aria-label="현재 위치"
						className="flex items-center gap-1 text-[15px] text-ink"
					>
						<Home className="size-4" />
						<span>홈</span>
						<ChevronRight className="size-3.5 text-muted-fg" />
						<span>알림 로그</span>
					</nav>
					<h1 className="text-2xl font-bold text-ink sm:text-[28px]">
						알림 발송 로그
					</h1>
					<p className="text-[15px] text-body-soft sm:text-[17px]">
						알림톡·SMS·이메일 발송 이력을 채널·상태별로 조회합니다.
					</p>
				</header>

				<section className="flex flex-col gap-5 rounded-xl bg-[#eef2f7] p-6 sm:p-8">
					<FilterRow
						label="채널"
						filters={CHANNEL_FILTERS}
						value={channel}
						onChange={(v) => {
							setChannel(v);
							setPage(1);
						}}
					/>
					<FilterRow
						label="상태"
						filters={STATUS_FILTERS}
						value={status}
						onChange={(v) => {
							setStatus(v);
							setPage(1);
						}}
					/>
				</section>

				<section className="flex flex-col gap-4">
					<p className="text-[15px] text-body">
						전체 <span className="font-bold text-ink">{total}</span>건
					</p>

					<div className="overflow-hidden rounded-xl border border-line-soft bg-surface shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
						<Table className="min-w-[820px]">
							<TableHeader>
								<TableRow className="border-t-2 border-t-ink bg-[#eef2f7] hover:bg-[#eef2f7]">
									<TableHead className="text-[17px] font-medium text-ink">
										채널
									</TableHead>
									<TableHead className="text-[17px] font-medium text-ink">
										템플릿
									</TableHead>
									<TableHead className="text-[17px] font-medium text-ink">
										수신처
									</TableHead>
									<TableHead className="text-[17px] font-medium text-ink">
										상태
									</TableHead>
									<TableHead className="text-[17px] font-medium text-ink">
										발송일시
									</TableHead>
									<TableHead className="text-[17px] font-medium text-ink">
										오류
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{isPending ? (
									<StateRow>
										<Loader2 className="size-6 animate-spin text-brand" />
										<p className="text-[15px] text-body-soft">
											알림 로그를 불러오는 중입니다…
										</p>
									</StateRow>
								) : isError ? (
									<StateRow>
										<AlertCircle className="size-7 text-danger" />
										<p className="text-[15px] text-ink">
											알림 로그를 불러오지 못했습니다.
										</p>
										<Button
											variant="neutral-outline"
											size="sm"
											onClick={() => {
												toastApiError(error);
												refetch();
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
											조건에 맞는 알림 발송 내역이 없습니다.
										</p>
									</StateRow>
								) : (
									items.map((row, idx) => {
										const channelValue = String(
											getField(row, ["channel"]) ?? "",
										);
										const template = str(getField(row, ["template_code"]));
										const toAddr = str(getField(row, ["to_addr"]));
										const statusValue = str(getField(row, ["status"]));
										const sentAt = formatDateTime(
											getField(row, ["sent_at", "created_at"]),
										);
										const error = str(getField(row, ["error"]));
										const rowKey = getField(row, ["no"]) ?? `row-${idx}`;
										return (
											<TableRow
												key={String(rowKey)}
												className="border-b-line-strong/50"
											>
												<TableCell className="text-[15px] text-ink">
													{CHANNEL_LABEL[channelValue] ?? str(channelValue)}
												</TableCell>
												<TableCell className="font-mono text-[13px] text-body">
													{template}
												</TableCell>
												<TableCell className="text-body">{toAddr}</TableCell>
												<TableCell>
													<StatusBadge status={statusValue} />
												</TableCell>
												<TableCell className="text-body">{sentAt}</TableCell>
												<TableCell className="max-w-[220px] truncate text-danger">
													{error === "-" ? (
														<span className="text-muted-fg">-</span>
													) : (
														error
													)}
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

export function NotificationsRoute() {
	return (
		<AuthGuard admin>
			<NotificationsPage />
		</AuthGuard>
	);
}
