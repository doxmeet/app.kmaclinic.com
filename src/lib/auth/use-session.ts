import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { useCallback, useEffect, useState } from "react";
import {
	type AccountMe,
	bootstrapSession,
	fetchAccount,
	logout as logoutRequest,
} from "#/lib/auth/session.ts";
import { authStore } from "#/lib/auth/token-store.ts";

/**
 * 클라이언트 세션 훅.
 * - 최초 1회 bootstrap(refresh 토큰으로 access 갱신).
 * - account/me 조회(TanStack Query).
 * - authStore 변화(로그인/로그아웃)에 반응.
 */
let bootstrapped = false;
let bootstrapPromise: Promise<boolean> | null = null;

export function useSession() {
	const { accessToken, refreshToken } = useStore(authStore);
	const [ready, setReady] = useState(bootstrapped);
	const queryClient = useQueryClient();

	useEffect(() => {
		if (bootstrapped) {
			setReady(true);
			return;
		}
		bootstrapPromise ??= bootstrapSession().finally(() => {
			bootstrapped = true;
		});
		bootstrapPromise.then(() => setReady(true));
	}, []);

	const hasToken = Boolean(accessToken || refreshToken);

	const query = useQuery<AccountMe>({
		queryKey: ["account", "me"],
		queryFn: fetchAccount,
		enabled: ready && hasToken,
		retry: false,
		staleTime: 60_000,
	});

	const account = query.data ?? null;

	// 로그아웃: 서버 refresh 토큰 폐기 + 토큰/계정 캐시 제거(UI 즉시 로그아웃 반영).
	const logout = useCallback(async () => {
		await logoutRequest();
		queryClient.removeQueries({ queryKey: ["account", "me"] });
	}, [queryClient]);

	return {
		account,
		user: account?.user ?? null,
		isLoading: !ready || (hasToken && query.isLoading),
		isAuthenticated: Boolean(account),
		isAdmin: (account?.user?.level ?? 0) >= 9,
		hasToken,
		logout,
		refetch: query.refetch,
	};
}
