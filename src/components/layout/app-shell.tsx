import type * as React from "react";
import { cn } from "#/lib/utils.ts";
import { AppHeader } from "./app-header.tsx";
import { SiteFooter } from "./site-footer.tsx";
import type { Step } from "./stepper.tsx";

/**
 * AppShell — 앱 화면 공통 레이아웃 (헤더 + 회색 본문 + 푸터).
 * 등록/관리/게시판 등 로그인 이후 화면에서 사용.
 */
function AppShell({
	children,
	steps,
	current,
	userName,
	headerExtra,
	maxWidth = "1100px",
	mainClassName,
	bottomBar,
}: {
	children: React.ReactNode;
	steps?: Step[];
	current?: number;
	userName?: string;
	headerExtra?: React.ReactNode;
	maxWidth?: string;
	mainClassName?: string;
	/** 하단 고정 액션 바 (StickyActionBar 등) */
	bottomBar?: React.ReactNode;
}) {
	return (
		<div className="flex min-h-screen flex-col bg-app-bg">
			<AppHeader
				steps={steps}
				current={current}
				userName={userName}
				rightExtra={headerExtra}
			/>
			<main className={cn("flex-1", mainClassName)}>
				<div
					className="mx-auto w-full px-4 py-6 sm:px-6 sm:py-8"
					style={{ maxWidth }}
				>
					{children}
				</div>
			</main>
			{bottomBar}
			<SiteFooter />
		</div>
	);
}

export { AppShell };
