import { Link } from "@tanstack/react-router";
import { ArrowRight, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import {
	type SampleKind,
	SamplePreviewDialog,
} from "#/components/home/sample-preview.tsx";
import { UserMenu } from "#/components/layout/user-menu.tsx";
import { useSession } from "#/lib/auth/use-session.ts";
import { cn } from "#/lib/utils.ts";

/**
 * 홈 랜딩 — 좌(의원 홈페이지)/우(의사 프로필) 풀스크린 분할 시안.
 * 좌측은 밝은 배경 + 브랜드 CTA, 우측은 네이비 배경 + 화이트 CTA.
 * "예시 보기"는 패널별로 해당 샘플(iframe Dialog)을 바로 연다.
 */
export function HomePage() {
	const [sample, setSample] = useState<SampleKind | null>(null);

	return (
		<div className="flex min-h-dvh flex-col">
			<LandingHeader />
			{/* 좌우 분할은 xl(1280px)부터 — lg 폭(1024~1279)에서는 반쪽 패널이 좁아 글줄이 갑갑해진다. */}
			<main className="grid flex-1 xl:grid-cols-2">
				<LandingPanel
					tone="light"
					eyebrow="의원 홈페이지"
					title="병원 홈페이지 만들기"
					desc="진료시간과 의료진, 오시는 길까지. 꼭 필요한 정보만 담은 병원 홈페이지를 간편하게 시작하세요."
					checks={[
						"모바일·PC 자동 최적화",
						"병원 전용 주소 제공",
						"필요한 정보만 간편 입력",
					]}
					ctaLabel="병원 홈페이지 만들기"
					onSample={() => setSample("hospital")}
				/>
				<LandingPanel
					tone="navy"
					eyebrow="의사 프로필"
					title="내 프로필 페이지 만들기"
					desc="학력과 전문 분야, 진료 철학을 깔끔하게 정리해 환자와 동료에게 나를 소개해 보세요."
					checks={[
						"평생 무료로 이용",
						"나만의 프로필 주소",
						"간편한 링크 공유",
					]}
					ctaLabel="내 프로필 만들기"
					onSample={() => setSample("profile")}
				/>
			</main>

			<SamplePreviewDialog kind={sample} onClose={() => setSample(null)} />
		</div>
	);
}

/** 상단 헤더 — 좌: 경기도의사회 공식 로고 / 우: 서비스 명칭(+로그인 시 사용자 메뉴). */
function LandingHeader() {
	const { hasToken } = useSession();

	return (
		<header className="sticky top-0 z-40 h-16 w-full border-b border-line bg-surface/90 backdrop-blur sm:h-[72px]">
			<div className="flex h-full w-full items-center justify-between gap-4 px-4 sm:px-8 lg:px-12">
				<Link
					to="/"
					className="rounded-md transition-opacity hover:opacity-80"
					aria-label="KMA 경기도의사회 홈"
				>
					<img
						src="/ggkma-logo.svg"
						alt="KMA 경기도의사회 GYEONGGI-DO MEDICAL ASSOCIATION"
						className="h-6 w-auto sm:h-7"
					/>
				</Link>
				<div className="flex items-center gap-3">
					<span className="text-[15px] font-semibold text-ink sm:text-base">
						회원 디지털 지원 서비스
					</span>
					{hasToken ? <UserMenu /> : null}
				</div>
			</div>
		</header>
	);
}

/** 좌/우 반쪽 패널 — tone에 따라 밝은/네이비 배경과 대비 색이 바뀐다. */
function LandingPanel({
	tone,
	eyebrow,
	title,
	desc,
	checks,
	ctaLabel,
	onSample,
}: {
	tone: "light" | "navy";
	eyebrow: string;
	title: React.ReactNode;
	desc: string;
	checks: string[];
	ctaLabel: string;
	onSample: () => void;
}) {
	const { isAuthenticated } = useSession();
	const navy = tone === "navy";

	return (
		<section
			className={cn(
				"flex flex-col px-6 py-14 sm:px-12 xl:px-[8%] xl:py-10",
				navy ? "bg-[#1d3e6d]" : "bg-app-bg",
			)}
		>
			<div className="my-auto flex max-w-[560px] flex-col items-start xl:pt-10">
				<span
					className={cn(
						"text-[15px] font-bold sm:text-base",
						navy ? "text-[#9dbdf5]" : "text-brand",
					)}
				>
					{eyebrow}
				</span>
				<h2
					className={cn(
						"mt-4 text-[30px] font-extrabold leading-[1.28] tracking-tight sm:mt-5 sm:text-[40px] xl:text-[48px]",
						navy ? "text-white" : "text-ink",
					)}
				>
					{title}
				</h2>
				<p
					className={cn(
						"mt-5 text-[16px] leading-relaxed sm:mt-6 sm:text-[17px]",
						navy ? "text-[#c9d7ec]" : "text-body",
					)}
				>
					{desc}
				</p>
				<ul
					className={cn(
						"mt-6 flex flex-wrap items-center gap-x-5 gap-y-2.5 text-[15px] font-medium sm:mt-8 sm:text-[17px]",
						navy ? "text-[#e3ecf9]" : "text-ink-soft",
					)}
				>
					{checks.map((check) => (
						<li key={check} className="flex items-center gap-1.5">
							<CheckCircle2
								className={cn(
									"size-4.5",
									navy ? "text-[#9dbdf5]" : "text-muted-fg",
								)}
							/>
							{check}
						</li>
					))}
				</ul>
				<div className="mt-9 flex w-full flex-col gap-3 sm:mt-11 sm:flex-row sm:gap-4">
					<Link
						to={isAuthenticated ? "/onboarding" : "/login"}
						className={cn(
							"inline-flex h-16 items-center justify-between gap-4 rounded-xl pl-7 pr-3 text-[17px] font-bold shadow-[0_12px_28px_-10px_rgba(10,30,70,0.45)] transition-all outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px sm:min-w-[320px]",
							navy
								? "bg-white text-[#1d3e6d] hover:bg-white/90"
								: "bg-brand text-brand-foreground hover:bg-brand-700",
						)}
					>
						{ctaLabel}
						<span
							className={cn(
								"flex size-10 items-center justify-center rounded-full",
								navy ? "bg-brand text-white" : "bg-white/20 text-white",
							)}
						>
							<ArrowRight className="size-5" />
						</span>
					</Link>
					<button
						type="button"
						onClick={onSample}
						className={cn(
							"inline-flex h-16 cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-7 text-[17px] font-bold transition-colors outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px",
							navy
								? "border-white/25 bg-white/5 text-white hover:bg-white/10"
								: "border-line bg-surface text-ink hover:bg-muted",
						)}
					>
						예시 보기
						<ArrowUpRight className="size-4.5" />
					</button>
				</div>
			</div>

			<p
				className={cn(
					"mt-14 text-base xl:mt-auto xl:pt-10",
					navy ? "text-white/60" : "text-muted-fg",
				)}
			>
				경기도의사회 회원이라면 누구나 시작할 수 있습니다.
			</p>
		</section>
	);
}
