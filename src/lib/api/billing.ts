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

/** 결제 주기(백엔드 `billing_cycle`). 미전달 시 백엔드는 `monthly`로 동작(하위호환). */
export type BillingCycle = "monthly" | "annual" | "one_time";

/**
 * 결제 주기 옵션 — 금액/기간/갱신 정책(백엔드 API 계약).
 * - monthly : ₩10,000 / 1개월 / 매월 자동청구 (기본)
 * - annual  : ₩100,000 / 1년 / 매년 자동청구 (월 환산 대비 ₩20,000 절약)
 * - one_time: ₩10,000 / 1개월 / 자동 갱신 없음(기간 만료 시 expired)
 *
 * 금액은 백엔드가 주기에 맞춰 청구하지만, 결제 화면 표시·요약에 쓰려고 동일 값을 둔다.
 */
const BILLING_CYCLES: ReadonlyArray<{
	value: BillingCycle;
	/** 선택지 라벨(예: "월간"). */
	label: string;
	/** 청구 금액(KRW 정수). */
	amount: number;
	/** 금액 옆 기간 접미사(예: "월" → "10,000원 / 월"). */
	periodSuffix: string;
	/** 보조 설명(자동 갱신 여부 등). */
	description: string;
}> = [
	{
		value: "monthly",
		label: "월간",
		amount: 10000,
		periodSuffix: "월",
		description: "매월 자동 결제",
	},
	{
		value: "annual",
		label: "연간",
		amount: 100000,
		periodSuffix: "년",
		description: "매년 자동 결제 · ₩20,000 절약",
	},
	{
		value: "one_time",
		label: "단건",
		amount: 10000,
		periodSuffix: "1개월",
		description: "1개월 이용 · 자동 갱신 없음",
	},
];

/** 주기 enum 검증(쿼리/외부 입력 정규화용). 유효하지 않으면 null. */
export function asBillingCycle(value: unknown): BillingCycle | null {
	return value === "monthly" || value === "annual" || value === "one_time"
		? value
		: null;
}

/** 주기별 청구 금액(표시용). 알 수 없으면 monthly 금액(₩10,000). */
export function amountForCycle(cycle: BillingCycle): number {
	return BILLING_CYCLES.find((c) => c.value === cycle)?.amount ?? 10000;
}

/** 주기별 메타(라벨/접미사/설명). 알 수 없으면 monthly. */
export function billingCycleMeta(cycle: BillingCycle) {
	return BILLING_CYCLES.find((c) => c.value === cycle) ?? BILLING_CYCLES[0];
}

/** 구독(문서 §6.5). */
export type Subscription = {
	no?: number;
	hospital_no?: number;
	user_no?: number;
	billing_key_no?: number;
	plan?: string;
	billing_cycle?: "monthly" | "annual" | "one_time" | string;
	/**
	 * 다음 갱신일부터 적용될 예약 주기(주기 변경 예약). `null`이면 예약 없음.
	 * 즉시 적용이 아니라 next_billing_at 결제 성공 시 billing_cycle로 전환된다(changeBillingCycle).
	 */
	pending_cycle?: "monthly" | "annual" | "one_time" | null;
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
		/**
		 * 결제 주기. 미전달 시 백엔드가 `monthly`로 동작(하위호환). 허용값 외는 백엔드가
		 * `ERROR_400_INVALID_BILLING_CYCLE`로 막으므로 BillingCycle로 좁혀 보낸다.
		 */
		billing_cycle?: BillingCycle;
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
			...(opts.billing_cycle ? { billing_cycle: opts.billing_cycle } : {}),
			...(opts.marketing_consent !== undefined
				? { marketing_consent: opts.marketing_consent }
				: {}),
		},
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

/**
 * 결제 주기 변경 **예약**(PATCH /subscription/:no/cycle).
 * - 즉시 결제·차액 정산 없음. `pending_cycle`에 예약되고 **다음 갱신일(next_billing_at)** 결제 시 적용된다.
 * - 현재 `billing_cycle`과 **같은 값**을 보내면 예약이 취소된다(`pending_cycle=null`).
 * - `one_time`/`canceled`/`expired`/갱신 없는 구독은 409(NOT_CHANGEABLE/NOT_RENEWABLE).
 *
 * 응답의 `billing_cycle`/`amount`는 아직 현재 값이고, 변경은 `pending_cycle`로만 내려온다.
 */
export function changeBillingCycle(
	no: number,
	billing_cycle: Exclude<BillingCycle, "one_time">,
) {
	return http.patch<{ subscription: Subscription }>(
		`subscription/${no}/cycle`,
		{ billing_cycle },
	);
}

/**
 * 주기 변경(월↔연)을 시도할 수 있는 구독인지(문서 §4 canChangeCycle).
 * active/past_due + one_time 아님 + 갱신 예정(next_billing_at) 있어야 가능. 그 외엔 409로 막힘.
 */
export function canChangeCycle(
	s: Pick<Subscription, "status" | "billing_cycle" | "next_billing_at">,
): boolean {
	return (
		(s.status === "active" || s.status === "past_due") &&
		s.billing_cycle !== "one_time" &&
		s.next_billing_at != null
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
