import { createFileRoute } from "@tanstack/react-router";
import { DoctorPreviewPage } from "#/components/doctor/doctor-preview.tsx";

export const Route = createFileRoute("/doctor/preview")({
	component: DoctorPreviewPage,
});
