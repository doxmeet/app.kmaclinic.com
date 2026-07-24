import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
		<AuthShell title="경기도의사회 계정으로 로그인" eyebrow="K CLINIC">
			<div className="mx-auto flex max-w-[480px] flex-col gap-6">
				<div className="flex flex-col gap-2.5">
					<h2 className="text-[19px] font-bold text-ink">
						경기도의사회에서 제공해요
					</h2>
					<p className="text-[17px] leading-relaxed text-body break-keep">
						<span className="block">
							병원 홈페이지를 만들거나, 개별 CV 페이지는 제작은
						</span>
						<span className="block">
							경기도의사회 계정으로 로그인 후 제작 가능해요.
						</span>
						<span className="block">
							회원님의 소중한 정보는 안전하게 공유됩니다.
						</span>
					</p>
				</div>

				<Button
					variant="brand"
					size="cta"
					className="w-full rounded-xl"
					onClick={handleLogin}
				>
					경기도의사회 계정으로 로그인
				</Button>
			</div>
		</AuthShell>
	);
}
