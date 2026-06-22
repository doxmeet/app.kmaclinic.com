import type * as React from "react";
import { cn } from "#/lib/utils.ts";
import { BrandLogo } from "./brand-logo.tsx";
import { type Step, Stepper } from "./stepper.tsx";
import { UserMenu } from "./user-menu.tsx";

/**
 * AppHeader — 앱 상단 고정 헤더.
 * 좌: 로고 / 중앙: 단계 표시(옵션) / 우: 부가 메뉴 + 사용자 드롭다운(UserMenu).
 */
function AppHeader({
	steps,
	current = 0,
	userName,
	rightExtra,
	className,
}: {
	steps?: Step[];
	current?: number;
	userName?: string;
	rightExtra?: React.ReactNode;
	className?: string;
}) {
	return (
		<header
			className={cn(
				"sticky top-0 z-40 h-16 w-full border-b border-line bg-surface/95 backdrop-blur",
				className,
			)}
		>
			<div className="mx-auto flex h-full max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6">
				<BrandLogo label="KMA Clinic" to="/" />

				{steps?.length ? (
					<Stepper
						steps={steps}
						current={current}
						className="mx-auto hidden md:flex"
					/>
				) : null}

				<div className="flex items-center gap-3">
					{rightExtra}
					<UserMenu userName={userName} />
				</div>
			</div>
		</header>
	);
}

export { AppHeader };
