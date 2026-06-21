import { http } from "#/lib/api";

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

export type AdminSubscription = Record<string, unknown> & {
	no?: number;
	hospital_no?: number;
	status?: string;
};

export type AdminPayment = Record<string, unknown> & {
	no?: number;
	status?: string;
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

	listSubscriptions: (
		p: { status?: string; hospital_no?: number; page?: number } = {},
	) => http.get<Paginated<AdminSubscription>>("admin/subscriptions", qs(p)),
	getSubscription: (no: number) =>
		http.get<AdminSubscription>(`admin/subscriptions/${no}`),

	listPayments: (
		p: { status?: string; subscription_no?: number; page?: number } = {},
	) => http.get<Paginated<AdminPayment>>("admin/payments", qs(p)),

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
