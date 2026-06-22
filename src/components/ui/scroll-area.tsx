import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import type * as React from "react";
import { cn } from "#/lib/utils.ts";

/**
 * ScrollArea — shadcn 스타일 래퍼(@base-ui/react 기반).
 * 네이티브 스크롤(Viewport)을 그대로 쓰되 커스텀 얇은 스크롤바를 덧입힌다.
 * 자동 스크롤 등 프로그램 제어가 필요하면 `viewportRef`로 Viewport(스크롤 컨테이너)를 잡아
 * `viewportRef.current?.scrollTo(...)` 처럼 직접 제어한다.
 */
function ScrollArea({
	className,
	viewportClassName,
	viewportRef,
	children,
	...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root> & {
	viewportClassName?: string;
	viewportRef?: React.Ref<HTMLDivElement>;
}) {
	return (
		<ScrollAreaPrimitive.Root
			data-slot="scroll-area"
			className={cn("relative overflow-hidden", className)}
			{...props}
		>
			<ScrollAreaPrimitive.Viewport
				ref={viewportRef}
				data-slot="scroll-area-viewport"
				// 스크롤 컨테이너는 Viewport 자신(overflow:scroll). 높이 제한(max-h 등)은
				// 여기(viewportClassName)에 줘야 스크롤된다 — Root에만 주면 h-full이 무너져 안 됨.
				className={cn(
					"w-full overscroll-contain rounded-[inherit] outline-none focus-visible:ring-3 focus-visible:ring-brand/15",
					viewportClassName,
				)}
			>
				{children}
			</ScrollAreaPrimitive.Viewport>
			<ScrollBar />
			<ScrollAreaPrimitive.Corner />
		</ScrollAreaPrimitive.Root>
	);
}

function ScrollBar({
	className,
	orientation = "vertical",
	...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Scrollbar>) {
	return (
		<ScrollAreaPrimitive.Scrollbar
			data-slot="scroll-area-scrollbar"
			orientation={orientation}
			// base-ui는 overflow가 있을 때만 마운트(keepMounted=false) → 보일 때만 렌더된다.
			className={cn(
				"z-10 flex touch-none select-none p-0.5",
				orientation === "vertical" && "h-full w-2.5",
				orientation === "horizontal" && "h-2.5 w-full flex-col",
				className,
			)}
			{...props}
		>
			<ScrollAreaPrimitive.Thumb
				data-slot="scroll-area-thumb"
				className="relative flex-1 rounded-full bg-muted-fg/40 transition-colors hover:bg-muted-fg/60"
			/>
		</ScrollAreaPrimitive.Scrollbar>
	);
}

export { ScrollArea, ScrollBar };
