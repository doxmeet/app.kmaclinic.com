import { env } from "#/lib/env.ts";

/**
 * 의사 프로필 실시간 미리보기 연동 — 단일 진실 출처는 `editor-preview-integration.md`.
 *
 * 편집기(app.kmaclinic.com)가 미리보기 앱(`preview.kmadoc.com`)을 iframe으로 띄우고,
 * 프로필 편집 상태를 `/profile/me` 형태의 번들로 postMessage 한다. 미리보기 앱은 공개 API를
 * 치지 않고 **받은 payload로만** 공개 프로필 템플릿(4종)으로 렌더한다(§0).
 *
 * ⚠ 병원 미리보기(`#/lib/preview.ts`)와 **다르다**: source `kmadoc-preview`,
 *   type `profile:update`/`preview:ready`, origin `preview.kmadoc.com`.
 *   또한 iframe src에 `/preview` 경로를 붙이지 않는다(origin 루트가 미리보기 화면).
 */

// ─────────────────────────────────────────────────────────────────────
// origin / 메시지 프로토콜 (§2, §4)
// ─────────────────────────────────────────────────────────────────────

/** 프로필 미리보기 앱 origin. 미설정 시 prod로 폴백. postMessage targetOrigin + iframe src에 사용. */
export const PROFILE_PREVIEW_ORIGIN =
	env.VITE_PROFILE_PREVIEW_ORIGIN ?? "https://preview.kmadoc.com";

/** iframe src — origin 루트(미리보기 앱이 루트에서 바로 렌더, `/preview` 경로 없음). */
export const PROFILE_PREVIEW_SRC = PROFILE_PREVIEW_ORIGIN;

/** 모든 메시지에 붙는 식별자/버전(§2). */
export const PROFILE_PREVIEW_SOURCE = "kmadoc-preview" as const;
export const PROFILE_PREVIEW_VERSION = 1 as const;

/** iframe → 편집기: 미리보기 앱이 수신 준비를 마쳤다는 신호(§2). */
export type ProfileReadyMessage = {
	source: typeof PROFILE_PREVIEW_SOURCE;
	type: "preview:ready";
	version?: number;
};

/** 편집기 → iframe: 현재 프로필 **전체 스냅샷**(§1). diff가 아니라 매번 전체를 보낸다. */
export type ProfileUpdateMessage = {
	source: typeof PROFILE_PREVIEW_SOURCE;
	type: "profile:update";
	version: typeof PROFILE_PREVIEW_VERSION;
	payload: ProfilePreviewBundle;
};

/** 수신한 메시지가 미리보기 앱의 `preview:ready` 인지 검증(origin 검증은 호출부 책임). */
export function isProfileReadyMessage(
	data: unknown,
): data is ProfileReadyMessage {
	if (data == null || typeof data !== "object") return false;
	const m = data as Record<string, unknown>;
	return m.source === PROFILE_PREVIEW_SOURCE && m.type === "preview:ready";
}

// ─────────────────────────────────────────────────────────────────────
// payload — ProfilePreviewBundle (§3). `/profile/me` 응답과 동일 형태.
// 코어 객체 + id 없는 배열 컬렉션. 모든 필드 선택(빈 값이어도 렌더).
// ─────────────────────────────────────────────────────────────────────

/** 프로필 공개 템플릿 키(§3). 미지정/미인식 → blue 폴백. */
export type ProfileTemplateKey = "blue" | "purple" | "mono" | "green";

/** 코어 객체 — `/profile/me`의 스칼라 필드(전부 선택). 추가 필드는 통과시켜도 무방. */
export type ProfilePreviewCore = Record<string, unknown> & {
	template_key?: string;
	display_name?: string | null;
	photo_url?: string | null;
};

/** 미리보기로 보내는 최상위 번들(부분 스냅샷). 컬렉션은 배열. */
export interface ProfilePreviewBundle {
	profile: ProfilePreviewCore;
	education?: unknown[];
	license?: unknown[];
	training?: unknown[];
	career?: unknown[];
	society?: unknown[];
	paper?: unknown[];
	affiliations?: unknown[];
}

/** 번들의 컬렉션 키 — `/profile/me` doc에서 코어와 분리할 대상. */
const PROFILE_COLLECTION_KEYS = [
	"education",
	"license",
	"training",
	"career",
	"society",
	"paper",
	"affiliations",
] as const;

/**
 * `/profile/me` doc(코어 + id-키 컬렉션) → `ProfilePreviewBundle`(코어 객체 + 배열 컬렉션).
 * 대시보드처럼 편집 상태가 아닌 **저장된 문서**로 미리보기할 때 사용. `templateOverride`로 스와치 반영.
 */
export function buildProfilePreviewBundleFromDoc(
	doc: Record<string, unknown> | null | undefined,
	templateOverride?: string,
): ProfilePreviewBundle {
	const d = doc ?? {};
	const collKeys = PROFILE_COLLECTION_KEYS as readonly string[];
	const profile: ProfilePreviewCore = {};
	for (const [k, v] of Object.entries(d)) {
		if (!collKeys.includes(k)) profile[k] = v;
	}
	const tk = templateOverride ?? profile.template_key;
	profile.template_key = (
		typeof tk === "string" && tk ? tk : "blue"
	).toLowerCase();

	const bundle: ProfilePreviewBundle = { profile };
	for (const key of PROFILE_COLLECTION_KEYS) {
		bundle[key] = collectionToArray(d[key]);
	}
	return bundle;
}

/** id-키 컬렉션 객체(또는 배열) → order 정렬 배열. */
function collectionToArray(value: unknown): unknown[] {
	if (Array.isArray(value)) return value;
	if (value && typeof value === "object") {
		return Object.values(value as Record<string, unknown>).sort(
			(a, b) => orderOf(a) - orderOf(b),
		);
	}
	return [];
}

function orderOf(item: unknown): number {
	const o = (item as { order?: unknown } | null)?.order;
	if (typeof o === "number") return o;
	const n = Number.parseInt(String(o ?? 0), 10);
	return Number.isFinite(n) ? n : 0;
}

// ─────────────────────────────────────────────────────────────────────
// 시안 스와치 — 4종(blue/green/purple/mono). 편집기 TEMPLATE_OPTIONS와 동일 의미.
// (lib 모듈에 둬서 컴포넌트 파일의 non-component export 경고를 피한다.)
// ─────────────────────────────────────────────────────────────────────

export const PROFILE_TEMPLATE_SWATCHES: {
	key: ProfileTemplateKey;
	color: string;
	label: string;
}[] = [
	{ key: "blue", color: "#2a64f6", label: "블루 · 신뢰감 있는 정통" },
	{ key: "green", color: "#22c55e", label: "그린 · 친근하고 편안한" },
	{ key: "purple", color: "#422af6", label: "퍼플 · 세련된 전문가형" },
	{ key: "mono", color: "#64748b", label: "모노 · 미니멀하고 정돈된" },
];
