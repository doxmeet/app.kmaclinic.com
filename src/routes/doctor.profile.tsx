import { createFileRoute } from "@tanstack/react-router";
import { DoctorProfilePage } from "#/components/doctor/doctor-profile.tsx";

export const Route = createFileRoute("/doctor/profile")({
	component: DoctorProfilePage,
});
