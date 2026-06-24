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

const OnboardingConflictSchema = z.looseObject({
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

const OnboardingMessageSchema = z.looseObject({
	role: z.enum(["assistant", "user"]).or(z.string()),
	// 파일만 보낸 턴이면 text가 null. 텍스트만이면 files가 null.
	text: z.string().nullish(),
	files: z.array(z.string()).nullish(),
});

const PaymentIntentSchema = z.looseObject({
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

const SessionViewSchema = z.looseObject({
	session_no: numeric,
	// 진입 분기(문서 §2): "in_progress" | "pending_payment" 등
	status: z.string().optional(),
	// true면 저장된 진행중 세션을 "이어하기" 가능(문서 §2). 방금 만든 새 세션은 false.
	resumable: z.boolean().optional(),
	// status="pending_payment"일 때만: 결제만 남은 병원(commit의 payment와 동일 형태).
	pending_payment: PaymentIntentSchema.nullish(),
	next_question: z.string().nullish(),
	// 입력 UI 메타(문서 §6.2.2). type="select"면 options를 클릭 버튼으로(클릭 시 value를 message text로 전송),
	// "text"면 주관식. allow_text/skip/file로 직접입력·건너뛰기·파일 허용 여부. 구버전 호환 위해 next_question도 유지.
	question: z
		.looseObject({
			text: z.string().nullish(),
			type: z.string().nullish(),
			options: z
				.array(
					z.looseObject({
						label: z.string().nullish(),
						value: z.string().nullish(),
					}),
				)
				.nullish(),
			allow_text: z.boolean().nullish(),
			allow_skip: z.boolean().nullish(),
			allow_file: z.boolean().nullish(),
		})
		.nullish(),
	// true면 next_question이 백그라운드 분석의 이상점/충돌 확인 질문(가로채기). message 응답에서만 true.
	interrupt: z.boolean().optional(),
	// "대기" 구간(마지막 답변 추출 중/파일 분석 중 — 사용자가 답할 게 없음).
	// 이 값으로만 폴링 시작/중단을 판단한다(문서 2026-06 §1). processing_*는 표시등 전용.
	waiting: z.boolean().optional(),
	progress_percent: numeric,
	// 진행중 "답변" 깊은분석 수(표시등 전용). 답변 보낼 때마다 1↑. 폴링 트리거 아님.
	processing_text: numeric,
	// 진행중 "업로드 문서" 추출 수(표시등 전용).
	processing_file: numeric,
	is_clinic_owner: z.boolean().nullish(),
	conflicts: z.array(OnboardingConflictSchema).nullish(),
	// pending_payment 분기에서는 draft/history가 null로 옴 → null 허용(optional은 null 불가).
	draft: z.looseObject({}).nullish(),
	history: z.array(OnboardingMessageSchema).nullish(),
	committed: z.unknown().nullish(),
});
export type SessionView = z.infer<typeof SessionViewSchema>;

/**
 * 데이터 검수(review) — commit/direct 후 백그라운드로 항목 AI 검증이 enqueue됨(문서 §8.3).
 * 표시용. `GET /onboarding/review[/:no]`로 진행 상태를 폴링할 수 있다(필수 아님).
 */
export const ReviewSchema = z.looseObject({
	no: numeric,
	status: z.string().nullish(),
});

const CommitResultSchema = z.looseObject({
	profile: z.looseObject({}).nullish(),
	hospital: z.looseObject({}).nullish(),
	seeded: z.record(z.string(), z.number()).optional(),
	payment: PaymentIntentSchema.optional(),
	// commit/direct 응답에 함께 오는 데이터 검수 작업(표시용, 게이트 아님).
	review: ReviewSchema.nullish(),
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

/**
 * 프로필(+병원) 생성 확정. 관리자 계정(아이디·비밀번호)은 대화가 아닌 **이 단계에서만** 받는다
 * (문서 2026-06 §2). 둘 다 draft에 저장되지 않고 commit 본문으로만 전달.
 * - 병원 소유(is_clinic_owner): login_id + password 모두 필수.
 * - 프로필만: 인자 없이 호출.
 */
export async function commitSession(args?: {
	login_id?: string;
	password?: string;
}): Promise<CommitResult> {
	const body: Record<string, string> = {};
	if (args?.login_id) body.hospital_admin_login_id = args.login_id;
	if (args?.password) body.hospital_admin_password = args.password;
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

// ─────────────────────────────────────────────────────────────────────
// 대시보드(overview) — 문서 onboarding-frontend-guide §3
//  진입 시 항상 먼저 호출. 진행중 draft(최대 1) + 생성된 병원 카드 목록.
// ─────────────────────────────────────────────────────────────────────

const OverviewDraftSchema = z.looseObject({
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
const OverviewHospitalSchema = z.looseObject({
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

/** 의사 프로필 카드(문서 overview.profile) — 상태: editing → published. */
const OverviewProfileSchema = z.looseObject({
	kind: z.string().optional(),
	// 게시 가능 여부 판단은 completion_percent가 아니라 이 status로 한다.
	status: z.string().optional(),
	no: numeric,
	slug: z.string().nullish(),
	display_name: z.string().nullish(),
	is_published: z.boolean().nullish(),
	// 완성도(%)는 보통 draft에만 옴 — 프로필 카드에서는 표시하지 않는다(게시 게이트도 아님).
	completion_percent: numeric,
	published_at: z.string().nullish(),
});
export type OverviewProfile = z.infer<typeof OverviewProfileSchema>;

const OverviewSchema = z.looseObject({
	draft: OverviewDraftSchema.nullish(),
	profile: OverviewProfileSchema.nullish(),
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

/** 미결제(미게시 + 비활성 구독) 병원 1개 폐기(soft-delete). */
export async function deleteHospital(
	no: number,
): Promise<{ ok: boolean; discarded_hospital_no?: number | string | null }> {
	return http.del(`onboarding/hospital/${no}`);
}
