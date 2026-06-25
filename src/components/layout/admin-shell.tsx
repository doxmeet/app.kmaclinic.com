import { Link } from "@tanstack/react-router";
import {
	Bell,
	Building2,
	CreditCard,
	EllipsisVertical,
	Home,
	Users,
} from "lucide-react";
import type * as React from "react";
import { cn } from "#/lib/utils.ts";

/**
 * AdminShell — 닥스밋 운영자 관리시스템 레이아웃.
 * 좌측 다크 사이드바(고정 256px) + 흰 본문 + 하단 카피라이트.
 * 관리자 화면(요양기관 현황/상세)에서 사용.
 */

type NavKey = "home" | "institutions" | "users" | "payments" | "notifications";

const NAV_ITEMS: {
	key: NavKey;
	label: string;
	icon: React.ComponentType<{ className?: string }>;
	to?: string;
}[] = [
	{ key: "home", label: "홈", icon: Home },
	{
		key: "institutions",
		label: "요양기관 현황",
		icon: Building2,
		to: "/admin/institutions",
	},
	{
		key: "users",
		label: "회원 관리",
		icon: Users,
		to: "/admin/users",
	},
	{
		key: "payments",
		label: "결제 관리",
		icon: CreditCard,
		to: "/admin/payments",
	},
	{
		key: "notifications",
		label: "알림 로그",
		icon: Bell,
		to: "/admin/notifications",
	},
];

function AdminSidebar({ active }: { active: NavKey }) {
	return (
		<aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-[#0f2744] shadow-[0_8px_5px_rgba(0,0,0,0.1),0_20px_12.5px_rgba(0,0,0,0.1)] lg:flex">
			{/* 로고 헤더 */}
			<div className="flex items-center gap-3 border-b border-[#1e3a8a]/50 px-6 py-5">
				<span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#3b82f6] text-white">
					<Building2 className="size-[18px]" />
				</span>
				<div className="flex flex-col">
					<span className="text-sm text-white">닥스밋</span>
					<span className="text-xs text-[#93c5fd]">운영자 관리시스템</span>
				</div>
			</div>

			{/* 메뉴 */}
			<nav className="flex flex-col gap-0.5 px-3 py-4">
				<p className="px-3 text-xs leading-6 tracking-[0.7px] text-[#60a5fa]">
					메뉴
				</p>
				{NAV_ITEMS.map((item) => {
					const isActive = item.key === active;
					const Icon = item.icon;
					const content = (
						<>
							<Icon className="size-4 shrink-0" />
							<span className="text-sm">{item.label}</span>
						</>
					);
					const className = cn(
						"flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
						isActive
							? "bg-[#256ef4] text-white"
							: "text-[#bfdbfe] hover:bg-white/5",
					);
					return item.to ? (
						<Link key={item.key} to={item.to} className={className}>
							{content}
						</Link>
					) : (
						<button key={item.key} type="button" className={className}>
							{content}
						</button>
					);
				})}
			</nav>

			{/* 사용자 */}
			<div className="mt-auto flex items-center gap-3 border-t border-[#1e3a8a]/50 bg-[#0f2744] p-4">
				<span className="size-9 shrink-0 rounded-full bg-[#1e3a8a]" />
				<div className="flex min-w-0 flex-1 flex-col">
					<span className="truncate text-sm text-white">관리자</span>
					<span className="truncate text-xs text-[#93c5fd]">슈퍼 관리자</span>
				</div>
				<EllipsisVertical className="size-4 shrink-0 text-[#93c5fd]" />
			</div>
		</aside>
	);
}

function AdminShell({
	children,
	active = "institutions",
}: {
	children: React.ReactNode;
	active?: NavKey;
}) {
	return (
		<div className="min-h-screen bg-[#f9fafb] lg:pl-64">
			<AdminSidebar active={active} />
			<div className="flex min-h-screen flex-col bg-white">
				<main className="flex-1 px-5 py-6 sm:px-8 sm:py-8 lg:px-10">
					{children}
				</main>
				<footer className="px-5 py-5 text-center text-[13px] text-muted-fg sm:px-8 lg:px-10">
					Copyright (c) 2026. All rights reserved.
				</footer>
			</div>
		</div>
	);
}

export { AdminShell };
