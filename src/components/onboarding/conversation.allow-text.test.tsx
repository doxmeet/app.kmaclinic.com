import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 대화형 온보딩 입력 UI 검증 — `question.allow_text`가 false일 때
 * 직접입력(텍스트 인풋 "답변을 입력하세요")이 실제로 렌더되지 않는지 확인한다.
 *
 * 실제 OnboardingConversation을 그대로 렌더하고 onboarding API만 모킹해
 * deriveQuestionMeta → Composer 의 실제 분기 경로를 통과시킨다(문서 §6.2.2).
 */

const { startSessionMock } = vi.hoisted(() => ({
	startSessionMock: vi.fn(),
}));

vi.mock("#/lib/api/onboarding.ts", () => ({
	startSession: startSessionMock,
	getSession: vi.fn(),
	sendMessage: vi.fn(),
	patchDraft: vi.fn(),
	commitSession: vi.fn(),
}));

// 라우터 컨텍스트 없이 ProgressHeader의 <Link>를 렌더하기 위한 passthrough.
vi.mock("@tanstack/react-router", () => ({
	Link: ({
		children,
		to,
		...rest
	}: {
		children?: React.ReactNode;
		to?: string;
	} & Record<string, unknown>) => (
		<a href={typeof to === "string" ? to : "#"} {...rest}>
			{children}
		</a>
	),
}));

// vi.mock 호이스팅 이후에 평가되도록 정적 import (vitest가 mock을 상단으로 끌어올림).
import { OnboardingConversation } from "#/components/onboarding/conversation.tsx";

const INPUT_PLACEHOLDER = "답변을 입력하세요";
const ASSISTANT_LINE = "병원 이름을 알려주세요";

type Question = Record<string, unknown> | null;

function makeView(question: Question) {
	return {
		session_no: 1,
		status: "in_progress",
		progress_percent: 50,
		waiting: false,
		mode: "hospital",
		is_clinic_owner: true,
		history: [{ role: "assistant", text: ASSISTANT_LINE }],
		draft: {},
		question,
	};
}

async function renderWith(question: Question) {
	startSessionMock.mockResolvedValue(makeView(question));
	const qc = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	render(
		<QueryClientProvider client={qc}>
			<OnboardingConversation mode="hospital" onBackToDashboard={() => {}} />
		</QueryClientProvider>,
	);
	// 채팅 화면이 떠야(어시스턴트 말풍선) Composer 분기가 의미를 가진다.
	await screen.findByText(ASSISTANT_LINE);
}

beforeEach(() => {
	startSessionMock.mockReset();
});
afterEach(() => {
	cleanup();
});

describe("conversational onboarding · allow_text 분기", () => {
	it("allow_text:false (보기/검색/파일 없음) → 입력창과 전송 버튼이 전혀 없다", async () => {
		await renderWith({ type: "confirm", allow_text: false });
		expect(screen.queryByPlaceholderText(INPUT_PLACEHOLDER)).toBeNull();
		expect(screen.queryByLabelText("전송")).toBeNull();
	});

	it("allow_text:false + allow_file:true → 파일첨부 버튼만 있고 입력창은 없다", async () => {
		await renderWith({
			type: "confirm",
			allow_text: false,
			allow_file: true,
		});
		expect(screen.getByLabelText("파일 첨부")).toBeTruthy();
		expect(screen.queryByPlaceholderText(INPUT_PLACEHOLDER)).toBeNull();
		expect(screen.queryByLabelText("전송")).toBeNull();
	});

	it("allow_text:false + 보기(select) 옵션 → 옵션 버튼만 있고 입력창은 없다", async () => {
		await renderWith({
			type: "select",
			allow_text: false,
			options: [
				{ label: "네", value: "yes" },
				{ label: "아니오", value: "no" },
			],
		});
		expect(screen.getByRole("button", { name: "네" })).toBeTruthy();
		expect(screen.getByRole("button", { name: "아니오" })).toBeTruthy();
		expect(screen.queryByPlaceholderText(INPUT_PLACEHOLDER)).toBeNull();
		// 보기일 때 직접입력 placeholder도 떠선 안 된다.
		expect(screen.queryByPlaceholderText("직접 입력하기")).toBeNull();
	});

	// ── 대조군: 입력이 떠야 정상인 경우들 ──────────────────────────────

	it("[대조] allow_text:true → 입력창과 전송 버튼이 보인다", async () => {
		await renderWith({ type: "text", allow_text: true });
		expect(screen.getByPlaceholderText(INPUT_PLACEHOLDER)).toBeTruthy();
		expect(screen.getByLabelText("전송")).toBeTruthy();
	});

	it("type:'text' + allow_text:false → 입력창이 숨겨진다(명시 allow_text 우선)", async () => {
		// 회귀: 백엔드가 type:"text"와 allow_text:false를 함께 보내면 숨겨야 한다.
		await renderWith({ type: "text", allow_text: false });
		expect(screen.queryByPlaceholderText(INPUT_PLACEHOLDER)).toBeNull();
		expect(screen.queryByLabelText("전송")).toBeNull();
	});

	it("[대조] type:'text', allow_text 미지정 → 입력창이 보인다(폴백)", async () => {
		await renderWith({ type: "text", options: null });
		expect(screen.getByPlaceholderText(INPUT_PLACEHOLDER)).toBeTruthy();
	});

	it("회귀(실제 대기 응답): type:'text'·allow_text:false·waiting → 입력창 없음", async () => {
		// session_no=95 실제 응답 형태(처리 중 대기 상태).
		await renderWith({
			text: "입력해주신 내용을 확인하고 있어요. 잠시만 기다려 주세요.",
			type: "text",
			options: null,
			allow_file: false,
			allow_skip: false,
			allow_text: false,
		});
		expect(screen.queryByPlaceholderText(INPUT_PLACEHOLDER)).toBeNull();
		expect(screen.queryByLabelText("전송")).toBeNull();
	});

	it("[주의] question 자체가 없으면(완료/구버전) 입력창이 기본 노출된다", async () => {
		// deriveQuestionMeta: question 없으면 allowText 기본 true.
		// 스크린샷의 '완료' 상태에서 입력창이 남아있는 원인이 이 분기인지 확인용.
		await renderWith(null);
		expect(screen.getByPlaceholderText(INPUT_PLACEHOLDER)).toBeTruthy();
	});
});
