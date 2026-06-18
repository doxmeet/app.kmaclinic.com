import { api, publicApi } from "#/lib/api";
import { clearAccessToken, setAccessToken } from "#/lib/auth/token-store";

/**
 * Thin session helpers wrapping the backend auth endpoints.
 *
 * Adjust the endpoint paths / response shapes to match the actual Node.js API.
 * Login/refresh are expected to return a JSON access token, and the backend is
 * expected to set the refresh token as an httpOnly cookie via Set-Cookie.
 */

export interface LoginInput {
	email: string;
	password: string;
}

export async function login(input: LoginInput): Promise<void> {
	const { accessToken } = await publicApi
		.post("auth/login", { json: input })
		.json<{ accessToken: string }>();
	setAccessToken(accessToken);
}

export async function logout(): Promise<void> {
	try {
		await api.post("auth/logout");
	} finally {
		clearAccessToken();
	}
}
