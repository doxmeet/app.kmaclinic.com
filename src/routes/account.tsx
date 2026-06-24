import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, CreditCard, Loader2 } from "lucide-react";
import { AuthGuard } from "#/components/auth/auth-guard.tsx";
import { InfoRows } from "#/components/common/data-list.tsx";
import { CardShell, SectionCard } from "#/components/common/section-card.tsx";
import { AppShell } from "#/components/layout/app-shell.tsx";
import { Badge } from "#/components/ui/badge.tsx";
import type { AccountHospital } from "#/lib/auth/session.ts";
import { useSession } from "#/lib/auth/use-session.ts";

/**
 * 내 계정 — 본인 계정/구독 상태 조회 (문서 §8.2).
 * 프로필/병원 콘텐츠 관리는 별도 도메인(kmadoc/kmaclinic)의 책임.
 */
export const Route = createFileRoute("/account")({
	component: AccountRoute,
});

const LEVEL_LABEL: Record<number, string> = {
	0: "일반",
	1: "의사",
	9: "운영자",
};

const SUB_STATUS_BADGE: Record<
	string,
	{ label: string; variant: "success" | "warning" | "soft" | "destructive" }
> = {
	active: { label: "이용 중", variant: "success" },
	past_due: { label: "결제 연체", variant: "warning" },
	canceled: { label: "해지됨", variant: "soft" },
	expired: { label: "만료됨", variant: "destructive" },
};

/** 소유 병원 1개의 구독 상태 요약 + 구독 관리 진입(문서 §8.7/§9.6). */
function HospitalSubscriptionRow({ hospital }: { hospital: AccountHospital }) {
	const status = hospital.subscription_status ?? null;
	const meta = status ? SUB_STATUS_BADGE[status] : undefined;
	return (
		<Link
			to="/subscription/$hospitalNo"
			params={{ hospitalNo: String(hospital.no) }}
			className="flex items-center justify-between gap-3 rounded-xl border border-line bg-app-bg px-4 py-3 transition-colors hover:border-brand hover:bg-brand-50"
		>
			<div className="flex items-center gap-3">
				<CreditCard className="size-5 shrink-0 text-brand" />
				<div className="flex flex-col">
					<span className="text-[15px] font-medium text-ink">
						{hospital.name?.trim() || "내 병원"}
					</span>
					<span className="text-sm text-body-soft">
						{hospital.is_published ? "공개 중" : "비공개"}
					</span>
				</div>
			</div>
			<div className="flex items-center gap-2">
				{meta ? (
					<Badge variant={meta.variant} className="rounded-full">
						{meta.label}
					</Badge>
				) : (
					<Badge variant="outline" className="rounded-full">
						구독 없음
					</Badge>
				)}
				<ChevronRight className="size-4 text-muted-fg" />
			</div>
		</Link>
	);
}

function AccountPage() {
	const { user, account, isLoading } = useSession();
	const hospitals = account?.hospitals ?? [];

	const infoRows = [
		{ label: "이름", value: user?.name ?? "-" },
		{ label: "소속 병원", value: user?.hospital_name ?? "-" },
		{
			label: "권한",
			value: LEVEL_LABEL[user?.level ?? 0] ?? `레벨 ${user?.level}`,
		},
	];

	return (
		<AppShell
			userName={user?.name ?? undefined}
			maxWidth="1280px"
			innerMaxWidth="720px"
		>
			<div className="flex flex-col gap-6">
				<header className="flex flex-col gap-2">
					<h1 className="text-2xl font-bold text-ink sm:text-[28px]">
						내 계정
					</h1>
					<p className="text-base text-body-soft sm:text-[17px]">
						계정 정보와 구독 상태를 확인합니다.
					</p>
				</header>

				{isLoading ? (
					<SectionCard className="flex items-center justify-center py-16">
						<Loader2 className="size-6 animate-spin text-brand" />
					</SectionCard>
				) : (
					<>
						<CardShell title="기본 정보">
							<InfoRows rows={infoRows} />
						</CardShell>

						{hospitals.length > 0 ? (
							<CardShell title="구독 / 결제">
								<div className="flex flex-col gap-2 p-5 sm:p-8">
									{hospitals.map((h) => (
										<HospitalSubscriptionRow key={h.no} hospital={h} />
									))}
								</div>
							</CardShell>
						) : null}
					</>
				)}
			</div>
		</AppShell>
	);
}

function AccountRoute() {
	return (
		<AuthGuard>
			<AccountPage />
		</AuthGuard>
	);
}
