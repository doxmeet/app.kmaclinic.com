import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Button } from "#/components/ui/button.tsx";
import { cn } from "#/lib/utils.ts";

/**
 * Calendar — 자체 구현(React만) 달력 / 날짜 선택기.
 * Figma "달력"(1:13458) 기준. 외부 날짜 라이브러리 미사용.
 *
 * - 월 헤더(이전/다음 + 연·월 + 월 드롭다운)
 * - 요일 행(일~토, 일=빨강 / 토=파랑)
 * - 7열 날짜 그리드(이번 달 + 앞뒤 달 흐림 처리)
 * - 선택 상태(단일 / 범위), 오늘 표시
 * - 취소 / 선택 완료 푸터 버튼
 *
 * mode="single": value=Date|null, onChange(Date)
 * mode="range":  value={start,end}, onChange({start,end})
 */

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;
const MONTH_LABELS = Array.from({ length: 12 }, (_, i) => `${i + 1}월`);

export type DateRange = { start: Date | null; end: Date | null };

type SingleProps = {
	mode?: "single";
	value?: Date | null;
	onChange?: (date: Date) => void;
};

type RangeProps = {
	mode: "range";
	value?: DateRange;
	onChange?: (range: DateRange) => void;
};

type CalendarProps = (SingleProps | RangeProps) & {
	/** 처음 보여줄 달 (기본: 오늘) */
	defaultMonth?: Date;
	onCancel?: () => void;
	onConfirm?: () => void;
	className?: string;
};

function startOfDay(d: Date) {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameDay(a: Date | null | undefined, b: Date | null | undefined) {
	if (!a || !b) return false;
	return (
		a.getFullYear() === b.getFullYear() &&
		a.getMonth() === b.getMonth() &&
		a.getDate() === b.getDate()
	);
}

const weekday = (idx: number) =>
	idx === 0
		? "text-danger-strong"
		: idx === 6
			? "text-brand"
			: "text-body-soft";

/** 그리드에 그릴 6주 × 7일 셀 목록 (앞뒤 달 포함) */
function buildGrid(viewYear: number, viewMonth: number) {
	const first = new Date(viewYear, viewMonth, 1);
	const startWeekday = first.getDay(); // 0=일
	const gridStart = new Date(viewYear, viewMonth, 1 - startWeekday);
	return Array.from({ length: 42 }, (_, i) => {
		const date = new Date(
			gridStart.getFullYear(),
			gridStart.getMonth(),
			gridStart.getDate() + i,
		);
		return { date, inMonth: date.getMonth() === viewMonth };
	});
}

function Calendar(props: CalendarProps) {
	const {
		mode = "single",
		defaultMonth,
		onCancel,
		onConfirm,
		className,
	} = props;

	const today = useMemo(() => startOfDay(new Date()), []);
	const initial = defaultMonth ?? today;
	const [view, setView] = useState({
		year: initial.getFullYear(),
		month: initial.getMonth(),
	});
	const [monthOpen, setMonthOpen] = useState(false);
	const monthBtnRef = useRef<HTMLButtonElement>(null);

	const cells = useMemo(
		() => buildGrid(view.year, view.month),
		[view.year, view.month],
	);

	const goPrev = () =>
		setView((v) =>
			v.month === 0
				? { year: v.year - 1, month: 11 }
				: { year: v.year, month: v.month - 1 },
		);
	const goNext = () =>
		setView((v) =>
			v.month === 11
				? { year: v.year + 1, month: 0 }
				: { year: v.year, month: v.month + 1 },
		);

	const range: DateRange | null =
		mode === "range" ? ((props.value as DateRange | undefined) ?? null) : null;
	const single: Date | null =
		mode === "single"
			? ((props.value as Date | null | undefined) ?? null)
			: null;

	function handlePick(date: Date) {
		if (mode === "range") {
			const r = range ?? { start: null, end: null };
			// start 없음 || 둘 다 있음 → 새 시작점
			if (!r.start || (r.start && r.end)) {
				(props.onChange as RangeProps["onChange"])?.({
					start: date,
					end: null,
				});
				return;
			}
			// start 있고 end 없음 → 끝점 (역순이면 스왑)
			if (date < r.start) {
				(props.onChange as RangeProps["onChange"])?.({
					start: date,
					end: r.start,
				});
			} else {
				(props.onChange as RangeProps["onChange"])?.({
					start: r.start,
					end: date,
				});
			}
			return;
		}
		(props.onChange as SingleProps["onChange"])?.(date);
	}

	function cellState(date: Date) {
		if (mode === "single") {
			return {
				selected: isSameDay(single, date),
				rangeStart: false,
				rangeEnd: false,
				inRange: false,
			};
		}
		const r = range;
		const rangeStart = isSameDay(r?.start, date);
		const rangeEnd = isSameDay(r?.end, date);
		const inRange =
			!!r?.start &&
			!!r?.end &&
			date > r.start &&
			date < r.end &&
			!rangeStart &&
			!rangeEnd;
		return { selected: false, rangeStart, rangeEnd, inRange };
	}

	return (
		<div
			className={cn(
				"flex w-[420px] max-w-full flex-col overflow-hidden rounded-2xl border border-line-soft bg-surface shadow-[0_8px_10px_0_rgba(0,0,0,0.1),0_10px_25px_0_rgba(0,0,0,0.1)]",
				className,
			)}
		>
			{/* 헤더 */}
			<div className="flex items-center justify-between border-b border-line-soft px-6 py-5">
				<button
					type="button"
					onClick={goPrev}
					aria-label="이전 달"
					className="flex size-10 items-center justify-center rounded-lg bg-app-bg text-body transition-colors hover:bg-line-soft"
				>
					<ChevronLeft className="size-5" />
				</button>

				<div className="relative">
					<button
						ref={monthBtnRef}
						type="button"
						onClick={() => setMonthOpen((o) => !o)}
						aria-expanded={monthOpen}
						className="flex items-center gap-1 rounded-md px-1 py-0.5 text-[19px] text-ink-soft transition-colors hover:bg-app-bg"
					>
						<span>
							{view.year}년 {view.month + 1}월
						</span>
						<ChevronDown
							className={cn(
								"size-3.5 text-body-soft transition-transform",
								monthOpen && "rotate-180",
							)}
						/>
					</button>

					{monthOpen ? (
						<>
							{/* 바깥 클릭 닫기 */}
							<button
								type="button"
								aria-hidden
								tabIndex={-1}
								onClick={() => setMonthOpen(false)}
								className="fixed inset-0 z-10 cursor-default"
							/>
							<div className="absolute top-full left-1/2 z-20 mt-2 grid w-[200px] -translate-x-1/2 grid-cols-3 gap-1 rounded-xl border border-line bg-surface p-3 shadow-[0_8px_5px_rgba(0,0,0,0.1),0_20px_12px_rgba(0,0,0,0.1)]">
								{MONTH_LABELS.map((label, m) => {
									const active = m === view.month;
									return (
										<button
											key={label}
											type="button"
											onClick={() => {
												setView((v) => ({ ...v, month: m }));
												setMonthOpen(false);
											}}
											className={cn(
												"flex h-9 items-center justify-center rounded-lg text-sm transition-colors",
												active
													? "bg-brand text-brand-foreground"
													: "text-ink hover:bg-app-bg",
											)}
										>
											{label}
										</button>
									);
								})}
							</div>
						</>
					) : null}
				</div>

				<button
					type="button"
					onClick={goNext}
					aria-label="다음 달"
					className="flex size-10 items-center justify-center rounded-lg bg-app-bg text-body transition-colors hover:bg-line-soft"
				>
					<ChevronRight className="size-5" />
				</button>
			</div>

			{/* 범위 요약(시작일/종료일) */}
			{mode === "range" ? (
				<div className="border-b border-line-soft bg-app-bg px-6 py-4">
					<div className="flex items-center justify-between rounded-2xl bg-app-bg">
						<div className="flex flex-col gap-0.5">
							<span className="text-base text-muted-fg">시작일</span>
							<span className="text-[17px] text-ink-soft">
								{range?.start ? formatKo(range.start) : "-"}
							</span>
						</div>
						<ChevronRight className="size-5 text-muted-fg" aria-hidden />
						<div className="flex flex-col gap-0.5 text-right">
							<span className="text-base text-muted-fg">종료일</span>
							<span className="text-[17px] text-ink-soft">
								{range?.end ? formatKo(range.end) : "-"}
							</span>
						</div>
					</div>
				</div>
			) : null}

			{/* 요일 행 */}
			<div className="grid grid-cols-7 border-b border-line-soft bg-app-bg/50">
				{WEEKDAY_LABELS.map((d, i) => (
					<div
						key={d}
						className={cn(
							"flex h-12 items-center justify-center text-[17px]",
							weekday(i),
						)}
					>
						{d}
					</div>
				))}
			</div>

			{/* 날짜 그리드 */}
			<div className="grid grid-cols-7 p-2">
				{cells.map(({ date, inMonth }) => {
					const dow = date.getDay();
					const { selected, rangeStart, rangeEnd, inRange } = cellState(date);
					const isToday = isSameDay(today, date);
					const highlighted = selected || rangeStart || rangeEnd;

					return (
						<div
							key={date.toISOString()}
							className={cn(
								"relative flex h-14 items-center justify-center",
								inRange && "bg-brand-50",
								rangeStart && inMonth && "rounded-l-full bg-brand-50",
								rangeEnd && inMonth && "rounded-r-full bg-brand-50",
							)}
						>
							<button
								type="button"
								onClick={() => handlePick(date)}
								aria-pressed={highlighted}
								aria-current={isToday ? "date" : undefined}
								className={cn(
									"flex size-[46px] items-center justify-center rounded-full text-[17px] transition-colors",
									!inMonth && "text-line-strong",
									inMonth &&
										!highlighted &&
										!inRange &&
										dow === 0 &&
										"text-danger-strong",
									inMonth &&
										!highlighted &&
										!inRange &&
										dow === 6 &&
										"text-brand",
									inMonth &&
										!highlighted &&
										!inRange &&
										dow !== 0 &&
										dow !== 6 &&
										"text-ink",
									inMonth && inRange && "text-brand",
									inMonth && !highlighted && "hover:bg-line-soft",
									highlighted && "bg-brand font-medium text-brand-foreground",
									isToday &&
										!highlighted &&
										"font-semibold ring-1 ring-brand/40 ring-inset",
								)}
							>
								{date.getDate()}
							</button>
						</div>
					);
				})}
			</div>

			{/* 푸터 */}
			<div className="flex gap-2 px-6 pt-1 pb-6">
				<Button
					type="button"
					variant="neutral-outline"
					onClick={onCancel}
					className="h-[58px] w-[121px] rounded-lg border-0 bg-line-soft text-[17px] text-body-soft hover:bg-line-strong"
				>
					취소
				</Button>
				<Button
					type="button"
					variant="brand"
					onClick={onConfirm}
					className="h-[58px] flex-1 rounded-lg text-[17px]"
				>
					선택 완료
				</Button>
			</div>
		</div>
	);
}

function formatKo(d: Date) {
	return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export { Calendar };
