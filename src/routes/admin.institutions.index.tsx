import { createFileRoute } from "@tanstack/react-router";
import { InstitutionsRoute } from "#/components/admin/admin-institutions.tsx";

export const Route = createFileRoute("/admin/institutions/")({
	component: InstitutionsRoute,
});
