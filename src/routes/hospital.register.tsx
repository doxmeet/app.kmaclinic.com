import { createFileRoute } from "@tanstack/react-router";
import { HospitalRegisterPage } from "#/components/hospital/hospital-register.tsx";

export const Route = createFileRoute("/hospital/register")({
	component: HospitalRegisterPage,
});
