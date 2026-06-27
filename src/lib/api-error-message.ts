import { toast } from "sonner";
import { ApiError } from "#/lib/api";
import { KAKAO_CHANNEL_URL } from "#/lib/support.ts";

/**
 * error_code → 사용자 노출용 메시지.
 *
 * 출처: 에러 코드 가이드(app.kmaclinic.com, 2026-06-28). 처리 우선순위는 §1과 §4를 따른다.
 *  1) error_uuid 가 있으면 예기치 못한 서버 오류 → 추적 코드와 함께 공통 안내(코드 무시).
 *  2) 호출부 overrides → MESSAGES → 동적 코드 정규식(matchDynamic).
 *  3) 그래도 못 찾으면 HTTP status 기반 폴백(STATUS_FALLBACK) → 최종 일반 문구.
 *
 * ⚠ error_detail(=ApiError.message)은 내부 식별자(hospital_no 등)가 섞일 수 있어
 *   사용자에게 그대로 노출하지 않는다.
 */
const MESSAGES: Record<string, string> = {
	// ── 인증·토큰(§2.1) ──────────────────────────────────────────────
	// TOKEN_EXPIRED는 보통 자동 갱신 후 재시도되어 노출되지 않는다. 토스트로 보인다면
	// 갱신까지 실패한 상황이므로 재로그인을 안내한다.
	ERROR_401_TOKEN_EXPIRED: "로그인이 만료되었습니다. 다시 로그인해 주세요.",
	ERROR_401_REFRESH_TOKEN_EXPIRED:
		"로그인 세션이 만료되었습니다. 다시 로그인해 주세요.",
	ERROR_401_REFRESH_TOKEN_NOT_FOUND:
		"로그인 정보를 찾을 수 없습니다. 다시 로그인해 주세요.",
	ERROR_401_AUTHORIZATION_HEADER_NOT_FOUND:
		"로그인이 필요한 기능입니다. 로그인해 주세요.",
	ERROR_401_AUTHORIZATION_HEADER_NOT_FOUND_IN_REQUEST:
		"로그인이 필요한 기능입니다. 로그인해 주세요.",
	ERROR_400_INVALID_TOKEN:
		"로그인 정보가 올바르지 않습니다. 다시 로그인해 주세요.",
	ERROR_400_TOKEN_MALFORMED:
		"로그인 정보가 올바르지 않습니다. 다시 로그인해 주세요.",
	ERROR_400_TOKEN_PAYLOAD_INVALID_USER_NO:
		"로그인 정보가 올바르지 않습니다. 다시 로그인해 주세요.",
	ERROR_400_AUTHORIZATION_HEADER_MALFORMED:
		"로그인 정보가 올바르지 않습니다. 다시 로그인해 주세요.",
	ERROR_400_AUTHORIZATION_HEADER_MISSING_BEARER_PREFIX:
		"로그인 정보가 올바르지 않습니다. 다시 로그인해 주세요.",
	ERROR_403_FORBIDDEN: "이 작업을 수행할 권한이 없습니다.",
	// 인증 맥락 기본값. 운영자 콘솔에서는 ADMIN_ERROR_OVERRIDES로 "대상 사용자" 문구로 바꾼다.
	ERROR_404_USER_NOT_FOUND:
		"사용자 정보를 찾을 수 없습니다. 다시 로그인해 주세요.",

	// ── 입력 검증(§2.2) ──────────────────────────────────────────────
	ERROR_400_INVALID_PARAMETER_STRUCTURE:
		"입력하신 내용의 형식이 올바르지 않습니다. 다시 확인해 주세요.",
	ERROR_400_MISSING_REQUIRED_PARAMETER:
		"필요한 항목이 빠졌습니다. 모두 입력했는지 확인해 주세요.",
	// ERROR_400_INVALID_FIELD_<필드명>은 matchDynamic에서 처리.

	// ── 파일 업로드(§2.3) ────────────────────────────────────────────
	ERROR_415_UNSUPPORTED_FILE_TYPE:
		"지원하지 않는 형식의 파일이 있습니다. pdf·doc·docx·hwp·ppt·xls 등 문서만 올려 주세요.",
	ERROR_400_INVALID_UPLOAD:
		"파일을 올리는 중 문제가 생겼습니다. 다시 시도해 주세요.",
	ERROR_400_INVALID_HASH:
		"파일 확인 정보가 올바르지 않습니다. 파일을 다시 선택해 주세요.",
	ERROR_400_FILENAME_REQUIRED:
		"업로드할 파일 이름이 없습니다. 파일을 다시 선택해 주세요.",
	ERROR_404_FILE_NOT_FOUND: "파일을 찾을 수 없습니다.",

	// ── 서버·인프라(§2.4) ────────────────────────────────────────────
	// 그 외 500/503 서버 측 오류는 STATUS_FALLBACK으로 일괄 처리한다.
	ERROR_404_ENDPOINT_NOT_FOUND: "요청하신 페이지를 찾을 수 없습니다.",
	ERROR_503_STORAGE_NOT_CONFIGURED:
		"지금은 파일 기능을 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.",
	ERROR_500_UNDEFINED_ERROR:
		"일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",

	// ── OAuth 로그인(§3.1) — Doxmeet/GGKMA ─────────────────────────────
	ERROR_403_USER_WITHDRAWN:
		"탈퇴하신 계정입니다. 자세한 내용은 카카오톡 채널로 문의해 주세요.",
	ERROR_400_UNSUPPORTED_OAUTH_SITE: "지원하지 않는 로그인 방식입니다.",
	ERROR_502_DOXMEET_UNREACHABLE:
		"로그인 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
	ERROR_502_GGKMA_UNREACHABLE:
		"경기도의사회 로그인 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
	ERROR_400_DOXMEET_TOKEN_NOT_FOUND:
		"로그인에 실패했습니다. 다시 시도해 주세요.",
	ERROR_400_GGKMA_TOKEN_NOT_FOUND:
		"로그인 인증이 만료되었습니다. 다시 로그인해 주세요.",
	ERROR_400_DOXMEET_USER_NOT_FOUND:
		"로그인 정보를 가져오지 못했습니다. 다시 시도해 주세요.",
	ERROR_400_GGKMA_USER_NOT_FOUND:
		"경기도의사회 계정 정보를 확인하지 못했습니다. 다시 로그인해 주세요.",
	// *_NOT_CONFIGURED(500)는 matchDynamic / STATUS_FALLBACK에서 처리.

	// ── 온보딩(§3.2) ─────────────────────────────────────────────────
	ERROR_400_ONBOARDING_MODE_REQUIRED:
		"먼저 만들 항목(병원 홈페이지 또는 의사 프로필)을 선택해 주세요.",
	ERROR_404_ONBOARDING_SESSION_NOT_FOUND:
		"진행 중인 온보딩이 없습니다. 처음부터 다시 시작해 주세요.",
	ERROR_409_ONBOARDING_FILES_PROCESSING:
		"올려 주신 파일을 분석하고 있습니다. 잠시 후 다시 시도해 주세요.",
	ERROR_409_PROFILE_ALREADY_EXISTS:
		"이미 의사 프로필이 있습니다. 프로필 관리에서 수정할 수 있어요.",
	ERROR_409_HOSPITAL_ALREADY_PUBLISHED: "이미 게시된 병원입니다.",
	ERROR_409_HOSPITAL_PUBLISHED_CANNOT_DISCARD:
		"게시된 병원은 여기서 삭제할 수 없습니다. 병원 관리에서 처리해 주세요.",
	ERROR_409_SUBSCRIPTION_ACTIVE_CANNOT_DISCARD:
		"이용 중인 구독이 있는 병원은 여기서 삭제할 수 없습니다.",
	ERROR_400_ADMIN_LOGIN_ID_REQUIRED: "병원 관리자 아이디를 입력해 주세요.",
	ERROR_400_ADMIN_PASSWORD_REQUIRED: "병원 관리자 비밀번호를 입력해 주세요.",
	ERROR_400_INVALID_LOGIN_ID:
		"아이디는 영문 소문자와 숫자 4~20자로 입력해 주세요.",
	ERROR_409_LOGIN_ID_TAKEN: "이미 사용 중인 관리자 아이디입니다.",
	ERROR_400_FILE_URL_REQUIRED: "분석할 파일을 먼저 올려 주세요.",
	ERROR_400_ZIP_MUST_BE_EXPANDED_CLIENT_SIDE:
		"압축 파일은 풀어서 개별 파일로 올려 주세요.",
	ERROR_503_AI_DISABLED:
		"지금은 AI 분석 기능을 사용할 수 없습니다. 직접 입력해 주세요.",

	// ── 의사 프로필 관리(§3.3) ───────────────────────────────────────
	ERROR_404_PROFILE_NOT_FOUND: "프로필을 찾을 수 없습니다.",
	ERROR_400_SLUG_REQUIRED: "먼저 프로필 공개 주소(URL)를 설정해 주세요.",
	// 메시지는 프론트 실제 규칙(slug.ts·slug-field.tsx)과 맞춘다.
	ERROR_400_SLUG_INVALID_FORMAT:
		"공개 주소는 영문 소문자·숫자·하이픈(-) 3~30자로 정해 주세요.",
	ERROR_409_SLUG_TAKEN: "이미 사용 중인 주소입니다. 다른 주소를 입력해 주세요.",
	ERROR_409_SLUG_RESERVED:
		"사용할 수 없는 주소예요. 다른 주소를 입력해 주세요.",
	ERROR_409_SLUG_IMMUTABLE:
		"공개 주소는 한 번 정하면 바꿀 수 없어요. 이미 설정되어 있습니다.",
	ERROR_400_INVALID_FIELD:
		"입력하신 내용 중 일부가 올바르지 않습니다. 다시 확인해 주세요.",
	ERROR_400_INVALID_GENDER: "성별을 다시 선택해 주세요.",
	ERROR_400_INVALID_DEPARTMENT: "진료과를 다시 선택해 주세요.",
	ERROR_400_INVALID_SPECIALTY_TAGS: "전문 진료 분야를 다시 확인해 주세요.",
	ERROR_400_TOO_MANY_SPECIALTY_TAGS:
		"주요 전문 진료 분야는 최대 5개까지 등록할 수 있습니다.",

	// ── AI·논문·자료 연동(§3.4) ──────────────────────────────────────
	ERROR_404_PROFILE_ANALYZE_JOB_NOT_FOUND:
		"분석 작업을 찾을 수 없습니다. 문서를 다시 올려 분석해 주세요.",
	ERROR_404_AI_DRAFT_JOB_NOT_FOUND:
		"작업을 찾을 수 없습니다. 다시 시도해 주세요.",
	ERROR_404_DATA_REVIEW_JOB_NOT_FOUND:
		"검수 작업을 찾을 수 없습니다. 다시 시도해 주세요.",
	ERROR_404_PAPER_IMPORT_JOB_NOT_FOUND:
		"작업을 찾을 수 없습니다. 다시 시도해 주세요.",
	ERROR_400_MISSING_FILE: "논문 파일을 올려 주세요.",
	ERROR_404_PROFILE_CARD_NOT_FOUND: "항목을 찾을 수 없습니다.",
	ERROR_404_CLINIC_NOT_FOUND: "해당 병원을 찾을 수 없습니다.",
	ERROR_409_SOCIETY_EXISTS: "이미 등록된 학회입니다.",

	// ── 결제·구독·빌링(§3.5) ─────────────────────────────────────────
	ERROR_402_HOSPITAL_SUBSCRIPTION_REQUIRED:
		"이 기능을 사용하려면 구독이 필요합니다. 구독을 진행해 주세요.",
	ERROR_402_TOSS_PAYMENT_FAILED:
		"결제에 실패했습니다. 카드 정보를 확인하고 다시 시도해 주세요.",
	ERROR_400_BILLING_KEY_REQUIRED:
		"등록된 결제수단이 없습니다. 결제수단을 먼저 등록해 주세요.",
	ERROR_400_INVALID_BILLING_CYCLE: "결제 주기를 다시 선택해 주세요.",
	ERROR_404_SUBSCRIPTION_NOT_FOUND: "구독 정보를 찾을 수 없습니다.",
	ERROR_409_SUBSCRIPTION_ALREADY_ACTIVE: "이미 이용 중인 구독이 있습니다.",
	ERROR_409_SUBSCRIPTION_NOT_CANCELABLE: "이미 종료된 구독입니다.",
	ERROR_409_SUBSCRIPTION_NOT_CHANGEABLE:
		"종료된 구독은 결제 주기를 변경할 수 없습니다.",
	ERROR_409_SUBSCRIPTION_NOT_RENEWABLE:
		"자동 갱신되지 않는 구독은 결제 주기를 변경할 수 없습니다.",
	ERROR_502_TOSS_UNREACHABLE:
		"결제 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
	// ERROR_500_TOSS_SECRET_NOT_CONFIGURED 등 결제 서버 설정 오류는 STATUS_FALLBACK으로.

	// ── 운영자 콘솔(§3.6) ────────────────────────────────────────────
	// USER/SUBSCRIPTION_NOT_FOUND의 운영자용 문구는 ADMIN_ERROR_OVERRIDES 참고.
	ERROR_400_CANNOT_DEMOTE_SELF: "본인 권한은 변경할 수 없습니다.",
};

/**
 * 운영자(ADMIN) 콘솔 전용 문구 덮어쓰기(§3.6).
 * 같은 코드가 인증 맥락과 "대상" 맥락에서 의미가 다른 경우를 보정한다.
 * 운영자 화면에서 `toastApiError(err, ADMIN_ERROR_OVERRIDES)`로 넘겨 사용.
 */
export const ADMIN_ERROR_OVERRIDES: Record<string, string> = {
	ERROR_404_USER_NOT_FOUND: "대상 사용자를 찾을 수 없습니다.",
	ERROR_404_SUBSCRIPTION_NOT_FOUND: "대상 구독을 찾을 수 없습니다.",
};

/**
 * 동적으로 생성되는 코드(§3.7) 정규식 폴백.
 * 제공자명(DOXMEET·GGKMA·…)을 하드코딩하지 않고 OAuth 전용 접미사로 매칭해,
 * 새 제공자가 추가돼도 자동으로 처리되게 한다(가이드 §3.7 권고). 단 _UNREACHABLE·
 * _NOT_CONFIGURED 접미사는 TOSS 등과 공유되므로 여기서 잡지 않고 STATUS_FALLBACK에 맡긴다.
 */
function matchDynamic(code: string): string | undefined {
	// 객체 내부 필드 검증 실패: ERROR_400_INVALID_FIELD_<필드명>
	if (/^ERROR_400_INVALID_FIELD_.+$/.test(code))
		return "입력하신 내용 중 일부가 올바르지 않습니다. 다시 확인해 주세요.";
	// OAuth 토큰 교환/사용자 조회 실패: ERROR_400_<제공자>_TOKEN|USER_NOT_FOUND
	if (/^ERROR_400_[A-Z0-9]+_(TOKEN|USER)_NOT_FOUND$/.test(code))
		return "로그인에 실패했습니다. 다시 시도해 주세요.";
	return undefined;
}

/** HTTP status_code 기반 최종 폴백(§4) — 모르는 코드 안전망. */
const STATUS_FALLBACK: Record<number, string> = {
	400: "입력하신 내용을 다시 확인해 주세요.",
	401: "로그인이 필요합니다.",
	402: "결제가 필요합니다.",
	403: "권한이 없습니다.",
	404: "요청하신 내용을 찾을 수 없습니다.",
	409: "이미 처리되었거나 다른 상태와 충돌했습니다.",
	415: "지원하지 않는 파일입니다.",
	500: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
	502: "외부 서비스와 연결이 원활하지 않습니다. 잠시 후 다시 시도해 주세요.",
	503: "잠시 후 다시 시도해 주세요.",
};

/**
 * 에러 → 사용자 노출 메시지. (가이드 §4 resolveMessage)
 * @param overrides 화면별 문구 덮어쓰기(예: 운영자 콘솔 ADMIN_ERROR_OVERRIDES).
 */
export function apiErrorMessage(
	err: unknown,
	overrides?: Record<string, string>,
): string {
	if (err instanceof ApiError) {
		// 정의되지 않은 서버 예외 — 추적용 코드(errx-…)와 함께 공통 안내.
		if (err.errorUuid)
			return `일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요. (오류 코드: ${err.errorUuid})`;
		const code = err.errorCode;
		if (code) {
			const msg = overrides?.[code] ?? MESSAGES[code] ?? matchDynamic(code);
			if (msg) return msg;
		}
		return (
			STATUS_FALLBACK[err.status] ??
			"문제가 발생했습니다. 잠시 후 다시 시도해 주세요."
		);
	}
	// ApiError가 아님(네트워크 끊김·타임아웃 등).
	return "네트워크 상태가 원활하지 않습니다. 잠시 후 다시 시도해 주세요.";
}

/** 모든 문의를 카카오톡 채널로 유도하는 토스트 액션(막힘 상태 전용). */
const supportAction = {
	label: "문의하기",
	onClick: () =>
		window.open(KAKAO_CHANNEL_URL, "_blank", "noopener,noreferrer"),
};

/**
 * ApiError를 토스트로 표시(+메시지 반환).
 * @param opts.support true면 "문의하기" 카카오톡 액션을 함께 노출(진짜 막힘 상태에서만 사용).
 */
export function toastApiError(
	err: unknown,
	overrides?: Record<string, string>,
	opts?: { support?: boolean },
): string {
	const msg = apiErrorMessage(err, overrides);
	toast.error(msg, opts?.support ? { action: supportAction } : undefined);
	return msg;
}

/** 비-ApiError 메시지를 문의 액션과 함께 토스트로 표시(막힘 상태 전용). */
export function toastSupport(message: string): void {
	toast.error(message, { action: supportAction });
}
