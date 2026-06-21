import { publicHttp } from "#/lib/api";

/** 공개 참조 데이터 — 문서 §2 (주소 검색 등). */

export type AddressResult = Record<string, unknown> & {
	road_address?: string;
	jibun_address?: string;
	zonecode?: string;
};

/** 도로명 주소 검색(행안부 juso). */
export function searchAddress(keyword: string) {
	return publicHttp.get<AddressResult[] | { items: AddressResult[] }>(
		"ref/address",
		{ keyword },
	);
}
