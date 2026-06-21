import { toast } from "sonner";
import { ApiError } from "#/lib/api";

/** error_code → 사용자 메시지 (문서 §0 "자주 보는 에러 코드"). */
const MESSAGES: Record<string, string> = {
	ERROR_401_TOKEN_EXPIRED: "세션이 만료되었습니다. 다시 로그인해 주세요.",
	ERROR_402_HOSPITAL_SUBSCRIPTION_REQUIRED:
		"병원 공개에는 활성 구독(결제)이 필요합니다.",
	ERROR_403_FORBIDDEN: "권한이 없습니다.",
	ERROR_409_SLUG_TAKEN: "이미 사용 중인 URL(slug)입니다.",
	ERROR_409_ONBOARDING_FILES_PROCESSING:
		"업로드한 파일을 분석 중입니다. 잠시 후 다시 시도해 주세요.",
	ERROR_400_INVALID_LOGIN_ID:
		"관리자 아이디는 영문 소문자·숫자 4~20자만 가능합니다.",
	ERROR_503_STORAGE_NOT_CONFIGURED:
		"파일 저장소가 설정되지 않았습니다. 운영팀에 문의해 주세요.",
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
