import {
	amountForCycle,
	type BillingCycle,
	billingCycleMeta,
	firstAmountForCycle,
} from "#/lib/api/billing.ts";
import { cn } from "#/lib/utils.ts";

/**
 * 결제 주기 선택 카드(Figma 1:11958) — 가입 결제(commit-complete)와 구독 관리(주기 변경)에서 공유한다.
 * 금액은 billing.ts 단일 출처(정가=amountForCycle, 특가=firstAmountForCycle, 앵커=meta.listAmount).
 *
 * `pricing`으로 표기를 분기한다(가이드 §2·§7):
 * - `intro`(가입): 정가 취소선 + 첫 결제 오픈특가 + "첫 달 무료".
 * - `renewal`(주기 변경): 정가(갱신가)만 — 무료달·특가는 병원당 최초 1회뿐이라 갱신 화면엔 노출 금지.
 */
const CYCLE_CARDS: ReadonlyArray<{
	value: BillingCycle;
	title: string;
	/** 가격 줄 접두사("연 "/"월 "). */
	pricePrefix: string;
	/** 우측 회색 보조 라벨. */
	note?: string;
	/** 강조 배지(연간 할인). */
	badge?: string;
	/** 카드 하단 설명 한 줄(연간). */
	blurb?: string;
}> = [
	{
		value: "annual",
		title: "정기 결제 (연간 구독)",
		pricePrefix: "연 ",
		badge: "2개월 할인",
		blurb: "연 1회 정기적으로 자동 결제되는 알뜰형 플랜입니다.",
	},
	{
		value: "monthly",
		title: "정기 결제 (월간 구독)",
		pricePrefix: "월 ",
		note: "매월 자동 결제",
	},
];

const won = (amount: number) => `${amount.toLocaleString("ko-KR")}원`;

/**
 * 결제 주기 선택 카드 목록. `cycles`로 노출할 주기를 제한할 수 있다(미지정 시 전체).
 * 표시 순서는 CYCLE_CARDS(연간 우선) 기준.
 */
export function CycleSelect({
	value,
	onChange,
	cycles,
	pricing = "intro",
	disabled,
	className,
}: {
	value: BillingCycle;
	onChange: (cycle: BillingCycle) => void;
	/** 노출할 주기 목록(예: ["monthly","annual"]). 미지정 시 전체. */
	cycles?: BillingCycle[];
	/** 가격 표기 모드. `intro`=가입(특가/첫 달 무료), `renewal`=주기 변경(정가만). 기본 `intro`. */
	pricing?: "intro" | "renewal";
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
				const meta = billingCycleMeta(card.value);
				const regular = amountForCycle(card.value); // 정가(갱신가)
				const first = firstAmountForCycle(card.value); // 오픈특가(첫 결제 1회)
				const list = meta.listAmount; // 취소선 앵커(연간 240,000)

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
						<span className="flex min-w-0 flex-1 flex-col gap-1">
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

							{pricing === "renewal" ? (
								/* 주기 변경: 정가(갱신가)만 — 다음 결제일부터 적용. */
								<span className="text-[16px] font-semibold text-ink sm:text-[17px]">
									{card.pricePrefix}
									{won(regular)} (부가세 포함)
								</span>
							) : (
								/* 가입: 정가 취소선 + (연간) 정가 + 첫 결제 특가 + 첫 달 무료. */
								<>
									<span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
										<span className="text-sm text-muted-fg line-through">
											{card.pricePrefix}
											{won(list)}
										</span>
										{regular !== list ? (
											<span className="text-sm font-medium text-body-soft">
												{card.pricePrefix}
												{won(regular)}
											</span>
										) : null}
									</span>
									<span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
										<span className="text-[17px] font-bold text-ink sm:text-[19px]">
											첫 결제 {card.pricePrefix}
											{won(first)}
										</span>
										<span className="shrink-0 rounded bg-success-bg px-1.5 py-0.5 text-xs font-bold text-success">
											+ 첫 달 무료
										</span>
									</span>
									<span className="text-xs text-muted-fg">
										부가세 포함 · 가입 한 달 뒤 첫 결제(오픈특가) 후 정가로 자동
										갱신
									</span>
								</>
							)}

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
