import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	AlertCircle,
	Check,
	ChevronRight,
	Home,
	Inbox,
	Loader2,
	RotateCcw,
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
	adminApi,
	type LicensePending,
	type Paginated,
} from "#/lib/api/admin.ts";
import { toastApiError } from "#/lib/api-error-message.ts";

export const Route = createFileRoute("/admin/licenses")({
	component: LicensesRoute,
});

function str(v: unknown): string {
	if (v === null || v === undefined || v === "") return "-";
	return String(v);
}

function getField(row: LicensePending, keys: string[]): unknown {
	for (const key of keys) {
		const value = row[key];
		if (value !== undefined && value !== null && value !== "") return value;
	}
	return undefined;
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

function LicensesPage() {
	const qc = useQueryClient();
	// 반려 사유 입력(행별).
	const [rejectingNo, setRejectingNo] = useState<number | null>(null);
	const [reason, setReason] = useState("");

	const query = useQuery<Paginated<LicensePending>>({
		queryKey: ["admin", "license", "pending"],
		queryFn: () => adminApi.licensePending(),
	});

	const invalidate = () =>
		qc.invalidateQueries({ queryKey: ["admin", "license", "pending"] });

	const approveMutation = useMutation({
		mutationFn: (no: number) => adminApi.approveLicense(no),
		onError: (err) => toastApiError(err),
		onSuccess: invalidate,
	});

	const rejectMutation = useMutation({
		mutationFn: ({ no, reason: r }: { no: number; reason: string }) =>
			adminApi.rejectLicense(no, r),
		onError: (err) => toastApiError(err),
		onSuccess: () => {
			setRejectingNo(null);
			setReason("");
			invalidate();
		},
	});

	const items = query.data?.items ?? [];
	const total = query.data?.pagination?.total ?? items.length;

	return (
		<AdminShell active="licenses">
			<div className="flex flex-col gap-8">
				<header className="flex flex-col gap-3">
					<nav
						aria-label="현재 위치"
						className="flex items-center gap-1 text-[15px] text-ink"
					>
						<Home className="size-4" />
						<span>홈</span>
						<ChevronRight className="size-3.5 text-muted-fg" />
						<span>면허 검증</span>
					</nav>
					<h1 className="text-2xl font-bold text-ink sm:text-[28px]">
						분과전문의 면허 검증
					</h1>
					<p className="text-base text-body-soft sm:text-[17px]">
						검증 대기 중인 면허 신청을 승인하거나 사유와 함께 반려합니다.
					</p>
				</header>

				<section className="flex flex-col gap-4">
					<div className="flex items-center gap-2">
						<p className="text-[15px] text-body">대기 중</p>
						<Badge variant="soft" className="rounded-full">
							{total}건
						</Badge>
					</div>

					<div className="overflow-hidden rounded-xl border border-line-soft bg-surface shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
						<Table className="min-w-[820px]">
							<TableHeader>
								<TableRow className="border-t-2 border-t-ink bg-[#eef2f7] hover:bg-[#eef2f7]">
									<TableHead className="text-[17px] font-medium text-ink">
										NO
									</TableHead>
									<TableHead className="text-[17px] font-medium text-ink">
										신청자
									</TableHead>
									<TableHead className="text-[17px] font-medium text-ink">
										분과 / 학회
									</TableHead>
									<TableHead className="text-[17px] font-medium text-ink">
										면허/자격 번호
									</TableHead>
									<TableHead className="text-center text-[15px] font-medium text-ink">
										검증
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{query.isPending ? (
									<StateRow>
										<Loader2 className="size-6 animate-spin text-brand" />
										<p className="text-[15px] text-body-soft">
											검증 대기 큐를 불러오는 중입니다…
										</p>
									</StateRow>
								) : query.isError ? (
									<StateRow>
										<AlertCircle className="size-7 text-danger" />
										<p className="text-[15px] text-ink">
											검증 대기 큐를 불러오지 못했습니다.
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
											검증 대기 중인 면허 신청이 없습니다.
										</p>
									</StateRow>
								) : (
									items.map((row, idx) => {
										const no = getField(row, ["no", "id"]);
										const numNo = Number(no);
										const rowKey = no ?? `row-${idx}`;
										const isRejecting = rejectingNo === numNo;
										const approving =
											approveMutation.isPending &&
											approveMutation.variables === numNo;
										const rejecting =
											rejectMutation.isPending &&
											rejectMutation.variables?.no === numNo;
										return (
											<TableRow
												key={String(rowKey)}
												className="border-b-line-strong/50 align-top"
											>
												<TableCell className="text-body-soft">
													{str(no)}
												</TableCell>
												<TableCell className="text-[15px] text-ink">
													{str(
														getField(row, [
															"user_name",
															"name",
															"applicant_name",
														]),
													)}
												</TableCell>
												<TableCell className="text-body">
													{str(
														getField(row, [
															"society_name",
															"society",
															"subspecialty",
															"category",
														]),
													)}
												</TableCell>
												<TableCell className="text-body">
													{str(
														getField(row, [
															"license_no",
															"license_number",
															"cert_no",
														]),
													)}
												</TableCell>
												<TableCell>
													{isRejecting ? (
														<div className="flex flex-col gap-2">
															<Input
																value={reason}
																onChange={(e) => setReason(e.target.value)}
																placeholder="반려 사유를 입력하세요."
																className="h-10 w-56 rounded-md border-body-soft text-[14px]"
															/>
															<div className="flex items-center gap-2">
																<Button
																	variant="brand"
																	size="sm"
																	disabled={!reason.trim() || rejecting}
																	onClick={() =>
																		rejectMutation.mutate({
																			no: numNo,
																			reason: reason.trim(),
																		})
																	}
																>
																	{rejecting ? (
																		<Loader2 className="size-4 animate-spin" />
																	) : null}
																	반려 확정
																</Button>
																<Button
																	variant="neutral-outline"
																	size="sm"
																	disabled={rejecting}
																	onClick={() => {
																		setRejectingNo(null);
																		setReason("");
																	}}
																>
																	취소
																</Button>
															</div>
														</div>
													) : (
														<div className="flex items-center justify-center gap-2">
															<Button
																variant="brand-outline"
																size="sm"
																disabled={approving || Number.isNaN(numNo)}
																onClick={() => approveMutation.mutate(numNo)}
															>
																{approving ? (
																	<Loader2 className="size-4 animate-spin" />
																) : (
																	<Check className="size-4" />
																)}
																승인
															</Button>
															<Button
																variant="neutral-outline"
																size="sm"
																disabled={Number.isNaN(numNo)}
																onClick={() => {
																	setRejectingNo(numNo);
																	setReason("");
																}}
															>
																<X className="size-4" />
																반려
															</Button>
														</div>
													)}
												</TableCell>
											</TableRow>
										);
									})
								)}
							</TableBody>
						</Table>
					</div>
				</section>
			</div>
		</AdminShell>
	);
}

function LicensesRoute() {
	return (
		<AuthGuard admin>
			<LicensesPage />
		</AuthGuard>
	);
}
