import { createFileRoute } from "@tanstack/react-router";
import { InstitutionDetailRoute } from "#/components/admin/admin-institutions-detail.tsx";

export const Route = createFileRoute("/admin/institutions/$id")({
	component: InstitutionDetailRoute,
});
