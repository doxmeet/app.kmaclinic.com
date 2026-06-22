import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { InfoCallout } from "#/components/common/info-callout.tsx";
import {
	SectionCard,
	SectionTitle,
} from "#/components/common/section-card.tsx";
import { AppShell } from "#/components/layout/app-shell.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
	createSubscription,
	issueBilling,
	publishHospital,
} from "#/lib/api/billing.ts";
import { toastApiError } from "#/lib/api-error-message.ts";

/**
 * 결제(Toss) 콜백 — 문서 §3.
 * Toss requestBillingAuth 성공 시 successUrl 로 리다이렉트되며 authKey/customerKey 가 쿼리로 전달된다.
 * 여기서 빌링키 발급 → 구독 생성 → 병원 게시(publish) 를 순차 호출한다.
 *
 *   issueBilling({authKey, customerKey}) → createSubscription(hospital_no) → publishHospital(hospital_no)
 *
 * 단계별 실패는 toastApiError + 재시도(실패한 단계부터 다시 시작).
 * fail=1 이면 결제 실패 안내.
 */

export const Route = createFileRoute("/billing/callback")({
	component: BillingCallbackPage,
	validateSearch: (search: Record<string, unknown>) => ({
		authKey: typeof search.authKey === "string" ? search.authKey : undefined,
		customerKey:
			typeof search.customerKey === "string" ? search.customerKey : undefined,
		hospital_no: toNumber(search.hospital_no),
		marketing_consent:
			search.marketing_consent === "1" || search.marketing_consent === 1
				? true
				: undefined,
		fail: search.fail === "1" || search.fail === 1 ? true : undefined,
	}),
});

type Step = "issue" | "subscription" | "publish" | "done";

const STEP_LABELS: Record<Step, string> = {
	issue: "카드(빌링키) 등록",
	subscription: "구독 생성 및 첫 결제",
	publish: "병원 홈페이지 공개",
	done: "완료",
};

const STEP_ORDER: Step[] = ["issue", "subscription", "publish", "done"];

function BillingCallbackPage() {
	const { authKey, customerKey, hospital_no, marketing_consent, fail } =
		Route.useSearch();
	const navigate = useNavigate();

	// 결제 실패 콜백
	if (fail) {
		return <PaymentFailed onRetry={() => navigate({ to: "/onboarding" })} />;
	}

	// 필수 파라미터 누락
	if (!authKey || !customerKey || hospital_no == null) {
		return (
			<AppShell maxWidth="560px">
				<SectionCard className="flex flex-col items-center gap-5 text-center">
					<p className="text-lg font-semibold text-ink">
						결제 정보가 올바르지 않습니다.
					</p>
					<p className="text-sm text-body">
						카드 등록 정보가 정상적으로 전달되지 않았습니다. 온보딩에서 결제를
						다시 시도해 주세요.
					</p>
					<Button
						variant="brand"
						size="2xl"
						onClick={() => navigate({ to: "/onboarding" })}
					>
						온보딩으로 돌아가기
					</Button>
				</SectionCard>
			</AppShell>
		);
	}

	return (
		<BillingFlow
			authKey={authKey}
			customerKey={customerKey}
			hospitalNo={hospital_no}
			marketingConsent={marketing_consent === true}
		/>
	);
}

function BillingFlow({
	authKey,
	customerKey,
	hospitalNo,
	marketingConsent,
}: {
	authKey: string;
	customerKey: string;
	hospitalNo: number;
	marketingConsent: boolean;
}) {
	// 현재 진행 중인 단계(완료되면 다음 단계로). "done" 이면 성공.
	const [step, setStep] = useState<Step>("issue");
	const [failedStep, setFailedStep] = useState<Step | null>(null);
	const running = useRef(false);

	const mutation = useMutation({
		mutationFn: async (from: Step) => {
			// 실패한 단계부터 순차 재개. 이미 통과한 단계는 멱등 가정 하에 다시 호출.
			if (from === "issue") {
				await issueBilling({ authKey, customerKey });
				setStep("subscription");
			}
			await createSubscription(hospitalNo, {
				marketing_consent: marketingConsent,
			});
			setStep("publish");
			await publishHospital(hospitalNo);
			setStep("done");
		},
		onError: (err, from) => {
			setFailedStep(from);
			toastApiError(err);
		},
	});

	// 진입 시 1회 자동 시작. running ref로 StrictMode 이중 실행/재렌더 재실행을 막는다.
	// biome-ignore lint/correctness/useExhaustiveDependencies: mount 시 1회만 실행해야 하며 running ref로 보장한다.
	useEffect(() => {
		if (running.current) return;
		running.current = true;
		mutation.mutate("issue");
	}, []);

	function handleRetry() {
		const from = failedStep ?? "issue";
		setFailedStep(null);
		setStep(from);
		mutation.mutate(from);
	}

	if (step === "done") {
		return <BillingSuccess />;
	}

	const currentIndex = STEP_ORDER.indexOf(step);

	return (
		<AppShell maxWidth="560px">
			<SectionCard className="flex flex-col gap-6">
				<SectionTitle>결제 처리 중</SectionTitle>

				<ol className="flex flex-col gap-3">
					{STEP_ORDER.filter((s) => s !== "done").map((s, idx) => {
						const done = idx < currentIndex;
						const active = s === step && !failedStep;
						const isFailed = failedStep === s;
						return (
							<li
								key={s}
								className="flex items-center gap-3 rounded-xl border border-line bg-app-bg px-4 py-3"
							>
								<StepIcon done={done} active={active} failed={isFailed} />
								<span
									className={
										done || active
											? "text-sm font-medium text-ink"
											: "text-sm text-body-soft"
									}
								>
									{STEP_LABELS[s]}
								</span>
							</li>
						);
					})}
				</ol>

				{failedStep ? (
					<>
						<InfoCallout tone="danger">
							<p className="text-sm">
								<span className="font-semibold text-ink">
									{STEP_LABELS[failedStep]}
								</span>{" "}
								단계에서 문제가 발생했습니다. 다시 시도해 주세요.
							</p>
						</InfoCallout>
						<Button
							variant="brand"
							size="2xl"
							className="w-full"
							disabled={mutation.isPending}
							onClick={handleRetry}
						>
							{mutation.isPending ? (
								<Loader2 className="size-5 animate-spin" />
							) : null}
							다시 시도
						</Button>
					</>
				) : (
					<p className="text-center text-sm text-muted-fg">
						결제와 공개 처리를 진행하고 있어요. 창을 닫지 말고 잠시만 기다려
						주세요.
					</p>
				)}
			</SectionCard>
		</AppShell>
	);
}

function StepIcon({
	done,
	active,
	failed,
}: {
	done: boolean;
	active: boolean;
	failed: boolean;
}) {
	if (failed) {
		return (
			<span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-danger-bg">
				<X className="size-3.5 text-danger-strong" strokeWidth={2.5} />
			</span>
		);
	}
	if (done) {
		return (
			<span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success-bg">
				<CheckCircle2 className="size-4 text-success" />
			</span>
		);
	}
	if (active) {
		return (
			<span className="flex size-6 shrink-0 items-center justify-center">
				<Loader2 className="size-4 animate-spin text-brand" />
			</span>
		);
	}
	return (
		<span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-line-strong" />
	);
}

function BillingSuccess() {
	return (
		<AppShell maxWidth="560px">
			<SectionCard className="flex flex-col items-center gap-6 text-center">
				<div className="flex size-16 items-center justify-center rounded-full bg-success-bg">
					<CheckCircle2 className="size-8 text-success" />
				</div>
				<div className="flex flex-col gap-2">
					<h1 className="text-2xl font-bold text-ink">결제가 완료됐어요!</h1>
					<p className="text-[15px] leading-7 text-body-soft">
						정기 결제 카드 등록과 구독이 완료되어
						<br />
						병원 홈페이지가 공개됐습니다.
					</p>
				</div>
				<InfoCallout tone="success" className="w-full text-left">
					<p className="text-sm">
						이제{" "}
						<span className="font-semibold text-ink">내 병원 홈페이지</span>
						에서 소개·진료안내·게시판·문의를 관리할 수 있어요. 공개된 주소는
						병원 관리 화면에서 확인할 수 있습니다.
					</p>
				</InfoCallout>
				<div className="flex w-full flex-col gap-3 sm:flex-row">
					<Button
						nativeButton={false}
						render={<Link to="/doctor/preview" />}
						variant="brand"
						size="xl"
						className="w-full"
					>
						공개 프로필 예시 보기
					</Button>
					<Button
						nativeButton={false}
						render={<Link to="/" />}
						variant="neutral-outline"
						size="xl"
						className="w-full"
					>
						홈으로
					</Button>
				</div>
			</SectionCard>
		</AppShell>
	);
}

function PaymentFailed({ onRetry }: { onRetry: () => void }) {
	return (
		<div className="flex min-h-screen items-center justify-center bg-black/45 px-4 py-10">
			<div className="flex w-full max-w-[400px] flex-col items-center gap-6 rounded-3xl bg-surface p-8 shadow-[0_25px_50px_0_rgba(0,0,0,0.25)]">
				<div className="flex size-16 items-center justify-center rounded-full bg-danger-bg">
					<div className="flex size-10 items-center justify-center rounded-full bg-danger-strong">
						<X className="size-5 text-white" strokeWidth={2.5} />
					</div>
				</div>

				<h1 className="text-2xl font-bold text-ink">결제 실패</h1>

				<p className="text-center text-[17px] leading-7 text-body-soft">
					카드 등록 또는 결제가 취소되었습니다.
					<br />
					카드 정보를 확인한 뒤 다시 시도해 주세요.
				</p>

				<div className="flex w-full flex-col gap-3">
					<Button
						variant="brand"
						size="2xl"
						className="w-full"
						onClick={onRetry}
					>
						다시 시도
					</Button>
				</div>
			</div>
		</div>
	);
}

function toNumber(value: unknown): number | undefined {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim() !== "") {
		const n = Number(value);
		if (Number.isFinite(n)) return n;
	}
	return undefined;
}
