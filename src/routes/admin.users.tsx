import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { type AdminUser, adminApi, type Paginated } from "#/lib/api/admin.ts";
import { toastApiError } from "#/lib/api-error-message.ts";

export const Route = createFileRoute("/admin/users")({
	component: UsersRoute,
});

const PAGE_SIZE = 10;

/** 권한 레벨 라벨(문서 §4: 0/1/9). */
const LEVEL_LABEL: Record<number, string> = {
	0: "일반",
	1: "의사",
	9: "운영자",
};

function str(v: unknown): string {
	if (v === null || v === undefined || v === "") return "-";
	return String(v);
}

function getField(row: AdminUser, keys: string[]): unknown {
	for (const key of keys) {
		const value = row[key];
		if (value !== undefined && value !== null && value !== "") return value;
	}
	return undefined;
}

function LevelBadge({ level }: { level: number }) {
	const label = LEVEL_LABEL[level] ?? `레벨 ${level}`;
	return (
		<Badge
			size="lg"
			variant={level >= 9 ? "soft" : level >= 1 ? "success" : "secondary"}
			className="rounded-full"
		>
			{label}
		</Badge>
	);
}

function StateRow({ children }: { children: React.ReactNode }) {
	return (
		<TableRow className="hover:bg-transparent">
			<TableCell colSpan={5} className="py-16">
				<div className="flex flex-col items-center justify-center gap-3 text-center">
					{children}
				</div>
			</TableCell>
		</TableRow>
	);
}

function UsersPage() {
	const qc = useQueryClient();
	const [keywordInput, setKeywordInput] = useState("");
	const [keyword, setKeyword] = useState("");
	const [page, setPage] = useState(1);

	const query = useQuery<Paginated<AdminUser>>({
		queryKey: ["admin", "users", { keyword, page }],
		queryFn: () => adminApi.listUsers({ keyword: keyword || undefined, page }),
	});

	// 권한 변경(본인 강등 금지는 서버 검증, 실패 시 토스트).
	const levelMutation = useMutation({
		mutationFn: ({ no, level }: { no: number; level: number }) =>
			adminApi.setUserLevel(no, level),
		onError: (err) => toastApiError(err),
		onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
	});

	const items = query.data?.items ?? [];
	const pagination = query.data?.pagination;
	const total = pagination?.total ?? items.length;
	const limit = pagination?.limit ?? PAGE_SIZE;
	const totalPages = Math.max(1, Math.ceil(total / limit));

	const runSearch = () => {
		setKeyword(keywordInput.trim());
		setPage(1);
	};

	return (
		<AdminShell active="users">
			<div className="flex flex-col gap-8">
				<header className="flex flex-col gap-3">
					<nav
						aria-label="현재 위치"
						className="flex items-center gap-1 text-[15px] text-ink"
					>
						<Home className="size-4" />
						<span>홈</span>
						<ChevronRight className="size-3.5 text-muted-fg" />
						<span>회원 관리</span>
					</nav>
					<h1 className="text-2xl font-bold text-ink sm:text-[28px]">
						회원 관리
					</h1>
					<p className="text-base text-body-soft sm:text-[17px]">
						가입한 회원(의사)을 검색하고 권한 레벨을 관리합니다.
					</p>
				</header>

				<section className="flex flex-wrap items-center gap-3 rounded-xl bg-[#eef2f7] p-6 sm:p-8">
					<div className="relative">
						<Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-fg" />
						<Input
							value={keywordInput}
							onChange={(e) => setKeywordInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === "Enter") runSearch();
							}}
							placeholder="이름 또는 이메일로 검색하세요."
							className="h-12 w-80 rounded-md border-body-soft bg-surface pl-9 text-[15px]"
						/>
					</div>
					<Button
						variant="brand"
						className="h-12 rounded-md px-6 text-[15px] font-medium"
						onClick={runSearch}
					>
						검색하기
					</Button>
				</section>

				<section className="flex flex-col gap-4">
					<p className="text-[15px] text-body">
						전체 <span className="font-bold text-ink">{total}</span>명
					</p>
					<div className="overflow-hidden rounded-xl border border-line-soft bg-surface shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
						<Table className="min-w-[800px]">
							<TableHeader>
								<TableRow className="border-t-2 border-t-ink bg-[#eef2f7] hover:bg-[#eef2f7]">
									<TableHead className="text-[17px] font-medium text-ink">
										NO
									</TableHead>
									<TableHead className="text-[17px] font-medium text-ink">
										이름
									</TableHead>
									<TableHead className="text-[17px] font-medium text-ink">
										이메일
									</TableHead>
									<TableHead className="text-[17px] font-medium text-ink">
										권한
									</TableHead>
									<TableHead className="text-center text-[15px] font-medium text-ink">
										권한 변경
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{query.isPending ? (
									<StateRow>
										<Loader2 className="size-6 animate-spin text-brand" />
										<p className="text-[15px] text-body-soft">
											회원 목록을 불러오는 중입니다…
										</p>
									</StateRow>
								) : query.isError ? (
									<StateRow>
										<AlertCircle className="size-7 text-danger" />
										<p className="text-[15px] text-ink">
											회원 목록을 불러오지 못했습니다.
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
											조건에 맞는 회원이 없습니다.
										</p>
									</StateRow>
								) : (
									items.map((row, idx) => {
										const no = getField(row, ["no", "id"]);
										const level = Number(getField(row, ["level"]) ?? 0);
										const rowKey = no ?? `row-${idx}`;
										const isPending =
											levelMutation.isPending &&
											levelMutation.variables?.no === Number(no);
										return (
											<TableRow
												key={String(rowKey)}
												className="border-b-line-strong/50"
											>
												<TableCell className="text-body-soft">
													{str(no)}
												</TableCell>
												<TableCell className="text-[15px] text-ink">
													{str(getField(row, ["name", "username"]))}
												</TableCell>
												<TableCell className="text-body">
													{str(getField(row, ["email"]))}
												</TableCell>
												<TableCell>
													<LevelBadge level={level} />
												</TableCell>
												<TableCell>
													<div className="flex items-center justify-center gap-2">
														{no !== undefined && level < 9 ? (
															<Button
																variant="brand-outline"
																size="sm"
																disabled={isPending}
																onClick={() =>
																	levelMutation.mutate({
																		no: Number(no),
																		level: 9,
																	})
																}
															>
																{isPending ? (
																	<Loader2 className="size-4 animate-spin" />
																) : null}
																운영자로 승격
															</Button>
														) : (
															<span className="text-[13px] text-muted-fg">
																변경 불가
															</span>
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
								페이지 {page} / {totalPages}
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

function UsersRoute() {
	return (
		<AuthGuard admin>
			<UsersPage />
		</AuthGuard>
	);
}
