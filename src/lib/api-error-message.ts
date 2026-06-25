import { toast } from "sonner";
import { ApiError } from "#/lib/api";

/** error_code → 사용자 메시지 (문서 §11 "주요 에러코드 표"). */
const MESSAGES: Record<string, string> = {
	// 인증/권한
	ERROR_401_TOKEN_EXPIRED: "로그인이 만료되었습니다. 다시 로그인해 주세요.",
	ERROR_400_INVALID_TOKEN:
		"로그인 정보가 올바르지 않습니다. 다시 로그인해 주세요.",
	ERROR_401_AUTHORIZATION_HEADER_NOT_FOUND_IN_REQUEST: "로그인이 필요합니다.",
	ERROR_400_AUTHORIZATION_HEADER_MALFORMED:
		"로그인 정보가 올바르지 않습니다. 다시 로그인해 주세요.",
	ERROR_403_FORBIDDEN: "권한이 없습니다.",
	ERROR_403_USER_WITHDRAWN: "탈퇴한 계정입니다. 로그인할 수 없습니다.",
	// 온보딩
	ERROR_400_ONBOARDING_MODE_REQUIRED:
		"작성할 유형(병원 또는 프로필)을 선택해 주세요.",
	ERROR_409_PROFILE_ALREADY_EXISTS:
		"이미 의사 프로필이 있습니다. 프로필 관리에서 수정할 수 있어요.",
	ERROR_404_ONBOARDING_SESSION_NOT_FOUND:
		"작성 중인 내용이 없습니다. 처음부터 시작해 주세요.",
	ERROR_409_ONBOARDING_FILES_PROCESSING:
		"업로드한 파일을 분석 중입니다. 분석이 끝나면 완료할 수 있어요.",
	ERROR_400_ADMIN_LOGIN_ID_REQUIRED: "관리자 아이디를 입력해 주세요.",
	ERROR_400_INVALID_LOGIN_ID:
		"관리자 아이디는 영문 소문자·숫자 4~20자만 가능합니다.",
	ERROR_400_ADMIN_PASSWORD_REQUIRED: "병원 관리자 비밀번호를 입력해 주세요.",
	ERROR_409_LOGIN_ID_TAKEN: "이미 사용 중인 관리자 아이디입니다.",
	// 결제/구독/게시
	ERROR_400_BILLING_KEY_REQUIRED: "먼저 결제 카드를 등록해 주세요.",
	ERROR_402_TOSS_PAYMENT_FAILED:
		"카드 결제에 실패했습니다. 카드 정보를 확인한 뒤 다시 시도해 주세요.",
	ERROR_402_HOSPITAL_SUBSCRIPTION_REQUIRED:
		"병원 공개에는 활성 구독(결제)이 필요합니다.",
	ERROR_409_SUBSCRIPTION_ALREADY_ACTIVE: "이미 활성 구독이 있습니다.",
	ERROR_409_SUBSCRIPTION_NOT_CANCELABLE:
		"이미 종료된 구독은 취소할 수 없습니다.",
	ERROR_404_SUBSCRIPTION_NOT_FOUND: "구독 정보를 찾을 수 없습니다.",
	// 결제 주기 변경(월↔연)
	ERROR_400_INVALID_BILLING_CYCLE: "지원하지 않는 결제 주기입니다.",
	ERROR_409_SUBSCRIPTION_NOT_CHANGEABLE:
		"이미 종료된 구독은 결제 주기를 변경할 수 없습니다.",
	ERROR_409_SUBSCRIPTION_NOT_RENEWABLE:
		"자동 갱신되지 않는 구독은 결제 주기를 변경할 수 없습니다.",
	ERROR_400_SLUG_REQUIRED: "먼저 공개 주소(URL)를 설정해 주세요.",
	ERROR_400_SLUG_INVALID_FORMAT:
		"공개 주소는 영문 소문자·숫자·하이픈(-) 3~30자로 정해 주세요.",
	ERROR_409_SLUG_TAKEN: "이미 사용 중인 주소입니다. 다른 주소를 입력해 주세요.",
	ERROR_409_SLUG_RESERVED:
		"사용할 수 없는 주소예요. 다른 주소를 입력해 주세요.",
	ERROR_409_SLUG_IMMUTABLE:
		"공개 주소는 한 번 정하면 바꿀 수 없어요. 이미 설정되어 있습니다.",
	// 운영자
	ERROR_400_CANNOT_DEMOTE_SELF: "본인 권한은 강등할 수 없습니다.",
	// 외부/인프라
	ERROR_502_TOSS_UNREACHABLE:
		"결제 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
	ERROR_502_DOXMEET_UNREACHABLE:
		"로그인 서비스에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
	ERROR_503_STORAGE_NOT_CONFIGURED:
		"파일 저장소가 설정되지 않았습니다. 운영팀에 문의해 주세요.",
	ERROR_500_UNDEFINED_ERROR:
		"일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
};

export function apiErrorMessage(err: unknown): string {
	if (err instanceof ApiError) {
		if (err.errorCode && MESSAGES[err.errorCode])
			return MESSAGES[err.errorCode];
		if (err.message && err.message !== err.errorCode) return err.message;
		if (err.status >= 500)
			return `서버 오류가 발생했습니다.${err.errorUuid ? ` (${err.errorUuid})` : ""}`;
		return "요청을 처리하지 못했습니다.";
	}
	return "네트워크 오류가 발생했습니다.";
}

/** ApiError를 토스트로 표시(+메시지 반환). */
export function toastApiError(err: unknown): string {
	const msg = apiErrorMessage(err);
	toast.error(msg);
	return msg;
}
