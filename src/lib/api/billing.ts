import { http } from "#/lib/api";

/**
 * 결제 / 구독 — 병원 게시(publish)에만 게이트 (문서 §9 기준 2단계).
 * 순서: `POST /billing/issue {authKey,customerKey}`(빌링키 발급) → `POST /subscription {hospital_no}`(저장된 빌링키로 즉시 1개월 청구) → `POST /hospital/:no/publish`.
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

/**
 * 토스 빌링키 발급/재발급 — Toss 위젯에서 받은 `authKey`를 빌링키로 교환·저장.
 * `customerKey`는 commit payment의 `customer_key`와 동일해야 매칭됨. authKey는 **1회용**.
 * 재발급 시 기존 active 빌링키는 deleted 후 active 구독에 새 빌링키로 자동 재연결.
 */
export function issueBilling(input: { authKey: string; customerKey: string }) {
	return http.post<BillingKey>("billing/issue", input);
}

export function listBilling() {
	return http.get<BillingKey[]>("billing");
}

/**
 * 병원 구독 생성 + 첫 결제 — **저장된 활성 빌링키**로 즉시 1개월(₩10,000) 청구 → active.
 * 빌링키가 없으면 `ERROR_400_BILLING_KEY_REQUIRED`(먼저 `issueBilling` 호출).
 */
export function createSubscription(
	hospitalNo: number,
	opts: { marketing_consent?: boolean } = {},
) {
	return http.post<Subscription>("subscription", {
		hospital_no: hospitalNo,
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

/**
 * 의사 프로필 공개 URL(slug) 설정 → `<slug>.kmadoc.com`. 온보딩에서 **1회만** 설정, 변경 불가.
 * 무료 프로필·병원 시나리오 모두에서 호출(이미 설정돼 있으면 ERROR_409_SLUG_IMMUTABLE).
 */
export function setProfileSlug(slug: string) {
	return http.put<{ no?: number; slug?: string }>("profile/me/slug", { slug });
}

/** 병원 공개 URL(slug) 설정 → `<slug>.kmaclinic.com`. publish 전 필요, 1회만(변경 불가). */
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
