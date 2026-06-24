import type * as React from "react";
import { AppHeader } from "#/components/layout/app-header.tsx";
import { SiteFooter } from "#/components/layout/site-footer.tsx";
import { cn } from "#/lib/utils.ts";

/**
 * AuthShell — 인증 화면 공통 레이아웃.
 * 사이트 공통 헤더/푸터(AppHeader·SiteFooter)로 감싸고, 본문에 제목 블록 + 내용을 둔다.
 * 헤더는 인증 화면이므로 "로그인" CTA를 숨긴다(hideAuthCta).
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
				"flex min-h-screen w-full flex-col overflow-x-clip bg-surface",
				className,
			)}
		>
			<AppHeader hideAuthCta />
			<main className="flex-1">
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
			</main>
			<SiteFooter />
		</div>
	);
}

export { AuthShell };
