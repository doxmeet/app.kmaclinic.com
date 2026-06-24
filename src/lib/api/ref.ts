import { publicHttp } from "#/lib/api";

/** 공개 참조 데이터 — 문서 §8.5 (주소·의과대학·진료과·학회 자동완성). */

export type AddressResult = Record<string, unknown> & {
	road_address?: string;
	jibun_address?: string;
	zonecode?: string;
};

/** 도로명 주소 검색(행안부 juso). `{ enabled, total, items }` 또는 배열로 옴. */
export function searchAddress(keyword: string) {
	return publicHttp.get<AddressResult[] | { items: AddressResult[] }>(
		"ref/address",
		{ keyword },
	);
}

export type RefItem = Record<string, unknown> & { name?: string };

/** `{ items }` 봉투에서 items만 안전하게 추출(배열로 와도 허용). */
function items<T>(res: T[] | { items?: T[] } | null | undefined): T[] {
	if (Array.isArray(res)) return res;
	return res?.items ?? [];
}

/** 의과대학 자동완성(문서 §8.5) — 온보딩 학력 보조 입력용(선택). */
export async function searchMedicalSchool(
	keyword: string,
	limit?: number,
): Promise<RefItem[]> {
	return items(
		await publicHttp.get<RefItem[] | { items: RefItem[] }>(
			"ref/medical-school",
			{
				keyword,
				...(limit ? { limit } : {}),
			},
		),
	);
}

/** 전문 진료과목 자동완성(문서 §8.5) — 선택. */
export async function searchDepartment(keyword: string): Promise<RefItem[]> {
	return items(
		await publicHttp.get<RefItem[] | { items: RefItem[] }>("ref/department", {
			keyword,
		}),
	);
}

/** 학회 자동완성(문서 §8.5) — 선택. 학회 추가(POST /ref/society)는 운영자 전용(admin.ts). */
export async function searchSociety(
	keyword: string,
	limit?: number,
): Promise<RefItem[]> {
	return items(
		await publicHttp.get<RefItem[] | { items: RefItem[] }>("ref/society", {
			keyword,
			...(limit ? { limit } : {}),
		}),
	);
}
