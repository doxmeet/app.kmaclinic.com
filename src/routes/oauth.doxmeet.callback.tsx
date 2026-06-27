import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiErrorMessage, toastApiError } from "#/lib/api-error-message.ts";
import { exchangeOAuthCode } from "#/lib/auth/session.ts";

export const Route = createFileRoute("/oauth/doxmeet/callback")({
	component: OAuthCallbackPage,
	validateSearch: (search: Record<string, unknown>) => ({
		code: typeof search.code === "string" ? search.code : undefined,
		site: typeof search.site === "string" ? search.site : undefined,
		error: typeof search.error === "string" ? search.error : undefined,
	}),
});

function OAuthCallbackPage() {
	const { code, site, error } = Route.useSearch();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	// 동기적으로 판정되는 실패(인가 오류 / 코드 없음)는 렌더 중 파생한다(state 미보관).
	const staticFailureReason = error
		? `인가 서버 오류: ${error}`
		: !code
			? "인증 코드가 없습니다."
			: null;
	// 토큰 교환(비동기) 실패만 state로 보관한다.
	const [exchangeError, setExchangeError] = useState<string | null>(null);
	const reason = staticFailureReason ?? exchangeError;
	const ran = useRef(false);

	useEffect(() => {
		if (ran.current) return;
		// 동기 실패면 교환을 시도하지 않는다(화면은 파생 reason으로 처리).
		if (staticFailureReason || !code) return;
		ran.current = true;
		exchangeOAuthCode(code, site ?? "doxmeet")
			.then(async () => {
				await queryClient.invalidateQueries({ queryKey: ["account", "me"] });
				navigate({ to: "/onboarding" });
			})
			.catch((e) => {
				toastApiError(e);
				setExchangeError(apiErrorMessage(e));
			});
	}, [code, site, staticFailureReason, navigate, queryClient]);

	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface px-6 text-center">
			{reason ? (
				<>
					<p className="text-lg font-semibold text-ink">
						로그인에 실패했습니다.
					</p>
					<p className="text-sm text-body">
						{reason ?? "잠시 후 다시 시도해 주세요."}
					</p>
					<button
						type="button"
						onClick={() => navigate({ to: "/login" })}
						className="mt-2 rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-brand-foreground"
					>
						로그인으로 돌아가기
					</button>
				</>
			) : (
				<>
					<Loader2 className="size-7 animate-spin text-brand" />
					<p className="text-base text-body">로그인 처리 중입니다…</p>
				</>
			)}
		</div>
	);
}
