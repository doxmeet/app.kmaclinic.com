import ky, { HTTPError, type KyInstance, type Options } from "ky";
import type { ZodType } from "zod";
import {
	captureTokensFromHeaders,
	clearTokens,
	getAccessToken,
	getRefreshToken,
} from "#/lib/auth/token-store.ts";
import { env } from "#/lib/env.ts";

/**
 * app.kmaclinic.com REST 백엔드 HTTP 레이어 (ky).
 *
 * 규약(문서 §0):
 *  - 성공: { success: true, data }  → `data`만 반환
 *  - 에러: { success: false, status_code, error_code, error_detail, error_uuid } → ApiError throw
 *  - 토큰: 로그인/갱신 응답 **헤더**(KCLINIC-Access/Refresh-Token)로 수신 → afterResponse에서 자동 저장
 *  - 인증: 요청에 Authorization: Bearer <access>. 401 → GET /auth/refresh(Bearer refresh) 후 1회 재시도
 */

export class ApiError extends Error {
	readonly status: number;
	readonly errorCode: string | null;
	readonly errorUuid: string | null;
	constructor(opts: {
		status: number;
		errorCode?: string | null;
		message?: string | null;
		errorUuid?: string | null;
	}) {
		super(opts.message || opts.errorCode || `HTTP ${opts.status}`);
		this.name = "ApiError";
		this.status = opts.status;
		this.errorCode = opts.errorCode ?? null;
		this.errorUuid = opts.errorUuid ?? null;
	}
}

const baseOptions = {
	prefix: env.VITE_API_URL,
	// 기본 60초. AI(온보딩) 호출처럼 더 긴 작업은 호출부에서 per-call timeout으로 늘린다.
	timeout: 60_000,
} satisfies Options;

/** 모든 응답에서 토큰 헤더가 있으면 저장(로테이션 투명 처리). ky v2 afterResponse: ({ response }) */
const captureHook = ({ response }: { response: Response }) =>
	captureTokensFromHeaders(response.headers);

export const publicApi: KyInstance = ky.create({
	...baseOptions,
	hooks: { afterResponse: [captureHook] },
});

/** refresh 전용 bare 클라이언트(인증 훅 재진입 방지). */
const refreshClient: KyInstance = ky.create({
	...baseOptions,
	hooks: { afterResponse: [captureHook] },
});

export const api: KyInstance = ky.create({
	...baseOptions,
	retry: 0,
	hooks: {
		beforeRequest: [
			({ request }) => {
				const token = getAccessToken();
				if (token) request.headers.set("Authorization", `Bearer ${token}`);
			},
		],
		afterResponse: [captureHook],
	},
});

/** 동시 401 단일화: 여러 요청이 하나의 refresh를 공유. */
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
	const refresh = getRefreshToken();
	if (!refresh) return null;
	refreshInFlight ??= refreshClient
		.get("auth/refresh", { headers: { Authorization: `Bearer ${refresh}` } })
		.then(() => getAccessToken()) // 새 토큰은 captureHook이 저장
		.catch(() => {
			clearTokens();
			return null;
		})
		.finally(() => {
			refreshInFlight = null;
		});
	return refreshInFlight;
}

/** ky HTTPError → ApiError(에러 봉투 파싱). */
async function toApiError(err: unknown): Promise<unknown> {
	if (!(err instanceof HTTPError)) return err;
	const status = err.response.status;
	try {
		const body = (await err.response.json()) as {
			error_code?: string;
			error_detail?: string;
			error_uuid?: string;
		};
		return new ApiError({
			status,
			errorCode: body.error_code,
			message: body.error_detail,
			errorUuid: body.error_uuid,
		});
	} catch {
		return new ApiError({ status });
	}
}

/** 성공 봉투에서 data 추출(없으면 본문 그대로). */
async function unwrap<T>(res: Response): Promise<T> {
	if (res.status === 204) return undefined as T;
	const body = (await res.json().catch(() => null)) as {
		success?: boolean;
		data?: unknown;
		error_code?: string;
	} | null;
	if (body && body.success === false) {
		throw new ApiError({ status: res.status, errorCode: body.error_code });
	}
	if (body && typeof body === "object" && "data" in body) return body.data as T;
	return body as T;
}

/**
 * 요청 실행 + data 언랩 + ApiError 매핑.
 * 401(토큰 만료) 이면 refresh 후 thunk를 1회 새로 실행(요청 바디 재사용 문제 회피).
 */
async function run<T>(thunk: () => Promise<unknown>, authed: boolean) {
	try {
		return await unwrap<T>((await thunk()) as Response);
	} catch (err) {
		const mapped = await toApiError(err);
		if (
			authed &&
			mapped instanceof ApiError &&
			mapped.status === 401 &&
			(await refreshAccessToken())
		) {
			try {
				return await unwrap<T>((await thunk()) as Response);
			} catch (retryErr) {
				throw await toApiError(retryErr);
			}
		}
		throw mapped;
	}
}

type Json = Record<string, unknown> | unknown[];

/** per-call 옵션. 느린(AI) 엔드포인트는 `timeout`을 늘리거나 false(무제한)로. */
type CallOpts = { timeout?: number | false };

/** 인증 클라이언트 helper (data 언랩 + 401 자동 refresh + ApiError). */
export const http = {
	get: <T = unknown>(
		path: string,
		searchParams?: Options["searchParams"],
		opts?: CallOpts,
	) => run<T>(() => api.get(path, { searchParams, ...opts }), true),
	post: <T = unknown>(path: string, json?: Json, opts?: CallOpts) =>
		run<T>(() => api.post(path, { ...(json ? { json } : {}), ...opts }), true),
	patch: <T = unknown>(path: string, json?: Json, opts?: CallOpts) =>
		run<T>(() => api.patch(path, { ...(json ? { json } : {}), ...opts }), true),
	put: <T = unknown>(path: string, json?: Json, opts?: CallOpts) =>
		run<T>(() => api.put(path, { ...(json ? { json } : {}), ...opts }), true),
	del: <T = unknown>(path: string, json?: Json, opts?: CallOpts) =>
		run<T>(
			() => api.delete(path, { ...(json ? { json } : {}), ...opts }),
			true,
		),
};

/** 공개(비인증) 클라이언트 helper. */
export const publicHttp = {
	get: <T = unknown>(
		path: string,
		searchParams?: Options["searchParams"],
		opts?: CallOpts,
	) => run<T>(() => publicApi.get(path, { searchParams, ...opts }), false),
	post: <T = unknown>(path: string, json?: Json, opts?: CallOpts) =>
		run<T>(
			() => publicApi.post(path, { ...(json ? { json } : {}), ...opts }),
			false,
		),
};

/** zod로 신뢰 경계 검증. */
export function parse<T>(value: unknown, schema: ZodType<T>): T {
	return schema.parse(value);
}
