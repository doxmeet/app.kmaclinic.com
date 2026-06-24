import { http } from "#/lib/api";

/**
 * 결제 / 구독 — 문서 §6.4~6.6, §8.6~8.8, §9.
 * 게시(publish) 전 2단계: `POST /billing/issue {authKey,customerKey}`(빌링키 발급)
 *   → `POST /subscription {hospital_no}`(저장된 빌링키로 즉시 1개월 청구) → `POST /hospital/:no/publish`.
 *
 * 모든 응답은 백엔드 봉투의 `data`만 http 레이어가 언랩한다. 목록은 `{ items, pagination }`,
 * 단건은 `{ subscription }`/`{ billing }` 같은 키 봉투로 온다(문서 §5.2).
 */

/** 페이지네이션 봉투(문서 §5.4). */
export type Paginated<T> = {
	items: T[];
	pagination?: { page: number; limit: number; total: number };
};

/** 빌링키 요약(문서 §6.4 toBillingSummary — 빌링키 원문은 제외). */
export type BillingKey = {
	no?: number;
	customer_key?: string;
	card_company?: string;
	card_company_name?: string;
	card_number_masked?: string;
	card_type?: string;
	/**
	 * 결제화면 표시용 라벨(카드사명 + 뒷자리, 예: "신한카드 066*"). 저장된 카드로 결제할 때
	 * 그대로 "이 카드로 결제" UI에 쓴다(toss 마스킹 형식상 끝 4자에 `*`가 섞일 수 있음).
	 */
	card_label?: string;
	status?: "active" | "deleted" | string;
	created_at?: string;
	[key: string]: unknown;
};

/** 구독(문서 §6.5). */
export type Subscription = {
	no?: number;
	hospital_no?: number;
	user_no?: number;
	billing_key_no?: number;
	plan?: string;
	billing_cycle?: "monthly" | "annual" | "one_time" | string;
	amount?: number;
	status?: "active" | "past_due" | "canceled" | "expired" | string;
	current_period_start?: string | null;
	current_period_end?: string | null;
	next_billing_at?: string | null;
	grace_until?: string | null;
	retry_count?: number;
	last_payment_error?: string | null;
	canceled_at?: string | null;
	marketing_consent?: boolean;
	created_at?: string;
	[key: string]: unknown;
};

/** 개별 결제(문서 §6.6). */
export type Payment = {
	no?: number;
	subscription_no?: number;
	hospital_no?: number;
	payment_key?: string;
	order_id?: string;
	amount?: number;
	method?: string | null;
	status?:
		| "pending"
		| "paid"
		| "failed"
		| "canceled"
		| "refunded"
		| "partial_refunded"
		| string;
	paid_at?: string | null;
	failure_code?: string | null;
	failure_reason?: string | null;
	refunded_amount?: number | null;
	created_at?: string;
	[key: string]: unknown;
};

/**
 * toss 빌링키 발급/재발급(문서 §8.6) — toss 위젯의 `authKey`를 빌링키로 교환·저장.
 * `customerKey`는 commit payment의 `customer_key`와 동일해야 매칭됨. authKey는 **1회용**.
 * 재발급 시 기존 active 빌링키는 deleted 후 active 구독에 새 빌링키로 자동 재연결(문서 §9.5).
 */
export function issueBilling(input: { authKey: string; customerKey: string }) {
	return http.post<{ billing: BillingKey }>("billing/issue", input);
}

/** 내 빌링키 목록(문서 §8.6, active 우선). */
export function listBilling() {
	return http.get<{ items: BillingKey[] }>("billing");
}

/**
 * 병원 구독 생성 + 첫 결제(문서 §8.7).
 * - `authKey` 미전달(권장) → **저장된 활성 빌링키**로 즉시 1개월(₩10,000) 청구 → active.
 *   저장된 카드도 없으면 `ERROR_400_BILLING_KEY_REQUIRED`(먼저 카드 등록 필요).
 * - `authKey`(+`customerKey`) 전달 → 그 카드를 먼저 발급·교체(기존 active는 deleted)한 뒤 결제.
 *   **새 카드로 결제/카드 변경 시에만** 보낸다(저장된 카드가 있으면 생략).
 */
export function createSubscription(
	hospitalNo: number,
	opts: {
		marketing_consent?: boolean;
		authKey?: string;
		customerKey?: string;
	} = {},
) {
	return http.post<{ subscription: Subscription; payment: Payment }>(
		"subscription",
		{
			hospital_no: hospitalNo,
			...(opts.authKey ? { authKey: opts.authKey } : {}),
			...(opts.authKey && opts.customerKey
				? { customerKey: opts.customerKey }
				: {}),
			...(opts.marketing_consent !== undefined
				? { marketing_consent: opts.marketing_consent }
				: {}),
		},
	);
}

/** 내 구독 목록(문서 §8.7). */
export function listSubscriptions(
	params: { status?: string; page?: number; limit?: number } = {},
) {
	const q = Object.fromEntries(
		Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
	);
	return http.get<Paginated<Subscription>>(
		"subscription",
		Object.keys(q).length ? q : undefined,
	);
}

/** 특정 병원의 구독 조회(문서 §8.7) — 최신 1건(없으면 null). */
export function getHospitalSubscription(hospitalNo: number) {
	return http.get<{ subscription: Subscription | null }>(
		`subscription/hospital/${hospitalNo}`,
	);
}

/**
 * 구독 취소(문서 §8.7) — 현재 기간 종료까지 유지(즉시 중단 아님), `next_billing_at`=NULL.
 * 이미 종료된 구독이면 `ERROR_409_SUBSCRIPTION_NOT_CANCELABLE`.
 */
export function cancelSubscription(no: number, reason?: string) {
	return http.post<{ subscription: Subscription }>(
		`subscription/${no}/cancel`,
		reason ? { reason } : undefined,
	);
}

/** 내 결제 내역(문서 §8.8). */
export function listPayments(
	params: { status?: string; page?: number; limit?: number } = {},
) {
	const q = Object.fromEntries(
		Object.entries(params).filter(([, v]) => v !== undefined && v !== ""),
	);
	return http.get<Paginated<Payment>>(
		"payment",
		Object.keys(q).length ? q : undefined,
	);
}

/**
 * 의사 프로필 공개 URL(slug) 설정 → `<slug>.kmadoc.com`. 온보딩에서 **1회만** 설정, 변경 불가.
 * 무료 프로필·병원 시나리오 모두에서 호출(이미 설정돼 있으면 ERROR_409_SLUG_IMMUTABLE).
 */
export function setProfileSlug(slug: string) {
	return http.put<{ no?: number; slug?: string }>("profile/me/slug", { slug });
}

/**
 * 의사 프로필 공개(발행) → `<slug>.kmadoc.com` 게시. slug 선설정 필요(setProfileSlug).
 * 병원 publish(`POST /hospital/:no/publish`)와 대칭. (백엔드 경로 미확인 시 여기 수정.)
 */
export function publishProfile() {
	return http.post("profile/me/publish");
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

/** 병원 비공개 전환(문서 §8.10, 보조). */
export function unpublishHospital(hospitalNo: number) {
	return http.post(`hospital/${hospitalNo}/unpublish`);
}
