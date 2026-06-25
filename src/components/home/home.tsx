import { Link } from "@tanstack/react-router";
import {
	ArrowRight,
	CalendarClock,
	CheckCircle2,
	CreditCard,
	Globe,
	LayoutGrid,
	LogIn,
	type LucideIcon,
	MessageSquareText,
	ShieldCheck,
	Sparkles,
	Stethoscope,
} from "lucide-react";
import {
	AppHeader,
	type HeaderNavItem,
} from "#/components/layout/app-header.tsx";
import { SiteFooter } from "#/components/layout/site-footer.tsx";
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import { useSession } from "#/lib/auth/use-session.ts";

/**
 * 같은 섹션을 다시 눌러도 스크롤되도록 프로그래밍적으로 이동한다.
 * (href="#id"는 주소창 해시가 동일하면 동작하지 않는 문제 회피)
 */
function scrollToSection(id: string) {
	const el = document.getElementById(id);
	if (!el) return;
	el.scrollIntoView({ behavior: "smooth" });
	window.history.replaceState(null, "", `#${id}`);
}

/** 홈 상단 마케팅 섹션 내비(헤더 가운데). */
const HOME_NAV: HeaderNavItem[] = [
	{ label: "작동 방식", sectionId: "how" },
	{ label: "만들어지는 것", sectionId: "create" },
	{ label: "요금", sectionId: "pricing" },
];

export function HomePage() {
	return (
		<div className="flex min-h-screen flex-col bg-app-bg">
			<AppHeader nav={HOME_NAV} />
			<main className="flex-1">
				<Hero />
				<HowItWorks />
				<WhatYouGet />
				<Pricing />
				<FinalCta />
			</main>
			<SiteFooter />
		</div>
	);
}

/* ─────────────────────────────── 히어로 ─────────────────────────────── */

function Hero() {
	const { isAuthenticated } = useSession();

	return (
		<section className="border-b border-line bg-surface">
			<div className="mx-auto grid w-full max-w-[1120px] items-center gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:py-24">
				<div className="flex flex-col items-start gap-6">
					<Badge variant="soft" size="lg" className="rounded-full">
						<Sparkles className="size-3.5" />
						의료진 전용 · 닥스밋 연동
					</Badge>
					<h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-ink sm:text-[44px] sm:leading-[1.18]">
						의사 프로필도 병원 홈페이지도,
						<br />
						<span className="text-brand">대화 한 번으로</span> 끝.
					</h1>
					<p className="max-w-[520px] text-[17px] leading-relaxed text-body">
						복잡한 입력 폼은 그만. AI와 대화하듯 답하기만 하면 의사 공개
						프로필과 병원 홈페이지가 자동으로 완성됩니다. 면허 인증부터 결제,
						공개까지 한 흐름으로 이어집니다.
					</p>
					<div className="flex w-full flex-col gap-3 sm:flex-row">
						<Button
							nativeButton={false}
							render={<Link to={isAuthenticated ? "/onboarding" : "/login"} />}
							variant="brand"
							size="cta"
							className="w-full sm:w-auto"
						>
							{isAuthenticated ? "작성 이어가기" : "닥스밋 계정으로 시작하기"}
							<ArrowRight className="size-5" />
						</Button>
						<Button
							onClick={() => scrollToSection("how")}
							variant="neutral-outline"
							size="cta"
							className="w-full sm:w-auto"
						>
							작동 방식 보기
						</Button>
					</div>
					<ul className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 text-sm text-muted-fg">
						<li className="flex items-center gap-1.5">
							<ShieldCheck className="size-4 text-brand" />
							의사 면허 인증
						</li>
						<li className="flex items-center gap-1.5">
							<CreditCard className="size-4 text-brand" />
							안전한 정기결제 (toss)
						</li>
						<li className="flex items-center gap-1.5">
							<Globe className="size-4 text-brand" />
							즉시 공개
						</li>
					</ul>
				</div>

				<HeroChatPreview />
			</div>
		</section>
	);
}

/** 히어로 우측: 대화형 온보딩을 보여주는 채팅 미리보기 */
function HeroChatPreview() {
	return (
		<div className="relative mx-auto w-full max-w-[440px]">
			<div className="absolute -inset-3 -z-10 rounded-[28px] bg-brand-50/70 blur-xl" />
			<div className="overflow-hidden rounded-3xl border border-line bg-app-bg shadow-xl">
				<div className="flex items-center gap-2 border-b border-line bg-surface px-5 py-3.5">
					<span className="flex size-7 items-center justify-center rounded-lg bg-brand text-xs font-semibold text-brand-foreground">
						AI
					</span>
					<span className="text-sm font-semibold text-ink">작성 도우미</span>
					<Badge variant="success" className="ml-auto rounded-full">
						진행 중
					</Badge>
				</div>
				<div className="flex flex-col gap-3 p-5">
					<ChatBubble from="ai">
						안녕하세요 원장님! 어느 진료과를 전문으로 하시나요?
					</ChatBubble>
					<ChatBubble from="me">소화기내과 전문의입니다.</ChatBubble>
					<ChatBubble from="ai">병원 주소를 알려주세요.</ChatBubble>
					<ChatBubble from="me">서울시 강남구 역삼동 123-456</ChatBubble>
					<div className="mt-1 flex items-center gap-2 rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-sm font-medium text-brand">
						<CheckCircle2 className="size-4" />
						초안 생성 중…
					</div>
				</div>
			</div>
		</div>
	);
}

function ChatBubble({
	from,
	children,
}: {
	from: "ai" | "me";
	children: React.ReactNode;
}) {
	const mine = from === "me";
	return (
		<div className={mine ? "flex justify-end" : "flex justify-start"}>
			<p
				className={
					mine
						? "max-w-[80%] rounded-2xl rounded-br-md bg-brand px-4 py-2.5 text-sm text-brand-foreground"
						: "max-w-[80%] rounded-2xl rounded-bl-md bg-surface px-4 py-2.5 text-sm text-ink"
				}
			>
				{children}
			</p>
		</div>
	);
}

/* ───────────────────────────── 작동 방식 ───────────────────────────── */

type StepItem = {
	icon: LucideIcon;
	step: string;
	title: string;
	desc: string;
};

const STEPS: StepItem[] = [
	{
		icon: LogIn,
		step: "01",
		title: "닥스밋으로 로그인",
		desc: "이미 쓰던 닥스밋 의사 계정으로 1초 만에 시작합니다.",
	},
	{
		icon: MessageSquareText,
		step: "02",
		title: "대화로 작성하기",
		desc: "AI가 묻는 말에 답하고 사진만 올리면 초안이 완성됩니다.",
	},
	{
		icon: CreditCard,
		step: "03",
		title: "결제 & 공개",
		desc: "프로필은 무료, 병원 홈페이지는 구독 결제 후 바로 공개됩니다.",
	},
	{
		icon: Globe,
		step: "04",
		title: "환자와 연결",
		desc: "공개된 프로필·홈페이지 주소로 환자와 자연스럽게 이어집니다.",
	},
];

function HowItWorks() {
	return (
		<section
			id="how"
			className="mx-auto w-full max-w-[1120px] scroll-mt-16 px-4 py-16 sm:px-6 sm:py-20"
		>
			<SectionHeading
				eyebrow="작동 방식"
				title="4단계면 충분합니다"
				desc="복잡한 설정 없이, 로그인부터 공개까지 하나의 흐름으로 이어집니다."
			/>
			<ol className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
				{STEPS.map((s) => (
					<li
						key={s.step}
						className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-6"
					>
						<div className="flex items-center justify-between">
							<span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand">
								<s.icon className="size-5" />
							</span>
							<span className="text-sm font-bold text-line-strong">
								{s.step}
							</span>
						</div>
						<h3 className="text-[17px] font-bold text-ink">{s.title}</h3>
						<p className="text-sm leading-relaxed text-body text-balance break-keep">
							{s.desc}
						</p>
					</li>
				))}
			</ol>
		</section>
	);
}

/* ─────────────────────────── 만들어지는 것 ─────────────────────────── */

function WhatYouGet() {
	return (
		<section
			id="create"
			className="scroll-mt-16 border-y border-line bg-surface"
		>
			<div className="mx-auto w-full max-w-[1120px] px-4 py-16 sm:px-6 sm:py-20">
				<SectionHeading
					eyebrow="만들어지는 것"
					title="한 번 작성, 두 개의 사이트"
					desc="의사 개인 프로필과 병원 홈페이지가 한 번에 만들어집니다."
				/>
				<div className="mt-10 grid gap-6 lg:grid-cols-2">
					<CreateCard
						icon={Stethoscope}
						title="의사 공개 프로필"
						domain="*.kmadoc.com"
						desc="경력·학력, 전문 자격, 진료 일정, 대표 논문까지. 환자가 신뢰할 수 있는 공개 프로필이 자동으로 구성됩니다."
						bullets={["진료 일정", "경력 타임라인"]}
					/>
					<CreateCard
						icon={LayoutGrid}
						title="병원 홈페이지"
						domain="*.kmaclinic.com"
						desc="병원 소개, 진료 안내, 공지·칼럼 게시판을 갖춘 홈페이지. 구독 결제 후 즉시 공개됩니다."
						bullets={[
							"병원 소개·진료안내",
							"공지/칼럼 게시판",
							"정기결제 후 공개",
						]}
					/>
				</div>
			</div>
		</section>
	);
}

function CreateCard({
	icon: Icon,
	title,
	domain,
	desc,
	bullets,
	to,
	ctaLabel,
}: {
	icon: LucideIcon;
	title: string;
	domain: string;
	desc: string;
	bullets: string[];
	to?: string;
	ctaLabel?: string;
}) {
	return (
		<div className="flex flex-col gap-5 rounded-2xl border border-line bg-app-bg p-7">
			<div className="flex items-center gap-3">
				<span className="flex size-12 items-center justify-center rounded-xl bg-brand text-brand-foreground">
					<Icon className="size-6" />
				</span>
				<div>
					<h3 className="text-xl font-bold text-ink">{title}</h3>
					<p className="font-mono text-sm text-muted-fg">{domain}</p>
				</div>
			</div>
			<p className="text-[15px] leading-relaxed text-body">{desc}</p>
			<ul className="flex flex-col gap-2">
				{bullets.map((b) => (
					<li key={b} className="flex items-center gap-2 text-sm text-body">
						<CheckCircle2 className="size-4 shrink-0 text-brand" />
						{b}
					</li>
				))}
			</ul>
			{to ? (
				<Link
					to={to}
					className="mt-auto inline-flex items-center gap-1.5 text-[15px] font-semibold text-brand transition-colors hover:text-brand-700"
				>
					{ctaLabel}
					<ArrowRight className="size-4" />
				</Link>
			) : null}
		</div>
	);
}

/* ─────────────────────────────── 요금 ─────────────────────────────── */

function Pricing() {
	const { isAuthenticated } = useSession();
	return (
		<section
			id="pricing"
			className="mx-auto w-full max-w-[1120px] scroll-mt-16 px-4 py-16 sm:px-6 sm:py-20"
		>
			<SectionHeading
				eyebrow="요금"
				title="프로필은 무료, 홈페이지는 구독"
				desc="필요한 만큼만. 의사 프로필은 비용 없이 공개할 수 있습니다."
			/>
			<div className="mx-auto mt-10 grid max-w-[760px] gap-6 sm:grid-cols-2">
				<div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-7">
					<div className="flex items-center gap-2">
						<Stethoscope className="size-5 text-brand" />
						<h3 className="text-lg font-bold text-ink">의사 공개 프로필</h3>
					</div>
					<p className="text-3xl font-extrabold text-ink">
						무료
						<span className="ml-1 text-base font-medium text-muted-fg">
							/ 영구
						</span>
					</p>
					<p className="text-sm leading-relaxed text-body">
						면허 인증과 공개 프로필 생성까지 비용이 들지 않습니다.
					</p>
				</div>
				<div className="relative flex flex-col gap-4 rounded-2xl border-2 border-brand bg-surface p-7">
					<Badge
						variant="default"
						className="absolute -top-3 left-7 rounded-full"
					>
						병원 운영자
					</Badge>
					<div className="flex items-center gap-2">
						<LayoutGrid className="size-5 text-brand" />
						<h3 className="text-lg font-bold text-ink">병원 홈페이지</h3>
					</div>
					<p className="text-3xl font-extrabold text-ink">
						월 구독
						<span className="ml-1 text-base font-medium text-muted-fg">
							/ toss 정기결제
						</span>
					</p>
					<p className="text-sm leading-relaxed text-body">
						홈페이지 공개와 게시판 운영을 위한 월 구독. 결제 즉시 공개됩니다.
					</p>
				</div>
			</div>
			<div className="mt-8 flex justify-center">
				<Button
					nativeButton={false}
					render={<Link to={isAuthenticated ? "/onboarding" : "/login"} />}
					variant="brand"
					size="cta"
					className="w-full sm:w-auto"
				>
					{isAuthenticated ? "작성 이어가기" : "지금 시작하기"}
					<ArrowRight className="size-5" />
				</Button>
			</div>
		</section>
	);
}

/* ───────────────────────────── 최종 CTA ───────────────────────────── */

function FinalCta() {
	const { isAuthenticated } = useSession();
	return (
		<section className="px-4 pb-20 sm:px-6">
			<div className="mx-auto flex w-full max-w-[1120px] flex-col items-center gap-6 rounded-3xl bg-brand px-6 py-14 text-center">
				<CalendarClock className="size-10 text-brand-foreground/90" />
				<h2 className="text-2xl font-extrabold text-brand-foreground sm:text-3xl">
					오늘 등록하고, 오늘 공개하세요.
				</h2>
				<p className="max-w-[520px] text-[15px] leading-relaxed text-brand-foreground/85">
					대화로 작성하면 10분이면 충분합니다. 지금 바로 프로필과 병원
					홈페이지를 만들어 보세요.
				</p>
				<Button
					nativeButton={false}
					render={<Link to={isAuthenticated ? "/onboarding" : "/login"} />}
					variant="neutral-outline"
					size="cta"
					className="w-full border-transparent bg-surface text-brand hover:bg-surface/90 sm:w-auto"
				>
					{isAuthenticated ? "작성 이어가기" : "닥스밋 계정으로 시작하기"}
					<ArrowRight className="size-5" />
				</Button>
			</div>
		</section>
	);
}

/* ───────────────────────────── 공통 소품 ───────────────────────────── */

function SectionHeading({
	eyebrow,
	title,
	desc,
}: {
	eyebrow: string;
	title: string;
	desc: string;
}) {
	return (
		<div className="flex flex-col items-center gap-3 text-center">
			<span className="text-sm font-bold uppercase tracking-wide text-brand">
				{eyebrow}
			</span>
			<h2 className="text-[26px] font-extrabold tracking-tight text-ink sm:text-[32px]">
				{title}
			</h2>
			<p className="max-w-[560px] text-[15px] leading-relaxed text-body">
				{desc}
			</p>
		</div>
	);
}
