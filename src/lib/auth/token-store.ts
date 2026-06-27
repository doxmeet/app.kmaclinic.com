import { Store } from "@tanstack/store";

/**
 * 토큰 보관소.
 *
 * 백엔드(app.kmaclinic.com)는 로그인/갱신 성공 시 access·refresh JWT를
 * **응답 헤더**(`KCLINIC-Access-Token` / `KCLINIC-Refresh-Token`)로 내려줍니다.
 * httpOnly 쿠키가 아니므로 클라이언트가 직접 보관합니다.
 *
 * - access  : 메모리(Store)에만. XSS 노출면적 최소화.
 * - refresh : 쿠키(`kclinic.refresh`, 만료 30분). 새로고침 후에도 세션 유지(팀 결정).
 *             토큰을 다시 저장할 때마다 만료가 30분으로 갱신(슬라이딩)된다.
 *
 * 서버(SSR)에서는 둘 다 null — 인증 데이터는 클라이언트에서 조회.
 */
const isBrowser = typeof window !== "undefined";
const REFRESH_KEY = "kclinic.refresh";
/** refresh 쿠키 만료(초). 30분. */
const REFRESH_MAX_AGE = 30 * 60;

function readRefresh(): string | null {
	if (!isBrowser) return null;
	try {
		const prefix = `${REFRESH_KEY}=`;
		for (const part of document.cookie.split("; ")) {
			if (part.startsWith(prefix)) {
				return decodeURIComponent(part.slice(prefix.length));
			}
		}
		return null;
	} catch {
		return null;
	}
}

/** refresh 토큰을 쿠키에 기록(token=null이면 삭제). 만료 30분, path=/, SameSite=Lax. */
function writeRefreshCookie(token: string | null): void {
	if (!isBrowser) return;
	try {
		const secure = window.location.protocol === "https:" ? "; Secure" : "";
		if (token) {
			const value = encodeURIComponent(token);
			// biome-ignore lint/suspicious/noDocumentCookie: JS가 읽어야 하는 비 httpOnly 토큰이라 직접 기록(CookieStore는 비동기·지원범위 제한).
			document.cookie = `${REFRESH_KEY}=${value}; Max-Age=${REFRESH_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
		} else {
			// biome-ignore lint/suspicious/noDocumentCookie: 위와 동일 — 동기 삭제 필요.
			document.cookie = `${REFRESH_KEY}=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
		}
	} catch {
		/* 쿠키 비활성 환경 무시 */
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
	writeRefreshCookie(token);
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
