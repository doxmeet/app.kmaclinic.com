import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useSession } from "#/lib/auth/use-session.ts";

/**
 * 인증/권한 가드.
 * - 로딩 중: 스피너
 * - 미로그인: /login 으로 이동
 * - admin=true 인데 ADMIN(level 9) 아님: 접근 불가 안내
 */
function FullPageSpinner() {
	return (
		<div className="flex min-h-screen items-center justify-center bg-app-bg">
			<Loader2 className="size-7 animate-spin text-brand" />
		</div>
	);
}

export function AuthGuard({
	children,
	admin = false,
}: {
	children: React.ReactNode;
	admin?: boolean;
}) {
	const { isLoading, isAuthenticated, isAdmin } = useSession();
	const navigate = useNavigate();

	useEffect(() => {
		if (!isLoading && !isAuthenticated) {
			navigate({ to: "/login" });
		}
	}, [isLoading, isAuthenticated, navigate]);

	if (isLoading) return <FullPageSpinner />;
	if (!isAuthenticated) return <FullPageSpinner />;

	if (admin && !isAdmin) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-app-bg px-6 text-center">
				<p className="text-lg font-semibold text-ink">접근 권한이 없습니다.</p>
				<p className="text-sm text-body">
					이 페이지는 플랫폼 운영자(ADMIN)만 이용할 수 있습니다.
				</p>
			</div>
		);
	}

	return <>{children}</>;
}
