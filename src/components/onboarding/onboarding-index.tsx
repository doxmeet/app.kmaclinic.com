import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useState } from "react";
import { AuthGuard } from "#/components/auth/auth-guard.tsx";
import { InfoCallout } from "#/components/common/info-callout.tsx";
import { KakaoSupportLink } from "#/components/common/kakao-support-link.tsx";
import {
	SectionCard,
	SectionTitle,
} from "#/components/common/section-card.tsx";
import { AppShell } from "#/components/layout/app-shell.tsx";
import { CommitComplete } from "#/components/onboarding/commit-complete.tsx";
import { OnboardingConversation } from "#/components/onboarding/conversation.tsx";
import { OnboardingDashboard } from "#/components/onboarding/dashboard.tsx";
import { isSlugValid } from "#/components/onboarding/slug.ts";
import { SlugField } from "#/components/onboarding/slug-field.tsx";
import { Button } from "#/components/ui/button.tsx";
import { ApiError } from "#/lib/api";
import { publishHospital, setHospitalSlug } from "#/lib/api/billing.ts";
import {
	getOverview,
	type OnboardingMode,
	type OverviewHospital,
	type PaymentIntent,
} from "#/lib/api/onboarding.ts";
import { apiErrorMessage, toastApiError } from "#/lib/api-error-message.ts";
import { useSession } from "#/lib/auth/use-session.ts";

const OVERVIEW_KEY = ["onboarding", "overview"] as const;

type Mode = "dashboard" | "conversation" | "payment" | "publish";

/**
 * 온보딩 진입점 — **대시보드 오케스트레이터** (문서 onboarding-frontend-guide §3).
 * 진입 시 항상 대시보드(내 병원 카드 목록)를 먼저 보여주고, 카드/버튼에서 하위 흐름을 시작한다.
 *
 * 내부 모드 상태머신: dashboard | conversation | payment | publish.
 * overview는 TanStack Query(queryKey ["onboarding","overview"])로 조회하고,
 * 액션(삭제/게시/결제 진입) 후 invalidateQueries로 새로고침한다.
 */
export function OnboardingPage() {
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
	// conversation 모드로 진입할 때 시작할 온보딩 모드(병원/프로필) — startSession에 전달.
	// 신규 대화형은 항상 병원, draft "이어서 작성"은 그 draft의 모드를 따른다.
	const [conversationMode, setConversationMode] =
		useState<OnboardingMode>("hospital");
	// payment 모드: 어떤 병원의 결제 페이로드를 쓸지.
	const [paymentTarget, setPaymentTarget] = useState<PaymentIntent | null>(
		null,
	);
	// publish 모드: 게시할 병원.
	const [publishTarget, setPublishTarget] = useState<OverviewHospital | null>(
		null,
	);

	const {
		data: overview,
		isLoading,
		isError,
		error,
		refetch,
	} = useQuery({
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
			<AppShell userName={userName} maxWidth="1280px" innerMaxWidth="720px">
				<OnboardingConversation
					mode={conversationMode}
					onBackToDashboard={backToDashboard}
				/>
			</AppShell>
		);
	}

	// ── payment 모드 ────────────────────────────────────────────────
	if (mode === "payment" && paymentTarget) {
		return (
			<AppShell userName={userName} maxWidth="1280px" innerMaxWidth="720px">
				<div className="flex flex-col gap-4">
					<BackToDashboardLink onClick={backToDashboard} />
					<CommitComplete
						result={{ payment: paymentTarget }}
						onComplete={backToDashboard}
					/>
				</div>
			</AppShell>
		);
	}

	// ── publish 모드 ────────────────────────────────────────────────
	if (mode === "publish" && publishTarget) {
		return (
			<AppShell userName={userName} maxWidth="1280px" innerMaxWidth="720px">
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
		<AppShell userName={userName} maxWidth="1280px" innerMaxWidth="720px">
			{isLoading ? (
				<div className="flex flex-col items-center gap-4 py-24 text-center">
					<Loader2 className="size-7 animate-spin text-brand" />
					<p className="text-base text-body">불러오는 중이에요…</p>
				</div>
			) : isError ? (
				<SectionCard className="flex flex-col items-center gap-5 text-center">
					<p className="text-lg font-semibold text-ink">
						대시보드를 불러오지 못했습니다.
					</p>
					<p className="text-sm text-body">
						{error instanceof ApiError
							? apiErrorMessage(error)
							: "네트워크 상태를 확인한 뒤 다시 시도해 주세요."}
					</p>
					<Button variant="brand" size="2xl" onClick={() => refetch()}>
						다시 시도
					</Button>
					<KakaoSupportLink variant="button" size="xl" />
				</SectionCard>
			) : overview ? (
				<OnboardingDashboard
					overview={overview}
					onStartConversation={(conversationStartMode) => {
						// 대화형 "새로 만들기" — 병원/프로필 모두 지원(대화 엔진은 mode로 분기).
						setConversationMode(conversationStartMode);
						setMode("conversation");
					}}
					onContinueDraft={() => {
						// draft를 이어서 작성 — 그 draft의 모드로 startOrGet.
						setConversationMode(
							overview.draft?.mode === "profile" ? "profile" : "hospital",
						);
						setMode("conversation");
					}}
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
	const queryClient = useQueryClient();

	// 병원 slug는 기존 hospital.slug prefill 유지.
	const [hospitalSlug, setHospitalSlugValue] = useState(
		hospital.slug?.trim() ?? "",
	);
	const [touched, setTouched] = useState(false);

	const publishMutation = useMutation({
		mutationFn: async () => {
			if (hospital.hospital_no == null) {
				throw new Error("병원 정보를 찾을 수 없습니다.");
			}
			// 발행은 병원 slug + 활성 구독만 필요. 프로필 slug는 프로필 전용 흐름에서만 설정한다.
			await setHospitalSlug(hospital.hospital_no, hospitalSlug.trim());
			await publishHospital(hospital.hospital_no);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: OVERVIEW_KEY });
			onPublished();
		},
		onError: (err) => toastApiError(err),
	});

	const title = hospital.name?.trim() ? hospital.name : "병원";

	const hospitalValid = isSlugValid(hospitalSlug.trim());
	const canSubmit = hospitalValid && !publishMutation.isPending;

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!canSubmit) return;
		publishMutation.mutate();
	}

	return (
		<SectionCard className="flex flex-col gap-6">
			<div className="flex flex-col gap-2">
				<SectionTitle>병원 홈페이지 공개</SectionTitle>
				<p className="text-[15px] leading-7 text-body-soft">
					<span className="font-semibold text-ink">{title}</span> 홈페이지를
					공개합니다. 방문자에게 보일 공개 주소를 정해 주세요.
				</p>
			</div>

			<form onSubmit={handleSubmit} className="flex flex-col gap-4">
				<SlugField
					label="병원 공개 주소"
					domain=".kmaclinic.com"
					value={hospitalSlug}
					onChange={(v) => {
						setHospitalSlugValue(v);
						setTouched(true);
					}}
					placeholder="예: mychungdam"
					disabled={publishMutation.isPending}
					invalid={touched && hospitalSlug.trim().length > 0 && !hospitalValid}
					description="병원 홈페이지가 이 주소로 공개됩니다."
				/>

				<InfoCallout tone="warning">
					<p className="text-sm">
						공개 주소는 한 번 정하면 바꿀 수 없어요. 공개하려면 활성
						구독(결제)이 필요합니다.
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
					공개하기
				</Button>
			</form>
		</SectionCard>
	);
}
