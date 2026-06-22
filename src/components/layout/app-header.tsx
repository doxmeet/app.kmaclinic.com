import { Menu } from "@base-ui/react/menu";
import { useNavigate } from "@tanstack/react-router";
import { ChevronDown, LogOut, ShieldCheck } from "lucide-react";
import type * as React from "react";
import { useSession } from "#/lib/auth/use-session.ts";
import { cn } from "#/lib/utils.ts";
import { BrandLogo } from "./brand-logo.tsx";
import { type Step, Stepper } from "./stepper.tsx";

const MENU_ITEM_CLASS =
	"flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink outline-none transition-colors select-none data-[highlighted]:bg-muted";

/**
 * AppHeader — 앱 상단 고정 헤더.
 * 좌: 로고 / 중앙: 단계 표시(옵션) / 우: 부가 메뉴 + 사용자 드롭다운(운영자 콘솔·로그아웃).
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
	const navigate = useNavigate();
	const { user, isAdmin, logout } = useSession();
	const displayName = userName ?? user?.name ?? "내 계정";
	const initial = displayName.slice(0, 1) || "내";

	async function handleLogout() {
		await logout();
		navigate({ to: "/" });
	}

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
					<Menu.Root>
						<Menu.Trigger className="flex cursor-pointer items-center gap-2 rounded-full py-1 pr-2 pl-1 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-brand/40">
							<span className="flex size-8 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand">
								{initial}
							</span>
							<span className="hidden text-sm font-medium text-ink sm:inline">
								{displayName}
							</span>
							<ChevronDown className="size-4 text-muted-fg" />
						</Menu.Trigger>
						<Menu.Portal>
							<Menu.Positioner sideOffset={8} align="end" className="z-50">
								<Menu.Popup className="min-w-[184px] origin-top-right rounded-xl border border-line bg-surface p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.12)] outline-none">
									{isAdmin ? (
										<>
											<Menu.Item
												className={MENU_ITEM_CLASS}
												onClick={() => navigate({ to: "/admin/institutions" })}
											>
												<ShieldCheck className="size-4 text-muted-fg" />
												운영자 콘솔
											</Menu.Item>
											<Menu.Separator className="my-1.5 h-px bg-line" />
										</>
									) : null}
									<Menu.Item
										className={cn(MENU_ITEM_CLASS, "text-danger")}
										onClick={handleLogout}
									>
										<LogOut className="size-4" />
										로그아웃
									</Menu.Item>
								</Menu.Popup>
							</Menu.Positioner>
						</Menu.Portal>
					</Menu.Root>
				</div>
			</div>
		</header>
	);
}

export { AppHeader };
