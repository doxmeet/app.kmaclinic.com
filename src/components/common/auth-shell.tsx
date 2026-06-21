import type * as React from "react";
import { cn } from "#/lib/utils.ts";

/**
 * AuthShell — 인증 화면 공통 레이아웃.
 * 상단: 서비스명(작게) + 큰 제목 + 가는 구분선, 하단: 본문.
 * 디자인 기준 컨테이너 max-w 1200 / 좌우 24px.
 */
function AuthShell({
	title,
	eyebrow = "서비스명",
	children,
	className,
	contentClassName,
}: {
	title: React.ReactNode;
	eyebrow?: React.ReactNode;
	children: React.ReactNode;
	className?: string;
	contentClassName?: string;
}) {
	return (
		<div
			className={cn(
				"min-h-screen w-full overflow-x-clip bg-surface",
				className,
			)}
		>
			<div className="mx-auto w-full max-w-[1200px] px-4 py-12 sm:px-6 sm:py-16">
				<div className="flex flex-col gap-2">
					<p className="text-[15px] text-body">{eyebrow}</p>
					<h1 className="text-3xl font-bold tracking-[0.5px] text-ink sm:text-[40px] sm:leading-[60px]">
						{title}
					</h1>
				</div>
				<hr className="mt-10 border-t border-body-soft" />
				<div className={cn("pt-10", contentClassName)}>{children}</div>
			</div>
		</div>
	);
}

export { AuthShell };
