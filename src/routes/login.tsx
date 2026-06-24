import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LogIn } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";
import { AuthShell } from "#/components/common/auth-shell.tsx";
import { InfoCallout } from "#/components/common/info-callout.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
	isDoxmeetLoginConfigured,
	startDoxmeetLogin,
} from "#/lib/auth/session.ts";
import { useSession } from "#/lib/auth/use-session.ts";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
	const navigate = useNavigate();
	const { isAuthenticated } = useSession();
	const configured = isDoxmeetLoginConfigured();

	// 이미 로그인돼 있으면 온보딩으로
	useEffect(() => {
		if (isAuthenticated) navigate({ to: "/onboarding" });
	}, [isAuthenticated, navigate]);

	function handleLogin() {
		if (!startDoxmeetLogin()) {
			toast.info(
				"Doxmeet OAuth 설정(authorize URL·client_id)이 아직 없습니다. 환경변수 설정 후 이용 가능합니다.",
			);
		}
	}

	return (
		<AuthShell title="로그인" eyebrow="K CLINIC">
			<div className="mx-auto flex max-w-[480px] flex-col gap-6">
				<div className="flex flex-col gap-2">
					<h2 className="text-xl font-medium text-ink">
						닥스밋 계정으로 로그인
					</h2>
					<p className="text-base text-body">
						가입·결제 콘솔은 닥스밋 의사 계정으로 로그인합니다. 로그인 후 대화로
						작성하면 프로필과 병원 홈페이지를 한 번에 만들 수 있어요.
					</p>
				</div>

				<Button
					variant="brand"
					size="cta"
					className="w-full"
					onClick={handleLogin}
				>
					<LogIn className="size-5" />
					Doxmeet 계정으로 로그인
				</Button>

				{!configured ? (
					<InfoCallout tone="warning">
						<p className="text-sm">
							현재 환경에 OAuth 설정값(<code>VITE_DOXMEET_AUTHORIZE_URL</code>,
							<code> VITE_DOXMEET_CLIENT_ID</code>)이 없어 로그인 시작이
							비활성화돼 있습니다. 백엔드에서 값 전달 시 즉시 동작합니다.
						</p>
					</InfoCallout>
				) : null}

				<p className="text-center text-sm text-muted-fg">
					휴대폰 본인인증 · 아이디/비밀번호 찾기는 후속 제공 예정입니다.
				</p>
			</div>
		</AuthShell>
	);
}
