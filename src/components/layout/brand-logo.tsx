import { Link } from "@tanstack/react-router";
import { cn } from "#/lib/utils.ts";

/**
 * BrandLogo — "D" 마크 + 서비스명. 헤더/푸터 공통.
 * `to` 가 주어지면 클릭 가능한 링크(보통 홈으로)로 렌더.
 */
function BrandLogo({
	label = "서비스명",
	className,
	markClassName,
	to,
}: {
	label?: string;
	className?: string;
	markClassName?: string;
	to?: string;
}) {
	const inner = (
		<>
			<span
				aria-hidden
				className={cn(
					"flex size-7 items-center justify-center rounded-lg bg-brand text-sm font-bold text-brand-foreground",
					markClassName,
				)}
			>
				K
			</span>
			<span className="text-base font-bold text-ink">{label}</span>
		</>
	);

	if (to) {
		return (
			<Link
				to={to}
				className={cn(
					"inline-flex items-center gap-2 rounded-md transition-opacity hover:opacity-80",
					className,
				)}
			>
				{inner}
			</Link>
		);
	}

	return (
		<span className={cn("inline-flex items-center gap-2", className)}>
			{inner}
		</span>
	);
}

export { BrandLogo };
