import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "#/components/ui/button.tsx";
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

/** state 불일치를 토큰 교환 실패와 같은 .catch로 흘려보내기 위한 sentinel 메시지. */
const STATE_MISMATCH = "GGKMA_STATE_MISMATCH";

function GgkmaCallbackPage() {
	const { code, state, error } = Route.useSearch();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	// 동기적으로 판정되는 실패(인가 오류 / 코드 없음)는 마운트 시점에 한 번만 확정한다.
	// 렌더마다 재파생하면 안 되는 이유: 아래 .finally가 code·state를 지우려 호출하는
	// history.replaceState를 TanStack Router가 가로채 search를 재계산 → code가 undefined가
	// 되면서 이 값이 "인증 코드가 없습니다."로 되살아나 실제 교환 실패 메시지를 덮어쓴다.
	const [staticFailureReason] = useState<string | null>(() =>
		error
			? "GGKMA 인증이 취소되었습니다."
			: !code
				? "인증 코드가 없습니다."
				: null,
	);
	// state 불일치(sessionStorage 소비)·토큰 교환 실패만 state로 보관한다.
	const [asyncError, setAsyncError] = useState<string | null>(null);
	const reason = staticFailureReason ?? asyncError;
	const ran = useRef(false);

	useEffect(() => {
		if (ran.current) return;
		// 동기 실패면 교환을 시도하지 않는다(화면은 파생 reason으로 처리).
		if (staticFailureReason || !code) return;
		ran.current = true;

		// CSRF state 대조와 토큰 교환을 하나의 async 체인으로 묶어, 모든 실패를 .catch에서
		// 일괄 처리한다(동기 setState로 인한 불필요한 추가 렌더 방지).
		Promise.resolve()
			// state 일치(저장값 소비)해야 교환 진행. 불일치는 sentinel로 .catch에 위임(삼항=if문 회피).
			.then(() =>
				consumeGgkmaState(state)
					? exchangeOAuthCode(code, "ggkma")
					: Promise.reject(new Error(STATE_MISMATCH)),
			)
			.then(async () => {
				await queryClient.invalidateQueries({ queryKey: ["account", "me"] });
				navigate({ to: "/onboarding" });
			})
			.catch((e) => {
				const mismatch = e instanceof Error && e.message === STATE_MISMATCH;
				if (!mismatch) toastApiError(e);
				setAsyncError(
					mismatch
						? "인증 상태가 올바르지 않습니다. 다시 시도해 주세요."
						: apiErrorMessage(e),
				);
			})
			.finally(() => {
				// code·state는 1회용 → 처리 후 쿼리스트링 제거(재진입/새로고침 시 재교환 방지).
				if (typeof window !== "undefined") {
					window.history.replaceState(null, "", window.location.pathname);
				}
			});
	}, [code, state, staticFailureReason, navigate, queryClient]);

	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-surface px-6 text-center">
			{reason ? (
				<>
					<p className="text-3xl font-bold text-ink">로그인에 실패했습니다.</p>
					<p className="text-lg text-body break-keep text-balance">
						{reason ?? "잠시 후 다시 시도해 주세요."}
					</p>
					<Button
						variant="brand"
						size="cta"
						className="mt-3"
						onClick={() => navigate({ to: "/login" })}
					>
						로그인으로 돌아가기
					</Button>
				</>
			) : (
				<>
					<Loader2 className="size-10 animate-spin text-brand" />
					<p className="text-xl text-body">로그인 처리 중입니다…</p>
				</>
			)}
		</div>
	);
}
