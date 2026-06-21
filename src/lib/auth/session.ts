import { http, publicApi, publicHttp } from "#/lib/api";
import {
	clearTokens,
	getRefreshToken,
	setAccessToken,
} from "#/lib/auth/token-store.ts";
import { env } from "#/lib/env.ts";

/**
 * 세션 헬퍼 — 문서 §1 (Doxmeet OAuth).
 *
 * 로그인은 Doxmeet 인가서버에서 받은 `code`를 POST /oauth/callback 으로 교환.
 * 토큰은 응답 헤더(KCLINIC-*)로 내려오며 api 레이어의 captureHook이 저장.
 */

export type Account = {
	no?: number;
	email?: string | null;
	name?: string | null;
	phone?: string | null;
	level?: number;
	[key: string]: unknown;
};

/** Doxmeet code → 토큰 교환(로그인 완료). */
export async function exchangeOAuthCode(
	code: string,
	site = "doxmeet",
): Promise<void> {
	await publicHttp.post("oauth/callback", { site, code });
}

/** 내 계정 + 프로필 요약 + 소유 병원/구독 상태. */
export async function fetchAccount(): Promise<Account> {
	return http.get<Account>("account/me");
}

export async function updatePhone(phone: string): Promise<Account> {
	return http.patch<Account>("account/me", { phone });
}

/** 새로고침 후 부트스트랩: refresh 토큰이 있으면 access를 갱신. */
export async function bootstrapSession(): Promise<boolean> {
	const refresh = getRefreshToken();
	if (!refresh) return false;
	try {
		await publicApi.get("auth/refresh", {
			headers: { Authorization: `Bearer ${refresh}` },
		});
		return true;
	} catch {
		clearTokens();
		return false;
	}
}

export async function logout(): Promise<void> {
	const refresh = getRefreshToken();
	try {
		if (refresh) {
			await publicApi.post("auth/logout", {
				headers: { Authorization: `Bearer ${refresh}` },
			});
		}
	} catch {
		/* 무시 */
	} finally {
		clearTokens();
	}
}

/** 로컬에서 토큰만 정리(데모/디버그용). */
export function clearLocalSession(): void {
	clearTokens();
	setAccessToken(null);
}

/**
 * Doxmeet OAuth 로그인 시작.
 * authorize URL/client_id 가 env로 설정돼 있으면 인가서버로 리다이렉트, 아니면 false.
 * (값은 백엔드에서 추후 전달 → 그전까지 stub)
 */
export function startDoxmeetLogin(): boolean {
	const authorize = env.VITE_DOXMEET_AUTHORIZE_URL;
	const clientId = env.VITE_DOXMEET_CLIENT_ID;
	if (!authorize || !clientId) return false;
	const redirectUri =
		env.VITE_OAUTH_REDIRECT_URI ??
		(typeof window !== "undefined"
			? `${window.location.origin}/oauth/callback`
			: "");
	const url = new URL(authorize);
	url.searchParams.set("client_id", clientId);
	url.searchParams.set("redirect_uri", redirectUri);
	url.searchParams.set("response_type", "code");
	if (typeof window !== "undefined") window.location.href = url.toString();
	return true;
}

export function isDoxmeetLoginConfigured(): boolean {
	return Boolean(env.VITE_DOXMEET_AUTHORIZE_URL && env.VITE_DOXMEET_CLIENT_ID);
}
