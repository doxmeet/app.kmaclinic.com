import { createContext, use, useId, useMemo } from "react";
import { cn } from "#/lib/utils.ts";

/**
 * OptionGroup / OptionButton — 분절형(segmented) 선택 컨트롤.
 * 통신사 선택(SKT/KT/LGU+/알뜰폰), 결제수단, 유형 선택 등에 재사용.
 * - box(기본): 선택 bg-brand-50 / border-brand / text-brand, 미선택 bg-surface / border-line.
 * - pill: 알약형(의사프로필 Figma 1:18531 — 학위/구분처럼 짧은 선택지). 선택 시 브랜드색 채움.
 */
type OptionGroupContextValue = {
	name: string;
	value: string | undefined;
	onValueChange?: (value: string) => void;
};

const OptionGroupContext = createContext<OptionGroupContextValue | null>(null);

function OptionGroup({
	value,
	onValueChange,
	name,
	className,
	children,
	...props
}: Omit<React.ComponentProps<"div">, "onChange"> & {
	value?: string;
	onValueChange?: (value: string) => void;
	name?: string;
}) {
	const generatedName = useId();
	const contextValue = useMemo(
		() => ({ name: name ?? generatedName, value, onValueChange }),
		[name, generatedName, value, onValueChange],
	);
	return (
		<OptionGroupContext.Provider value={contextValue}>
			<div
				data-slot="option-group"
				role="radiogroup"
				className={cn("flex w-full flex-wrap gap-3", className)}
				{...props}
			>
				{children}
			</div>
		</OptionGroupContext.Provider>
	);
}

function OptionButton({
	value,
	className,
	children,
	disabled,
	fluid,
	variant = "box",
	...props
}: Omit<React.ComponentProps<"button">, "value"> & {
	value: string;
	/** 남은 공간을 균등 분할 (flex-1) */
	fluid?: boolean;
	/** box(기본): 분절 버튼. pill: 알약형 — 학위/구분처럼 짧은 선택지. */
	variant?: "box" | "pill";
}) {
	const ctx = use(OptionGroupContext);
	const selected = ctx?.value === value;
	return (
		// biome-ignore lint/a11y/useSemanticElements: 분절형(segmented) 선택 컨트롤 — 버튼 + radio role 패턴 (shadcn/radix ToggleGroup 동일)
		<button
			type="button"
			role="radio"
			aria-checked={selected}
			disabled={disabled}
			data-state={selected ? "on" : "off"}
			onClick={() => ctx?.onValueChange?.(value)}
			className={cn(
				"flex min-w-0 items-center justify-center whitespace-nowrap transition-colors outline-none select-none",
				"focus-visible:ring-3 focus-visible:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-50",
				variant === "box"
					? cn(
							"h-14 rounded-xl border-2 px-3 text-base font-normal sm:px-6",
							selected
								? "border-brand bg-brand-50 font-medium text-brand"
								: "border-line bg-surface text-body hover:border-line-strong",
						)
					: cn(
							"rounded-full border px-4 py-2 text-[15px]",
							selected
								? "border-brand bg-brand font-semibold text-brand-foreground"
								: "border-line bg-surface text-body-soft hover:border-line-strong",
						),
				fluid && "flex-1",
				className,
			)}
			{...props}
		>
			{children}
		</button>
	);
}

export { OptionGroup, OptionButton };
