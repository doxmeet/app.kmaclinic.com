import { env } from "#/lib/env.ts";

/**
 * 병원 홈페이지 실시간 미리보기 연동 — 단일 진실 출처는 `preview-integration.md`.
 *
 * 콘솔(app.kmaclinic.com)이 미리보기 앱(`preview.kmaclinic.com`)을 iframe으로 띄우고,
 * 온보딩 입력을 `PublicHospitalData` 형태로 매핑해 postMessage로 보내면 미리보기가 실시간 렌더한다.
 * 미리보기 앱은 공개 API를 치지 않고 **오직 받은 payload로만** 그린다(§1).
 * (iframe src는 origin 루트 — `/preview` 경로를 붙이지 않는다.)
 */

// ─────────────────────────────────────────────────────────────────────
// origin / 메시지 프로토콜 (§2, §3)
// ─────────────────────────────────────────────────────────────────────

/** 미리보기 앱 origin. 미설정 시 prod로 폴백. postMessage targetOrigin + iframe src에 사용. */
export const PREVIEW_ORIGIN =
	env.VITE_PREVIEW_ORIGIN ?? "https://preview.kmaclinic.com";

/** iframe src — origin 루트(미리보기 앱이 루트에서 바로 렌더, `/preview` 경로 없음). */
export const PREVIEW_SRC = PREVIEW_ORIGIN;

/** 모든 메시지에 붙는 식별자/버전(§3). 버전이 다르면 미리보기 앱이 무시한다. */
export const PREVIEW_SOURCE = "kmaclinic-preview" as const;
export const PREVIEW_VERSION = 1 as const;

/** iframe → 콘솔: 미리보기 앱이 메시지 수신 준비를 마쳤다는 신호(§3.1). */
export type PreviewReadyMessage = {
	source: typeof PREVIEW_SOURCE;
	type: "ready";
	version: typeof PREVIEW_VERSION;
};

/** 콘솔 → iframe: 현재 입력 **전체 스냅샷**(§3.2). diff가 아니라 매번 전체를 보낸다. */
export type PreviewDataMessage = {
	source: typeof PREVIEW_SOURCE;
	type: "data";
	version: typeof PREVIEW_VERSION;
	payload: PreviewPayload;
};

/** 수신한 메시지가 미리보기 앱의 `ready` 인지 검증(origin 검증은 호출부 책임). */
export function isReadyMessage(data: unknown): data is PreviewReadyMessage {
	if (data == null || typeof data !== "object") return false;
	const m = data as Record<string, unknown>;
	return (
		m.source === PREVIEW_SOURCE &&
		m.type === "ready" &&
		m.version === PREVIEW_VERSION
	);
}

// ─────────────────────────────────────────────────────────────────────
// 데이터 계약 — PublicHospitalData (§4). 모든 필드 사실상 선택.
// 콘솔이 채우는 부분집합만 타입으로 정의한다(미사용 필드는 생략).
// ─────────────────────────────────────────────────────────────────────

export interface PreviewHospital {
	no?: number;
	slug?: string;
	name?: string;
	road_address?: string;
	detail_address?: string;
	postal_code?: string;
	// 지도 좌표(네이버). 없으면 미리보기는 "지도 보기" 링크로 폴백(§4.2).
	lat?: number | string;
	lng?: number | string;
	naver_place_url?: string;
	parking_info?: string;
	main_phone?: string;
	email?: string;
	logo_url?: string;
	hero_headline?: string;
	hero_sub?: string;
	template_key?: string;
	description?: string;
	established_year?: number;
	representative_name?: string;
	sns_links?: Record<string, string>;
	business_hours?: PreviewBusinessHours;
}

export interface PreviewPhoto {
	no: number;
	url: string;
	caption?: string;
	sort?: number;
}
export interface PreviewDepartment {
	no: number;
	name: string;
	sort?: number;
}
export interface PreviewTreatment {
	no: number;
	name: string;
	description?: string;
	price_info?: string;
	sort?: number;
}

export interface PreviewDayHours {
	closed?: boolean;
	open?: string | null;
	close?: string | null;
	lunch?: { start: string; end: string } | null;
}
export interface PreviewBusinessHours {
	version?: number;
	days?: Partial<
		Record<
			"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun",
			PreviewDayHours
		>
	>;
	holiday?: PreviewDayHours;
	note?: string | null;
}

/** 콘솔이 보내는 최상위 페이로드(부분 스냅샷). */
export interface PreviewPayload {
	hospital?: PreviewHospital;
	photos?: PreviewPhoto[];
	departments?: PreviewDepartment[];
	treatments?: PreviewTreatment[];
	popups?: never[];
	members?: never[];
	home_boards?: never[];
	menu?: never[];
}

// ─────────────────────────────────────────────────────────────────────
// 온보딩(병원 직접 입력) → 미리보기 payload 매핑
// ─────────────────────────────────────────────────────────────────────

/** 폼에서 미리보기로 넘기는 정규화된 입력(폼 reducer 타입과 분리). */
export interface HospitalPreviewInput {
	name?: string;
	roadAddress?: string;
	mainPhone?: string;
	logoUrl?: string;
	templateKey?: string;
	// 레지스트리(ref/clinic)에서 고른 병원 좌표(있을 때만 — 지도 표시용).
	lat?: number | string;
	lng?: number | string;
	hoursWeekday?: string;
	hoursSaturday?: string;
	hoursSunday?: string;
	sns?: {
		instagram?: string;
		facebook?: string;
		youtube?: string;
		blog?: string;
		kakao?: string;
		x?: string;
	};
	departments?: string[];
	treatments?: Array<{
		name?: string;
		price_info?: string;
		description?: string;
	}>;
	photos?: string[];
}

/**
 * `HospitalPreviewInput` → `PreviewPayload`(§4 형태). 빈 값은 생략한다.
 * 미리보기 앱이 빈 배열/기본값으로 방어하므로 미입력 필드는 빼도 안전하다.
 */
export function buildHospitalPreviewPayload(
	input: HospitalPreviewInput,
): PreviewPayload {
	const hospital: PreviewHospital = {};
	const name = input.name?.trim();
	if (name) hospital.name = name;
	const roadAddress = input.roadAddress?.trim();
	if (roadAddress) hospital.road_address = roadAddress;
	const mainPhone = input.mainPhone?.trim();
	if (mainPhone) hospital.main_phone = mainPhone;
	const logoUrl = input.logoUrl?.trim();
	if (logoUrl) hospital.logo_url = logoUrl;
	// 레지스트리에서 고른 병원이면 좌표가 있어 지도를 띄울 수 있다(없으면 미반영).
	const lat = asNumber(input.lat);
	if (lat !== undefined) hospital.lat = lat;
	const lng = asNumber(input.lng);
	if (lng !== undefined) hospital.lng = lng;
	// template_key는 항상 보낸다(시안 전환이 핵심 — 빈 값이면 t1).
	hospital.template_key = (input.templateKey || "t1").toLowerCase();

	const sns = compactRecord({
		instagram: input.sns?.instagram,
		facebook: input.sns?.facebook,
		youtube: input.sns?.youtube,
		blog: input.sns?.blog,
		kakao_channel: input.sns?.kakao,
		x: input.sns?.x,
	});
	if (sns) hospital.sns_links = sns;

	const businessHours = buildBusinessHours(input);
	if (businessHours) hospital.business_hours = businessHours;

	const payload: PreviewPayload = { hospital };

	const departments = (input.departments ?? [])
		.map((d) => d.trim())
		.filter(Boolean)
		.map((nm, i) => ({ no: i + 1, name: nm, sort: i }));
	if (departments.length > 0) payload.departments = departments;

	const treatments = (input.treatments ?? [])
		.map((t, i) => {
			const nm = t.name?.trim();
			if (!nm) return null;
			const treatment: PreviewTreatment = { no: i + 1, name: nm, sort: i };
			const price = t.price_info?.trim();
			if (price) treatment.price_info = price;
			const desc = t.description?.trim();
			if (desc) treatment.description = desc;
			return treatment;
		})
		.filter((t): t is PreviewTreatment => t !== null);
	if (treatments.length > 0) payload.treatments = treatments;

	const photos = (input.photos ?? [])
		.map((url) => url.trim())
		.filter(Boolean)
		.map((url, i) => ({ no: i + 1, url, sort: i }));
	if (photos.length > 0) payload.photos = photos;

	return payload;
}

/**
 * 대화형 온보딩 **세션 draft** → `PreviewPayload`. 직접 입력 폼과 달리 draft.hospital은
 * 이미 PublicHospitalData에 가까운 구조(business_hours v2·sns_links 객체)라 거의 그대로 통과시킨다.
 * 모든 필드는 방어적으로 파싱한다(타입 미보장). `templateKeyOverride`로 스와치 실시간 선택을 반영.
 */
export function buildPreviewPayloadFromDraft(
	draft: Record<string, unknown> | null | undefined,
	templateKeyOverride?: string,
): PreviewPayload {
	const hospitalRaw = asObject(draft?.hospital);
	const hospital: PreviewHospital = {};
	if (hospitalRaw) {
		assignStr(hospital, "name", hospitalRaw.name);
		assignStr(hospital, "road_address", hospitalRaw.road_address);
		assignStr(hospital, "detail_address", hospitalRaw.detail_address);
		assignStr(hospital, "postal_code", hospitalRaw.postal_code);
		assignStr(hospital, "naver_place_url", hospitalRaw.naver_place_url);
		assignStr(hospital, "parking_info", hospitalRaw.parking_info);
		assignStr(hospital, "main_phone", hospitalRaw.main_phone);
		assignStr(hospital, "email", hospitalRaw.email);
		assignStr(hospital, "logo_url", hospitalRaw.logo_url);
		assignStr(hospital, "hero_headline", hospitalRaw.hero_headline);
		assignStr(hospital, "hero_sub", hospitalRaw.hero_sub);
		assignStr(hospital, "description", hospitalRaw.description);
		assignStr(hospital, "representative_name", hospitalRaw.representative_name);
		// 지도 좌표 — 숫자/숫자문자열만 통과(없으면 미반영 → 미리보기 "지도 보기" 폴백).
		const lat = asNumber(hospitalRaw.lat);
		if (lat !== undefined) hospital.lat = lat;
		const lng = asNumber(hospitalRaw.lng);
		if (lng !== undefined) hospital.lng = lng;
		const establishedYear = asNumber(hospitalRaw.established_year);
		if (establishedYear !== undefined)
			hospital.established_year = establishedYear;
		const sns = asObject(hospitalRaw.sns_links);
		if (sns) {
			const compact = onlyStringValues(sns);
			if (Object.keys(compact).length > 0) hospital.sns_links = compact;
		}
		// business_hours는 백엔드가 v2로 정규화 → 객체면 그대로 통과(미리보기 앱이 방어).
		const businessHours = asObject(hospitalRaw.business_hours);
		if (businessHours)
			hospital.business_hours = businessHours as PreviewBusinessHours;
	}
	hospital.template_key = (
		templateKeyOverride ||
		strOrEmpty(hospitalRaw?.template_key) ||
		"t1"
	).toLowerCase();

	const payload: PreviewPayload = { hospital };

	const departments = nameList(draft?.departments).map((name, i) => ({
		no: i + 1,
		name,
		sort: i,
	}));
	if (departments.length > 0) payload.departments = departments;

	const treatments: PreviewTreatment[] = [];
	if (Array.isArray(draft?.treatments)) {
		draft.treatments.forEach((raw, i) => {
			const row = asObject(raw);
			const name = strOrEmpty(row?.name);
			if (!name) return;
			const treatment: PreviewTreatment = {
				no: i + 1,
				name,
				sort: treatments.length,
			};
			const price = strOrEmpty(row?.price_info);
			if (price) treatment.price_info = price;
			const desc = strOrEmpty(row?.description);
			if (desc) treatment.description = desc;
			treatments.push(treatment);
		});
	}
	if (treatments.length > 0) payload.treatments = treatments;

	const photos = urlList(draft?.photos).map((url, i) => ({
		no: i + 1,
		url,
		sort: i,
	}));
	if (photos.length > 0) payload.photos = photos;

	return payload;
}

/**
 * 자유 텍스트 진료시간(평일/토/일) → `BusinessHours` v2(§4.6).
 * "09:00-18:00"/"09:00~18:00" → {open,close}, "휴진"/"휴무"/빈 값 → 미반영(주말은 closed).
 */
function buildBusinessHours(
	input: HospitalPreviewInput,
): PreviewBusinessHours | undefined {
	const weekday = parseDayHours(input.hoursWeekday);
	const saturday = parseDayHours(input.hoursSaturday);
	const sunday = parseDayHours(input.hoursSunday);
	if (!weekday && !saturday && !sunday) return undefined;

	const days: PreviewBusinessHours["days"] = {};
	if (weekday) {
		days.mon = weekday;
		days.tue = weekday;
		days.wed = weekday;
		days.thu = weekday;
		days.fri = weekday;
	}
	if (saturday) days.sat = saturday;
	if (sunday) days.sun = sunday;

	const result: PreviewBusinessHours = { version: 2, days };
	// 일요일/공휴일 휴진 표기가 있으면 holiday도 닫음.
	if (sunday?.closed) result.holiday = { closed: true };
	return result;
}

const TIME_RE = /(\d{1,2}:\d{2})\s*[-~]\s*(\d{1,2}:\d{2})/;
const CLOSED_RE = /(휴진|휴무|휴일|closed)/i;

/** 한 줄 진료시간 문자열 → DayHours. 파싱 불가 시 undefined. */
function parseDayHours(value: string | undefined): PreviewDayHours | undefined {
	const text = value?.trim();
	if (!text) return undefined;
	if (CLOSED_RE.test(text)) return { closed: true };
	const m = TIME_RE.exec(text);
	if (m) return { open: m[1], close: m[2] };
	return undefined;
}

/** 빈 문자열 값을 제거한 레코드(비면 undefined). */
function compactRecord(
	obj: Record<string, string | undefined>,
): Record<string, string> | undefined {
	const out: Record<string, string> = {};
	for (const [key, value] of Object.entries(obj)) {
		const trimmed = value?.trim();
		if (trimmed) out[key] = trimmed;
	}
	return Object.keys(out).length > 0 ? out : undefined;
}

// ── draft 방어 파싱 헬퍼(buildPreviewPayloadFromDraft 전용) ──────────────

/** unknown → 객체(아니면 null). */
function asObject(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

/** unknown → trim된 문자열(비었으면 ""). */
function strOrEmpty(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

/** unknown → 유한 숫자(숫자 또는 숫자문자열). 아니면 undefined. 좌표/연도용. */
function asNumber(value: unknown): number | undefined {
	if (typeof value === "number")
		return Number.isFinite(value) ? value : undefined;
	if (typeof value === "string" && value.trim() !== "") {
		const n = Number(value);
		return Number.isFinite(n) ? n : undefined;
	}
	return undefined;
}

/** target[key]에 trim된 문자열 값을 채운다(빈 값은 건너뜀). 문자열 필드 전용. */
function assignStr<T, K extends keyof T>(
	target: T,
	key: K,
	value: unknown,
): void {
	const trimmed = strOrEmpty(value);
	if (trimmed) target[key] = trimmed as T[K];
}

/** 레코드에서 문자열 값만 추려 trim(비문자/빈값 제외). */
function onlyStringValues(
	obj: Record<string, unknown>,
): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [key, value] of Object.entries(obj)) {
		const trimmed = strOrEmpty(value);
		if (trimmed) out[key] = trimmed;
	}
	return out;
}

/** string[] 또는 {name}[] → 이름 문자열 배열(빈값/중복 제거 없이 순서 유지). */
function nameList(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value
		.map((item) =>
			typeof item === "string" ? item.trim() : strOrEmpty(asObject(item)?.name),
		)
		.filter(Boolean);
}

/** string[] 또는 {url}[] → URL 문자열 배열(빈값 제외, 순서 유지). */
function urlList(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value
		.map((item) =>
			typeof item === "string" ? item.trim() : strOrEmpty(asObject(item)?.url),
		)
		.filter(Boolean);
}
