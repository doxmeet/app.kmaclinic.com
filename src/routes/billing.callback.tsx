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
import { ApiError } from "#/lib/api";
import { createSubscription, issueBilling } from "#/lib/api/billing.ts";
import { apiErrorMessage } from "#/lib/api-error-message.ts";
import { useSession } from "#/lib/auth/use-session.ts";

/**
 * 결제(Toss) 콜백 — 2단계 (문서 §9).
 * Toss requestBillingAuth 성공 시 successUrl 로 리다이렉트되며 authKey/customerKey 가 쿼리로 전달된다.
 *   ① POST /billing/issue { authKey, customerKey }  (authKey→빌링키 발급·저장, authKey는 1회용)
 *   ② POST /subscription { hospital_no, marketing_consent }  (저장된 빌링키로 즉시 1개월 청구)
 *
 * 재시도 규칙: authKey는 1회용 → ①이 성공한 뒤(빌링키 저장됨) ②에서만 실패했다면 재시도는 ②만 다시 한다.
 * ①(빌링키 발급)에서 실패(카드 거절 등)면 새 authKey가 필요하므로 카드부터 다시 등록.
 * 구독 성공 시 병원은 ready_to_publish → **게시(slug+publish)는 대시보드에서** 별도. fail=1 이면 실패 안내.
 */

export const Route = createFileRoute("/billing/callback")({
	component: BillingCallbackPage,
	validateSearch: (search: Record<string, unknown>) => ({
		authKey: typeof search.authKey === "string" ? search.authKey : undefined,
		// 우리는 customerKey를 예약 안 된 이름 `ck`로 넘긴다(Toss가 customerKey는 떼어냄).
		// 혹시 Toss가 customerKey를 붙여주는 환경이면 그것도 fallback으로 받는다.
		customerKey:
			typeof search.ck === "string" && search.ck
				? search.ck
				: typeof search.customerKey === "string"
					? search.customerKey
					: undefined,
		hospital_no: toNumber(search.hospital_no),
		marketing_consent:
			search.marketing_consent === "1" || search.marketing_consent === 1
				? true
				: undefined,
		fail: search.fail === "1" || search.fail === 1 ? true : undefined,
	}),
});

// 재시도가 무의미한(카드부터 다시 등록해야 하는) 에러 — authKey는 1회용.
const RE_REGISTER_CODES = new Set([
	"ERROR_402_TOSS_PAYMENT_FAILED",
	"ERROR_400_BILLING_KEY_REQUIRED",
]);

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
	const navigate = useNavigate();
	// 토스 리다이렉트는 전체 새로고침이라 메모리의 액세스 토큰이 사라진다.
	// useSession이 refresh 토큰으로 액세스 토큰을 재발급(bootstrap)하므로 그 준비가 끝난 뒤 호출한다.
	const { isLoading: sessionLoading, isAuthenticated } = useSession();
	const running = useRef(false);
	// 빌링키 발급(①) 성공 여부. authKey는 1회용이라, ②에서만 실패한 재시도는 ①을 건너뛴다.
	const issuedRef = useRef(false);
	const [done, setDone] = useState(false);
	const [needsLogin, setNeedsLogin] = useState(false);
	const [error, setError] = useState<{
		code: string | null;
		message: string;
	} | null>(null);

	const mutation = useMutation({
		mutationFn: async () => {
			// ① 빌링키 발급(아직 안 했을 때만 — authKey는 1회용).
			if (!issuedRef.current) {
				await issueBilling({ authKey, customerKey });
				issuedRef.current = true;
			}
			// ② 저장된 빌링키로 구독 생성 + 즉시 첫 결제.
			await createSubscription(hospitalNo, {
				marketing_consent: marketingConsent,
			});
		},
		onSuccess: () => {
			setError(null);
			setDone(true);
		},
		onError: (err) => {
			const code = err instanceof ApiError ? err.errorCode : null;
			// 이미 활성 구독이면 결제는 끝난 상태 → 성공으로 간주(게시 단계로).
			if (code === "ERROR_409_SUBSCRIPTION_ALREADY_ACTIVE") {
				setError(null);
				setDone(true);
				return;
			}
			setError({ code, message: apiErrorMessage(err) });
		},
	});

	// 세션 부트스트랩(토큰 재발급)이 끝난 뒤 1회 자동 시작. 그래야 POST에 Bearer 토큰이 실린다.
	// running ref로 StrictMode 이중 실행/재렌더 재실행을 막는다.
	// biome-ignore lint/correctness/useExhaustiveDependencies: mutation은 stable, running ref로 1회 보장.
	useEffect(() => {
		if (running.current) return;
		if (sessionLoading) return; // 액세스 토큰 재발급 대기
		running.current = true;
		if (!isAuthenticated) {
			setNeedsLogin(true); // refresh 토큰까지 만료 → 재로그인 필요
			return;
		}
		mutation.mutate();
	}, [sessionLoading, isAuthenticated]);

	if (needsLogin) {
		return (
			<AppShell maxWidth="560px">
				<SectionCard className="flex flex-col items-center gap-5 text-center">
					<p className="text-lg font-semibold text-ink">로그인이 만료됐어요</p>
					<p className="text-sm text-body">
						다시 로그인한 뒤 결제를 이어서 진행해 주세요. 등록한 카드가 있다면
						대시보드의 결제하기에서 한 번에 이어집니다.
					</p>
					<Button
						variant="brand"
						size="2xl"
						onClick={() => navigate({ to: "/login" })}
					>
						로그인하러 가기
					</Button>
				</SectionCard>
			</AppShell>
		);
	}

	if (done) return <BillingSuccess />;

	if (error) {
		return (
			<BillingError
				code={error.code}
				message={error.message}
				pending={mutation.isPending}
				onRetry={() => mutation.mutate()}
				onReRegister={() => navigate({ to: "/onboarding" })}
			/>
		);
	}

	return (
		<AppShell maxWidth="560px">
			<SectionCard className="flex flex-col items-center gap-5 py-10 text-center">
				<Loader2 className="size-8 animate-spin text-brand" />
				<div className="flex flex-col gap-1.5">
					<SectionTitle>결제 처리 중</SectionTitle>
					<p className="text-sm text-body-soft">
						카드 등록과 결제를 한 번에 처리하고 있어요. 창을 닫지 말고 잠시만
						기다려 주세요.
					</p>
				</div>
			</SectionCard>
		</AppShell>
	);
}

function BillingError({
	code,
	message,
	pending,
	onRetry,
	onReRegister,
}: {
	code: string | null;
	message: string;
	pending: boolean;
	onRetry: () => void;
	onReRegister: () => void;
}) {
	const mustReRegister = code != null && RE_REGISTER_CODES.has(code);
	const forbidden = code === "ERROR_403_FORBIDDEN";

	return (
		<AppShell maxWidth="560px">
			<SectionCard className="flex flex-col items-center gap-6 text-center">
				<div className="flex size-16 items-center justify-center rounded-full bg-danger-bg">
					<X className="size-8 text-danger-strong" strokeWidth={2.5} />
				</div>
				<div className="flex flex-col gap-2">
					<h1 className="text-2xl font-bold text-ink">
						결제를 완료하지 못했어요
					</h1>
					<p className="text-[15px] leading-7 text-body-soft">{message}</p>
				</div>

				<div className="flex w-full flex-col gap-3">
					{forbidden ? (
						<Button
							variant="brand"
							size="cta"
							className="w-full"
							onClick={onReRegister}
						>
							대시보드로 돌아가기
						</Button>
					) : mustReRegister ? (
						<Button
							variant="brand"
							size="cta"
							className="w-full"
							onClick={onReRegister}
						>
							카드 다시 등록하기
						</Button>
					) : (
						<>
							<Button
								variant="brand"
								size="cta"
								className="w-full"
								disabled={pending}
								onClick={onRetry}
							>
								{pending ? <Loader2 className="size-5 animate-spin" /> : null}
								다시 시도
							</Button>
							<Button
								variant="neutral-outline"
								size="2xl"
								className="w-full"
								disabled={pending}
								onClick={onReRegister}
							>
								카드 다시 등록하기
							</Button>
						</>
					)}
				</div>
			</SectionCard>
		</AppShell>
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
						정기 결제 카드 등록과 구독이 완료됐습니다.
						<br />
						이제 <span className="font-semibold text-ink">게시</span>하면 병원
						홈페이지가 공개됩니다.
					</p>
				</div>
				<InfoCallout tone="info" className="w-full text-left">
					<p className="text-sm">
						대시보드에서 이 병원의{" "}
						<span className="font-semibold text-ink">게시하기</span> 버튼으로
						공개 주소를 정하고 공개할 수 있어요.
					</p>
				</InfoCallout>
				<Button
					nativeButton={false}
					render={<Link to="/onboarding" />}
					variant="brand"
					size="cta"
					className="w-full"
				>
					대시보드로 가서 게시하기
				</Button>
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
