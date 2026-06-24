import { createFileRoute } from "@tanstack/react-router";
import { DirectOnboardingPage } from "#/components/onboarding/onboarding-direct.tsx";

export const Route = createFileRoute("/onboarding/direct")({
	component: DirectOnboardingPage,
});
