import { Link } from "@tanstack/react-router";
import { Loader2, PartyPopper } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { InfoCallout } from "#/components/common/info-callout.tsx";
import {
	SectionCard,
	SectionTitle,
} from "#/components/common/section-card.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Checkbox } from "#/components/ui/checkbox.tsx";
import type { CommitResult } from "#/lib/api/onboarding.ts";

/**
 * 온보딩/직접입력 commit 결과 화면.
 * - 병원(payment.required) → Toss 카드 등록 결제 단계
 * - 프로필만 → 무료 완료 축하
 * 대화형 온보딩(`/onboarding`)과 일괄 입력(`/onboarding/direct`)이 공유한다.
 */
export function CommitComplete({
	result,
	onStartOver,
}: {
	result: CommitResult;
	/** 결제 화면에서 "병원 지우고 새로 시작" — 제공 시 결제 단계에 버튼 노출. */
	onStartOver?: () => Promise<void>;
}) {
	const payment = result.payment;
	const slug = extractSlug(result);

	if (payment?.required === true) {
		return (
			<PaymentStep payment={payment} slug={slug} onStartOver={onStartOver} />
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
						{slug ? `${slug}.kmadoc.com` : "***.kmadoc.com"}
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
// 결제(Toss) 단계 — commit 후 병원이면 카드(빌링키) 등록으로 유도
// ─────────────────────────────────────────────────────────────────────

/** Toss SDK v2 standard 의 최소 인터페이스(좁은 타입). */
type TossPaymentsInstance = {
	payment: (options: { customerKey: string }) => {
		requestBillingAuth: (options: {
			method: "CARD";
			successUrl: string;
			failUrl: string;
		}) => Promise<void>;
	};
};
type TossPaymentsFactory = (clientKey: string) => TossPaymentsInstance;

declare global {
	interface Window {
		TossPayments?: TossPaymentsFactory;
	}
}

const TOSS_SDK_URL = "https://js.tosspayments.com/v2/standard";

/** Toss SDK 동적 로드(CDN script). 새 의존성 추가 없이 window.TossPayments 사용. */
function loadTossSdk(): Promise<TossPaymentsFactory> {
	return new Promise((resolve, reject) => {
		if (window.TossPayments) {
			resolve(window.TossPayments);
			return;
		}
		const existing = document.querySelector<HTMLScriptElement>(
			`script[src="${TOSS_SDK_URL}"]`,
		);
		if (existing) {
			existing.addEventListener("load", () => {
				window.TossPayments
					? resolve(window.TossPayments)
					: reject(new Error("Toss SDK 로드 실패"));
			});
			existing.addEventListener("error", () =>
				reject(new Error("Toss SDK 로드 실패")),
			);
			return;
		}
		const script = document.createElement("script");
		script.src = TOSS_SDK_URL;
		script.async = true;
		script.onload = () =>
			window.TossPayments
				? resolve(window.TossPayments)
				: reject(new Error("Toss SDK 로드 실패"));
		script.onerror = () => reject(new Error("Toss SDK 로드 실패"));
		document.head.appendChild(script);
	});
}

function PaymentStep({
	payment,
	slug,
	onStartOver,
}: {
	payment: NonNullable<CommitResult["payment"]>;
	slug: string | null;
	onStartOver?: () => Promise<void>;
}) {
	const [loading, setLoading] = useState(false);
	const [marketingConsent, setMarketingConsent] = useState(false);
	const [startingOver, setStartingOver] = useState(false);

	async function handleStartOver() {
		if (!onStartOver) return;
		const ok = window.confirm(
			"지금 만든 병원 정보를 모두 지우고 처음부터 다시 시작할까요?\n결제 전 입력한 내용은 복구할 수 없습니다.",
		);
		if (!ok) return;
		setStartingOver(true);
		try {
			await onStartOver();
		} catch {
			toast.error("새로 시작에 실패했어요. 잠시 후 다시 시도해 주세요.");
			setStartingOver(false);
		}
	}
	const clientKey = payment.toss_client_key;
	const customerKey = payment.customer_key;
	const hospitalNo = payment.hospital_no;
	const amount = payment.amount;

	const ready = Boolean(clientKey && customerKey && hospitalNo != null);

	async function handlePay() {
		if (!ready || !clientKey || !customerKey || hospitalNo == null) return;
		setLoading(true);
		try {
			const factory = await loadTossSdk();
			const toss = factory(clientKey);
			const origin = window.location.origin;
			// ⚠ Toss는 successUrl의 예약 파라미터(customerKey 등)를 떼어내고 자기 값(authKey)만 다시 붙인다.
			// 그래서 customerKey를 그대로 넣으면 콜백에서 사라진다 → 예약 안 된 이름(ck)으로 전달한다.
			const successUrl = `${origin}/billing/callback?hospital_no=${hospitalNo}&ck=${encodeURIComponent(
				customerKey,
			)}${marketingConsent ? "&marketing_consent=1" : ""}`;
			const failUrl = `${origin}/billing/callback?fail=1`;
			await toss.payment({ customerKey }).requestBillingAuth({
				method: "CARD",
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

	return (
		<SectionCard className="flex flex-col gap-6">
			<div className="flex flex-col gap-2">
				<SectionTitle>병원 홈페이지 결제</SectionTitle>
				<p className="text-[15px] leading-7 text-body-soft">
					프로필과 병원이 생성됐어요. 병원 홈페이지를 공개하려면 정기 결제용
					카드를 등록해 주세요.
				</p>
			</div>

			<div className="rounded-xl border border-line bg-app-bg p-5">
				<div className="flex items-center justify-between">
					<span className="text-sm text-body-soft">월 정기 결제</span>
					<span className="text-lg font-bold text-ink">
						{typeof amount === "number"
							? `${amount.toLocaleString("ko-KR")}원 / 월`
							: "월 정기 결제"}
					</span>
				</div>
			</div>

			<div className="flex items-start gap-2.5 rounded-xl border border-line bg-app-bg px-4 py-3">
				<Checkbox
					id="marketing-consent"
					checked={marketingConsent}
					onCheckedChange={(v) => setMarketingConsent(v === true)}
					className="mt-0.5"
				/>
				<label
					htmlFor="marketing-consent"
					className="cursor-pointer text-sm text-body"
				>
					<span className="font-medium text-ink">[선택]</span> 혜택·소식 등
					마케팅 정보 수신에 동의합니다.
				</label>
			</div>

			{ready ? (
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

			{/* 미결제 병원 폐기 후 처음부터 새로 시작(파괴적 → confirm 보호). */}
			{onStartOver ? (
				<div className="flex flex-col items-center border-t border-line pt-4">
					<button
						type="button"
						disabled={startingOver}
						onClick={handleStartOver}
						className="cursor-pointer text-sm text-muted-fg underline-offset-4 transition-colors hover:text-danger-strong hover:underline disabled:opacity-50"
					>
						{startingOver
							? "초기화 중…"
							: "이 병원 지우고 처음부터 새로 시작하기"}
					</button>
				</div>
			) : null}
		</SectionCard>
	);
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
