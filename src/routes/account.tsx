import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Loader2 } from "lucide-react";
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

function formatDate(value: string | null | undefined): string | null {
	if (!value) return null;
	const d = new Date(value);
	if (Number.isNaN(d.getTime())) return null;
	return new Intl.DateTimeFormat("ko-KR", {
		year: "numeric",
		month: "long",
		day: "numeric",
	}).format(d);
}

/** 구독/결제 카드의 보조 라인 — 구독 상태/결제일을 한 줄로 요약한다. */
function subscriptionSummary(hospital: AccountHospital): string {
	const status = hospital.subscription_status ?? null;
	switch (status) {
		case "active": {
			const next = formatDate(hospital.next_billing_at);
			return next ? `다음 결제 ${next}` : "이용 중";
		}
		case "past_due":
			return "결제가 연체되었어요";
		case "canceled": {
			const end = formatDate(hospital.current_period_end);
			return end ? `${end}까지 이용 가능` : "해지됨";
		}
		case "expired":
			return "구독이 만료됐어요";
		default:
			return "아직 구독을 시작하지 않았어요";
	}
}

/**
 * 소유 병원 1개의 구독 상태 요약 + 구독 관리 진입(문서 §8.7/§9.6).
 * 시각 언어는 Figma "병의원" 1:11841(구독 플랜 카드)을 따른다 —
 * 연한 카드 → hover 시 흰 배경 + 브랜드 테두리 + 그림자, 이름 + 보조 라인 + 상태 알약.
 */
function HospitalSubscriptionRow({ hospital }: { hospital: AccountHospital }) {
	const published = hospital.is_published === true;
	return (
		<Link
			to="/subscription/$hospitalNo"
			params={{ hospitalNo: String(hospital.no) }}
			className="flex items-center justify-between gap-4 rounded-2xl border border-line-soft bg-surface px-4 py-4 transition-colors hover:border-brand hover:bg-brand-50 sm:px-5"
		>
			<div className="flex min-w-0 flex-col gap-1">
				<span className="truncate text-[16px] font-semibold text-ink sm:text-[17px]">
					{hospital.name?.trim() || "내 병원"}
				</span>
				<span className="truncate text-[13px] text-body-soft sm:text-sm">
					{subscriptionSummary(hospital)}
				</span>
			</div>
			<div className="flex shrink-0 items-center gap-2">
				<Badge
					size="lg"
					variant={published ? "success" : "outline"}
					className="rounded-full"
				>
					{published ? "공개 중" : "비공개"}
				</Badge>
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
