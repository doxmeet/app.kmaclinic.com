import type * as React from "react";
import { cn } from "#/lib/utils.ts";

/** SectionTitleRow — 제목 + 우측 액션(예: 전체 수정) 배치용 */
function SectionTitleRow({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="section-title-row"
			className={cn("flex items-center justify-between gap-3", className)}
			{...props}
		/>
	);
}

export { SectionTitleRow };
