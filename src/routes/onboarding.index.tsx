import { createFileRoute } from "@tanstack/react-router";
import { OnboardingPage } from "#/components/onboarding/onboarding-index.tsx";

export const Route = createFileRoute("/onboarding/")({
	component: OnboardingPage,
});
