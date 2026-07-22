import { createFileRoute } from "@tanstack/react-router";
import { OnboardingPage } from "#/components/onboarding/onboarding-index.tsx";

export const Route = createFileRoute("/onboarding/")({
	// 결제 완료 화면의 "홈페이지 주소 정하기" 딥링크 — `?publish=<hospital_no>`로
	// 진입하면 대시보드 목록을 거치지 않고 바로 공개 주소 설정(publish 모드)으로 간다.
	validateSearch: (search: Record<string, unknown>): { publish?: number } => {
		const no = Number(search.publish);
		return Number.isInteger(no) && no > 0 ? { publish: no } : {};
	},
	component: OnboardingPage,
});
