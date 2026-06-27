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
				"overflow-hidden rounded-xl border border-line-soft bg-surface p-6 shadow-sm sm:p-7",
				className,
			)}
			{...props}
		/>
	);
}

/** 파란 알약 막대 + 24px(모바일 18px) SemiBold 공통 베이스. */
const sectionTitleBase =
	"flex items-center gap-3 text-lg font-semibold leading-7 text-ink sm:text-2xl sm:leading-9";

const sectionTitleVariants = {
	/**
	 * form — 입력 폼용. 헤더와 본문 사이 구분선이 없다 (Figma "병의원" 1:21134).
	 * 제목만 카드 패딩 안에 자연스럽게 놓이고, 본문 간격은 부모의 gap이나 className(mb-*)이 담당한다.
	 */
	form: "",
	/**
	 * info — 정보 표시용. 카드 패딩(p-6 sm:p-7)을 음수 마진으로 상쇄해 헤더를 카드 폭 전체로
	 * 꽉 차게(full-bleed) 펴고, 헤더와 본문 사이에 하단 구분선을 그린다 (Figma "병의원" 1:11528).
	 */
	info: "-mx-6 -mt-6 self-stretch border-b border-line-soft px-6 py-5 sm:-mx-7 sm:-mt-7 sm:px-7 sm:py-6",
} as const;

/**
 * SectionTitle — 카드 상단의 제목 (파란 알약 막대 + 제목).
 * variant로 헤더/본문 구분선 유무를 고른다.
 * - `form`(기본): 무언가를 입력받는 폼. 구분선 없음.
 * - `info`: 정보를 보여주기만 하는 카드. 하단 구분선 있음.
 */
function SectionTitle({
	className,
	children,
	as: Tag = "h2",
	variant = "form",
	...props
}: React.ComponentProps<"h2"> & {
	as?: "h2" | "h3";
	variant?: keyof typeof sectionTitleVariants;
}) {
	return (
		<Tag
			data-slot="section-title"
			data-variant={variant}
			className={cn(sectionTitleBase, sectionTitleVariants[variant], className)}
			{...props}
		>
			<span
				aria-hidden
				className="inline-block h-6 w-1.5 shrink-0 rounded-full bg-brand sm:h-8 sm:w-2"
			/>
			{children}
		</Tag>
	);
}

export { SectionCard, SectionTitle };
