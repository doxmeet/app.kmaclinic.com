import { z } from "zod";
import { http, parse } from "#/lib/api";

/**
 * 의사 프로필 관리 — 문서 §6.10 / §8.11.
 *
 * 프로필은 **단일 JSON 문서**다(코어 필드 + id-키 컬렉션). 모든 수정은 하나의
 * `PATCH /profile/me`(RFC 7386 **JSON Merge Patch**)로 한다:
 *  - 보낸 키만 반영, 명시적 `null`인 키는 삭제, 생략한 키는 유지.
 *  - 객체는 깊은 병합, 배열/스칼라는 통째 교체.
 *  - 컬렉션(education/license/training/career/society/paper/affiliations)은 id-키 객체:
 *      추가 = `{coll:{<새 id>:{...}}}`, 수정 = `{coll:{<id>:{변경필드}}}`, 삭제 = `{coll:{<id>:null}}`.
 *  - 각 항목 공통: `order`(정렬), `is_public`(공개 여부). education만 `is_confirmed`(미설정=미확정).
 *
 * 구 per-엔티티 CRUD 라우트는 제거됨(§8.11.2). 자동완성 ref는 `#/lib/api/ref.ts`.
 */

/** 컬렉션 항목(공통 메타 + 자유 필드). 서버 계약은 컬렉션별로 다르나 경계는 loose. */
export type ProfileItem = Record<string, unknown> & {
	order?: number;
	is_public?: boolean;
};

/** id-키 컬렉션(예: { e_a1: {...}, e_a2: {...} }). */
export type ProfileCollection = Record<string, ProfileItem>;

/**
 * 프로필 문서(코어 + 컬렉션). 알려진 코어 필드만 명시하고 나머지는 인덱스로 허용.
 * bigint(no/primary_department_no)는 JSON에서 문자열일 수 있어 호출부에서 숫자 변환.
 */
export type ProfileDoc = Record<string, unknown> & {
	no?: number | string;
	user_no?: number | string;
	slug?: string | null;
	is_published?: boolean;
	published_at?: string | null;
	completion_percent?: number;
	display_name?: string | null;
	name_en?: string | null;
	gender?: string | null;
	birth_date?: string | null;
	headline?: string | null;
	primary_department_no?: number | string | null;
	primary_department_text?: string | null;
	specialty_text?: string | null;
	specialty_tags?: string[] | null;
	etc_text?: string | null;
	intro_text?: string | null;
	media_text?: string | null;
	photo_url?: string | null;
	cover_url?: string | null;
	naver_url?: string | null;
	kakao_url?: string | null;
	contact_phone?: string | null;
	contact_email?: string | null;
	orcid_id?: string | null;
	template_key?: string | null;
	field_visibility?: Record<string, boolean> | null;
	education?: ProfileCollection;
	license?: ProfileCollection;
	training?: ProfileCollection;
	career?: ProfileCollection;
	society?: ProfileCollection;
	paper?: ProfileCollection;
	affiliations?: ProfileCollection;
};

/** GET/PATCH 응답은 loose — 서버가 코어+doc을 한 객체로 병합해 내려준다(§8.11.1). */
const ProfileDocSchema = z.looseObject({});

/** merge-patch 본문 — 코어 스칼라 + 컬렉션 id-키 부분객체(null=삭제). */
export type ProfilePatch = Record<string, unknown>;

/** 내 프로필 전체(비공개·미확정 포함). 편집기 초기 로드용. */
export async function getProfile(): Promise<ProfileDoc> {
	return parse(await http.get("profile/me"), ProfileDocSchema) as ProfileDoc;
}

/**
 * 프로필 문서 부분 수정(JSON Merge Patch). 응답 `{ profile }`의 갱신된 전체 문서를 돌려준다.
 * 검증 에러: ERROR_400_INVALID_DEPARTMENT/INVALID_GENDER/INVALID_SPECIALTY_TAGS/
 * TOO_MANY_SPECIALTY_TAGS/INVALID_FIELD.
 */
export async function patchProfile(patch: ProfilePatch): Promise<ProfileDoc> {
	const res = await http.patch<{ profile?: unknown }>("profile/me", patch);
	return parse(res?.profile ?? res, ProfileDocSchema) as ProfileDoc;
}

/** 완성도(%) + 섹션별 충족(§6.10.1 가중치). */
export type ProfileCompletion = {
	completion_percent?: number;
	sections?: Array<{ key: string; weight?: number; done?: boolean }>;
};

export async function getCompletion(): Promise<ProfileCompletion> {
	return http.get<ProfileCompletion>("profile/me/completion");
}

/** 동료 비교(과·표본 부족 시 comparison_available:false). 표시용. */
export type ProfileComparison = Record<string, unknown> & {
	comparison_available?: boolean;
	reason?: string;
	sample_size?: number;
};

export async function getComparison(): Promise<ProfileComparison> {
	return http.get<ProfileComparison>("profile/me/comparison");
}

// ── 자동완성/확정(§8.11.3) ─────────────────────────────────────────────

/** 학위 자동 제안(bachelor일 때 master/doctorate 2건). 사용자가 확인 후 PATCH로 추가. */
export function suggestEducation() {
	return http.post<{ suggestions: ProfileItem[] }>(
		"profile/me/education/suggest",
	);
}

/** 미확정 학력 확정(is_confirmed=true). `:id`는 doc.education의 문자열 id. */
export function confirmEducation(id: string) {
	return http.patch<{ item: ProfileItem }>(
		`profile/me/education/${id}/confirm`,
	);
}

/** 수련 기간 자동 제안(있으면 { start_date, end_date }, 없으면 null). */
export function suggestTraining() {
	return http.post<{
		suggestion: { start_date?: string; end_date?: string } | null;
	}>("profile/me/training/suggest");
}

// ── 게시(§8.11.1) — slug 선설정 필요(setProfileSlug는 billing.ts) ──────────

/** 프로필 공개. slug 미설정 시 ERROR_400_SLUG_REQUIRED. */
export function publishProfile() {
	return http.post<{
		no?: number;
		slug?: string;
		is_published?: boolean;
		published_at?: string;
	}>("profile/me/publish");
}

/** 프로필 공개 해제. */
export function unpublishProfile() {
	return http.post<{ no?: number; is_published?: boolean }>(
		"profile/me/unpublish",
	);
}
