import { createFileRoute } from "@tanstack/react-router";
import { AccountRoute } from "#/components/account/account.tsx";

/**
 * 내 계정 — 본인 계정/구독 상태 조회 (문서 §8.2).
 * 프로필/병원 콘텐츠 관리는 별도 도메인(kmadoc/kmaclinic)의 책임.
 */
export const Route = createFileRoute("/account")({
	component: AccountRoute,
});
