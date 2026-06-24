import type * as React from "react";
import { cn } from "#/lib/utils.ts";

/**
 * DataList / DataRow — 라벨↔값 정보 목록 (병원 정보 확인/관리 카드).
 * 행마다 옅은 구분선, 라벨은 회색·고정폭, 값은 본문색.
 */
function DataList({ className, ...props }: React.ComponentProps<"dl">) {
	return (
		<dl
			data-slot="data-list"
			className={cn("divide-y divide-line-soft", className)}
			{...props}
		/>
	);
}

function DataRow({
	label,
	children,
	className,
	labelClassName,
}: {
	label: React.ReactNode;
	children: React.ReactNode;
	className?: string;
	labelClassName?: string;
}) {
	return (
		<div
			className={cn(
				"flex flex-col gap-1 py-3.5 sm:flex-row sm:gap-4 sm:py-3",
				className,
			)}
		>
			<dt
				className={cn(
					"w-full shrink-0 text-sm text-body-soft sm:w-32 sm:pt-0.5",
					labelClassName,
				)}
			>
				{label}
			</dt>
			<dd className="min-w-0 flex-1 text-base text-ink">{children}</dd>
		</div>
	);
}

export { DataList, DataRow };
