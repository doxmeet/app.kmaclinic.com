import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { CheckCircle2, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { InfoCallout } from "#/components/common/info-callout.tsx";
import { KakaoSupportLink } from "#/components/common/kakao-support-link.tsx";
import {
	SectionCard,
	SectionTitle,
} from "#/components/common/section-card.tsx";
import { AppShell } from "#/components/layout/app-shell.tsx";
import { Button } from "#/components/ui/button.tsx";
import { ApiError } from "#/lib/api";
import {
	type BillingCycle,
	createSubscription,
	getHospitalSubscription,
	issueBilling,
	isTrialing,
} from "#/lib/api/billing.ts";
import { apiErrorMessage } from "#/lib/api-error-message.ts";
import { useSession } from "#/lib/auth/use-session.ts";

// 재시도가 무의미한(카드부터 다시 등록해야 하는) 에러 — authKey는 1회용.
const RE_REGISTER_CODES = new Set([
	"ERROR_402_TOSS_PAYMENT_FAILED",
	"ERROR_400_BILLING_KEY_REQUIRED",
]);

// 1회용 authKey 콜백을 이미 성공 처리했는지 세션에 기록한다(뒤로가기/새로고침 재진입 대비).
// authKey 단위로 저장 — 같은 콜백 URL로 다시 들어오면 결제를 재시도하지 않고 완료 화면을 보여준다.
const PROCESSED_PREFIX = "billing:callback:done:";

function readProcessed(authKey: string): { trial: boolean } | null {
	try {
		const raw = sessionStorage.getItem(PROCESSED_PREFIX + authKey);
		if (!raw) return null;
		const parsed = JSON.parse(raw) as { trial?: boolean };
		return { trial: parsed.trial === true };
	} catch {
		return null;
	}
}

function markProcessed(authKey: string, trial: boolean) {
	try {
		sessionStorage.setItem(
			PROCESSED_PREFIX + authKey,
			JSON.stringify({ trial }),
		);
	} catch {
		// sessionStorage 사용 불가(시크릿 모드 등) — 무시. 서버 상태 확인으로 폴백된다.
	}
}

export function BillingCallbackPage() {
	const {
		authKey,
		customerKey,
		hospital_no,
		marketing_consent,
		billing_cycle,
		mode,
		fail,
		code,
		message,
	} = useSearch({ from: "/billing/callback" });
	const navigate = useNavigate();

	// 결제 실패 콜백 — toss가 failUrl 에 code/message 를 붙여 돌려보낸다.
	if (fail || code || message) {
		return (
			<PaymentFailed
				code={code ?? null}
				message={message}
				onRetry={() => {
					// 카드 변경/재구독은 해당 병원의 구독 관리 화면으로, 최초 결제는 온보딩으로.
					if (
						(mode === "card" || mode === "resubscribe") &&
						hospital_no != null
					) {
						navigate({
							to: "/subscription/$hospitalNo",
							params: { hospitalNo: String(hospital_no) },
						});
					} else {
						navigate({ to: "/onboarding" });
					}
				}}
			/>
		);
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
						카드 등록 정보가 정상적으로 전달되지 않았습니다. 작성 화면에서
						결제를 다시 시도해 주세요.
					</p>
					<Button
						variant="brand"
						size="2xl"
						onClick={() => navigate({ to: "/onboarding" })}
					>
						작성 화면으로 돌아가기
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
			billingCycle={billing_cycle}
			mode={mode}
		/>
	);
}

type BillingMode = "subscribe" | "card" | "resubscribe";

function BillingFlow({
	authKey,
	customerKey,
	hospitalNo,
	marketingConsent,
	billingCycle,
	mode,
}: {
	authKey: string;
	customerKey: string;
	hospitalNo: number;
	marketingConsent: boolean;
	billingCycle?: BillingCycle;
	mode: BillingMode;
}) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	// toss 리다이렉트는 전체 새로고침이라 메모리의 액세스 토큰이 사라진다.
	// useSession이 refresh 토큰으로 액세스 토큰을 재발급(bootstrap)하므로 그 준비가 끝난 뒤 호출한다.
	const { isLoading: sessionLoading, isAuthenticated } = useSession();
	const running = useRef(false);
	// 빌링키 발급(①) 성공 여부. authKey는 1회용이라, ②에서만 실패한 재시도는 ①을 건너뛴다.
	const issuedRef = useRef(false);
	// 이 authKey 콜백을 이전에 이미 성공 처리했는지(뒤로가기/새로고침 재진입). 마운트 시 1회 조회.
	const [processed] = useState(() => readProcessed(authKey));
	const alreadyProcessed = processed !== null;
	// refresh 토큰까지 만료(비로그인)면 재로그인 안내 — 세션 상태에서 파생(별도 state 없음).
	const needsLogin = !sessionLoading && !isAuthenticated;

	// 카드 변경(mode="card")은 빌링키만 재발급한다(저장된 활성/연체 구독에 백엔드가 자동 재연결 — 문서 §9.5).
	const cardOnly = mode === "card";
	// 카드 변경/재구독 실패·완료 후 돌아갈 곳은 해당 병원의 구독 관리 화면.
	const backToManage = mode === "card" || mode === "resubscribe";

	// 결제·구독·빌링키 변경 후 관련 캐시를 무효화해 최신 상태를 반영한다.
	const invalidateBilling = () => {
		queryClient.invalidateQueries({ queryKey: ["account", "me"] });
		queryClient.invalidateQueries({
			queryKey: ["subscription", "hospital", hospitalNo],
		});
		queryClient.invalidateQueries({ queryKey: ["billing", "list"] });
	};

	// 뒤로가기/새로고침으로 이미 처리된 콜백에 다시 들어오면 issueBilling이 1회용 authKey로
	// 실패한다. 이때 서버 구독 상태를 확인해 "이미 완료된 결제"면 성공으로 간주한다.
	// (카드 변경은 서버 상태만으로 판별 불가 → 세션 마커로만 처리하므로 여기선 null.)
	const detectAlreadyComplete = async () => {
		if (cardOnly) return null;
		try {
			const { subscription } = await getHospitalSubscription(hospitalNo);
			if (subscription?.status === "active") {
				return {
					subscription,
					payment: null,
					trial: isTrialing(subscription),
				};
			}
		} catch {
			// 상태 조회 실패 시엔 원래 결제 에러를 그대로 노출한다.
		}
		return null;
	};

	// onSuccess/onError에서 invalidateBilling()로 캐시를 무효화한다(헬퍼라 정적분석이 못 따라감). 오탐 억제.
	// react-doctor-disable-next-line query-mutation-missing-invalidation
	const mutation = useMutation({
		mutationFn: async () => {
			// ① 빌링키 발급(아직 안 했을 때만 — authKey는 1회용).
			if (!issuedRef.current) {
				try {
					await issueBilling({ authKey, customerKey });
				} catch (err) {
					// authKey가 이미 소진됐다면(재진입) 이미 완료된 결제인지 확인 후 성공 처리.
					const completed = await detectAlreadyComplete();
					if (completed) return completed;
					throw err;
				}
				issuedRef.current = true;
			}
			// ② 카드 변경이면 빌링키만 교체(구독 생성 없음).
			if (cardOnly) return null;
			// ③ 저장된 빌링키로 구독 생성/재구독. 최초면 첫 달 무료(trial), 재구독이면 즉시 청구.
			return createSubscription(hospitalNo, {
				marketing_consent: marketingConsent,
				...(billingCycle ? { billing_cycle: billingCycle } : {}),
			});
		},
		onSuccess: (data) => {
			// 1회용 authKey 재진입 대비 — 처리 완료(첫 달 무료 여부 포함)를 세션에 기록한다.
			markProcessed(authKey, data?.trial ?? false);
			invalidateBilling();
		},
		onError: (err) => {
			// 이미 활성 구독(409)이면 결제는 끝난 상태 → 완료로 기록(재진입 시 성공 화면).
			if (
				err instanceof ApiError &&
				err.errorCode === "ERROR_409_SUBSCRIPTION_ALREADY_ACTIVE"
			) {
				markProcessed(authKey, false);
				invalidateBilling();
			}
		},
	});
	const { mutate } = mutation;

	// 성공/실패 화면 분기는 별도 state 없이 mutation 상태에서 파생한다.
	// 이미 활성 구독(409)이면 결제는 끝난 상태 → 성공으로 간주(게시 단계로).
	const mutationErrorCode =
		mutation.error instanceof ApiError ? mutation.error.errorCode : null;
	const alreadyActive =
		mutationErrorCode === "ERROR_409_SUBSCRIPTION_ALREADY_ACTIVE";
	// alreadyProcessed: 이전 방문에서 이미 성공 처리된 콜백(뒤로가기/새로고침 재진입) → 완료로 간주.
	const done = mutation.isSuccess || alreadyActive || alreadyProcessed;
	// 최초 구독이면 첫 달 무료(trial). 성공 화면 카피를 분기한다(가이드 §4).
	// 재진입(alreadyProcessed)이면 mutation 데이터가 없으므로 세션에 저장해 둔 값을 쓴다.
	const trial = mutation.data?.trial ?? processed?.trial ?? false;
	const error =
		mutation.isError && !alreadyActive
			? { code: mutationErrorCode, message: apiErrorMessage(mutation.error) }
			: null;

	// 세션 부트스트랩(토큰 재발급)이 끝난 뒤 1회 자동 시작. 그래야 POST에 Bearer 토큰이 실린다.
	// running ref로 StrictMode 이중 실행/재렌더 재실행을 막는다.
	useEffect(() => {
		if (running.current) return;
		// 이미 처리된 콜백 재진입이면 결제를 다시 시도하지 않는다(완료 화면으로 파생).
		if (alreadyProcessed) return;
		// 세션 로딩 중이거나 비로그인이면 자동 시작하지 않는다(비로그인은 needsLogin 화면 파생).
		if (sessionLoading || !isAuthenticated) return;
		running.current = true;
		// mutate는 부모로 데이터를 넘기는 콜백이 아니라 결제 자동 시작 트리거다(toss 전체
		// 새로고침 후 세션 부트스트랩이 끝나야만 호출 가능 → effect가 유일한 자리). 오탐 억제.
		// react-doctor-disable-next-line no-pass-data-to-parent
		mutate();
	}, [sessionLoading, isAuthenticated, mutate, alreadyProcessed]);

	// 이미 완료된 결제(뒤로가기/새로고침 재진입 등)는 로그인 만료보다 우선해 완료 화면을 보여준다.
	if (done)
		return <BillingSuccess mode={mode} hospitalNo={hospitalNo} trial={trial} />;

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

	if (error) {
		return (
			<BillingError
				code={error.code}
				message={error.message}
				pending={mutation.isPending}
				onRetry={() => mutation.mutate()}
				onReRegister={() =>
					backToManage
						? navigate({
								to: "/subscription/$hospitalNo",
								params: { hospitalNo: String(hospitalNo) },
							})
						: navigate({ to: "/onboarding" })
				}
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
					<KakaoSupportLink variant="button" size="2xl" className="w-full" />
				</div>
			</SectionCard>
		</AppShell>
	);
}

function BillingSuccess({
	mode,
	hospitalNo,
	trial = false,
}: {
	mode: BillingMode;
	hospitalNo: number;
	/** 최초 구독이면 첫 달 무료(trial) — subscribe 모드 카피만 분기한다. */
	trial?: boolean;
}) {
	// 카드 변경: 빌링키만 교체됨 → 구독 관리로 복귀.
	if (mode === "card") {
		return (
			<AppShell maxWidth="560px">
				<SectionCard className="flex flex-col items-center gap-6 text-center">
					<div className="flex size-16 items-center justify-center rounded-full bg-success-bg">
						<CheckCircle2 className="size-8 text-success" />
					</div>
					<div className="flex flex-col gap-2">
						<h1 className="text-2xl font-bold text-ink">
							결제 카드를 변경했어요
						</h1>
						<p className="text-[15px] leading-7 text-body-soft">
							새 카드가 등록되어 다음 정기 결제부터 적용됩니다.
						</p>
					</div>
					<Button
						nativeButton={false}
						render={
							<Link
								to="/subscription/$hospitalNo"
								params={{ hospitalNo: String(hospitalNo) }}
							/>
						}
						variant="brand"
						size="cta"
						className="w-full"
					>
						구독 관리로 돌아가기
					</Button>
				</SectionCard>
			</AppShell>
		);
	}

	// 재구독: 구독이 다시 활성화됨 → 구독 관리로 복귀.
	if (mode === "resubscribe") {
		return (
			<AppShell maxWidth="560px">
				<SectionCard className="flex flex-col items-center gap-6 text-center">
					<div className="flex size-16 items-center justify-center rounded-full bg-success-bg">
						<CheckCircle2 className="size-8 text-success" />
					</div>
					<div className="flex flex-col gap-2">
						<h1 className="text-2xl font-bold text-ink">
							재구독이 완료됐어요!
						</h1>
						<p className="text-[15px] leading-7 text-body-soft">
							정기 결제가 다시 시작됐습니다. 병원이 비공개 상태라면 구독
							관리에서 다시 공개할 수 있어요.
						</p>
					</div>
					<Button
						nativeButton={false}
						render={
							<Link
								to="/subscription/$hospitalNo"
								params={{ hospitalNo: String(hospitalNo) }}
							/>
						}
						variant="brand"
						size="cta"
						className="w-full"
					>
						구독 관리로 돌아가기
					</Button>
				</SectionCard>
			</AppShell>
		);
	}

	// 최초 구독(subscribe): 게시 단계로 유도. 첫 달 무료(trial)면 카피를 분기한다.
	return (
		<AppShell maxWidth="560px">
			<SectionCard className="flex flex-col items-center gap-6 text-center">
				<div className="flex size-16 items-center justify-center rounded-full bg-success-bg">
					<CheckCircle2 className="size-8 text-success" />
				</div>
				<div className="flex flex-col gap-2">
					<h1 className="text-2xl font-bold text-ink">
						{trial ? "첫 달 무료로 시작했어요!" : "결제가 완료됐어요!"}
					</h1>
					<p className="text-[15px] leading-7 text-body-soft">
						{trial
							? "카드가 등록됐고 첫 달은 무료예요. 무료 기간이 끝나면 자동으로 첫 결제가 진행됩니다."
							: "정기 결제 카드 등록과 구독이 완료됐습니다."}
						<br />
						이제 <span className="font-semibold text-ink">공개</span>하면 병원
						홈페이지가 공개됩니다.
					</p>
				</div>
				<InfoCallout tone="info" className="w-full text-left">
					<p className="text-sm">
						대시보드에서 이 병원의{" "}
						<span className="font-semibold text-ink">공개하기</span> 버튼으로
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
					대시보드로 가서 공개하기
				</Button>
			</SectionCard>
		</AppShell>
	);
}

function PaymentFailed({
	code,
	message,
	onRetry,
}: {
	code?: string | null;
	message?: string;
	onRetry: () => void;
}) {
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
					{message ? (
						message
					) : (
						<>
							카드 등록 또는 결제가 취소되었습니다.
							<br />
							카드 정보를 확인한 뒤 다시 시도해 주세요.
						</>
					)}
				</p>

				{code ? (
					<p className="text-xs text-body-soft/70">오류 코드: {code}</p>
				) : null}

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
