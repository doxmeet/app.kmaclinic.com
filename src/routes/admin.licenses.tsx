import { createFileRoute } from "@tanstack/react-router";
import { LicensesRoute } from "#/components/admin/admin-licenses.tsx";

export const Route = createFileRoute("/admin/licenses")({
	component: LicensesRoute,
});
