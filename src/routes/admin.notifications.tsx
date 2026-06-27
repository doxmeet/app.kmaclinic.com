import { createFileRoute } from "@tanstack/react-router";
import { NotificationsRoute } from "#/components/admin/admin-notifications.tsx";

export const Route = createFileRoute("/admin/notifications")({
	component: NotificationsRoute,
});
