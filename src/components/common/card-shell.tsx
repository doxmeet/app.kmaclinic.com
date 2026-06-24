import type * as React from "react";
import { cn } from "#/lib/utils.ts";

/**
 * CardShell — 제목 헤더 밴드(막대 + 제목)를 가진 카드 (Figma "병의원" 1:11528 / 1:27156).
 * 컨테이너 자체에는 패딩이 없고, 본문(children)이 자체 패딩(p-5 sm:p-8)으로 채운다.
 * 정보 행은 InfoRows, 표는 DataTable과 조합해 쓴다. 우측 액션이 필요하면 action 슬롯을 사용한다.
 * (본문을 패딩 안에 직접 넣는 단순 카드는 SectionCard + SectionTitle을 쓴다.)
 *
 * variant로 헤더/본문 구분선 유무를 고른다 (SectionTitle과 동일 규칙).
 * - `info`(기본): 정보를 보여주기만 하는 카드. 헤더 하단 구분선 있음.
 * - `form`: 무언가를 입력받는 폼. 구분선 없음.
 */
function CardShell({
	title,
	action,
	children,
	className,
	variant = "info",
}: {
	title: React.ReactNode;
	action?: React.ReactNode;
	children: React.ReactNode;
	className?: string;
	variant?: "form" | "info";
}) {
	return (
		<section
			data-slot="card-shell"
			data-variant={variant}
			className={cn(
				"overflow-hidden rounded-xl border border-line-soft bg-surface shadow-sm",
				className,
			)}
		>
			<div
				className={cn(
					"flex items-center gap-3 p-5 sm:p-8",
					variant === "info" && "border-b border-line-soft",
				)}
			>
				<h2 className="flex flex-1 items-center gap-3 text-lg font-semibold leading-7 text-ink sm:text-2xl sm:leading-9">
					<span
						aria-hidden
						className="inline-block h-6 w-1.5 shrink-0 rounded-full bg-brand sm:h-8 sm:w-2"
					/>
					{title}
				</h2>
				{action}
			</div>
			{children}
		</section>
	);
}

export { CardShell };
