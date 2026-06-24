import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "#/components/home/home.tsx";

export const Route = createFileRoute("/")({ component: HomePage });
