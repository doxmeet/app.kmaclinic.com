import { ChevronRight, PencilLine, Search, X } from "lucide-react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "#/lib/utils.ts";

// SSR에서 useLayoutEffect 경고를 피한다 (TanStack Start는 서버 렌더).
const useIsoLayoutEffect =
	typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Autocomplete — 입력 + 서버가 준 결과 드롭다운 (자동완성 검색).
 * Figma "자동완성검색 기능"(1:13163) 기준.
 *
 * - `options`(서버 검색 결과)를 그대로 렌더 — 클라이언트 재필터는 하지 않는다.
 *   (백엔드가 한글 자모 검색을 하므로 "강ㄴ"이 "강남병원"을 돌려준다.
 *    여기서 includes("강ㄴ") 같은 부분일치로 거르면 정답이 전부 탈락한다.)
 * - 매칭되는 글자가 있으면 brand 색으로 하이라이트(자모 단계엔 매칭이 없어 원문 그대로)
 * - 검색 결과 헤더("'서울' 검색 결과 4건"), 부제(category · region)
 * - 키보드(↑/↓/Enter/Esc) + 클릭 선택, X로 초기화
 * - 결과에 없으면 "'직접 입력' 하기" 행으로 자유 입력 모드 전환
 */

export type AutocompleteOption = {
	value: string;
	label: string;
	/** 부제 (예: "의과대학 · 서울특별시 종로구") */
	description?: string;
};

function highlight(label: string, query: string) {
	if (!query) return label;
	const idx = label.toLowerCase().indexOf(query.toLowerCase());
	if (idx === -1) return label;
	return (
		<>
			{label.slice(0, idx)}
			<span className="text-brand">{label.slice(idx, idx + query.length)}</span>
			{label.slice(idx + query.length)}
		</>
	);
}

function Autocomplete({
	options,
	value,
	onChange,
	onSelect,
	onManualEntry,
	placeholder = "검색어를 입력하세요",
	className,
	"aria-invalid": ariaInvalid,
}: {
	options: AutocompleteOption[];
	value: string;
	onChange: (value: string) => void;
	onSelect?: (option: AutocompleteOption) => void;
	/** "직접 입력" 행을 노출하고 클릭 시 호출 */
	onManualEntry?: () => void;
	placeholder?: string;
	className?: string;
	"aria-invalid"?: boolean;
}) {
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(0);
	const listId = useId();
	const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	// 드롭다운을 body로 포털해 카드의 overflow-hidden에 잘리지 않게 한다.
	// 입력 박스(anchor) 위치를 기준으로 fixed 좌표를 계산한다.
	const anchorRef = useRef<HTMLDivElement>(null);
	const [panelPos, setPanelPos] = useState<{
		left: number;
		top: number;
		width: number;
	} | null>(null);

	// 결과는 서버 검색 결과(options)를 그대로 쓴다 — 클라이언트 재필터 없음(자모 검색 보존).
	const showPanel = open && (options.length > 0 || !!onManualEntry);
	// 서버 결과가 매 입력마다 바뀌므로 active 인덱스를 길이에 맞춰 클램프한다.
	const activeIndex = options.length ? Math.min(active, options.length - 1) : 0;

	// 패널이 열려 있는 동안 anchor 위치를 추적 (스크롤/리사이즈 반영).
	useIsoLayoutEffect(() => {
		if (!showPanel) {
			setPanelPos(null);
			return;
		}
		const update = () => {
			const el = anchorRef.current;
			if (!el) return;
			const r = el.getBoundingClientRect();
			// 패널은 body로 포털된 fixed 요소라 anchor 폭/위치를 그대로 쓰면
			// 좁은 화면에서 화면 밖으로 밀려날 수 있다 → 뷰포트 안으로 클램프한다.
			const margin = 8;
			const vw = document.documentElement.clientWidth;
			const width = Math.min(r.width, vw - margin * 2);
			const left = Math.max(margin, Math.min(r.left, vw - width - margin));
			setPanelPos({ left, top: r.bottom + 8, width });
		};
		update();
		window.addEventListener("scroll", update, true);
		window.addEventListener("resize", update);
		return () => {
			window.removeEventListener("scroll", update, true);
			window.removeEventListener("resize", update);
		};
	}, [showPanel]);

	function commit(opt: AutocompleteOption) {
		onChange(opt.label);
		onSelect?.(opt);
		setOpen(false);
	}

	function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (!showPanel) {
			if (e.key === "ArrowDown") setOpen(true);
			return;
		}
		if (e.key === "ArrowDown") {
			e.preventDefault();
			setActive((a) => Math.min(a + 1, options.length - 1));
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			setActive((a) => Math.max(a - 1, 0));
		} else if (e.key === "Enter") {
			// 엔터는 모호하지 않을 때만 동작한다(실수 선택 방지):
			//  - 결과가 정확히 1건  → 그 항목을 선택
			//  - 결과가 0건이라 "직접 입력"만 떠 있음 → 직접 입력 실행
			//  - 결과가 여러 건이면 아무 동작도 안 함(명시적 클릭/방향키 선택만 허용)
			e.preventDefault();
			if (options.length === 1) {
				commit(options[0]);
			} else if (options.length === 0 && onManualEntry) {
				onManualEntry();
				setOpen(false);
			}
		} else if (e.key === "Escape") {
			setOpen(false);
		}
	}

	return (
		<div className={cn("relative w-full", className)}>
			<div
				ref={anchorRef}
				className={cn(
					"flex h-14 items-center gap-2 rounded-lg border-2 bg-surface px-4 transition-colors",
					ariaInvalid
						? "border-danger-strong"
						: open
							? "border-brand"
							: "border-line",
				)}
			>
				<input
					type="text"
					// ARIA 1.2 콤보박스 패턴: input에는 role="combobox"가 필요하다
					// (네이티브 input의 암시 role은 textbox이므로 중복이 아님). 오탐 억제.
					// react-doctor-disable-next-line no-redundant-roles
					role="combobox"
					aria-label="검색어 입력"
					aria-expanded={showPanel}
					aria-controls={listId}
					aria-autocomplete="list"
					aria-invalid={ariaInvalid}
					value={value}
					placeholder={placeholder}
					onChange={(e) => {
						onChange(e.target.value);
						setOpen(true);
						setActive(0);
					}}
					onFocus={() => setOpen(true)}
					onBlur={() => {
						blurTimer.current = setTimeout(() => setOpen(false), 120);
					}}
					onKeyDown={onKeyDown}
					className="h-full min-w-0 flex-1 bg-transparent text-[17px] text-ink-soft outline-none placeholder:text-muted-fg"
				/>
				{value ? (
					<button
						type="button"
						aria-label="지우기"
						onMouseDown={(e) => e.preventDefault()}
						onClick={() => {
							onChange("");
							setOpen(true);
						}}
						className="flex size-5 items-center justify-center rounded-full bg-muted-fg/60 text-white transition-colors hover:bg-muted-fg"
					>
						<X className="size-3" />
					</button>
				) : null}
				<span className="h-4 w-px bg-line" aria-hidden />
				<Search className="size-4 shrink-0 text-brand" aria-hidden />
			</div>

			{showPanel && panelPos && typeof document !== "undefined"
				? createPortal(
						<div
							id={listId}
							// ARIA 콤보박스 팝업은 헤더·설명·직접입력 행 등 리치 마크업을 담아야 해
							// <datalist>(option 전용)로 대체할 수 없다. role="listbox"가 올바른 패턴 — 오탐 억제.
							// react-doctor-disable-next-line prefer-tag-over-role
							role="listbox"
							tabIndex={-1}
							aria-label="검색 결과"
							style={{
								left: panelPos.left,
								top: panelPos.top,
								width: panelPos.width,
							}}
							onMouseDown={() => {
								if (blurTimer.current) clearTimeout(blurTimer.current);
							}}
							className="fixed z-50 flex max-h-[440px] max-w-[calc(100vw-16px)] flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-[0_2px_8px_rgba(0,0,0,0.07),0_8px_32px_rgba(42,100,246,0.1)]"
						>
							{/* 결과 헤더 */}
							<div className="flex items-center gap-2 border-b border-line-soft px-4 py-2.5 text-base">
								<Search className="size-3 shrink-0 text-muted-fg" aria-hidden />
								{value.trim() ? (
									<>
										<span className="min-w-0 truncate text-muted-fg">
											'{value}' 검색 결과
										</span>
										<span className="shrink-0 text-brand">
											{options.length}건
										</span>
									</>
								) : (
									<span className="text-muted-fg">검색어를 입력해주세요</span>
								)}
							</div>

							<div className="flex-1 overflow-y-auto">
								{options.map((opt, i) => {
									const isActive = i === activeIndex;
									return (
										<button
											key={opt.value}
											type="button"
											role="option"
											aria-selected={isActive}
											onMouseEnter={() => setActive(i)}
											onClick={() => commit(opt)}
											className={cn(
												"flex w-full flex-col items-start gap-0.5 border-t border-line-soft px-4 py-4 text-left transition-colors first:border-t-0",
												isActive ? "bg-brand-50" : "hover:bg-app-bg",
											)}
										>
											<span className="break-keep text-[18px] text-ink-soft">
												{highlight(opt.label, value)}
											</span>
											{opt.description ? (
												<span className="break-keep text-base text-muted-fg">
													{opt.description}
												</span>
											) : null}
										</button>
									);
								})}
							</div>

							{/* 직접 입력 행 */}
							{onManualEntry ? (
								<button
									type="button"
									onClick={() => {
										onManualEntry();
										setOpen(false);
									}}
									className="flex items-center justify-between gap-3 border-t border-line bg-app-bg px-4 py-4 text-left transition-colors hover:bg-line-soft"
								>
									<span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-body">
										<PencilLine className="size-3.5" />
									</span>
									<span className="flex min-w-0 flex-1 flex-col gap-0.5">
										<span className="text-[17px] break-keep text-body">
											리스트에 없는 경우:{" "}
											<span className="text-brand underline">
												'직접 입력' 하기
											</span>
										</span>
										<span className="text-sm text-muted-fg">
											검색 결과에 없으면 직접 입력해 주세요
										</span>
									</span>
									<ChevronRight className="size-4 shrink-0 text-muted-fg" />
								</button>
							) : null}
						</div>,
						document.body,
					)
				: null}
		</div>
	);
}

export { Autocomplete };
