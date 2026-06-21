import { Link } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { cn } from "#/lib/utils.ts";

/**
 * BoardSideNav — 게시판 관리 화면 좌측 메뉴 네비게이션.
 * 데스크탑에서는 본문 좌측 고정 사이드바, 모바일에서는 상단 가로 스크롤 칩으로 표시.
 * "의원 프로필 관리 / 병원 정보 관리 / 게시판 관리" 등 관리 메뉴에 재사용.
 */
type BoardNavItem = {
	label: string;
	to?: string;
};

const DEFAULT_ITEMS: BoardNavItem[] = [
	{ label: "의원 프로필 관리" },
	{ label: "병원 정보 관리" },
	{ label: "게시판 관리", to: "/board" },
];

function BoardSideNav({
	items = DEFAULT_ITEMS,
	activeLabel = "게시판 관리",
	className,
}: {
	items?: BoardNavItem[];
	activeLabel?: string;
	className?: string;
}) {
	return (
		<nav
			data-slot="board-side-nav"
			className={cn(
				"w-full shrink-0 rounded-2xl border border-line bg-surface p-4 lg:w-[260px] lg:self-start lg:p-6",
				className,
			)}
		>
			<p className="hidden px-1 text-sm tracking-wider text-muted-fg lg:block">
				메뉴
			</p>
			<ul className="flex flex-row gap-2 overflow-x-auto lg:mt-5 lg:flex-col">
				{items.map((item) => {
					const active = item.label === activeLabel;
					const inner = (
						<span
							className={cn(
								"block w-full whitespace-nowrap rounded-xl px-4 py-3 text-base transition-colors",
								active
									? "bg-brand-50 font-semibold text-brand"
									: "text-body hover:bg-muted",
							)}
						>
							{item.label}
						</span>
					);
					return (
						<li key={item.label} className="shrink-0 lg:w-full">
							{item.to ? (
								<Link to={item.to} className="block">
									{inner}
								</Link>
							) : (
								<button type="button" className="block w-full text-left">
									{inner}
								</button>
							)}
						</li>
					);
				})}
			</ul>
			<button
				type="button"
				className="mt-2 hidden w-full items-center gap-2 rounded-xl px-4 py-3 text-base text-body transition-colors hover:bg-muted lg:flex"
			>
				<LogOut className="size-4" />
				로그아웃
			</button>
		</nav>
	);
}

export { BoardSideNav };
export type { BoardNavItem };
