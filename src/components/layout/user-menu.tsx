import { Menu } from "@base-ui/react/menu";
import { useNavigate } from "@tanstack/react-router";
import { ChevronDown, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { useSession } from "#/lib/auth/use-session.ts";
import { cn } from "#/lib/utils.ts";

const MENU_ITEM_CLASS =
	"flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink outline-none transition-colors select-none data-[highlighted]:bg-muted";

/**
 * UserMenu — 아바타 + 이름 + 드롭다운(운영자 콘솔[ADMIN] · 로그아웃).
 * 앱 헤더(AppHeader)와 홈 헤더에서 공통으로 사용하는 사용자 메뉴.
 */
function UserMenu({
	userName,
	className,
}: {
	userName?: string;
	className?: string;
}) {
	const navigate = useNavigate();
	const { user, isAdmin, logout } = useSession();
	const displayName = userName ?? user?.name ?? "내 계정";
	const initial = displayName.slice(0, 1) || "내";

	function handleLogout() {
		logout(); // 로컬 세션을 즉시 정리(서버 폐기는 백그라운드)
		navigate({ to: "/" });
	}

	return (
		<Menu.Root>
			<Menu.Trigger
				className={cn(
					"flex cursor-pointer items-center gap-2 rounded-full py-1 pr-2 pl-1 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-brand/40",
					className,
				)}
			>
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
						<Menu.Item
							className={MENU_ITEM_CLASS}
							onClick={() => navigate({ to: "/account" })}
						>
							<UserRound className="size-4 text-muted-fg" />내 계정
						</Menu.Item>
						<Menu.Separator className="my-1.5 h-px bg-line" />
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
	);
}

export { UserMenu };
