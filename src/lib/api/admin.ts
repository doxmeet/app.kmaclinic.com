import { api, http } from "#/lib/api";

/**
 * 플랫폼 운영자 콘솔 — 문서 §4 (Doxmeet ADMIN, level 9). USER는 403.
 */

export type Paginated<T> = {
	items: T[];
	pagination?: { page: number; limit: number; total: number };
};

export type AdminUser = Record<string, unknown> & {
	no?: number;
	name?: string;
	email?: string;
	level?: number;
};

/**
 * 구독 목록/상세 항목(문서 §10.2). 구독 컬럼 + 병원/결제 조인 컬럼.
 * 추가 컬럼이 와도 안전하도록 Record 인덱스 시그니처 유지.
 */
export type AdminSubscription = Record<string, unknown> & {
	no?: number;
	status?: string;
	billing_cycle?: string;
	amount?: number;
	current_period_end?: string | null;
	next_billing_at?: string | null;
	memo?: string | null;
	created_at?: string;
	hospital_no?: number;
	hospital_slug?: string;
	hospital_name?: string;
	owner_name?: string;
	last_payment_method?: string | null;
	last_payment_amount?: number | null;
	last_paid_at?: string | null;
};

/** 결제 이력 항목(문서 §10.2 구독 상세 payments[], §10.3). */
export type AdminPayment = Record<string, unknown> & {
	no?: number;
	payment_key?: string;
	order_id?: string;
	amount?: number;
	method?: string | null;
	status?: string;
	paid_at?: string | null;
	failure_code?: string | null;
	failure_reason?: string | null;
	refunded_amount?: number | null;
	created_at?: string;
};

/** 구독 상세 응답 봉투(문서 §10.2 `GET /admin/subscriptions/:no`). */
export type AdminSubscriptionDetail = {
	subscription: AdminSubscription;
	payments: AdminPayment[];
};

/** 구독/결제 목록 필터(문서 §10.2/§10.3). */
export type SubscriptionFilters = {
	status?: string;
	hospital_no?: number;
	billing_cycle?: string;
	keyword?: string;
	date_from?: string;
	date_to?: string;
	page?: number;
	limit?: number;
};

export type PaymentFilters = {
	status?: string;
	subscription_no?: number;
	method?: string;
	date_from?: string;
	date_to?: string;
	page?: number;
};

export type LicensePending = Record<string, unknown> & { no?: number };
export type NotificationLog = Record<string, unknown> & { no?: number };

const qs = (o: Record<string, string | number | undefined>) => {
	const e = Object.entries(o).filter(([, v]) => v !== undefined && v !== "");
	return e.length ? Object.fromEntries(e) : undefined;
};

export const adminApi = {
	listUsers: (p: { keyword?: string; level?: number; page?: number } = {}) =>
		http.get<Paginated<AdminUser>>("admin/users", qs(p)),
	getUser: (no: number) => http.get<AdminUser>(`admin/users/${no}`),
	setUserLevel: (no: number, level: number) =>
		http.patch<AdminUser>(`admin/users/${no}/level`, { level }),
	withdrawUser: (no: number, isWithdrawn: boolean) =>
		http.patch<AdminUser>(`admin/users/${no}/withdraw`, {
			is_withdrawn: isWithdrawn,
		}),

	listSubscriptions: (p: SubscriptionFilters = {}) =>
		http.get<Paginated<AdminSubscription>>("admin/subscriptions", qs(p)),
	getSubscription: (no: number) =>
		http.get<AdminSubscriptionDetail>(`admin/subscriptions/${no}`),
	updateMemo: (no: number, memo: string) =>
		http.patch<{ subscription: { no: number; memo: string } }>(
			`admin/subscriptions/${no}/memo`,
			{ memo },
		),

	/**
	 * 구독 현황 CSV 내보내기(문서 §10.2). 봉투 없이 raw CSV(UTF-8 BOM).
	 * 401 자동갱신 래퍼(http)를 거치지 않고 ky 인스턴스(Bearer access 자동첨부)로 blob 직접 수신.
	 */
	exportSubscriptionsCsv: (filters: SubscriptionFilters = {}) => {
		const searchParams = qs(filters) ?? {};
		return api.get("admin/subscriptions/export", { searchParams }).blob();
	},

	listPayments: (p: PaymentFilters = {}) =>
		http.get<Paginated<AdminPayment>>("admin/payments", qs(p)),

	licensePending: () =>
		http.get<Paginated<LicensePending>>("admin/profile/license/pending"),
	approveLicense: (no: number) =>
		http.post(`admin/profile/license/${no}/approve`),
	rejectLicense: (no: number, reason: string) =>
		http.post(`admin/profile/license/${no}/reject`, { reason }),

	addSociety: (input: {
		name: string;
		name_en?: string;
		category?: string;
		is_official?: boolean;
	}) => http.post("ref/society", input),

	notificationLog: (
		p: {
			channel?: "alimtalk" | "sms" | "email";
			status?: "pending" | "sent" | "failed";
			page?: number;
		} = {},
	) => http.get<Paginated<NotificationLog>>("notification/log", qs(p)),
};
