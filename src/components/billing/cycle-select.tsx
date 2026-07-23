import { Check, Tag } from "lucide-react";
import monthArt from "#/assets/month.png";
import yearArt from "#/assets/year.png";
import {
	amountForCycle,
	type BillingCycle,
	firstAmountForCycle,
} from "#/lib/api/billing.ts";
import { cn } from "#/lib/utils.ts";

/**
 * 결제 주기 선택 카드 — 가입 결제(commit-complete)와 구독 관리(주기 변경)에서 공유한다.
 * 금액은 billing.ts 단일 출처(정가=amountForCycle, 첫 결제=firstAmountForCycle).
 *
 * `pricing`으로 표기를 분기한다(가이드 §2·§7):
 * - `intro`(가입): 첫 결제 금액 중심 + 무료 혜택(체크)·결제 시점(태그) 안내.
 * - `renewal`(주기 변경): 정가(갱신가)만 — 무료달·특가는 병원당 최초 1회뿐이라 갱신 화면엔 노출 금지.
 */
const CYCLE_CARDS: ReadonlyArray<{
	value: BillingCycle;
	title: string;
	/** 가격 줄 접두사("연 "/"월 "). */
	pricePrefix: string;
	/** 우측 상단 회색 알약 라벨(월간). */
	note?: string;
	/** 제목 옆 강조 배지(가입 화면에서만 노출). */
	badges?: ReadonlyArray<{ label: string; tone: "brand" | "success" }>;
	/** 무료 혜택 한 줄(가입 화면, 파란 체크). */
	perk: string;
	/** 결제 시점 안내 한 줄(가입 화면, 태그 아이콘). */
	schedule: string;
}> = [
	{
		value: "annual",
		title: "정기 결제 (연간 구독)",
		pricePrefix: "연 ",
		badges: [
			{ label: "추천", tone: "brand" },
			{ label: "연간 혜택", tone: "success" },
		],
		perk: "첫 달 무료 + 연간 구독 시 2달 무료 (총 3달 무료)",
		schedule: "첫달 사용 후 최초 결제, 이후 1년마다 자동 결제",
	},
	{
		value: "monthly",
		title: "정기 결제 (월간 구독)",
		pricePrefix: "월 ",
		note: "매월 자동 결제",
		perk: "첫 달 무료",
		schedule: `다음 달부터 월 ${firstAmountForCycle("monthly").toLocaleString("ko-KR")}원 자동 결제`,
	},
];

const won = (amount: number) => `${amount.toLocaleString("ko-KR")}원`;

/** 보조 라벨 알약(매월 자동 결제) — 테두리 없는 연한 파랑 배경(시안). */
const noteChipClass =
	"shrink-0 rounded-full bg-brand-50 px-3 py-1 text-[15px] text-body-soft";

/** 카드 우측 장식 — 캘린더 일러스트(연간=체크, 월간=갱신 배지, src/assets 시안 에셋). */
function CalendarArt({ variant }: { variant: BillingCycle }) {
	return (
		<img
			src={variant === "annual" ? yearArt : monthArt}
			alt=""
			aria-hidden
			className="hidden size-24 shrink-0 self-end object-contain sm:block"
		/>
	);
}

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
	/** 가격 표기 모드. `intro`=가입(첫 결제가/무료 혜택), `renewal`=주기 변경(정가만). 기본 `intro`. */
	pricing?: "intro" | "renewal";
	disabled?: boolean;
	className?: string;
}) {
	const cards = cycles
		? CYCLE_CARDS.filter((c) => cycles.includes(c.value))
		: CYCLE_CARDS;
	const intro = pricing === "intro";

	return (
		<div className={cn("flex flex-col gap-4", className)}>
			{cards.map((card) => {
				const selected = value === card.value;
				const regular = amountForCycle(card.value); // 정가(갱신가)
				const first = firstAmountForCycle(card.value); // 오픈특가(첫 결제 1회)

				return (
					<button
						key={card.value}
						type="button"
						disabled={disabled}
						onClick={() => onChange(card.value)}
						aria-pressed={selected}
						className={cn(
							// 선택 시 두께가 변하지 않도록 보더는 늘 1px, 강조는 안쪽 링(그림자)으로 얹는다.
							"relative flex w-full items-center gap-4 rounded-2xl border bg-surface p-6 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
							selected
								? "border-brand ring-1 ring-inset ring-brand"
								: "border-line-soft hover:border-brand/40",
						)}
					>
						{/* 라디오 */}
						<span
							className={cn(
								"mt-1 flex size-6 shrink-0 items-center justify-center self-start rounded-full border-2",
								selected ? "border-brand" : "border-line-soft",
							)}
						>
							{selected ? (
								<span className="size-3 rounded-full bg-brand" />
							) : null}
						</span>

						{/* 내용 */}
						<span className="flex min-w-0 flex-1 flex-col gap-1.5">
							<span className="flex flex-wrap items-center gap-2">
								<span className="text-[16px] font-semibold text-ink sm:text-[17px]">
									{card.title}
								</span>
								{/* 보조 라벨(매월 자동 결제) — 연간 카드의 배지와 같은 자리(제목 옆). */}
								{card.note ? (
									<span className={noteChipClass}>{card.note}</span>
								) : null}
								{intro
									? card.badges?.map((b) => (
											<span
												key={b.label}
												className={cn(
													"shrink-0 rounded-full px-2.5 py-0.5 text-[15px] font-semibold",
													b.tone === "brand"
														? "bg-brand text-brand-foreground"
														: "border border-success-border bg-success-bg text-success",
												)}
											>
												{b.label}
											</span>
										))
									: null}
							</span>

							{intro ? (
								/* 가입: 첫 결제 금액 중심(정가 안내는 화면 상단 카피가 담당). */
								<>
									<span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
										<span className="text-[24px] font-bold text-ink sm:text-[26px]">
											{card.pricePrefix}
											{won(first)}
										</span>
										{card.value === "annual" ? (
											<span className="text-base text-body-soft">
												월 {won(Math.round(first / 12))} 수준
											</span>
										) : null}
									</span>
									<span className="flex items-start gap-1.5 text-[15px] font-semibold text-brand sm:text-base">
										<Check className="mt-0.5 size-4 shrink-0" strokeWidth={3} />
										{card.perk}
									</span>
									<span className="flex items-start gap-1.5 text-[15px] text-muted-fg">
										<Tag className="mt-0.5 size-4 shrink-0" />
										{card.schedule}
									</span>
								</>
							) : (
								/* 주기 변경: 정가(갱신가)만 — 다음 결제일부터 적용. */
								<span className="text-[16px] font-semibold text-ink sm:text-[17px]">
									{card.pricePrefix}
									{won(regular)} (부가세 포함)
								</span>
							)}
						</span>

						<CalendarArt variant={card.value} />
					</button>
				);
			})}
		</div>
	);
}
