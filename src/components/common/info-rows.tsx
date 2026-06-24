import type * as React from "react";
import { cn } from "#/lib/utils.ts";

/**
 * InfoRows — 라벨/값 정보 행 (Figma "병의원" 1:27156 / 1:11534).
 * 모바일: 라벨 위·값 아래 세로 스택, PC: 56px 행 + 행간 구분선 + 고정 140px 라벨 열.
 * 패딩 없는 카드(CardShell)의 본문으로 쓰도록 PC에서 카드 폭 전체로 꽉 차게(full-bleed) 그린다.
 * 카드 패딩이 있는 컨테이너(SectionCard 등)에는 DataList/DataRow를 쓴다.
 */
function InfoRows({
	rows,
	className,
}: {
	rows: Array<{ label: string; value: React.ReactNode }>;
	className?: string;
}) {
	return (
		<dl className={cn("flex flex-col gap-5 p-5 sm:gap-0 sm:p-0", className)}>
			{rows.map((row) => (
				<div
					key={row.label}
					className="flex flex-col gap-1 sm:h-14 sm:flex-row sm:items-center sm:gap-0 sm:border-b sm:border-line-soft sm:px-8 sm:last:border-b-0"
				>
					<dt className="text-[14px] text-body-soft sm:w-[140px] sm:shrink-0 sm:text-[17px]">
						{row.label}
					</dt>
					<dd className="text-[16px] text-ink sm:text-[17px]">{row.value}</dd>
				</div>
			))}
		</dl>
	);
}

export { InfoRows };
