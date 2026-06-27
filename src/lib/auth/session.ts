import { z } from "zod";
import { http, parse, publicApi, publicHttp } from "#/lib/api";
import { clearTokens, getRefreshToken } from "#/lib/auth/token-store.ts";
import { env } from "#/lib/env.ts";

/**
 * 세션 헬퍼 — 문서 §1 (Doxmeet OAuth).
 *
 * 로그인은 Doxmeet 인가서버에서 받은 `code`를 POST /oauth/callback 으로 교환.
 * 토큰은 응답 헤더(KCLINIC-*)로 내려오며 api 레이어의 captureHook이 저장.
 */

/**
 * GET /account/me 응답(문서 §7.1) — { user, profile, hospitals }.
 *
 * 백엔드 bigint PK(no/subscription_no 등)는 JSON에서 **문자열**로 직렬화되므로
 * (예: "12") 경계에서 숫자로 정규화한다(onboarding.ts의 `numeric`과 동일 규약).
 * 라우트 파라미터(Number)와 strict 비교가 깨지지 않도록 하기 위함.
 */
const numericId = z.coerce.number();
const numericIdOpt = z.coerce.number().optional();
const numericIdNullish = z.coerce.number().nullish();

const AccountUserSchema = z.looseObject({
	no: numericId,
	id: z.string().optional(),
	name: z.string().nullish(),
	phone: z.string().nullish(),
	hospital_name: z.string().nullish(),
	level: z.coerce.number().default(0),
	is_withdrawn: z.boolean().optional(),
	created_at: z.string().optional(),
});
export type AccountUser = z.infer<typeof AccountUserSchema>;

const AccountProfileSchema = z.looseObject({
	no: numericIdOpt,
	slug: z.string().nullish(),
	is_published: z.boolean().optional(),
	completion_percent: z.coerce.number().optional(),
});
export type AccountProfile = z.infer<typeof AccountProfileSchema> | null;

const AccountHospitalSchema = z.looseObject({
	no: numericId,
	slug: z.string().nullish(),
	name: z.string().optional(),
	is_published: z.boolean().optional(),
	subscription_no: numericIdNullish,
	subscription_status: z.string().nullish(),
	next_billing_at: z.string().nullish(),
	current_period_end: z.string().nullish(),
});
export type AccountHospital = z.infer<typeof AccountHospitalSchema>;

const AccountMeSchema = z.looseObject({
	user: AccountUserSchema,
	profile: AccountProfileSchema.nullish(),
	hospitals: z.array(AccountHospitalSchema).nullish().default([]),
});
export type AccountMe = z.infer<typeof AccountMeSchema>;

/** Doxmeet code → 토큰 교환(로그인 완료). 백엔드 엔드포인트는 POST /oauth/callback. */
export async function exchangeOAuthCode(
	code: string,
	site = "doxmeet",
): Promise<void> {
	await publicHttp.post("oauth/callback", { site, code });
}

/** 내 계정 + 프로필 요약 + 소유 병원/구독 상태. ID는 경계에서 숫자로 정규화. */
export async function fetchAccount(): Promise<AccountMe> {
	return parse(await http.get("account/me"), AccountMeSchema);
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
	// 로컬 세션을 먼저 비워 UI가 서버 응답을 기다리지 않고 즉시 로그아웃되게 한다.
	// (clearTokens는 첫 await 이전에 동기 실행되므로 호출부가 await하지 않아도 즉시 반영.)
	clearTokens();
	if (!refresh) return;
	try {
		await publicApi.post("auth/logout", {
			headers: { Authorization: `Bearer ${refresh}` },
		});
	} catch {
		/* 서버 폐기 실패는 무시 — 로컬 세션은 이미 종료됨 */
	} finally {
		// 폐기 응답 헤더가 토큰을 재주입했을 수 있으니 한 번 더 정리.
		clearTokens();
	}
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
			? `${window.location.origin}/oauth/doxmeet/callback`
			: "");
	const url = new URL(authorize);
	url.searchParams.set("client_id", clientId);
	url.searchParams.set("redirect_uri", redirectUri);
	url.searchParams.set("response_type", "code");
	url.searchParams.set("scope", env.VITE_DOXMEET_SCOPE ?? "read:user");
	if (typeof window !== "undefined") window.location.href = url.toString();
	return true;
}

export function isDoxmeetLoginConfigured(): boolean {
	return Boolean(env.VITE_DOXMEET_AUTHORIZE_URL && env.VITE_DOXMEET_CLIENT_ID);
}

/**
 * GGKMA(경기도의사회) OAuth — ggkma-oauth-frontend-guide.
 *
 * Doxmeet과 **같은 콜백/토큰 규약**(POST /oauth/callback, KCLINIC-* 헤더)을 쓰되
 * site="ggkma"·전용 scope·CSRF `state`만 다르다. code→token 교환과 userinfo 조회는
 * 전부 백엔드가 처리하므로 프론트는 client_id/redirect_uri/scope/state만 다룬다.
 */
const GGKMA_STATE_KEY = "ggkma_oauth_state";

/** CSRF state 값 생성(보안 컨텍스트=crypto, 폴백 포함). */
function randomState(): string {
	try {
		if (typeof crypto !== "undefined") {
			if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
			if (typeof crypto.getRandomValues === "function") {
				const bytes = crypto.getRandomValues(new Uint8Array(16));
				return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
					"",
				);
			}
		}
	} catch {
		/* 보안 컨텍스트 아님 → 폴백 */
	}
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/**
 * GGKMA OAuth 로그인 시작. CSRF `state`를 생성·저장하고 authorize URL로 전체 리다이렉트.
 * authorize URL/client_id 가 env에 없으면 false(미설정 stub).
 */
export function startGgkmaLogin(): boolean {
	const authorize = env.VITE_GGKMA_AUTHORIZE_URL;
	const clientId = env.VITE_GGKMA_CLIENT_ID;
	if (!authorize || !clientId) return false;
	if (typeof window === "undefined") return false;

	const redirectUri =
		env.VITE_GGKMA_REDIRECT_URI ??
		`${window.location.origin}/oauth/ggkma/callback`;

	const state = randomState();
	try {
		// 콜백에서 대조할 수 있게 저장(탭 한정 → sessionStorage).
		sessionStorage.setItem(GGKMA_STATE_KEY, state);
	} catch {
		/* sessionStorage 비활성 환경 무시 */
	}

	const url = new URL(authorize);
	url.searchParams.set("response_type", "code");
	url.searchParams.set("client_id", clientId);
	url.searchParams.set("redirect_uri", redirectUri);
	url.searchParams.set(
		"scope",
		env.VITE_GGKMA_SCOPE ?? "profile license workplace",
	);
	url.searchParams.set("state", state);
	window.location.href = url.toString();
	return true;
}

export function isGgkmaLoginConfigured(): boolean {
	return Boolean(env.VITE_GGKMA_AUTHORIZE_URL && env.VITE_GGKMA_CLIENT_ID);
}

/**
 * 콜백에서 CSRF state 일치 확인(저장값을 1회 소비).
 * 시작 때 저장한 값과 받은 값이 같아야 true. 서버 환경/미저장/불일치는 false.
 */
export function consumeGgkmaState(
	received: string | null | undefined,
): boolean {
	if (typeof window === "undefined") return false;
	let saved: string | null = null;
	try {
		saved = sessionStorage.getItem(GGKMA_STATE_KEY);
		sessionStorage.removeItem(GGKMA_STATE_KEY);
	} catch {
		return false;
	}
	return Boolean(received && saved && received === saved);
}
