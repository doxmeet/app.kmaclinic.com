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
	const [failed, setFailed] = useState(false);
	const [reason, setReason] = useState<string | null>(null);
	const ran = useRef(false);

	useEffect(() => {
		if (ran.current) return;
		ran.current = true;

		if (error || !code) {
			setReason(
				error ? `인가 서버 오류: ${error}` : "인증 코드(code)가 없습니다.",
			);
			setFailed(true);
			return;
		}
		exchangeOAuthCode(code, site ?? "doxmeet")
			.then(async () => {
				await queryClient.invalidateQueries({ queryKey: ["account", "me"] });
				navigate({ to: "/onboarding" });
			})
			.catch((e) => {
				toastApiError(e);
				setReason(apiErrorMessage(e));
				setFailed(true);
			});
	}, [code, site, error, navigate, queryClient]);

	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface px-6 text-center">
			{failed ? (
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
