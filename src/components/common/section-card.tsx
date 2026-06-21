import type * as React from "react";
import { cn } from "#/lib/utils.ts";

/**
 * SectionCard — 흰색 카드 컨테이너 (앱 화면 공통).
 * 병원 정보 확인/관리 등 정보 블록의 기본 그릇.
 */
function SectionCard({ className, ...props }: React.ComponentProps<"section">) {
	return (
		<section
			data-slot="section-card"
			className={cn(
				"rounded-2xl border border-line bg-surface p-6 sm:p-7",
				className,
			)}
			{...props}
		/>
	);
}

/** SectionTitle — 앞에 파란 막대가 붙는 섹션 제목 */
function SectionTitle({
	className,
	children,
	as: Tag = "h2",
	...props
}: React.ComponentProps<"h2"> & { as?: "h2" | "h3" }) {
	return (
		<Tag
			data-slot="section-title"
			className={cn("flex items-center text-lg font-bold text-ink", className)}
			{...props}
		>
			<span
				aria-hidden
				className="mr-2 inline-block h-[18px] w-1 shrink-0 rounded-full bg-brand"
			/>
			{children}
		</Tag>
	);
}

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

export { SectionCard, SectionTitle, SectionTitleRow };
