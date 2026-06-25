import { env } from "#/lib/env.ts";

/**
 * 병원 홈페이지 실시간 미리보기 연동 — 단일 진실 출처는 `preview-integration.md`.
 *
 * 콘솔(app.kmaclinic.com)이 미리보기 앱(`preview.kmaclinic.com/preview`)을 iframe으로 띄우고,
 * 온보딩 입력을 `PublicHospitalData` 형태로 매핑해 postMessage로 보내면 미리보기가 실시간 렌더한다.
 * 미리보기 앱은 공개 API를 치지 않고 **오직 받은 payload로만** 그린다(§1).
 */

// ─────────────────────────────────────────────────────────────────────
// origin / 메시지 프로토콜 (§2, §3)
// ─────────────────────────────────────────────────────────────────────

/** 미리보기 앱 origin. 미설정 시 prod로 폴백. postMessage targetOrigin + iframe src에 사용. */
export const PREVIEW_ORIGIN =
	env.VITE_PREVIEW_ORIGIN ?? "https://preview.kmaclinic.com";

/** iframe src — 미리보기 라우트(`/preview`). */
export const PREVIEW_SRC = `${PREVIEW_ORIGIN}/preview`;

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
	main_phone?: string;
	email?: string;
	logo_url?: string;
	hero_headline?: string;
	hero_sub?: string;
	template_key?: string;
	description?: string;
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
