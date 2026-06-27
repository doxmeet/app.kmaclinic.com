import { Link } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import type * as React from "react";
import { Button } from "#/components/ui/button.tsx";
import { useSession } from "#/lib/auth/use-session.ts";
import { cn } from "#/lib/utils.ts";
import { BrandLogo } from "./brand-logo.tsx";
import { type Step, Stepper } from "./stepper.tsx";
import { UserMenu } from "./user-menu.tsx";

/** 홈 마케팅 섹션 내비 항목(섹션 id로 부드럽게 스크롤). */
export type HeaderNavItem = { label: string; sectionId: string };

/**
 * 같은 섹션을 다시 눌러도 스크롤되도록 프로그래밍적으로 이동(주소창 해시 동일 시 미동작 회피).
 */
function scrollToSection(id: string) {
	const el = document.getElementById(id);
	if (!el) return;
	el.scrollIntoView({ behavior: "smooth" });
	window.history.replaceState(null, "", `#${id}`);
}

/**
 * AppHeader — 사이트 공통 상단 헤더(홈 페이지 기준 통일).
 * 좌: 로고 / 중앙: 마케팅 내비(홈) 또는 단계 표시(옵션) / 우: 세션 인식 액션.
 *
 * 세션 인식(useSession):
 *  - 로그인 상태 → `rightExtra`(예: 홈 "온보딩 이어가기") + 사용자 메뉴(UserMenu)
 *  - 비로그인 → "로그인" 버튼(`hideAuthCta`면 숨김 — 인증 화면용)
 */
function AppHeader({
	steps,
	current = 0,
	userName,
	rightExtra,
	nav,
	hideAuthCta = false,
	className,
}: {
	steps?: Step[];
	current?: number;
	userName?: string;
	/** 로그인 상태에서 UserMenu 앞에 노출할 부가 액션(예: 홈 "온보딩 이어가기" CTA). */
	rightExtra?: React.ReactNode;
	/** 홈 마케팅 섹션 내비(있으면 가운데 노출). 단계 표시(steps)보다 우선. */
	nav?: HeaderNavItem[];
	/** 비로그인 시 "로그인" 버튼을 숨긴다(로그인/회원찾기 등 인증 화면). */
	hideAuthCta?: boolean;
	className?: string;
}) {
	// 토큰이 있으면(로그인 상태) 사용자 메뉴를 바로 보여준다(account/me 로딩 중 "로그인" 깜빡임 방지).
	const { hasToken } = useSession();

	return (
		<header
			className={cn(
				"sticky top-0 z-40 h-16 w-full border-b border-line bg-surface/90 backdrop-blur",
				className,
			)}
		>
			<div className="mx-auto flex h-full w-full max-w-[1120px] items-center justify-between gap-4 px-4 sm:px-6">
				<BrandLogo label="KMA CLINIC" to="/" />

				{nav?.length ? (
					<nav className="hidden items-center gap-7 text-[15px] font-medium text-body md:flex">
						{nav.map((item) => (
							<button
								key={item.sectionId}
								type="button"
								onClick={() => scrollToSection(item.sectionId)}
								className="cursor-pointer transition-colors hover:text-ink"
							>
								{item.label}
							</button>
						))}
					</nav>
				) : steps?.length ? (
					<Stepper
						steps={steps}
						current={current}
						className="mx-auto hidden md:flex"
					/>
				) : null}

				<div className="flex items-center gap-2">
					{hasToken ? (
						<>
							{rightExtra}
							<UserMenu userName={userName} />
						</>
					) : hideAuthCta ? null : (
						<Button
							nativeButton={false}
							render={<Link to="/login" />}
							variant="brand"
							size="sm"
						>
							<LogIn className="size-4" />
							로그인
						</Button>
					)}
				</div>
			</div>
		</header>
	);
}

export { AppHeader };
