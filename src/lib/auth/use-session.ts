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

	// 로그아웃: 토큰/계정 캐시를 즉시 제거해 UI에 바로 반영하고,
	// 서버 refresh 토큰 폐기는 백그라운드로 진행(응답을 기다리지 않음).
	const logout = useCallback(() => {
		const done = logoutRequest(); // 토큰 정리는 첫 await 이전에 동기 실행됨
		queryClient.removeQueries({ queryKey: ["account", "me"] });
		return done;
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
