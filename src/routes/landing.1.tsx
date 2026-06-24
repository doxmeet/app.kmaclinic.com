import { createFileRoute } from "@tanstack/react-router";
import { Landing1 } from "#/components/landing/landing-1";

export const Route = createFileRoute("/landing/1")({ component: Landing1 });
