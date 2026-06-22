import { http } from "#/lib/api";

/**
 * 결제 / 구독 — 문서 §3. 병원 게시(publish)에만 게이트.
 * 권장 순서: billing/issue → subscription → hospital/:no/publish
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

/** 토스 빌링키 발급/재발급. */
export function issueBilling(input: { authKey: string; customerKey: string }) {
	return http.post<BillingKey>("billing/issue", input);
}

export function listBilling() {
	return http.get<BillingKey[]>("billing");
}

/** 병원 구독 생성 + 첫 결제 → active. (문서 §8.7) */
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
