import { publicHttp } from "#/lib/api";

/**
 * 참조 데이터 자동완성 — 문서 §8.5 / §8.11.4. 전부 **공개(게스트)** GET.
 * 온보딩·프로필 입력 보조용(주소는 별도: lib/upload 등에서 처리하지 않고 여기 ref/address).
 *
 * 백엔드 bigint(no/lat/lng)는 JSON에서 **문자열**로 직렬화될 수 있어 number|string으로 받는다.
 */

type NumOrStr = number | string;

/** 페이지/검색 공통 쿼리. 빈 값은 제외해 보낸다. */
function refQuery(
	params: Record<string, string | number | undefined>,
): Record<string, string | number> | undefined {
	const out: Record<string, string | number> = {};
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined && value !== "") out[key] = value;
	}
	return Object.keys(out).length ? out : undefined;
}

// ── 전국 병의원 레지스트리(HIRA) — 문서 §8.11.4 ────────────────────────

/** `GET /ref/clinic` 항목. `no`/`lat`/`lng`는 문자열로 올 수 있어 number|string. */
export type RefClinic = {
	no?: NumOrStr;
	hira_code?: string;
	name?: string;
	type_name?: string;
	type_code?: string;
	sido_name?: string;
	sigungu_name?: string;
	eup_myeon_dong?: string;
	address?: string;
	postal_code?: string;
	phone?: string;
	homepage?: string;
	opened_at?: string;
	total_doctors?: number;
	lat?: NumOrStr;
	lng?: NumOrStr;
	source?: string;
	[key: string]: unknown;
};

/**
 * 병의원 자동완성(`GET /ref/clinic`).
 * - `keyword` 이름 부분일치(ILIKE), prefix 우선.
 * - `limit` 기본 20 / 최대 30.
 * - `sido`/`type` 정확일치 필터(예: "서울", "의원"). 짧은 표기 허용.
 */
export function searchClinics(
	params: {
		keyword?: string;
		limit?: number;
		sido?: string;
		type?: string;
	},
	signal?: AbortSignal,
) {
	return publicHttp.get<{ items: RefClinic[] }>(
		"ref/clinic",
		refQuery(params),
		{ signal },
	);
}

/** 온보딩 search 질문이 돌려주는 자동완성 항목(필드는 endpoint마다 다름). */
export type RefSearchItem = Record<string, unknown>;

/**
 * 온보딩 search 질문용 제네릭 자동완성 — `GET <question.search.endpoint>`(예: `/ref/clinic`).
 * 공개 GET, `keyword` 부분일치. 응답은 다른 ref 자동완성과 동일한 `{ items }` 규약.
 * 앞 슬래시는 제거한다(ky prefixUrl은 절대경로를 허용하지 않음).
 */
export function searchRef(
	endpoint: string,
	params: { keyword?: string; limit?: number },
	signal?: AbortSignal,
) {
	const path = endpoint.replace(/^\/+/, "");
	return publicHttp.get<{ items: RefSearchItem[] }>(path, refQuery(params), {
		signal,
	});
}

// ── 프로필 입력 보조 자동완성 — 문서 §8.11.4 ───────────────────────────

export type RefMedicalSchool = {
	no?: NumOrStr;
	name?: string;
	name_en?: string;
	region?: string;
	type?: string;
	status?: string;
	note?: string;
	sort?: number;
	[key: string]: unknown;
};

export type RefDepartment = {
	no?: NumOrStr;
	name?: string;
	code?: string;
	sort?: number;
	[key: string]: unknown;
};

export type RefSociety = {
	no?: NumOrStr;
	name?: string;
	name_en?: string;
	category?: string;
	is_official?: boolean;
	[key: string]: unknown;
};

/** 의과대학 자동완성(`GET /ref/medical-school`). 현존 우선. */
export function searchMedicalSchools(params: {
	keyword?: string;
	limit?: number;
}) {
	return publicHttp.get<{ items: RefMedicalSchool[] }>(
		"ref/medical-school",
		refQuery(params),
	);
}

/** 전문과목 자동완성(`GET /ref/department`). */
export function searchDepartments(params: { keyword?: string }) {
	return publicHttp.get<{ items: RefDepartment[] }>(
		"ref/department",
		refQuery(params),
	);
}

/** 학회 자동완성(`GET /ref/society`). 공식 우선. */
export function searchSocieties(params: { keyword?: string; limit?: number }) {
	return publicHttp.get<{ items: RefSociety[] }>(
		"ref/society",
		refQuery(params),
	);
}
