import type * as React from "react";
import { cn } from "#/lib/utils.ts";

/**
 * 디자인 폼 입력 (높이 56px / radius 8px / 본문 17px).
 * shadcn Input을 디자인 사이즈에 맞춰 개조한 버전.
 * aria-invalid 시 빨간 테두리(2px)로 전환된다.
 */
const fieldControlBase =
	"w-full rounded-lg border border-line bg-surface text-[17px] text-ink transition-colors outline-none placeholder:text-muted-fg disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/15 aria-invalid:border-2 aria-invalid:border-danger-strong aria-invalid:focus-visible:ring-danger-strong/15";

function FieldInput({
	className,
	endAdornment,
	containerClassName,
	...props
}: React.ComponentProps<"input"> & {
	endAdornment?: React.ReactNode;
	containerClassName?: string;
}) {
	const input = (
		<input
			data-slot="field-input"
			className={cn(
				fieldControlBase,
				"h-14 px-4",
				endAdornment ? "pr-16" : undefined,
				className,
			)}
			{...props}
		/>
	);

	if (!endAdornment) return input;

	return (
		<div className={cn("relative w-full", containerClassName)}>
			{input}
			<div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm">
				{endAdornment}
			</div>
		</div>
	);
}

function FieldTextarea({
	className,
	...props
}: React.ComponentProps<"textarea">) {
	return (
		<textarea
			data-slot="field-textarea"
			className={cn(
				fieldControlBase,
				"min-h-28 px-4 py-3 leading-relaxed",
				className,
			)}
			{...props}
		/>
	);
}

export { FieldInput, FieldTextarea, fieldControlBase };
