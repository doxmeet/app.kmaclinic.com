import { Store } from "@tanstack/store";

/**
 * 토큰 보관소.
 *
 * 백엔드(app.kmaclinic.com)는 로그인/갱신 성공 시 access·refresh JWT를
 * **응답 헤더**(`KCLINIC-Access-Token` / `KCLINIC-Refresh-Token`)로 내려줍니다.
 * httpOnly 쿠키가 아니므로 클라이언트가 직접 보관합니다.
 *
 * - access  : 메모리(Store)에만. XSS 노출면적 최소화.
 * - refresh : localStorage. 새로고침 후에도 세션 유지(팀 결정).
 *
 * 서버(SSR)에서는 둘 다 null — 인증 데이터는 클라이언트에서 조회.
 */
const isBrowser = typeof window !== "undefined";
const REFRESH_KEY = "kclinic.refresh";

function readRefresh(): string | null {
	if (!isBrowser) return null;
	try {
		return window.localStorage.getItem(REFRESH_KEY);
	} catch {
		return null;
	}
}

export const authStore = new Store<{
	accessToken: string | null;
	refreshToken: string | null;
}>({
	accessToken: null,
	refreshToken: readRefresh(),
});

export function getAccessToken(): string | null {
	return isBrowser ? authStore.state.accessToken : null;
}

function setAccessToken(token: string | null): void {
	authStore.setState((s) => ({ ...s, accessToken: token }));
}

export function getRefreshToken(): string | null {
	return isBrowser ? authStore.state.refreshToken : null;
}

function setRefreshToken(token: string | null): void {
	if (isBrowser) {
		try {
			if (token) window.localStorage.setItem(REFRESH_KEY, token);
			else window.localStorage.removeItem(REFRESH_KEY);
		} catch {
			/* storage 비활성 환경 무시 */
		}
	}
	authStore.setState((s) => ({ ...s, refreshToken: token }));
}

/** 로그인/갱신 응답 헤더에서 토큰을 읽어 저장 (있을 때만). */
export function captureTokensFromHeaders(headers: Headers): void {
	const access = headers.get("KCLINIC-Access-Token");
	const refresh = headers.get("KCLINIC-Refresh-Token");
	if (access) setAccessToken(access);
	if (refresh) setRefreshToken(refresh);
}

export function clearTokens(): void {
	setAccessToken(null);
	setRefreshToken(null);
}
