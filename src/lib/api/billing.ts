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

/** 결제 주기(백엔드 `billing_cycle`). 월간·연간만(가이드 §2). 미전달 시 백엔드는 `monthly`. */
export type BillingCycle = "monthly" | "annual";

/**
 * 결제 주기 옵션 — 가격·기간 정책(가이드 §2). 정책 단일 출처는 백엔드(plan.util.js)이고,
 * 프론트는 가능한 한 서버 응답 `amount`(다음 청구 예정액)를 그대로 표시한다(§12). 단, 구독
 * 생성 전 "결제 주기 선택 화면"에는 서버 amount가 없어 아래 마케팅 가격을 직접 노출한다.
 *
 * - regularAmount : 정가(갱신가). 월 ₩20,000 / 연 ₩200,000.
 * - firstAmount   : 오픈특가(병원당 최초 결제 1회). 월 ₩10,000 / 연 ₩100,000.
 * - listAmount    : 취소선 기준 금액(연간은 월 정가×12 = ₩240,000 앵커).
 *
 * 첫 달은 무료체험(카드만 등록, 즉시 과금 없음 — 가이드 §4). 무료기간 종료 후 cron이
 * 오픈특가로 첫 결제하고, 이후 갱신부터 정가로 청구한다.
 */
const BILLING_CYCLES: ReadonlyArray<{
	value: BillingCycle;
	/** 선택지 라벨(예: "월간"). */
	label: string;
	/** 정가(갱신가, KRW 정수). */
	regularAmount: number;
	/** 오픈특가(최초 결제 1회, KRW 정수). */
	firstAmount: number;
	/** 취소선 기준 금액(연간 240,000 앵커). */
	listAmount: number;
	/** 금액 옆 기간 접미사(예: "월" → "20,000원 / 월"). */
	periodSuffix: string;
	/** 환불창(결제일 기준, 일). 월 7 / 연 14 (가이드 §8). */
	refundWindowDays: number;
	/** 보조 설명(자동 갱신 등). */
	description: string;
}> = [
	{
		value: "monthly",
		label: "월간",
		regularAmount: 20000,
		firstAmount: 10000,
		listAmount: 20000,
		periodSuffix: "월",
		refundWindowDays: 7,
		description: "매월 자동 결제",
	},
	{
		value: "annual",
		label: "연간",
		regularAmount: 200000,
		firstAmount: 100000,
		listAmount: 240000,
		periodSuffix: "년",
		refundWindowDays: 14,
		description: "매년 자동 결제 · 2개월 무료 혜택",
	},
];

/** 주기 enum 검증(쿼리/외부 입력 정규화용). 유효하지 않으면 null. */
export function asBillingCycle(value: unknown): BillingCycle | null {
	return value === "monthly" || value === "annual" ? value : null;
}

/** 주기별 정가(갱신가, 표시용). 알 수 없으면 monthly 정가(₩20,000). */
export function amountForCycle(cycle: BillingCycle): number {
	return BILLING_CYCLES.find((c) => c.value === cycle)?.regularAmount ?? 20000;
}

/** 주기별 오픈특가(최초 결제 1회). 알 수 없으면 monthly 특가(₩10,000). */
export function firstAmountForCycle(cycle: BillingCycle): number {
	return BILLING_CYCLES.find((c) => c.value === cycle)?.firstAmount ?? 10000;
}

/** 주기별 메타(라벨/접미사/금액/환불창). 알 수 없으면 monthly. */
export function billingCycleMeta(cycle: BillingCycle) {
	return BILLING_CYCLES.find((c) => c.value === cycle) ?? BILLING_CYCLES[0];
}

/** 주기별 환불창(결제일 기준 일수). 월 7 / 연 14 (가이드 §8). */
export function refundWindowDays(
	cycle: BillingCycle | null | undefined,
): number {
	return billingCycleMeta(asBillingCycle(cycle) ?? "monthly").refundWindowDays;
}

/** 구독(문서 §6.5). */
export type Subscription = {
	no?: number;
	hospital_no?: number;
	user_no?: number;
	billing_key_no?: number;
	plan?: string;
	billing_cycle?: "monthly" | "annual" | string;
	/**
	 * 다음 갱신일부터 적용될 예약 주기(주기 변경 예약). `null`이면 예약 없음.
	 * 즉시 적용이 아니라 next_billing_at 결제 성공 시 billing_cycle로 전환된다(changeBillingCycle).
	 */
	pending_cycle?: "monthly" | "annual" | null;
	/** 다음 청구 예정액. 무료체험 중엔 오픈특가, 첫 결제 후엔 정가(가이드 §6.1). */
	amount?: number;
	status?: "active" | "past_due" | "canceled" | "expired" | string;
	current_period_start?: string | null;
	current_period_end?: string | null;
	/**
	 * 무료체험 종료 시각(체험인 경우에만 채워짐 — 가이드 §4·§6.1). "체험 중" 판단은
	 * status가 아니라 `trial_end_at && now < trial_end_at`로 한다(체험도 status=active).
	 */
	trial_end_at?: string | null;
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
 * 병원 구독 생성(가이드 §4). 백엔드가 이 병원의 과거 구독 이력을 보고 자동 분기한다:
 * - **최초 구독**(이력 없음) → **첫 달 무료체험**. 카드만 등록되고 즉시 과금하지 않는다.
 *   응답 `trial:true`, `payment:null`, `subscription.status:active`(체험은 active),
 *   `trial_end_at`/`next_billing_at`에 첫 결제(오픈특가) 시각이 담긴다.
 * - **재구독**(이력 있음) → **즉시 정가 청구**(무료달·특가 미적용). `trial:false`, `payment:{...}`.
 *
 * 카드 경로:
 * - `authKey` 미전달(권장) → **저장된 활성 빌링키**로 진행. 저장된 카드도 없으면
 *   `ERROR_400_BILLING_KEY_REQUIRED`(먼저 카드 등록 필요).
 * - `authKey`(+`customerKey`) 전달 → 그 카드를 먼저 발급·교체(기존 active는 deleted)한 뒤 진행.
 *   **새 카드로 결제/카드 변경 시에만** 보낸다(저장된 카드가 있으면 생략).
 *   ⚠ 재구독 청구 실패(402) 시 카드는 이미 저장됨 → 재시도는 `authKey` 없이 보낼 것(1회용 키).
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
	return http.post<{
		subscription: Subscription;
		/** 최초(무료체험) 구독이면 null, 재구독(즉시 청구)이면 결제 객체. */
		payment: Payment | null;
		/** 첫 달 무료체험으로 생성됐는지(가이드 §4 분기). */
		trial: boolean;
	}>("subscription", {
		hospital_no: hospitalNo,
		...(opts.authKey ? { authKey: opts.authKey } : {}),
		...(opts.authKey && opts.customerKey
			? { customerKey: opts.customerKey }
			: {}),
		...(opts.billing_cycle ? { billing_cycle: opts.billing_cycle } : {}),
		...(opts.marketing_consent !== undefined
			? { marketing_consent: opts.marketing_consent }
			: {}),
	});
}

/** 특정 병원의 구독 조회(문서 §8.7) — 최신 1건(없으면 null). */
export function getHospitalSubscription(hospitalNo: number) {
	return http.get<{ subscription: Subscription | null }>(
		`subscription/hospital/${hospitalNo}`,
	);
}

/**
 * 구독 해지(가이드 §8) — 백엔드가 환불창 여부로 자동 분기한다:
 * - **환불창 이내**(최근 결제가 결제일 기준 월 7일 / 연 14일 이내) → **전액 자동환불 + 즉시 종료**.
 *   응답 `refunded:true`, `refunded_amount:<금액>`.
 * - **환불창 밖** 또는 **무료체험 중**(결제 이력 없음) → 다음 결제만 중지, **현재 기간 종료까지 유지**.
 *   응답 `refunded:false`, `refunded_amount:0`, `next_billing_at:null`.
 *
 * 이미 종료된 구독이면 `ERROR_409_SUBSCRIPTION_NOT_CANCELABLE`,
 * 환불 호출 실패면 `ERROR_402_TOSS_PAYMENT_FAILED`(재시도/문의 유도).
 */
export function cancelSubscription(no: number, reason?: string) {
	return http.post<{
		subscription: Subscription;
		/** 전액 자동환불됐는지(환불창 이내). */
		refunded: boolean;
		/** 환불된 금액(KRW 정수). 환불 없으면 0. */
		refunded_amount: number;
	}>(`subscription/${no}/cancel`, reason ? { reason } : undefined);
}

/**
 * 결제 주기 변경 **예약**(PATCH /subscription/:no/cycle).
 * - 즉시 결제·차액 정산 없음. `pending_cycle`에 예약되고 **다음 갱신일(next_billing_at)** 결제 시 적용된다.
 * - 현재 `billing_cycle`과 **같은 값**을 보내면 예약이 취소된다(`pending_cycle=null`).
 * - `canceled`/`expired`/갱신 없는 구독은 409(NOT_CHANGEABLE/NOT_RENEWABLE).
 *
 * 응답의 `billing_cycle`/`amount`는 아직 현재 값이고, 변경은 `pending_cycle`로만 내려온다.
 */
export function changeBillingCycle(no: number, billing_cycle: BillingCycle) {
	return http.patch<{ subscription: Subscription }>(
		`subscription/${no}/cycle`,
		{ billing_cycle },
	);
}

/**
 * 주기 변경(월↔연)을 시도할 수 있는 구독인지(가이드 §7 canChangeCycle).
 * active/past_due + 갱신 예정(next_billing_at) 있어야 가능. 그 외엔 409로 막힘.
 */
export function canChangeCycle(
	s: Pick<Subscription, "status" | "billing_cycle" | "next_billing_at">,
): boolean {
	return (
		(s.status === "active" || s.status === "past_due") &&
		s.next_billing_at != null
	);
}

/**
 * 무료체험 중인지(가이드 §6.3) — trial_end_at이 미래면 체험 중(status가 active여도 동일).
 * status만으로 판단 금지(체험도 active).
 */
export function isTrialing(s: Pick<Subscription, "trial_end_at">): boolean {
	if (!s.trial_end_at) return false;
	const end = new Date(s.trial_end_at).getTime();
	return Number.isFinite(end) && end > Date.now();
}

/** 무료체험 남은 일수(올림). 체험 중이 아니면 0. */
export function trialDaysLeft(s: Pick<Subscription, "trial_end_at">): number {
	if (!isTrialing(s) || !s.trial_end_at) return 0;
	return Math.ceil(
		(new Date(s.trial_end_at).getTime() - Date.now()) / 86400000,
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
