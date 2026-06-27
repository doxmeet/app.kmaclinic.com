/**
 * 고객 문의 채널 — 모든 문의를 닥스밋 카카오톡 채널로 단일화한다.
 * 환경 무관 고정 URL이므로 env가 아닌 상수로 둔다(seo.SITE_URL·toss.TOSS_SDK_URL과 동일 규약).
 */

/** 닥스밋 카카오톡 채널 홈(항상 새 탭으로 연다). */
export const KAKAO_CHANNEL_URL = "https://pf.kakao.com/_xmPMZn";

/** 표준 문의 CTA 문구 — 화면 전역에서 동일하게 사용한다. */
export const KAKAO_CHANNEL_LABEL = "카카오톡으로 문의하기";

/** 푸터 등 보조 위치용 짧은 라벨. */
export const KAKAO_CHANNEL_SHORT_LABEL = "카카오톡 채널";
