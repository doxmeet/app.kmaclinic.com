import { http } from "#/lib/api";

/**
 * 결제 / 구독 — 병원 게시(publish)에만 게이트.
 * `POST /subscription` **한 번**으로 빌링키 발급 + 구독 + 첫 결제까지 끝낸다(2026-06 최종).
 */

export type BillingKey = {
	no?: number;
	card_company?: string;
	card_masked?: string;
	[key: string]: unknown;
};

export type Subscription = {
	no?: number;
	hospital_no?: number;
	status?: string;
	plan?: string;
	amount?: number;
	[key: string]: unknown;
};

export type Payment = {
	no?: number;
	subscription_no?: number;
	status?: string;
	amount?: number;
	paid_at?: string;
	[key: string]: unknown;
};

export function listBilling() {
	return http.get<BillingKey[]>("billing");
}

/**
 * 구독 생성 — **단일 호출**로 토스 빌링키 발급 + 구독 + 첫 결제까지 처리(2026-06 최종).
 * - 최초: `authKey`(+`customerKey`)를 함께 보내 빌링키를 발급한다.
 * - 재시도: 토스 authKey는 **1회용**이라 재사용 불가. 결제 단계에서만 실패했다면 빌링키는
 *   이미 저장돼 있으므로 `authKey` 없이 `{ hospital_no }`(+marketing_consent)만 다시 보낸다.
 *   저장된 빌링키가 없으면 `ERROR_400_BILLING_KEY_REQUIRED` → 카드부터 다시 등록.
 */
export function createSubscription(
	hospitalNo: number,
	opts: {
		authKey?: string;
		customerKey?: string;
		marketing_consent?: boolean;
	} = {},
) {
	return http.post<Subscription>("subscription", {
		hospital_no: hospitalNo,
		...(opts.authKey ? { authKey: opts.authKey } : {}),
		...(opts.customerKey ? { customerKey: opts.customerKey } : {}),
		...(opts.marketing_consent !== undefined
			? { marketing_consent: opts.marketing_consent }
			: {}),
	});
}

export function listSubscriptions(status?: string) {
	return http.get<Subscription[]>(
		"subscription",
		status ? { status } : undefined,
	);
}

export function getHospitalSubscription(hospitalNo: number) {
	return http.get<Subscription>(`subscription/hospital/${hospitalNo}`);
}

export function cancelSubscription(no: number, reason?: string) {
	return http.post<Subscription>(
		`subscription/${no}/cancel`,
		reason ? { reason } : undefined,
	);
}

export function listPayments(status?: string) {
	return http.get<Payment[]>("payment", status ? { status } : undefined);
}

/** 공개 URL(slug) 설정 — publish 전에 필요(없으면 ERROR_400_SLUG_REQUIRED). */
export function setHospitalSlug(hospitalNo: number, slug: string) {
	return http.put<{ no?: number; slug?: string }>(
		`hospital/${hospitalNo}/slug`,
		{
			slug,
		},
	);
}

/** 병원 공개(slug + 활성 구독 필요 — 없으면 ERROR_400_SLUG_REQUIRED/ERROR_402_*). */
export function publishHospital(hospitalNo: number) {
	return http.post(`hospital/${hospitalNo}/publish`);
}
