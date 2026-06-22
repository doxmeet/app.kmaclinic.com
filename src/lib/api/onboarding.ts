import { z } from "zod";
import { http, parse } from "#/lib/api";

/**
 * 대화형 AI 온보딩 — 문서 §2.
 * 한 번에 하나씩 질문/답변하며 draft를 채우고, 마지막에 commit으로 프로필(+병원) 생성.
 */

/**
 * 숫자 필드(선택). 백엔드 bigint PK(session_no/hospital_no 등)는 JSON에서 **문자열**로
 * 직렬화되므로 숫자/문자열 모두 허용해 숫자로 정규화한다(예: "1" → 1).
 */
const numeric = z.coerce.number().optional();

export const OnboardingConflictSchema = z.looseObject({
	// flag형 이상점(FlagConflict)은 field가 null일 수 있음 → nullable.
	field: z.string().nullish(),
	// ① 입력값 vs 분석값 불일치(GapConflict)
	current: z.unknown().optional(),
	from_file: z.unknown().optional(),
	// ② 깊은 분석이 찾은 이상점(FlagConflict): { field, note, question }
	note: z.string().nullish(),
	question: z.string().optional(),
	// 이미 확인 질문을 한 항목인지
	asked: z.boolean().optional(),
});

export const OnboardingMessageSchema = z.looseObject({
	role: z.enum(["assistant", "user"]).or(z.string()),
	// 파일만 보낸 턴이면 text가 null. 텍스트만이면 files가 null.
	text: z.string().nullish(),
	files: z.array(z.string()).nullish(),
});

export const PaymentIntentSchema = z.looseObject({
	required: z.boolean(),
	hospital_no: numeric,
	plan: z.string().optional(),
	amount: numeric,
	// 토스 클라이언트 키 미설정 시 null로 내려올 수 있음 → nullable.
	toss_client_key: z.string().nullish(),
	customer_key: z.string().optional(),
	next: z.array(z.string()).optional(),
	// GET /hospital/:no/payment 응답(PaymentPayloadWithName)에만 병원명이 붙음(표시용).
	hospital_name: z.string().nullish(),
});
export type PaymentIntent = z.infer<typeof PaymentIntentSchema>;

export const SessionViewSchema = z.looseObject({
	session_no: numeric,
	// 진입 분기(문서 §2): "in_progress" | "pending_payment" 등
	status: z.string().optional(),
	// true면 저장된 진행중 세션을 "이어하기" 가능(문서 §2). 방금 만든 새 세션은 false.
	resumable: z.boolean().optional(),
	// status="pending_payment"일 때만: 결제만 남은 병원(commit의 payment와 동일 형태).
	pending_payment: PaymentIntentSchema.nullish(),
	next_question: z.string().nullish(),
	// true면 next_question이 백그라운드 분석의 이상점/충돌 확인 질문(가로채기). message 응답에서만 true.
	interrupt: z.boolean().optional(),
	progress_percent: numeric,
	processing_files: numeric,
	is_clinic_owner: z.boolean().nullish(),
	conflicts: z.array(OnboardingConflictSchema).nullish(),
	// pending_payment 분기에서는 draft/history가 null로 옴 → null 허용(optional은 null 불가).
	draft: z.looseObject({}).nullish(),
	history: z.array(OnboardingMessageSchema).nullish(),
	committed: z.unknown().nullish(),
});
export type SessionView = z.infer<typeof SessionViewSchema>;

export const CommitResultSchema = z.looseObject({
	profile: z.looseObject({}).nullish(),
	hospital: z.looseObject({}).nullish(),
	seeded: z.record(z.string(), z.number()).optional(),
	payment: PaymentIntentSchema.optional(),
});
export type CommitResult = z.infer<typeof CommitResultSchema>;

export type SendMessageInput = {
	text?: string;
	file_urls?: string[];
	purpose?: "logo" | "photo";
};

/** AI 추출/질문 생성은 수십 초가 걸릴 수 있어 넉넉히(2분). */
const AI_TIMEOUT = 120_000;

export async function startSession(): Promise<SessionView> {
	return parse(
		await http.post("onboarding/session", undefined, { timeout: AI_TIMEOUT }),
		SessionViewSchema,
	);
}

export async function getSession(): Promise<SessionView> {
	return parse(await http.get("onboarding/session"), SessionViewSchema);
}

/**
 * 일괄(폼) 입력 자동저장 — 문서 §3. 부분 draft를 머지만 한다(commit 아님).
 * 보낸 키만 최신값으로 덮어쓰며, 진행중 세션이 없으면 자동저장용 새 세션이 생성된다.
 * ⚠ 비밀번호(hospital_admin.password)는 절대 넣지 말 것(commit/결제에서만).
 */
export type OnboardingDraftInput = Record<string, unknown>;

export async function patchDraft(
	partial: OnboardingDraftInput,
): Promise<SessionView> {
	return parse(
		await http.patch("onboarding/session/draft", partial),
		SessionViewSchema,
	);
}

export async function sendMessage(
	input: SendMessageInput,
): Promise<SessionView> {
	return parse(
		await http.post(
			"onboarding/session/message",
			{ ...input },
			{ timeout: AI_TIMEOUT },
		),
		SessionViewSchema,
	);
}

export async function commitSession(
	hospitalAdminPassword?: string,
): Promise<CommitResult> {
	const body = hospitalAdminPassword
		? { hospital_admin_password: hospitalAdminPassword }
		: {};
	return parse(
		await http.post("onboarding/session/commit", body, {
			timeout: AI_TIMEOUT,
		}),
		CommitResultSchema,
	);
}

export async function resetSession(): Promise<void> {
	await http.post("onboarding/session/reset");
}

/**
 * 결제만 남은(미게시·미결제) 병원을 폐기하고 처음부터 다시 시작 — 문서 onboarding-discard-pending.
 * reset과 달리 이미 만들어진(commit된) 미결제 병원/구독/세션까지 정리(soft-delete). 멱등.
 * ⚠ 이미 공개됐거나 활성/연체 구독이 있는 병원은 건드리지 않음.
 */
export type DiscardPendingResult = {
	ok: boolean;
	discarded_hospital_nos?: Array<number | string>;
	discarded_count?: number;
};

/** 걸려 있는 미결제 병원 **전체** + 진행중 초안 일괄 폐기(보조). 항목별은 deleteHospital. */
export async function discardPending(): Promise<DiscardPendingResult> {
	return http.post<DiscardPendingResult>("onboarding/discard-pending");
}

/**
 * 일괄(직접) 입력 one-shot — 문서 §8.3.
 * 대화형 루프 대신 전체 정보를 한 요청으로 보내 즉시 프로필(+병원)을 생성한다.
 * 응답은 commit과 동일(`{ profile, hospital, seeded, payment }`). 파일/AI 추출은 거치지 않음.
 */
export type DirectOnboardingInput = {
	is_clinic_owner?: boolean;
	profile?: Record<string, unknown>;
	hospital?: Record<string, unknown>;
	hospital_admin?: { login_id?: string; name?: string };
	hospital_admin_password?: string;
	departments?: string[];
	treatments?: Array<Record<string, unknown>>;
	subentities?: Record<string, unknown>;
	photos?: string[];
};

export async function directOnboarding(
	input: DirectOnboardingInput,
): Promise<CommitResult> {
	return parse(
		await http.post("onboarding/direct", input, { timeout: AI_TIMEOUT }),
		CommitResultSchema,
	);
}

// ─────────────────────────────────────────────────────────────────────
// 대시보드(overview) — 문서 onboarding-frontend-guide §3
//  진입 시 항상 먼저 호출. 진행중 draft(최대 1) + 생성된 병원 카드 목록.
// ─────────────────────────────────────────────────────────────────────

export const OverviewDraftSchema = z.looseObject({
	kind: z.string().optional(),
	status: z.string().optional(),
	session_no: numeric,
	name: z.string().nullish(),
	is_clinic_owner: z.boolean().nullish(),
	progress_percent: numeric,
	next_question: z.string().nullish(),
	created_at: z.string().nullish(),
	updated_at: z.string().nullish(),
});
export type OverviewDraft = z.infer<typeof OverviewDraftSchema>;

/** 병원 카드 상태: pending_payment → ready_to_publish → published. */
export const OverviewHospitalSchema = z.looseObject({
	kind: z.string().optional(),
	status: z.string(),
	hospital_no: numeric,
	name: z.string().nullish(),
	region: z.string().nullish(),
	slug: z.string().nullish(),
	is_published: z.boolean().nullish(),
	subscription_status: z.string().nullish(),
	current_period_end: z.string().nullish(),
	created_at: z.string().nullish(),
	updated_at: z.string().nullish(),
	// pending_payment 카드에만 존재(결제 위젯 즉시 사용용).
	payment: PaymentIntentSchema.nullish(),
});
export type OverviewHospital = z.infer<typeof OverviewHospitalSchema>;

export const OverviewSchema = z.looseObject({
	draft: OverviewDraftSchema.nullish(),
	hospitals: z.array(OverviewHospitalSchema).nullish(),
	can_start_new_draft: z.boolean().optional(),
	counts: z
		.looseObject({
			draft: numeric,
			pending_payment: numeric,
			ready_to_publish: numeric,
			published: numeric,
		})
		.optional(),
});
export type Overview = z.infer<typeof OverviewSchema>;

export async function getOverview(): Promise<Overview> {
	return parse(await http.get("onboarding/overview"), OverviewSchema);
}

/** 특정 병원의 결제 페이로드(새로고침/딥링크로 결제 화면 진입 시). */
export async function getHospitalPayment(no: number): Promise<PaymentIntent> {
	return parse(
		await http.get(`onboarding/hospital/${no}/payment`),
		PaymentIntentSchema,
	);
}

/** 미결제(미게시 + 비활성 구독) 병원 1개 폐기(soft-delete). */
export async function deleteHospital(
	no: number,
): Promise<{ ok: boolean; discarded_hospital_no?: number | string | null }> {
	return http.del(`onboarding/hospital/${no}`);
}
