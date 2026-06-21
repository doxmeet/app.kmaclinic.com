import { cn } from "#/lib/utils.ts";

const FOOTER_LINKS = ["서비스 이용약관", "개인정보처리방침", "고객센터"];

/**
 * SiteFooter — 앱 하단 공통 푸터.
 */
function SiteFooter({ className }: { className?: string }) {
	return (
		<footer className={cn("border-t border-line bg-surface", className)}>
			<div className="mx-auto flex max-w-[1280px] flex-col gap-3 px-4 py-6 text-sm text-muted-fg sm:flex-row sm:items-center sm:justify-between sm:px-6">
				<p>© 2026. All rights reserved.</p>
				<nav className="flex flex-wrap items-center gap-x-5 gap-y-1">
					{FOOTER_LINKS.map((link) => (
						<button
							key={link}
							type="button"
							className="transition-colors hover:text-body"
						>
							{link}
						</button>
					))}
				</nav>
			</div>
		</footer>
	);
}

export { SiteFooter };
