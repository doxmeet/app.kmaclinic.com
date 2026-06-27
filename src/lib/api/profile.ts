import { z } from "zod";
import { http, parse } from "#/lib/api";

/**
 * 의사 프로필 관리 — 문서 §6.10 / §8.11.
 *
 * 프로필은 **단일 JSON 문서**다(코어 필드 + 컬렉션). 모든 수정은 하나의
 * `PATCH /profile/me`(RFC 7386 **JSON Merge Patch**)로 한다:
 *  - 보낸 키만 반영, 명시적 `null`인 키는 삭제, 생략한 키는 유지.
 *  - 객체는 깊은 병합, 배열/스칼라는 통째 교체.
 *  - 컬렉션(education/license/training/career/society/paper/affiliations) **쓰기**는 id-키 객체:
 *      추가 = `{coll:{<새 id>:{...}}}`, 수정 = `{coll:{<id>:{변경필드}}}`, 삭제 = `{coll:{<id>:null}}`.
 *  - 컬렉션 **읽기**(GET 응답)는 서버가 **정렬한 배열**(각 항목에 `id` 포함)로 내려준다.
 *  - 각 항목 공통: `is_public`(공개 여부, 기본 true). **`order` 필드는 없다 — 서버가 자동 정렬한다.**
 *  - 기본정보 공개여부는 `field_visibility` 맵(키=코어 필드명, 값=boolean). display_name·
 *    primary_department는 항상 공개라 토글 대상이 아니다.
 *
 * 자동완성 ref는 `#/lib/api/ref.ts`.
 */

/** 컬렉션 항목(공통 메타 + 자유 필드). 서버 계약은 컬렉션별로 다르나 경계는 loose. */
export type ProfileItem = Record<string, unknown> & {
	/** 읽기(GET 응답) 항목에는 id가 포함된다. 쓰기(PATCH)는 id를 키로 쓴다. */
	id?: string;
	is_public?: boolean;
};

/** 쓰기용 id-키 컬렉션(예: { e_a1: {...}, e_a2: {...} }). */
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
	specialty_tags?: string[] | null;
	intro_text?: string | null;
	media_text?: string | null;
	photo_url?: string | null;
	kakao_url?: string | null;
	contact_phone?: string | null;
	contact_email?: string | null;
	orcid_id?: string | null;
	template_key?: string | null;
	/** 코어 필드명→공개여부 맵. 키 부재=공개(true). false면 공개 프로필에서 제거. */
	field_visibility?: Record<string, boolean> | null;
	// 컬렉션은 GET 응답에선 배열(+id), PATCH 본문에선 id-키 객체.
	education?: ProfileCollection | ProfileItem[];
	license?: ProfileCollection | ProfileItem[];
	training?: ProfileCollection | ProfileItem[];
	career?: ProfileCollection | ProfileItem[];
	society?: ProfileCollection | ProfileItem[];
	paper?: ProfileCollection | ProfileItem[];
	affiliations?: ProfileCollection | ProfileItem[];
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

// ── 문서 분석으로 자동 채우기(§8.11 analyze, 비동기 잡 + 폴링) ───────────────
//
// 이력서·경력기술서·논문목록 등을 업로드하면 AI가 분석해 **프로필에 바로 적용 가능한
// merge-patch(JSON)** 를 돌려준다. 이 호출은 **저장하지 않는다** — 돌려받은 patch를
// 미리보기로 보여주고, 사용자가 고른 항목만 편집 상태에 반영한 뒤 별도로 PATCH 한다.
//
// 처리는 **비동기 잡**이다(document-analysis-frontend-guide §1, 2026-06-27 전환). 동기
// 호출은 파일이 크면 변환+추출에 분 단위가 걸려 게이트웨이/브라우저 타임아웃으로 결과가
// 통째 버려졌다("Request failed due to a network error"). 이제는 잡으로 처리하고 결과를
// 서버에 보존한다:
//   ① 파일 업로드(presign) → file_url 확보(`uploadFilesToStorage`)
//   ② POST /profile/me/analyze → { no, status:"pending" } **즉시** 반환
//   ③ GET /profile/me/analyze/:no → done|failed 될 때까지 2~3초 폴링
//   ④ done → result.patch 미리보기 → 선택 → PATCH /profile/me
// 결과는 잡 번호로 보존되므로 새로고침/재진입해도 같은 no로 다시 받을 수 있다.
//  - 본문: 단일=`{ file_url }`, 여러 개=`{ file_urls }`.
//  - 에러(즉시): ERROR_400_FILE_URL_REQUIRED / ERROR_400_ZIP_MUST_BE_EXPANDED_CLIENT_SIDE /
//    ERROR_415_UNSUPPORTED_FILE_TYPE / ERROR_503_AI_DISABLED.
//  - 에러(폴링): ERROR_404_PROFILE_ANALYZE_JOB_NOT_FOUND.
//  - 잡 실패: status:"failed" + error(사유 문자열).

/** 분석 결과 — `patch`는 PATCH /profile/me에 그대로 넣을 수 있는 merge-patch. */
export type ProfileAnalyzeResult = {
	/** 코어 스칼라 + 컬렉션(id-키 객체). 비어 있으면 추출된 내용이 없다는 뜻. */
	patch: ProfilePatch;
	/** 컬렉션별 추출 건수(요약 표시용). */
	counts?: Record<string, number>;
	/** AI 원본 추출(디버깅/검증용). */
	raw?: unknown;
};

/** 분석 잡 상태(문서 §4). */
export type AnalyzeStatus = "pending" | "processing" | "done" | "failed";

/** 분석 잡 — `done`이면 `result`, `failed`면 `error`가 채워진다. */
export type ProfileAnalyzeJob = {
	no: number;
	status: AnalyzeStatus;
	result?: ProfileAnalyzeResult | null;
	error?: string | null;
	created_at?: string;
	updated_at?: string;
};

/** 분석 잡 생성(즉시 반환). file_url 1개 이상 필요. */
export async function startProfileAnalyze(
	fileUrls: string[],
): Promise<{ no: number; status: AnalyzeStatus }> {
	const body =
		fileUrls.length === 1 ? { file_url: fileUrls[0] } : { file_urls: fileUrls };
	const res = await http.post<{ no: number | string; status?: AnalyzeStatus }>(
		"profile/me/analyze",
		body,
	);
	return { no: Number(res?.no), status: res?.status ?? "pending" };
}

/** 분석 잡 상태 1회 조회(폴링 단위). */
export async function getProfileAnalyzeJob(
	no: number,
): Promise<ProfileAnalyzeJob> {
	const res = await http.get<ProfileAnalyzeJob>(`profile/me/analyze/${no}`);
	return {
		no: Number(res?.no ?? no),
		status: res?.status ?? "pending",
		result: res?.result ?? null,
		error: res?.error ?? null,
		created_at: res?.created_at,
		updated_at: res?.updated_at,
	};
}

/**
 * 잡이 `done`/`failed`가 될 때까지 폴링한다(문서 §3 폴링 규칙).
 *  - 간격: 기본 2.5초.
 *  - 지연 안내(`onSlow`): 기본 2분 경과 시 **1회** 호출 — 폴링은 멈추지 않는다(결과 보존).
 *  - `signal`로 취소(언마운트 등). 취소 시 AbortError를 throw.
 */
export async function pollProfileAnalyze(
	no: number,
	opts: {
		intervalMs?: number;
		slowAfterMs?: number;
		onTick?: (job: ProfileAnalyzeJob) => void;
		onSlow?: () => void;
		signal?: AbortSignal;
	} = {},
): Promise<ProfileAnalyzeJob> {
	const interval = opts.intervalMs ?? 2500;
	const slowAfter = opts.slowAfterMs ?? 120_000;
	const startedAt = Date.now();
	let slowFired = false;
	for (;;) {
		if (opts.signal?.aborted)
			throw new DOMException("분석 폴링이 취소되었습니다.", "AbortError");
		const job = await getProfileAnalyzeJob(no);
		opts.onTick?.(job);
		if (job.status === "done" || job.status === "failed") return job;
		if (!slowFired && Date.now() - startedAt >= slowAfter) {
			slowFired = true;
			opts.onSlow?.();
		}
		await new Promise((r) => setTimeout(r, interval));
	}
}

/**
 * 업로드된 문서를 분석해 적용 가능한 patch를 받는다(저장 X). 잡 생성 → 폴링까지 묶은 헬퍼.
 *  - `onJob`: 잡 번호 확보 시 호출(새로고침 대비 보관용).
 *  - `onStatus`: 폴링마다 상태 전달(스피너 문구 갱신).
 *  - `onSlow`: 2분 경과 지연 안내(1회).
 *  - 잡이 실패하면 사유 메시지로 throw — 호출부에서 재시도 안내.
 */
export async function analyzeProfileDocuments(
	fileUrls: string[],
	opts: {
		onJob?: (no: number) => void;
		onStatus?: (status: AnalyzeStatus) => void;
		onSlow?: () => void;
		signal?: AbortSignal;
	} = {},
): Promise<ProfileAnalyzeResult> {
	const { no } = await startProfileAnalyze(fileUrls);
	opts.onJob?.(no);
	const job = await pollProfileAnalyze(no, {
		onTick: (j) => opts.onStatus?.(j.status),
		onSlow: opts.onSlow,
		signal: opts.signal,
	});
	if (job.status === "failed") {
		throw new Error(
			job.error || "문서 분석에 실패했습니다. 다시 시도해 주세요.",
		);
	}
	return job.result ?? { patch: {} };
}

/** 완성도(%) + 섹션별 충족(§6.10.1 가중치). */
export type ProfileCompletion = {
	completion_percent?: number;
	sections?: Array<{ key: string; weight?: number; done?: boolean }>;
};

export async function getCompletion(): Promise<ProfileCompletion> {
	return http.get<ProfileCompletion>("profile/me/completion");
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
