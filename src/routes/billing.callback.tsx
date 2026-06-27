import { createFileRoute } from "@tanstack/react-router";
import { BillingCallbackPage } from "#/components/billing/billing-callback.tsx";
import { asBillingCycle } from "#/lib/api/billing.ts";

/**
 * 결제(toss) 콜백 — 2단계 (문서 §9).
 * toss requestBillingAuth 성공 시 successUrl 로 리다이렉트되며 authKey/customerKey 가 쿼리로 전달된다.
 *   ① POST /billing/issue { authKey, customerKey }  (authKey→빌링키 발급·저장, authKey는 1회용)
 *   ② POST /subscription { hospital_no, marketing_consent }  (저장된 빌링키로 즉시 1개월 청구)
 *
 * 재시도 규칙: authKey는 1회용 → ①이 성공한 뒤(빌링키 저장됨) ②에서만 실패했다면 재시도는 ②만 다시 한다.
 * ①(빌링키 발급)에서 실패(카드 거절 등)면 새 authKey가 필요하므로 카드부터 다시 등록.
 * 구독 성공 시 병원은 ready_to_publish → **게시(slug+publish)는 대시보드에서** 별도. fail=1 이면 실패 안내.
 */

export const Route = createFileRoute("/billing/callback")({
	component: BillingCallbackPage,
	validateSearch: (search: Record<string, unknown>) => ({
		authKey: typeof search.authKey === "string" ? search.authKey : undefined,
		// 우리는 customerKey를 예약 안 된 이름 `ck`로 넘긴다(toss가 customerKey는 떼어냄).
		// 혹시 toss가 customerKey를 붙여주는 환경이면 그것도 fallback으로 받는다.
		customerKey:
			typeof search.ck === "string" && search.ck
				? search.ck
				: typeof search.customerKey === "string"
					? search.customerKey
					: undefined,
		hospital_no: toNumber(search.hospital_no),
		marketing_consent:
			search.marketing_consent === "1" || search.marketing_consent === 1
				? true
				: undefined,
		// 결제 단계에서 고른 결제 주기(monthly/annual). toss 리다이렉트로 보존된다.
		// 유효하지 않거나 없으면 undefined → 백엔드 기본(monthly).
		billing_cycle: asBillingCycle(search.billing_cycle) ?? undefined,
		// 흐름 모드(문서 §9.5/§9.6):
		//  - 미지정/"subscribe": 온보딩 최초 결제(빌링키 발급 + 구독 생성)
		//  - "card": 결제수단(카드) 변경 — 빌링키만 재발급(저장된 구독에 자동 재연결)
		//  - "resubscribe": 해지/만료 후 재구독(빌링키 발급 + 구독 재생성)
		mode:
			search.mode === "card"
				? ("card" as const)
				: search.mode === "resubscribe"
					? ("resubscribe" as const)
					: ("subscribe" as const),
		fail: search.fail === "1" || search.fail === 1 ? true : undefined,
		// toss는 카드 등록/결제 실패 시 failUrl 에 code/message 를 붙여 돌려보낸다.
		// (예: ?fail=1&code=INVALID_CARD_NUMBER&message=신용카드가+아니거나…)
		code:
			typeof search.code === "string" && search.code ? search.code : undefined,
		message:
			typeof search.message === "string" && search.message
				? search.message
				: undefined,
	}),
});

function toNumber(value: unknown): number | undefined {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim() !== "") {
		const n = Number(value);
		if (Number.isFinite(n)) return n;
	}
	return undefined;
}
