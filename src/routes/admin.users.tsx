import { createFileRoute } from "@tanstack/react-router";
import { UsersRoute } from "#/components/admin/admin-users.tsx";

export const Route = createFileRoute("/admin/users")({
	component: UsersRoute,
});
