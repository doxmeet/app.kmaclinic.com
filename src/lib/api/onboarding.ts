import { z } from "zod";
import { http, parse } from "#/lib/api";

/**
 * 대화형 AI 온보딩 — 문서 §2.
 * 한 번에 하나씩 질문/답변하며 draft를 채우고, 마지막에 commit으로 프로필(+병원) 생성.
 */

export const OnboardingConflictSchema = z.looseObject({
	field: z.string(),
	current: z.unknown().optional(),
	from_file: z.unknown().optional(),
});

export const OnboardingMessageSchema = z.looseObject({
	role: z.enum(["assistant", "user"]).or(z.string()),
	text: z.string().optional(),
});

export const SessionViewSchema = z.looseObject({
	session_no: z.number().optional(),
	status: z.string().optional(),
	next_question: z.string().nullish(),
	progress_percent: z.number().optional(),
	processing_files: z.number().optional(),
	is_clinic_owner: z.boolean().nullish(),
	conflicts: z.array(OnboardingConflictSchema).optional(),
	draft: z.looseObject({}).optional(),
	history: z.array(OnboardingMessageSchema).optional(),
	committed: z.unknown().nullish(),
});
export type SessionView = z.infer<typeof SessionViewSchema>;

export const PaymentIntentSchema = z.looseObject({
	required: z.boolean(),
	hospital_no: z.number().optional(),
	plan: z.string().optional(),
	amount: z.number().optional(),
	toss_client_key: z.string().optional(),
	customer_key: z.string().optional(),
	next: z.array(z.string()).optional(),
});
export type PaymentIntent = z.infer<typeof PaymentIntentSchema>;

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

export async function startSession(): Promise<SessionView> {
	return parse(await http.post("onboarding/session"), SessionViewSchema);
}

export async function getSession(): Promise<SessionView> {
	return parse(await http.get("onboarding/session"), SessionViewSchema);
}

export async function sendMessage(
	input: SendMessageInput,
): Promise<SessionView> {
	return parse(
		await http.post("onboarding/session/message", { ...input }),
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
		await http.post("onboarding/session/commit", body),
		CommitResultSchema,
	);
}

export async function resetSession(): Promise<void> {
	await http.post("onboarding/session/reset");
}
