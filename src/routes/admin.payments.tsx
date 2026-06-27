import { createFileRoute } from "@tanstack/react-router";
import { PaymentsRoute } from "#/components/admin/admin-payments.tsx";

export const Route = createFileRoute("/admin/payments")({
	component: PaymentsRoute,
});
