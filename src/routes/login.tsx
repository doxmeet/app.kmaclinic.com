import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { AuthShell } from "#/components/common/auth-shell.tsx";
import { Button } from "#/components/ui/button.tsx";
import { startGgkmaLogin } from "#/lib/auth/session.ts";
import { useSession } from "#/lib/auth/use-session.ts";

export const Route = createFileRoute("/login")({ component: LoginPage });

function handleLogin() {
	if (!startGgkmaLogin()) {
		toast.info(
			"경기도의사회(GGKMA) OAuth 설정(authorize URL·client_id)이 아직 없습니다. 환경변수 설정 후 이용 가능합니다.",
		);
	}
}

function LoginPage() {
	const navigate = useNavigate();
	const { isAuthenticated } = useSession();

	// 이미 로그인돼 있으면 온보딩으로
	useEffect(() => {
		if (isAuthenticated) navigate({ to: "/onboarding" });
	}, [isAuthenticated, navigate]);

	return (
		<AuthShell title="로그인" eyebrow="K CLINIC">
			<div className="mx-auto flex max-w-[480px] flex-col gap-6">
				<div className="flex flex-col gap-2">
					<h2 className="text-xl font-medium text-ink">
						경기도의사회에서 시작하기
					</h2>
					<p className="text-base text-body">
						병원 홈페이지·프로필 제작은 경기도의사회 계정으로 진행할 수
						있습니다. 로그인 후 의료진을 위한 프로필·병원 홈페이지 자동 생성을
						경험해보세요.
					</p>
				</div>

				<Button
					variant="brand"
					size="cta"
					className="w-full"
					onClick={handleLogin}
				>
					<LogIn className="size-5" />
					경기도의사회 계정으로 로그인
				</Button>
			</div>
		</AuthShell>
	);
}
