import type * as React from "react";
import { cn } from "#/lib/utils.ts";

/**
 * GuidelineList — 회색 불릿 안내 목록 (로그인 우측 유의사항 등).
 */
function GuidelineList({ className, ...props }: React.ComponentProps<"ul">) {
	return (
		<ul
			data-slot="guideline-list"
			className={cn("flex flex-col gap-6", className)}
			{...props}
		/>
	);
}

function GuidelineItem({
	className,
	children,
	...props
}: React.ComponentProps<"li">) {
	return (
		<li
			data-slot="guideline-item"
			className={cn("flex items-start gap-3", className)}
			{...props}
		>
			<span
				aria-hidden
				className="mt-[10px] size-2 shrink-0 rounded-full bg-body"
			/>
			<span className="flex-1 text-[17px] leading-7 text-body">{children}</span>
		</li>
	);
}

export { GuidelineList, GuidelineItem };
