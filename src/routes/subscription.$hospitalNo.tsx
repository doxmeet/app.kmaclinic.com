import { createFileRoute } from "@tanstack/react-router";
import { SubscriptionManageRoute } from "#/components/subscription/subscription.tsx";

/**
 * 구독 관리 — 특정 병원의 구독 상태/결제수단/결제내역 조회 + 해지·카드변경·재구독 (문서 §8.6~8.8, §9.5/§9.6).
 * 대시보드의 공개 병원 카드 또는 내 계정에서 진입한다.
 */
export const Route = createFileRoute("/subscription/$hospitalNo")({
	component: SubscriptionManageRoute,
});
