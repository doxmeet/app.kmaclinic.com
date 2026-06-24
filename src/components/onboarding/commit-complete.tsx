import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CheckCircle2, CreditCard, Loader2, PartyPopper } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CycleSelect } from "#/components/billing/cycle-select.tsx";
import { InfoCallout } from "#/components/common/info-callout.tsx";
import {
	SectionCard,
	SectionTitle,
} from "#/components/common/section-card.tsx";
import { isSlugValid } from "#/components/onboarding/slug.ts";
import { SlugField } from "#/components/onboarding/slug-field.tsx";
import { Button } from "#/components/ui/button.tsx";
import { ApiError } from "#/lib/api";
import {
	type BillingCycle,
	type BillingKey,
	createSubscription,
	listBilling,
	setProfileSlug,
} from "#/lib/api/billing.ts";
import type { CommitResult } from "#/lib/api/onboarding.ts";
import { toastApiError } from "#/lib/api-error-message.ts";
import { useSession } from "#/lib/auth/use-session.ts";
import { startCardBillingAuth } from "#/lib/toss.ts";

/**
 * 온보딩/직접입력 commit 결과 화면.
 * - 병원(payment.required) → toss 카드 등록 결제 단계
 * - 프로필만 → 무료 완료 축하
 * 대화형 온보딩(`/onboarding`)과 일괄 입력(`/onboarding/direct`)이 공유한다.
 */
export function CommitComplete({
	result,
	onComplete,
}: {
	result: CommitResult;
	/**
	 * 저장된 카드로 즉시 결제가 완료됐을 때(toss 리다이렉트 없는 경로) 대시보드로 돌아갈 핸들러.
	 * 미제공 시 결제 완료 화면은 `/onboarding`으로 링크 이동한다.
	 */
	onComplete?: () => void;
}) {
	const payment = result.payment;
	const slug = extractSlug(result);

	if (payment?.required === true) {
		return (
			<PaymentStep payment={payment} slug={slug} onComplete={onComplete} />
		);
	}

	return <FreeProfileComplete commitSlug={slug} />;
}

// ─────────────────────────────────────────────────────────────────────
// 무료 프로필 완료 — 공개 주소(slug) 설정(1회) 후 완료 축하
// ─────────────────────────────────────────────────────────────────────

/**
 * 무료 프로필(payment.required !== true) 완료 화면.
 * - profile.slug 미설정: `____.kmadoc.com` 입력 폼 → setProfileSlug → refetch → 완료 화면.
 * - profile.slug 설정됨: 바로 완료 화면(실제 `<slug>.kmadoc.com` 표기).
 * publish 호출 없음(프로필 게시는 kmadoc 별도 도메인 담당).
 */
function FreeProfileComplete({ commitSlug }: { commitSlug: string | null }) {
	const queryClient = useQueryClient();
	const { account, refetch } = useSession();
	const profileSlug = account?.profile?.slug?.trim() || null;
	// commit 결과 slug를 보조로 사용(세션 갱신 전 표시용).
	const settledSlug = profileSlug ?? commitSlug;

	const [slug, setSlug] = useState("");
	const [touched, setTouched] = useState(false);

	const slugMutation = useMutation({
		mutationFn: async (value: string) => {
			await setProfileSlug(value.trim());
		},
		onSuccess: async () => {
			await refetch();
			queryClient.invalidateQueries({ queryKey: ["account", "me"] });
		},
		onError: (err) => toastApiError(err),
	});

	// 아직 slug가 없으면 → 입력 폼.
	if (!settledSlug) {
		const trimmed = slug.trim();
		const valid = isSlugValid(trimmed);
		const canSubmit = valid && !slugMutation.isPending;

		function handleSubmit(e: React.FormEvent) {
			e.preventDefault();
			if (!canSubmit) return;
			slugMutation.mutate(slug);
		}

		return (
			<SectionCard className="flex flex-col gap-6">
				<div className="flex flex-col gap-2">
					<SectionTitle>프로필 공개 주소 정하기</SectionTitle>
					<p className="text-[15px] leading-7 text-body-soft">
						의사 프로필이 무료로 만들어졌어요. 방문자에게 보일 공개 주소를 정해
						주세요.
					</p>
				</div>

				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<SlugField
						label="공개 주소"
						domain=".kmadoc.com"
						value={slug}
						onChange={(v) => {
							setSlug(v);
							setTouched(true);
						}}
						placeholder="예: hong-gildong"
						disabled={slugMutation.isPending}
						invalid={touched && trimmed.length > 0 && !valid}
						description="입력한 주소로 프로필이 공개됩니다."
					/>

					<InfoCallout tone="warning">
						<p className="text-sm">
							공개 주소는 한 번 정하면 바꿀 수 없어요. 신중히 입력해 주세요.
						</p>
					</InfoCallout>

					<Button
						type="submit"
						variant="brand"
						size="cta"
						className="w-full"
						disabled={!canSubmit}
					>
						{slugMutation.isPending ? (
							<Loader2 className="size-5 animate-spin" />
						) : null}
						이 주소로 설정하기
					</Button>
				</form>
			</SectionCard>
		);
	}

	return (
		<SectionCard className="flex flex-col items-center gap-6 text-center">
			<div className="flex size-16 items-center justify-center rounded-full bg-success-bg">
				<PartyPopper className="size-8 text-success" />
			</div>
			<div className="flex flex-col gap-2">
				<h1 className="text-2xl font-bold text-ink">
					프로필 생성이 완료됐어요!
				</h1>
				<p className="text-[15px] leading-7 text-body-soft">
					의사 프로필이 무료로 만들어졌습니다.
					<br />
					이제 본인 프로필 도메인에서 자유롭게 편집할 수 있어요.
				</p>
			</div>
			<InfoCallout tone="success" className="w-full text-left">
				<p className="text-sm">
					프로필 관리:{" "}
					<span className="font-semibold text-ink">
						{`${settledSlug}.kmadoc.com`}
					</span>
				</p>
			</InfoCallout>
			<div className="flex w-full flex-col gap-3 sm:flex-row">
				<Button
					nativeButton={false}
					render={<Link to="/doctor/preview" />}
					variant="brand"
					size="xl"
					className="w-full sm:flex-1"
				>
					공개 프로필 예시 보기
				</Button>
				<Button
					nativeButton={false}
					render={<Link to="/" />}
					variant="neutral-outline"
					size="xl"
					className="w-full sm:flex-1"
				>
					홈으로
				</Button>
			</div>
		</SectionCard>
	);
}

// ─────────────────────────────────────────────────────────────────────
// 결제(toss) 단계 — commit 후 병원이면 카드(빌링키) 등록으로 유도
// ─────────────────────────────────────────────────────────────────────

function PaymentStep({
	payment,
	slug,
	onComplete,
}: {
	payment: NonNullable<CommitResult["payment"]>;
	slug: string | null;
	onComplete?: () => void;
}) {
	const queryClient = useQueryClient();
	const [loading, setLoading] = useState(false);
	// 연간을 기본 선택값으로(Figma 1:11958).
	const [cycle, setCycle] = useState<BillingCycle>("annual");
	// 저장된 카드가 있어도 "다른 카드로 변경"을 누르면 toss 위젯으로 새 카드를 등록한다.
	const [useNewCard, setUseNewCard] = useState(false);
	// 저장된 카드로 즉시 결제(toss 리다이렉트 없음)가 끝나면 성공 화면을 보여준다.
	const [done, setDone] = useState(false);

	const clientKey = payment.toss_client_key;
	const customerKey = payment.customer_key;
	const hospitalNo = payment.hospital_no;

	// 결제화면 진입 시 먼저 저장된 카드(active 빌링키)를 확인한다(가이드: GET /billing).
	const {
		data: billingData,
		isSuccess: billingIsSuccess,
		isPending: billingIsPending,
	} = useQuery({
		queryKey: ["billing", "list"],
		queryFn: () => listBilling(),
	});
	const savedCard: BillingKey | null =
		billingData?.items?.find((b) => b.status === "active") ?? null;
	// 저장된 카드가 있고 사용자가 "다른 카드로 변경"을 누르지 않았다면 toss 없이 바로 결제.
	const showSavedCard =
		billingIsSuccess && savedCard != null && !useNewCard && hospitalNo != null;

	// 저장된 빌링키로 즉시 청구 — authKey 없이 POST /subscription(가이드 2-A, 권장 경로).
	const chargeMutation = useMutation({
		mutationFn: () =>
			createSubscription(hospitalNo as number, {
				billing_cycle: cycle,
			}),
		onSuccess: () => {
			setDone(true);
			queryClient.invalidateQueries({ queryKey: ["billing", "list"] });
			queryClient.invalidateQueries({ queryKey: ["account", "me"] });
		},
		onError: (err) => {
			const code = err instanceof ApiError ? err.errorCode : null;
			// 이미 활성 구독이면 결제는 끝난 상태 → 성공으로 간주(게시 단계로).
			if (code === "ERROR_409_SUBSCRIPTION_ALREADY_ACTIVE") {
				setDone(true);
				return;
			}
			// 저장된 카드가 사라졌으면(레이스) 새 카드 등록(toss)으로 폴백.
			if (code === "ERROR_400_BILLING_KEY_REQUIRED") {
				setUseNewCard(true);
				toast.message("저장된 카드를 찾을 수 없어 카드를 다시 등록해 주세요.");
				return;
			}
			toastApiError(err);
		},
	});

	// 새 카드 등록(toss) 경로는 클라이언트 키·고객 키·병원 번호가 모두 있어야 시작할 수 있다.
	const ready = Boolean(clientKey && customerKey && hospitalNo != null);

	async function handlePay() {
		if (!ready || !clientKey || !customerKey || hospitalNo == null) return;
		setLoading(true);
		try {
			const origin = window.location.origin;
			// ⚠ toss는 successUrl의 예약 파라미터(customerKey 등)를 떼어내고 자기 값(authKey)만 다시 붙인다.
			// 그래서 customerKey를 그대로 넣으면 콜백에서 사라진다 → 예약 안 된 이름(ck)으로 전달한다.
			const successUrl = `${origin}/billing/callback?hospital_no=${hospitalNo}&ck=${encodeURIComponent(
				customerKey,
			)}&billing_cycle=${cycle}`;
			const failUrl = `${origin}/billing/callback?fail=1`;
			await startCardBillingAuth({
				clientKey,
				customerKey,
				successUrl,
				failUrl,
			});
			// requestBillingAuth 성공 시 successUrl 로 리다이렉트되므로 이 아래는 보통 실행 안 됨.
		} catch (err) {
			toast.error(
				err instanceof Error && err.message
					? err.message
					: "결제 모듈을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
			);
			setLoading(false);
		}
	}

	if (done) return <PaidComplete slug={slug} onComplete={onComplete} />;

	return (
		<SectionCard className="flex flex-col gap-6">
			<div className="flex flex-col gap-2">
				<SectionTitle>병원 홈페이지 결제</SectionTitle>
				<p className="text-[15px] leading-7 text-body-soft">
					{showSavedCard
						? "프로필과 병원이 생성됐어요. 저장된 카드로 바로 결제하면 병원 홈페이지를 공개할 수 있어요."
						: "프로필과 병원이 생성됐어요. 병원 홈페이지를 공개하려면 정기 결제용 카드를 등록해 주세요."}
				</p>
			</div>

			{/* 결제 주기 선택 — Figma 1:11958. 백엔드 billing_cycle(monthly/annual/one_time). */}
			<CycleSelect value={cycle} onChange={(c) => setCycle(c)} />

			{/* 저장된 카드 — 카드 재입력 없이 바로 결제(가이드 2-A). 글씨/여백을 결제 주기 카드와 맞춤. */}
			{showSavedCard && savedCard ? (
				<div className="flex items-center justify-between gap-3 rounded-xl border border-line-soft bg-surface p-6">
					<div className="flex min-w-0 items-center gap-3">
						<CreditCard className="size-6 shrink-0 text-brand" />
						<div className="flex min-w-0 flex-col gap-0.5">
							<span className="truncate text-[16px] font-semibold text-ink sm:text-[17px]">
								{cardLabel(savedCard)}
							</span>
							<span className="text-sm text-body-soft">저장된 결제 카드</span>
						</div>
					</div>
					<button
						type="button"
						onClick={() => setUseNewCard(true)}
						className="shrink-0 text-sm font-medium text-brand underline-offset-4 transition-colors hover:underline"
					>
						다른 카드로 변경
					</button>
				</div>
			) : null}

			{billingIsPending ? (
				<div className="flex items-center justify-center py-3">
					<Loader2 className="size-5 animate-spin text-brand" />
				</div>
			) : showSavedCard ? (
				<Button
					variant="brand"
					size="cta"
					className="w-full"
					disabled={chargeMutation.isPending}
					onClick={() => chargeMutation.mutate()}
				>
					{chargeMutation.isPending ? (
						<Loader2 className="size-5 animate-spin" />
					) : null}
					이 카드로 결제하기
				</Button>
			) : ready ? (
				<div className="flex flex-col gap-3">
					<Button
						variant="brand"
						size="cta"
						className="w-full"
						disabled={loading}
						onClick={handlePay}
					>
						{loading ? <Loader2 className="size-5 animate-spin" /> : null}
						카드 등록하고 결제하기
					</Button>
					{/* "다른 카드로 변경"으로 들어왔다면 저장된 카드로 되돌아갈 수 있게 한다. */}
					{savedCard != null && useNewCard ? (
						<button
							type="button"
							onClick={() => setUseNewCard(false)}
							className="text-center text-sm font-medium text-body-soft underline-offset-4 transition-colors hover:text-brand hover:underline"
						>
							저장된 카드로 결제하기
						</button>
					) : null}
				</div>
			) : (
				<InfoCallout tone="warning">
					<p className="text-sm">
						결제 정보(클라이언트 키·고객 키·병원 번호)가 충분하지 않아 결제를
						시작할 수 없습니다. 백엔드 응답을 확인해 주세요.
					</p>
				</InfoCallout>
			)}

			<p className="text-center text-sm text-muted-fg">
				결제가 완료되면 병원 홈페이지가 공개됩니다
				{slug ? ` (${slug}.kmaclinic.com)` : ""}.
			</p>
		</SectionCard>
	);
}

/**
 * 저장된 카드로 즉시 결제가 끝난 뒤 성공 화면(toss 콜백의 BillingSuccess(subscribe)와 동형).
 * onComplete가 있으면(대시보드 오케스트레이터) 그 핸들러로, 없으면 `/onboarding`으로 이동한다.
 */
function PaidComplete({
	slug,
	onComplete,
}: {
	slug: string | null;
	onComplete?: () => void;
}) {
	return (
		<SectionCard className="flex flex-col items-center gap-6 text-center">
			<div className="flex size-16 items-center justify-center rounded-full bg-success-bg">
				<CheckCircle2 className="size-8 text-success" />
			</div>
			<div className="flex flex-col gap-2">
				<h1 className="text-2xl font-bold text-ink">결제가 완료됐어요!</h1>
				<p className="text-[15px] leading-7 text-body-soft">
					저장된 카드로 정기 결제가 시작됐어요.
					<br />
					이제 <span className="font-semibold text-ink">공개</span>하면 병원
					홈페이지가 공개됩니다
					{slug ? ` (${slug}.kmaclinic.com)` : ""}.
				</p>
			</div>
			<InfoCallout tone="info" className="w-full text-left">
				<p className="text-sm">
					대시보드에서 이 병원의{" "}
					<span className="font-semibold text-ink">공개하기</span> 버튼으로 공개
					주소를 정하고 공개할 수 있어요.
				</p>
			</InfoCallout>
			{onComplete ? (
				<Button
					variant="brand"
					size="cta"
					className="w-full"
					onClick={onComplete}
				>
					대시보드로 가서 공개하기
				</Button>
			) : (
				<Button
					nativeButton={false}
					render={<Link to="/onboarding" />}
					variant="brand"
					size="cta"
					className="w-full"
				>
					대시보드로 가서 공개하기
				</Button>
			)}
		</SectionCard>
	);
}

/**
 * 결제화면 표시용 카드 라벨 — 백엔드 `card_label`을 우선 사용하고,
 * 없으면 카드사명 + 마스킹 번호 뒷자리로 보강한다.
 */
function cardLabel(card: BillingKey): string {
	const label = card.card_label?.trim();
	if (label) return label;
	const company = card.card_company_name?.trim() || "등록된 카드";
	const tail = card.card_number_masked?.trim().replace(/[\s-]/g, "").slice(-4);
	return tail ? `${company} ${tail}` : company;
}

/** commit 결과에서 공개 slug 후보 추출(병원 우선, 없으면 프로필). */
function extractSlug(result: CommitResult): string | null {
	const profile = result.profile as Record<string, unknown> | null | undefined;
	const hospital = result.hospital as
		| Record<string, unknown>
		| null
		| undefined;
	const candidate =
		(hospital?.slug as string | undefined) ??
		(profile?.slug as string | undefined);
	return typeof candidate === "string" && candidate ? candidate : null;
}
