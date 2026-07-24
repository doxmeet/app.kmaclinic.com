import { Link } from "@tanstack/react-router";
import { cn } from "#/lib/utils.ts";

/**
 * BrandLogo — Pretendard Black 워드마크(브랜드 블루). 헤더/푸터 공통.
 * `to` 가 주어지면 클릭 가능한 링크(보통 홈으로)로 렌더.
 */
function BrandLogo({
	label = "KMA CLINIC",
	className,
	to,
}: {
	label?: string;
	className?: string;
	to?: string;
}) {
	const inner = (
		<span className="whitespace-nowrap text-[22px] font-black tracking-[-0.02em] text-[#1268b3]">
			{label}
		</span>
	);

	if (to) {
		return (
			<Link
				to={to}
				className={cn(
					"inline-flex items-center rounded-md transition-opacity hover:opacity-80",
					className,
				)}
			>
				{inner}
			</Link>
		);
	}

	return (
		<span className={cn("inline-flex items-center", className)}>{inner}</span>
	);
}

export { BrandLogo };
