import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { apiErrorMessage, toastApiError } from "#/lib/api-error-message.ts";
import { consumeGgkmaState, exchangeOAuthCode } from "#/lib/auth/session.ts";

/**
 * GGKMA(경기도의사회) OAuth 콜백 — ggkma-oauth-frontend-guide §5.
 *
 * GGKMA가 `?code&state`(또는 `?error`)로 되돌려준다. 시작 때 저장한 state와 대조(CSRF)한 뒤
 * code를 백엔드(POST /oauth/callback, site="ggkma")로 교환한다. code는 1회용이라
 * 성공/실패와 무관하게 처리 후 URL의 code·state를 제거(history.replaceState)한다.
 */
export const Route = createFileRoute("/oauth/ggkma/callback")({
	component: GgkmaCallbackPage,
	validateSearch: (search: Record<string, unknown>) => ({
		code: typeof search.code === "string" ? search.code : undefined,
		state: typeof search.state === "string" ? search.state : undefined,
		error: typeof search.error === "string" ? search.error : undefined,
	}),
});

function GgkmaCallbackPage() {
	const { code, state, error } = Route.useSearch();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [reason, setReason] = useState<string | null>(null);
	const ran = useRef(false);

	useEffect(() => {
		if (ran.current) return;
		ran.current = true;

		// code·state는 1회용 → 처리 후 쿼리스트링 제거(재진입/새로고침 시 재교환 방지).
		const stripUrl = () => {
			if (typeof window !== "undefined") {
				window.history.replaceState(null, "", window.location.pathname);
			}
		};

		if (error) {
			setReason("GGKMA 인증이 취소되었습니다.");
			stripUrl();
			return;
		}
		if (!code) {
			setReason("인증 코드(code)가 없습니다.");
			stripUrl();
			return;
		}
		// CSRF: 시작 때 저장한 state와 일치해야 진행(저장값 소비).
		if (!consumeGgkmaState(state)) {
			setReason("인증 상태가 올바르지 않습니다. 다시 시도해 주세요.");
			stripUrl();
			return;
		}

		exchangeOAuthCode(code, "ggkma")
			.then(async () => {
				stripUrl();
				await queryClient.invalidateQueries({ queryKey: ["account", "me"] });
				navigate({ to: "/onboarding" });
			})
			.catch((e) => {
				stripUrl();
				toastApiError(e);
				setReason(apiErrorMessage(e));
			});
	}, [code, state, error, navigate, queryClient]);

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
