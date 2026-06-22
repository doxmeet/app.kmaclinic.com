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
	field: z.string(),
	// ① 입력값 vs 분석값 불일치
	current: z.unknown().optional(),
	from_file: z.unknown().optional(),
	// ② 깊은 분석이 찾은 이상점
	note: z.string().optional(),
	question: z.string().optional(),
	// 이미 확인 질문을 한 항목인지
	asked: z.boolean().optional(),
});

export const OnboardingMessageSchema = z.looseObject({
	role: z.enum(["assistant", "user"]).or(z.string()),
	text: z.string().optional(),
});

export const PaymentIntentSchema = z.looseObject({
	required: z.boolean(),
	hospital_no: numeric,
	plan: z.string().optional(),
	amount: numeric,
	toss_client_key: z.string().optional(),
	customer_key: z.string().optional(),
	next: z.array(z.string()).optional(),
	// pending_payment 분기에서만 내려옴(표시용)
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
