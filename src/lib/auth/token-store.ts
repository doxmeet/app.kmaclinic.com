import { Store } from "@tanstack/store";

/**
 * Access token store.
 *
 * Strategy: the short-lived JWT access token lives in memory only (never in
 * localStorage — that would expose it to XSS). The long-lived refresh token is
 * an httpOnly cookie set by the backend, invisible to JS and sent automatically
 * with `credentials: 'include'`.
 *
 * On the server the access token is always null: protected/authenticated data is
 * fetched client-side (see `api` in `#/lib/api`), while public SEO pages are
 * server-rendered without auth.
 */
const isBrowser = typeof window !== "undefined";

export const authStore = new Store<{ accessToken: string | null }>({
	accessToken: null,
});

export function getAccessToken(): string | null {
	return isBrowser ? authStore.state.accessToken : null;
}

export function setAccessToken(token: string | null): void {
	authStore.setState((s) => ({ ...s, accessToken: token }));
}

export function clearAccessToken(): void {
	setAccessToken(null);
}

export function isAuthenticated(): boolean {
	return getAccessToken() !== null;
}
