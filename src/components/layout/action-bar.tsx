import type * as React from "react";
import { cn } from "#/lib/utils.ts";

/**
 * StickyActionBar — 화면 하단에 고정되는 액션 바.
 * 좌(보조 액션) / 중앙(안내문) / 우(주요 액션) 슬롯.
 */
function StickyActionBar({
	left,
	center,
	right,
	className,
}: {
	left?: React.ReactNode;
	center?: React.ReactNode;
	right?: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"sticky bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur",
				className,
			)}
		>
			<div className="mx-auto flex max-w-[1100px] items-center gap-2 px-3 py-3 sm:gap-3 sm:px-6">
				<div className="flex shrink-0 items-center gap-2">{left}</div>
				<div className="hidden flex-1 justify-center text-center text-sm text-body sm:flex">
					{center}
				</div>
				<div className="ml-auto flex shrink-0 items-center gap-2 sm:ml-0">
					{right}
				</div>
			</div>
		</div>
	);
}

/**
 * PageActions — 페이지 하단의 중앙 정렬 버튼 행 (이전으로 / 다음 단계 등).
 */
function PageActions({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="page-actions"
			className={cn(
				"flex flex-col-reverse items-stretch justify-center gap-3 sm:flex-row sm:items-center",
				className,
			)}
			{...props}
		/>
	);
}

export { StickyActionBar, PageActions };
