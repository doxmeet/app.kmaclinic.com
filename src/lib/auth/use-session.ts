import { useQuery } from "@tanstack/react-query";
import { useStore } from "@tanstack/react-store";
import { useEffect, useState } from "react";
import {
	type Account,
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

	const query = useQuery<Account>({
		queryKey: ["account", "me"],
		queryFn: fetchAccount,
		enabled: ready && hasToken,
		retry: false,
		staleTime: 60_000,
	});

	const account = query.data ?? null;

	return {
		account,
		isLoading: !ready || (hasToken && query.isLoading),
		isAuthenticated: Boolean(account),
		isAdmin: (account?.level ?? 0) >= 9,
		hasToken,
		logout: logoutRequest,
		refetch: query.refetch,
	};
}
