import { createFileRoute } from "@tanstack/react-router";
import { HospitalManagePage } from "#/components/hospital/hospital-manage.tsx";

export const Route = createFileRoute("/hospital/manage")({
	component: HospitalManagePage,
});
