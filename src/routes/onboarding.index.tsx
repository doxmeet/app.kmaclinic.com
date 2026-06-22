import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useId, useState } from "react";
import { AuthGuard } from "#/components/auth/auth-guard.tsx";
import { InfoCallout } from "#/components/common/info-callout.tsx";
import {
	SectionCard,
	SectionTitle,
} from "#/components/common/section-card.tsx";
import { FieldInput } from "#/components/form/field-input.tsx";
import { AppShell } from "#/components/layout/app-shell.tsx";
import { CommitComplete } from "#/components/onboarding/commit-complete.tsx";
import { OnboardingConversation } from "#/components/onboarding/conversation.tsx";
import { OnboardingDashboard } from "#/components/onboarding/dashboard.tsx";
import { Button } from "#/components/ui/button.tsx";
import { ApiError } from "#/lib/api";
import { publishHospital, setHospitalSlug } from "#/lib/api/billing.ts";
import {
	deleteHospital,
	getOverview,
	type OverviewHospital,
	type PaymentIntent,
} from "#/lib/api/onboarding.ts";
import { toastApiError } from "#/lib/api-error-message.ts";
import { useSession } from "#/lib/auth/use-session.ts";

/**
 * 온보딩 진입점 — **대시보드 오케스트레이터** (문서 onboarding-frontend-guide §3).
 * 진입 시 항상 대시보드(내 병원 카드 목록)를 먼저 보여주고, 카드/버튼에서 하위 흐름을 시작한다.
 *
 * 내부 모드 상태머신: dashboard | conversation | payment | publish.
 * overview는 TanStack Query(queryKey ["onboarding","overview"])로 조회하고,
 * 액션(삭제/게시/결제 진입) 후 invalidateQueries로 새로고침한다.
 */
export const Route = createFileRoute("/onboarding/")({
	component: OnboardingPage,
});

const OVERVIEW_KEY = ["onboarding", "overview"] as const;

type Mode = "dashboard" | "conversation" | "payment" | "publish";

function OnboardingPage() {
	return (
		<AuthGuard>
			<OnboardingOrchestrator />
		</AuthGuard>
	);
}

function OnboardingOrchestrator() {
	const { user } = useSession();
	const queryClient = useQueryClient();

	const [mode, setMode] = useState<Mode>("dashboard");
	// payment 모드: 어떤 병원의 결제 페이로드를 쓸지.
	const [paymentTarget, setPaymentTarget] = useState<PaymentIntent | null>(
		null,
	);
	// publish 모드: 게시할 병원.
	const [publishTarget, setPublishTarget] = useState<OverviewHospital | null>(
		null,
	);

	const overviewQuery = useQuery({
		queryKey: OVERVIEW_KEY,
		queryFn: getOverview,
	});

	function refetchOverview() {
		queryClient.invalidateQueries({ queryKey: OVERVIEW_KEY });
	}

	function backToDashboard() {
		setMode("dashboard");
		setPaymentTarget(null);
		setPublishTarget(null);
		refetchOverview();
	}

	const userName = user?.name ?? "원장님";

	// ── conversation 모드 ───────────────────────────────────────────
	if (mode === "conversation") {
		return (
			<AppShell userName={userName} maxWidth="720px">
				<OnboardingConversation onBackToDashboard={backToDashboard} />
			</AppShell>
		);
	}

	// ── payment 모드 ────────────────────────────────────────────────
	if (mode === "payment" && paymentTarget) {
		return (
			<AppShell userName={userName} maxWidth="720px">
				<div className="flex flex-col gap-4">
					<BackToDashboardLink onClick={backToDashboard} />
					<CommitComplete
						result={{ payment: paymentTarget }}
						onStartOver={async () => {
							if (paymentTarget.hospital_no != null) {
								await deleteHospital(paymentTarget.hospital_no);
							}
							backToDashboard();
						}}
					/>
				</div>
			</AppShell>
		);
	}

	// ── publish 모드 ────────────────────────────────────────────────
	if (mode === "publish" && publishTarget) {
		return (
			<AppShell userName={userName} maxWidth="720px">
				<div className="flex flex-col gap-4">
					<BackToDashboardLink onClick={backToDashboard} />
					<PublishPanel
						hospital={publishTarget}
						onPublished={backToDashboard}
					/>
				</div>
			</AppShell>
		);
	}

	// ── dashboard 모드(기본) ────────────────────────────────────────
	return (
		<AppShell userName={userName} maxWidth="720px">
			{overviewQuery.isLoading ? (
				<div className="flex flex-col items-center gap-4 py-24 text-center">
					<Loader2 className="size-7 animate-spin text-brand" />
					<p className="text-base text-body">불러오는 중이에요…</p>
				</div>
			) : overviewQuery.isError ? (
				<SectionCard className="flex flex-col items-center gap-5 text-center">
					<p className="text-lg font-semibold text-ink">
						대시보드를 불러오지 못했습니다.
					</p>
					<p className="text-sm text-body">
						{overviewQuery.error instanceof ApiError
							? overviewQuery.error.message
							: "네트워크 상태를 확인한 뒤 다시 시도해 주세요."}
					</p>
					<Button
						variant="brand"
						size="2xl"
						onClick={() => overviewQuery.refetch()}
					>
						다시 시도
					</Button>
				</SectionCard>
			) : overviewQuery.data ? (
				<OnboardingDashboard
					overview={overviewQuery.data}
					onStartConversation={() => setMode("conversation")}
					onContinueDraft={() => setMode("conversation")}
					onPay={(payment) => {
						setPaymentTarget(payment);
						setMode("payment");
					}}
					onPublish={(hospital) => {
						setPublishTarget(hospital);
						setMode("publish");
					}}
					onRefetch={refetchOverview}
				/>
			) : null}
		</AppShell>
	);
}

// ─────────────────────────────────────────────────────────────────────
// 공통: "← 대시보드" 링크
// ─────────────────────────────────────────────────────────────────────

function BackToDashboardLink({ onClick }: { onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex w-fit items-center gap-1.5 text-sm font-medium text-body-soft transition-colors hover:text-brand"
		>
			<ArrowLeft className="size-4" />
			대시보드
		</button>
	);
}

// ─────────────────────────────────────────────────────────────────────
// publish 모드: 공개 주소(slug) 설정 + 게시
// ─────────────────────────────────────────────────────────────────────

function PublishPanel({
	hospital,
	onPublished,
}: {
	hospital: OverviewHospital;
	onPublished: () => void;
}) {
	const slugId = useId();
	// 이미 slug가 있으면 prefill(입력만 두고 바로 게시도 가능).
	const [slug, setSlug] = useState(hospital.slug?.trim() ?? "");

	const publishMutation = useMutation({
		mutationFn: async (value: string) => {
			const trimmed = value.trim();
			if (hospital.hospital_no == null) {
				throw new Error("병원 정보를 찾을 수 없습니다.");
			}
			// slug가 비어 있지 않으면 먼저 설정(이미 동일하면 멱등). 그 뒤 publish.
			if (trimmed) {
				await setHospitalSlug(hospital.hospital_no, trimmed);
			}
			await publishHospital(hospital.hospital_no);
		},
		onSuccess: onPublished,
		onError: (err) => toastApiError(err),
	});

	const title = hospital.name?.trim() ? hospital.name : "병원";
	const canSubmit = slug.trim().length > 0 && !publishMutation.isPending;

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!canSubmit) return;
		publishMutation.mutate(slug);
	}

	return (
		<SectionCard className="flex flex-col gap-6">
			<div className="flex flex-col gap-2">
				<SectionTitle>병원 홈페이지 게시</SectionTitle>
				<p className="text-[15px] leading-7 text-body-soft">
					<span className="font-semibold text-ink">{title}</span> 홈페이지를
					공개합니다. 방문자에게 보일 공개 주소를 정해 주세요.
				</p>
			</div>

			<form onSubmit={handleSubmit} className="flex flex-col gap-4">
				<div className="flex flex-col gap-2">
					<label htmlFor={slugId} className="text-sm font-medium text-ink">
						공개 주소
					</label>
					<FieldInput
						id={slugId}
						value={slug}
						onChange={(e) => setSlug(e.target.value)}
						placeholder="예: mychungdam"
						autoComplete="off"
						autoCapitalize="off"
						spellCheck={false}
						endAdornment={<span className="text-muted-fg">.kmaclinic.com</span>}
					/>
					<p className="text-xs text-body-soft">
						입력한 주소로 공개됩니다 (예: 입력한 주소.kmaclinic.com). 영문
						소문자·숫자로 정해 주세요.
					</p>
				</div>

				<InfoCallout tone="info">
					<p className="text-sm">
						게시하려면 활성 구독(결제)이 필요합니다. 결제가 완료된 병원만 게시할
						수 있어요.
					</p>
				</InfoCallout>

				<Button
					type="submit"
					variant="brand"
					size="cta"
					className="w-full"
					disabled={!canSubmit}
				>
					{publishMutation.isPending ? (
						<Loader2 className="size-5 animate-spin" />
					) : null}
					게시하기
				</Button>
			</form>
		</SectionCard>
	);
}
