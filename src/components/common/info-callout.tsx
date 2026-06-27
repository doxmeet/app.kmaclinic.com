import type * as React from "react";
import { cn } from "#/lib/utils.ts";

const toneStyles = {
	info: "border-brand-100 bg-brand-50 text-body",
	success: "border-success-border bg-success-bg text-body",
	warning: "border-amber-200 bg-warning-bg text-body",
	danger: "border-red-200 bg-danger-bg text-body",
} as const;

/**
 * InfoCallout — 안내/강조 박스 (연한 배경 + 테두리).
 * 로그인 안내, 결제 안내, 알림 배너 등에 재사용.
 */
function InfoCallout({
	className,
	tone = "info",
	icon,
	children,
	...props
}: React.ComponentProps<"div"> & {
	tone?: keyof typeof toneStyles;
	icon?: React.ReactNode;
}) {
	return (
		<div
			data-slot="info-callout"
			className={cn(
				"flex gap-2.5 rounded-xl border p-5 text-base leading-relaxed",
				toneStyles[tone],
				className,
			)}
			{...props}
		>
			{icon ? <span className="mt-0.5 shrink-0">{icon}</span> : null}
			<div className="min-w-0 flex-1">{children}</div>
		</div>
	);
}

export { InfoCallout };
