import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SectionCard } from "#/components/common/section-card.tsx";
import { AppShell } from "#/components/layout/app-shell.tsx";
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import { cn } from "#/lib/utils.ts";

export const Route = createFileRoute("/hospital/billing")({
	component: HospitalBillingPage,
});

const STEPS = [{ label: "병원 정보 입력" }, { label: "프로필 페이지 작성" }];

type Plan = {
	id: string;
	title: string;
	price: string;
	badge?: string;
	note?: string;
	description?: string;
	muted?: boolean;
};

const PLANS: Plan[] = [
	{
		id: "annual",
		title: "정기 결제 (연간 구독)",
		price: "연 100,000원 (부가세 포함)",
		badge: "2개월 무료 혜택",
		description: "연 1회 정기적으로 자동 결제되는 알뜰형 플랜입니다.",
	},
	{
		id: "monthly",
		title: "정기 결제 (월간 구독)",
		price: "월 10,000원 (부가세 포함)",
		note: "매월 자동 결제",
	},
	{
		id: "single",
		title: "1개월 이용권 결제",
		price: "10,000원 (부가세 포함)",
		note: "1회 결제",
		muted: true,
	},
];

function PlanOption({
	plan,
	selected,
	onSelect,
}: {
	plan: Plan;
	selected: boolean;
	onSelect: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onSelect}
			aria-pressed={selected}
			className={cn(
				"flex w-full items-start gap-4 rounded-xl border p-6 text-left transition-colors",
				selected
					? "border-2 border-brand bg-surface"
					: plan.muted
						? "border-line-soft bg-app-bg hover:border-line-strong"
						: "border-line-soft bg-surface hover:border-line-strong",
			)}
		>
			<span
				className={cn(
					"mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2",
					selected ? "border-brand" : "border-line-soft",
				)}
			>
				{selected ? <span className="size-3 rounded-full bg-brand" /> : null}
			</span>
			<span className="flex min-w-0 flex-1 flex-col gap-0.5">
				<span className="flex flex-wrap items-center justify-between gap-2">
					<span className="flex items-center gap-2">
						<span className="text-[17px] font-medium text-ink">
							{plan.title}
						</span>
						{plan.badge ? <Badge>{plan.badge}</Badge> : null}
					</span>
					{plan.note ? (
						<span className="text-base text-muted-fg">{plan.note}</span>
					) : null}
				</span>
				<span className="text-[17px] font-semibold text-ink">{plan.price}</span>
				{plan.description ? (
					<span className="pt-1 text-base text-body-soft">
						{plan.description}
					</span>
				) : null}
			</span>
		</button>
	);
}

function HospitalBillingPage() {
	const [selected, setSelected] = useState("annual");

	return (
		<AppShell
			steps={STEPS}
			current={0}
			userName="김의사"
			maxWidth="620px"
			mainClassName="flex items-center"
		>
			<SectionCard className="flex flex-col gap-8 rounded-lg p-8">
				<div className="flex flex-col gap-2">
					<h1 className="text-2xl font-bold text-ink">
						구독 플랜 및 과금 방식 선택
					</h1>
					<p className="text-base text-body-soft">
						의원 홈페이지 관리를 위한 최적의 결제 플랜을 선택해 주세요.
					</p>
				</div>

				<div className="flex flex-col gap-4">
					{PLANS.map((plan) => (
						<PlanOption
							key={plan.id}
							plan={plan}
							selected={selected === plan.id}
							onSelect={() => setSelected(plan.id)}
						/>
					))}
				</div>

				<div className="flex flex-col gap-3 sm:flex-row">
					<Button
						variant="neutral-outline"
						size="2xl"
						className="flex-1 text-[20px] font-medium"
						nativeButton={false}
						render={<Link to="/hospital/confirm" />}
					>
						추가 수정하기
					</Button>
					<Button
						variant="brand"
						size="2xl"
						className="flex-1 text-[20px] font-medium"
					>
						토스 페이로 결제하기
					</Button>
				</div>
			</SectionCard>
		</AppShell>
	);
}
