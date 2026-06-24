import { amountForCycle, type BillingCycle } from "#/lib/api/billing.ts";
import { cn } from "#/lib/utils.ts";

/**
 * 결제 주기 선택 카드(Figma 1:11958) — 결제 화면(commit-complete)과 구독 관리(주기 변경)에서 공유한다.
 * 금액은 amountForCycle(billing.ts) 단일 출처에서 가져오고, 여기서는 표기 텍스트만 정의한다.
 */
const CYCLE_CARDS: ReadonlyArray<{
	value: BillingCycle;
	title: string;
	/** 가격 줄 접두사("연 "/"월 "). 단건은 없음. */
	pricePrefix: string;
	/** 우측 회색 보조 라벨(월간/단건). */
	note?: string;
	/** 강조 배지(연간). */
	badge?: string;
	/** 카드 하단 설명 한 줄(연간). */
	blurb?: string;
}> = [
	{
		value: "annual",
		title: "정기 결제 (연간 구독)",
		pricePrefix: "연 ",
		badge: "2개월 무료 혜택",
		blurb: "연 1회 정기적으로 자동 결제되는 알뜰형 플랜입니다.",
	},
	{
		value: "monthly",
		title: "정기 결제 (월간 구독)",
		pricePrefix: "월 ",
		note: "매월 자동 결제",
	},
	{
		value: "one_time",
		title: "1개월 이용권 결제",
		pricePrefix: "",
		note: "1회 결제",
	},
];

/** 카드 가격 표기(예: "연 100,000원 (부가세 포함)"). 금액은 amountForCycle 단일 출처. */
function cyclePriceText(card: (typeof CYCLE_CARDS)[number]): string {
	return `${card.pricePrefix}${amountForCycle(card.value).toLocaleString("ko-KR")}원 (부가세 포함)`;
}

/**
 * 결제 주기 선택 카드 목록. `cycles`로 노출할 주기를 제한할 수 있다(미지정 시 전체).
 * 표시 순서는 CYCLE_CARDS(연간 우선) 기준.
 */
export function CycleSelect({
	value,
	onChange,
	cycles,
	disabled,
	className,
}: {
	value: BillingCycle;
	onChange: (cycle: BillingCycle) => void;
	/** 노출할 주기 목록(예: ["monthly","annual"]). 미지정 시 monthly·annual·one_time 전체. */
	cycles?: BillingCycle[];
	disabled?: boolean;
	className?: string;
}) {
	const cards = cycles
		? CYCLE_CARDS.filter((c) => cycles.includes(c.value))
		: CYCLE_CARDS;

	return (
		<div className={cn("flex flex-col gap-4", className)}>
			{cards.map((card) => {
				const selected = value === card.value;
				return (
					<button
						key={card.value}
						type="button"
						disabled={disabled}
						onClick={() => onChange(card.value)}
						aria-pressed={selected}
						className={cn(
							"flex w-full items-start gap-4 rounded-xl p-6 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
							selected
								? "border-2 border-brand bg-surface"
								: card.value === "one_time"
									? "border border-line-soft bg-app-bg hover:border-brand/40"
									: "border border-line-soft bg-surface hover:border-brand/40",
						)}
					>
						{/* 라디오 */}
						<span
							className={cn(
								"mt-1 flex size-6 shrink-0 items-center justify-center rounded-full border-2",
								selected ? "border-brand" : "border-line-soft",
							)}
						>
							{selected ? (
								<span className="size-3 rounded-full bg-brand" />
							) : null}
						</span>

						{/* 내용 */}
						<span className="flex min-w-0 flex-1 flex-col gap-0.5">
							<span className="flex items-center justify-between gap-3">
								<span className="flex flex-wrap items-center gap-x-3 gap-y-1">
									<span className="text-[16px] font-medium text-ink sm:text-[17px]">
										{card.title}
									</span>
									{card.badge ? (
										<span className="shrink-0 rounded bg-brand px-2 py-0.5 text-xs font-bold text-white">
											{card.badge}
										</span>
									) : null}
								</span>
								{card.note ? (
									<span className="shrink-0 text-sm text-muted-fg">
										{card.note}
									</span>
								) : null}
							</span>
							<span className="text-[16px] font-semibold text-ink sm:text-[17px]">
								{cyclePriceText(card)}
							</span>
							{card.blurb ? (
								<span className="pt-1 text-sm text-body-soft">
									{card.blurb}
								</span>
							) : null}
						</span>
					</button>
				);
			})}
		</div>
	);
}
