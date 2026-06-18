import type { KyInstance, Options } from "ky";
import ky from "ky";
import type { ZodType } from "zod";
import {
	clearAccessToken,
	getAccessToken,
	setAccessToken,
} from "#/lib/auth/token-store";
import { env } from "#/lib/env";

/**
 * HTTP layer for the separate Node.js REST backend (ky v2).
 *
 * Two clients:
 *  - `publicApi` : no auth. Safe to call on the server (SSR loaders / server
 *                  functions) for public, SEO-facing data.
 *  - `api`       : attaches the Bearer access token and transparently refreshes
 *                  it on 401. Use from the browser (TanStack Query) for
 *                  authenticated/admin data.
 *
 * With ky's `prefix`, request paths should be relative (no leading slash
 * needed): `api.get('clinics/123')` -> `${VITE_API_URL}/clinics/123`.
 */

const baseOptions = {
	prefix: env.VITE_API_URL,
	// send/receive the httpOnly refresh-token cookie
	credentials: "include",
	timeout: 20_000,
} satisfies Options;

export const publicApi: KyInstance = ky.create(baseOptions);

/**
 * Bare client used only to hit the refresh endpoint, so the refresh call itself
 * never re-enters the auth hooks (which would loop on failure).
 */
const refreshClient: KyInstance = ky.create(baseOptions);

/** Single-flight refresh: concurrent 401s share one /auth/refresh request. */
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
	refreshInFlight ??= refreshClient
		.post("auth/refresh")
		.json<{ accessToken: string }>()
		.then(({ accessToken }) => {
			setAccessToken(accessToken);
			return accessToken;
		})
		.catch(() => {
			clearAccessToken();
			return null;
		})
		.finally(() => {
			refreshInFlight = null;
		});

	return refreshInFlight;
}

export const api: KyInstance = ky.create({
	...baseOptions,
	// allow exactly one forced retry (ky.retry) after a token refresh
	retry: 1,
	hooks: {
		// initial request: attach the current access token
		beforeRequest: [
			({ request }) => {
				const token = getAccessToken();
				if (token) request.headers.set("Authorization", `Bearer ${token}`);
			},
		],
		// retried request: re-attach the (now refreshed) token
		beforeRetry: [
			({ request }) => {
				const token = getAccessToken();
				if (token) request.headers.set("Authorization", `Bearer ${token}`);
			},
		],
		afterResponse: [
			async ({ request, response, retryCount }) => {
				if (response.status !== 401) return response;
				// already retried once -> give up
				if (retryCount > 0) return response;
				// never try to refresh-loop on the refresh endpoint itself
				if (request.url.includes("/auth/refresh")) return response;

				const token = await refreshAccessToken();
				if (!token) return response;
				// force one retry; beforeRetry re-attaches the new token
				return ky.retry();
			},
		],
	},
});

/**
 * Validate an API response against a Zod schema at the trust boundary.
 * Since the backend has no OpenAPI contract, every response is parsed.
 *
 * @example
 *   const clinic = await parsed(publicApi.get('clinics/abc').json(), ClinicSchema)
 */
export async function parsed<T>(
	promise: Promise<unknown>,
	schema: ZodType<T>,
): Promise<T> {
	return schema.parse(await promise);
}
