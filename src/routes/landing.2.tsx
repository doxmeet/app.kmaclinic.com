import { createFileRoute } from "@tanstack/react-router";
import {
	ArrowRight,
	Bus,
	Calendar,
	Car,
	Check,
	ChevronRight,
	Clock,
	Facebook,
	HeartPulse,
	MapPin,
	Phone,
	Quote,
	Share2,
	Stethoscope,
	Train,
	UserRound,
} from "lucide-react";

export const Route = createFileRoute("/landing/2")({ component: Landing2 });

/* ── 디자인 색상 (시안2: 에메랄드 그린 따뜻한 동네 의원 테마) ──
 * brand #059669 · accent #0d9488 · light #f0fdf4 · ink #111827 · footer #020617
 */

const NAV = ["진료안내", "의료진 소개", "커뮤니티", "오시는 길"];

const SPECIALTIES = [
	"일반 내과 진료",
	"소화기내과 (위/대장 내시경)",
	"이비인후과 진료",
	"국민건강보험공단 건강검진",
];

const HOURS = [
	{ label: "평일", value: "09:00 - 18:30" },
	{ label: "토요일", value: "09:00 - 13:00" },
	{ label: "일요일/공휴일", value: "휴진" },
];

type Doctor = {
	tag: string;
	name: string;
	role: string;
	specialty: string;
	quote: string;
	credentials: string[];
	// 월~토 진료 상태: "off" 휴진 · "full" 종일 · "am" 오전
	schedule: ("off" | "full" | "am")[];
};

const DOCTOR_DAYS = ["월", "화", "수", "목", "금", "토"];

const DOCTORS: Doctor[] = [
	{
		tag: "내과 전문의",
		name: "홍길동",
		role: "대표원장",
		specialty: "소화기내과 분과전문의",
		quote:
			"환자의 작은 소리에도 귀 기울이며, 정확한 진단으로 건강한 내일을 약속드립니다.",
		credentials: [
			"서울대학교 의과대학 졸업",
			"서울대학교병원 내과 전공의 수료",
			"대한소화기내시경학회 평생회원",
		],
		schedule: ["off", "full", "full", "full", "full", "am"],
	},
	{
		tag: "가정의학과 전문의",
		name: "김경기",
		role: "부원장",
		specialty: "만성질환/건강검진 전담",
		quote: "가족을 대하는 마음으로, 세심하고 따뜻한 진료를 제공하겠습니다.",
		credentials: [
			"연세대학교 의과대학 졸업",
			"세브란스병원 가정의학과 전공의 수료",
			"대한임상건강증진학회 정회원",
		],
		schedule: ["off", "full", "full", "full", "full", "am"],
	},
];

const NOTICES = [
	{ title: "추석 연휴 진료 일정 안내", date: "2023.09.15" },
	{ title: "독감 예방접종 시작 안내 (4가 백신)", date: "2023.09.01" },
	{ title: "국가건강검진 지정병원 안내", date: "2023.08.10" },
	{ title: "새로운 초음파 장비 도입 안내", date: "2023.07.22" },
];

const COLUMNS = [
	{
		title: "침묵의 살인자, 고혈압 예방과 관리법",
		sub: "정기적인 혈압 측정과 생활 습관 개선이 가장 중요합니...",
	},
	{
		title: "현대인의 고질병, 기능성 위장장애",
		sub: "스트레스와 불규칙한 식습관이 원인인 경우가 많습니...",
	},
];

const PRICES = [
	{ item: "독감 예방접종", desc: "4가 백신", amount: "40,000원" },
	{ item: "대상포진 예방접종", desc: "싱그릭스", amount: "180,000원" },
	{ item: "건강진단서", desc: "일반 진단서 발급", amount: "20,000원" },
	{ item: "영문진단서", desc: "영문 진단서 발급", amount: "30,000원" },
	{ item: "채용 신체검사", desc: "일반 채용검진", amount: "30,000원" },
];

const PROMO_FEATURES = [
	"종합검진 15% 할인",
	"위·대장 내시경 패키지",
	"초음파 검사 포함",
	"전문의 1:1 결과 상담",
];

function Landing2() {
	return (
		<div className="min-h-screen bg-white font-sans text-[#374151] [letter-spacing:-0.3px]">
			<Header />
			<main>
				<Hero />
				<InfoCards />
				<Doctors />
				<Boards />
				<Pricing />
				<Location />
			</main>
			<Footer />
		</div>
	);
}

/* ── 헤더 (플로팅 알약형) ── */
function Header() {
	return (
		<header className="sticky top-0 z-50 px-4 pt-4 md:px-6 md:pt-6">
			<div className="mx-auto flex max-w-[1400px] items-center justify-between rounded-[24px] border border-white/90 bg-white/85 px-5 py-3 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.12)] backdrop-blur-md md:rounded-[32px] md:px-8 md:py-4">
				<a href="/landing/2" className="flex items-center gap-2.5">
					<span className="flex size-9 items-center justify-center rounded-full bg-[#059669] text-white shadow-[0_4px_12px_-2px_rgba(5,150,105,0.4)] md:size-10">
						<HeartPulse className="size-5" />
					</span>
					<span className="text-lg font-bold text-[#111827] md:text-[22px]">
						홍길동내과의원
					</span>
				</a>
				<nav className="hidden items-center gap-8 lg:flex">
					{NAV.map((item) => (
						<a
							key={item}
							href="/landing/2"
							className="text-[17px] font-medium text-[#374151] transition-colors hover:text-[#059669]"
						>
							{item}
						</a>
					))}
				</nav>
				<a href="/landing/2" className="flex items-center gap-2 text-[#111827]">
					<Phone className="size-5 text-[#059669]" />
					<span className="hidden text-[17px] font-semibold sm:inline">
						02-1234-5678
					</span>
				</a>
			</div>
		</header>
	);
}

/* ── 히어로 ── */
function Hero() {
	return (
		<section className="relative overflow-hidden">
			<div className="pointer-events-none absolute inset-0">
				<div className="absolute -top-20 right-0 size-[420px] rounded-full bg-[radial-gradient(circle,rgba(5,150,105,0.08),transparent_70%)] blur-2xl" />
				<div className="absolute bottom-0 -left-20 size-[420px] rounded-full bg-[radial-gradient(circle,rgba(6,182,212,0.06),transparent_70%)] blur-3xl" />
			</div>
			<div className="relative mx-auto max-w-[1400px] px-5 pt-16 pb-20 md:px-8 md:pt-24 md:pb-28">
				<div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
					<div className="flex flex-col gap-6">
						<span className="inline-flex w-fit items-center rounded-full border border-[#dcfce7] bg-[#f0fdf4] px-4 py-1.5 text-sm font-medium text-[#059669]">
							프리미엄 내과 진료의 새로운 기준
						</span>
						<h1 className="text-[36px] leading-[1.15] font-bold tracking-[-1.4px] text-[#111827] md:text-[56px]">
							언제나{" "}
							<span className="bg-gradient-to-br from-[#059669] to-[#0d9488] bg-clip-text text-transparent">
								가족 같은 마음
							</span>
							으로,
							<br />
							당신의 건강을 먼저 생각합니다.
						</h1>
						<p className="max-w-[520px] text-base leading-relaxed text-[#475569] md:text-xl">
							대학병원급 첨단 장비와 풍부한 임상경험을 바탕으로 정확한 진단과
							따뜻한 진료를 약속드립니다.
						</p>
						<div className="flex flex-wrap gap-3">
							<a
								href="#doctors"
								className="inline-flex items-center gap-2 rounded-3xl bg-[#111827] px-8 py-4 text-base font-semibold text-white shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] transition-transform hover:-translate-y-0.5"
							>
								의료진 소개 보기
							</a>
							<a
								href="#hours"
								className="inline-flex items-center gap-2 rounded-3xl border border-[#e5e7eb] bg-white/85 px-8 py-4 text-base font-semibold text-[#111827] backdrop-blur-md transition-colors hover:bg-white"
							>
								진료 시간 안내
							</a>
						</div>
					</div>

					{/* 히어로 이미지 + 플로팅 카드 */}
					<div className="relative">
						<div className="flex aspect-square w-full items-center justify-center rounded-[32px] bg-gradient-to-br from-[#d1fae5] to-[#f0fdf4] text-sm font-medium text-[#059669]">
							병원 내부 이미지
						</div>
						<div className="absolute -bottom-6 left-4 w-[80%] max-w-[340px] rounded-3xl border border-[#f3f4f6] bg-white p-6 shadow-[0_20px_40px_-16px_rgba(0,0,0,0.2)] sm:left-auto sm:-bottom-8 sm:-left-8">
							<h2 className="mb-4 text-base font-bold text-[#111827]">
								주요 진료 과목
							</h2>
							<ul className="flex flex-col gap-3">
								{SPECIALTIES.map((s) => (
									<li key={s} className="flex items-center gap-3 text-sm">
										<span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#f0fdf4] text-[#059669]">
											<Check className="size-3.5" />
										</span>
										<span className="text-[#374151]">{s}</span>
									</li>
								))}
							</ul>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

/* ── 진료시간 / 오시는 길 카드 ── */
function InfoCards() {
	return (
		<section id="hours" className="bg-[#f9fafb]/50 py-16 md:py-24">
			<div className="mx-auto grid max-w-[1100px] gap-6 px-5 md:grid-cols-2 md:px-8">
				{/* 진료 시간 */}
				<div className="rounded-3xl border border-[#e5e7eb] bg-white p-7 shadow-sm md:p-8">
					<div className="mb-5 flex items-center justify-between">
						<div className="flex items-center gap-3">
							<span className="flex size-11 items-center justify-center rounded-xl bg-[#f0fdf4] text-[#059669]">
								<Clock className="size-6" />
							</span>
							<h2 className="text-xl font-bold text-[#111827]">진료 시간</h2>
						</div>
						<span className="rounded-full border border-[#fee2e2] bg-[#fef2f2] px-3 py-1 text-xs font-medium text-[#dc2626]">
							점심시간 없음
						</span>
					</div>
					<dl className="flex flex-col gap-3">
						{HOURS.map((h) => (
							<div
								key={h.label}
								className="flex items-center justify-between border-b border-[#f3f4f6] pb-3 last:border-0 last:pb-0"
							>
								<dt className="text-[#6b7280]">{h.label}</dt>
								<dd className="font-semibold text-[#111827]">{h.value}</dd>
							</div>
						))}
					</dl>
				</div>

				{/* 오시는 길 */}
				<div className="rounded-3xl border border-[#e5e7eb] bg-white p-7 shadow-sm md:p-8">
					<div className="mb-5 flex items-center gap-3">
						<span className="flex size-11 items-center justify-center rounded-xl bg-[#f0fdf4] text-[#059669]">
							<MapPin className="size-6" />
						</span>
						<h2 className="text-xl font-bold text-[#111827]">오시는 길</h2>
					</div>
					<p className="text-base leading-relaxed text-[#374151]">
						서울특별시 강남구 테헤란로 123
						<br />
						메디컬타워 5층 홍길동내과의원
					</p>
					<div className="mt-5 flex gap-2">
						<a
							href="#location"
							className="inline-flex h-14 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-[#059669] text-base font-semibold text-white transition-colors hover:bg-[#047857]"
						>
							<MapPin className="size-4" />
							지도 보기
						</a>
						<button
							type="button"
							className="flex size-14 items-center justify-center rounded-2xl border border-[#e5e7eb] text-[#6b7280] transition-colors hover:bg-[#f9fafb]"
							aria-label="공유하기"
						>
							<Share2 className="size-5" />
						</button>
					</div>
				</div>
			</div>
		</section>
	);
}

/* ── 신뢰할 수 있는 의료진 ── */
function Doctors() {
	return (
		<section id="doctors" className="bg-white py-20 md:py-28">
			<div className="mx-auto max-w-[1100px] px-5 md:px-8">
				<div className="mb-12 text-center">
					<h2 className="text-3xl font-bold text-[#0f172a] md:text-[40px]">
						신뢰할 수 있는 의료진
					</h2>
					<p className="mt-3 text-base text-[#64748b]">
						풍부한 임상경험을 바탕으로 최선의 진료를 다합니다.
					</p>
				</div>
				<div className="grid gap-8 md:grid-cols-2">
					{DOCTORS.map((doc) => (
						<DoctorCard key={doc.name} doc={doc} />
					))}
				</div>
			</div>
		</section>
	);
}

function DoctorCard({ doc }: { doc: Doctor }) {
	return (
		<article className="flex flex-col gap-6 rounded-[32px] border border-[#f3f4f6] bg-[#f9fafb]/30 p-8">
			<div className="flex items-center gap-4">
				<span className="flex size-32 shrink-0 items-center justify-center rounded-[24px] bg-[#e5e7eb] text-[#94a3b8]">
					<UserRound className="size-12" />
				</span>
				<div className="flex flex-col gap-1.5">
					<span className="w-fit rounded-full bg-[#f0fdf4] px-3 py-1 text-sm font-bold text-[#059669]">
						{doc.tag}
					</span>
					<div className="flex items-baseline gap-2">
						<span className="text-[28px] font-bold text-[#111827]">
							{doc.name}
						</span>
						<span className="text-xl font-medium text-[#6b7280]">
							{doc.role}
						</span>
					</div>
					<span className="text-[17px] font-medium text-[#059669]">
						{doc.specialty}
					</span>
				</div>
			</div>

			<div className="relative rounded-[20px] border border-[#f3f4f6] bg-white px-6 pt-8 pb-6">
				<Quote className="absolute top-4 left-4 size-[30px] fill-[#f3f4f6] text-[#f3f4f6]" />
				<p className="pl-6 text-[17px] leading-relaxed text-[#374151]">
					{doc.quote}
				</p>
			</div>

			<ul className="flex flex-col gap-3 text-[15px] text-[#4b5563]">
				{doc.credentials.map((c) => (
					<li key={c} className="flex items-center gap-2.5">
						<span className="shrink-0 text-[#d1d5db]">—</span>
						{c}
					</li>
				))}
			</ul>

			<Schedule schedule={doc.schedule} />
		</article>
	);
}

function Schedule({ schedule }: { schedule: Doctor["schedule"] }) {
	return (
		<div className="mt-auto">
			<h3 className="border-b border-[#e5e7eb] pb-2 text-sm font-bold text-[#111827]">
				진료 일정 안내
			</h3>
			<div className="mt-2 grid grid-cols-6 gap-1 text-center text-xs">
				{DOCTOR_DAYS.map((d) => (
					<div key={d} className="rounded bg-[#f9fafb] p-2 text-[#111827]">
						{d}
					</div>
				))}
				{schedule.map((state, i) => (
					<div key={DOCTOR_DAYS[i]} className="p-2">
						{state === "off" ? (
							<span className="text-[#d1d5db]">○</span>
						) : state === "am" ? (
							<span className="font-bold text-[#059669]">오전</span>
						) : (
							<span className="font-bold text-[#059669]">●</span>
						)}
					</div>
				))}
			</div>
		</div>
	);
}

/* ── 공지사항 / 건강 칼럼 / 퀵 배너 ── */
function Boards() {
	return (
		<section className="border-y border-[#e5e7eb] bg-[#f9fafb] py-16 md:py-20">
			<div className="mx-auto grid max-w-[1400px] gap-8 px-5 md:px-8 lg:grid-cols-3">
				{/* 공지사항 */}
				<BoardCard title="공지사항">
					<ul className="flex flex-col">
						{NOTICES.map((n) => (
							<li
								key={n.title}
								className="flex items-center justify-between gap-3 border-b border-[#f3f4f6] py-3 last:border-0"
							>
								<span className="truncate text-sm text-[#1e293b]">
									{n.title}
								</span>
								<span className="shrink-0 text-xs text-[#64748b]">
									{n.date}
								</span>
							</li>
						))}
					</ul>
				</BoardCard>

				{/* 건강 칼럼 */}
				<BoardCard title="건강 칼럼">
					<ul className="flex flex-col gap-4">
						{COLUMNS.map((c) => (
							<li key={c.title} className="flex items-center gap-3">
								<span className="flex size-16 shrink-0 items-center justify-center rounded-xl bg-[#f1f5f9] text-[#059669]">
									<HeartPulse className="size-6" />
								</span>
								<span className="flex flex-col gap-1">
									<span className="text-sm font-semibold text-[#1e293b]">
										{c.title}
									</span>
									<span className="line-clamp-1 text-xs text-[#64748b]">
										{c.sub}
									</span>
								</span>
							</li>
						))}
					</ul>
				</BoardCard>

				{/* 퀵 배너 */}
				<div className="flex flex-col gap-4">
					<QuickBanner
						iconBg="bg-[#e0e7ff] text-[#4f46e5]"
						icon={<Calendar className="size-5" />}
						title="국가건강검진"
						sub="올해 대상자 확인 및 예약"
					/>
					<QuickBanner
						iconBg="bg-[#ede9fe] text-[#7c3aed]"
						icon={<Stethoscope className="size-5" />}
						title="비급여 진료비 안내"
						sub="투명하고 합리적인 비용"
					/>
				</div>
			</div>
		</section>
	);
}

function BoardCard({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className="rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
			<div className="mb-4 flex items-center justify-between">
				<h3 className="text-lg font-bold text-[#0f172a]">{title}</h3>
				<a href="/landing/2" className="text-sm text-[#059669]">
					+ 더보기
				</a>
			</div>
			{children}
		</div>
	);
}

function QuickBanner({
	iconBg,
	icon,
	title,
	sub,
}: {
	iconBg: string;
	icon: React.ReactNode;
	title: string;
	sub: string;
}) {
	return (
		<a
			href="/landing/2"
			className="flex flex-1 items-center gap-4 rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-transform hover:-translate-y-0.5"
		>
			<span
				className={`flex size-12 items-center justify-center rounded-xl ${iconBg}`}
			>
				{icon}
			</span>
			<span className="flex flex-col gap-0.5">
				<span className="text-base font-bold text-[#0f172a]">{title}</span>
				<span className="text-sm text-[#64748b]">{sub}</span>
			</span>
			<ChevronRight className="ml-auto size-5 text-[#cbd5e1]" />
		</a>
	);
}

/* ── 비급여 진료비 안내 + 프로모션 배너 ── */
function Pricing() {
	return (
		<section className="bg-white py-16 md:py-20">
			<div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-5 md:px-8">
				{/* 가격표 */}
				<div className="rounded-3xl border border-[#e5e7eb] bg-white p-7 shadow-[0_20px_30px_-20px_rgba(0,0,0,0.08)] md:p-12">
					<h2 className="text-xl font-bold text-[#111827] md:text-[22px]">
						비급여 진료비 안내
					</h2>
					<p className="mt-2 text-base text-[#374151]">
						주요 비급여 진료 항목 및 비용을 투명하게 안내드립니다.
					</p>
					<div className="mt-6 overflow-hidden rounded-2xl border border-[#f3f4f6]">
						<div className="overflow-x-auto">
							<table className="w-full min-w-[440px] text-left">
								<thead>
									<tr className="bg-[#f9fafb] text-[#4b5563]">
										<th className="px-6 py-[18px] text-[17px] font-semibold md:px-8">
											항목
										</th>
										<th className="px-6 py-[18px] text-[17px] font-semibold md:px-8">
											내용
										</th>
										<th className="px-6 py-[18px] text-right text-[17px] font-semibold md:px-8">
											금액
										</th>
									</tr>
								</thead>
								<tbody>
									{PRICES.map((p) => (
										<tr key={p.item} className="border-t border-[#f3f4f6]">
											<td className="px-6 py-[18px] font-medium text-[#111827] md:px-8">
												{p.item}
											</td>
											<td className="px-6 py-[18px] text-[15px] text-[#6b7280] md:px-8">
												{p.desc}
											</td>
											<td className="px-6 py-[18px] text-right text-[17px] font-bold text-[#111827] md:px-8">
												{p.amount}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
					<div className="mt-3 flex items-center justify-between gap-4">
						<p className="text-sm text-[#374151]">
							※ 건강보험이 적용되지 않는 비급여 항목 기준입니다.
						</p>
						<a
							href="/landing/2"
							className="hidden shrink-0 items-center gap-1 text-base font-medium text-[#059669] sm:inline-flex"
						>
							전체 비급여 진료비 보기
							<ArrowRight className="size-4" />
						</a>
					</div>
				</div>

				{/* 프로모션 배너 */}
				<div className="relative overflow-hidden rounded-[32px] bg-[#1e293b] p-8 text-white shadow-[0_32px_64px_-24px_rgba(0,0,0,0.4)] md:p-12">
					<div className="pointer-events-none absolute -top-10 -left-10 size-60 rounded-full bg-white/5" />
					<span className="relative inline-block rounded-full bg-[#059669] px-4 py-1 text-xs font-bold tracking-wide">
						프로모션
					</span>
					<h3 className="relative mt-4 text-2xl leading-tight font-extrabold md:text-[40px] md:leading-[48px]">
						봄맞이 종합건강검진
						<br />
						특별 프로그램
					</h3>
					<p className="relative mt-4 text-base leading-relaxed text-[#d1d5db] md:text-lg">
						조기 발견과 예방을 위한 맞춤형 건강검진. 최신 의료장비와 전문
						의료진이 함께합니다.
					</p>
					<ul className="relative mt-6 grid max-w-[500px] grid-cols-1 gap-x-8 gap-y-4 text-base sm:grid-cols-2">
						{PROMO_FEATURES.map((f) => (
							<li key={f} className="flex items-center gap-3">
								<span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#f0fdf4]">
									<Check className="size-3.5 text-[#059669]" />
								</span>
								{f}
							</li>
						))}
					</ul>
					<div className="relative mt-8 flex flex-wrap gap-4">
						<a
							href="/landing/2"
							className="inline-flex items-center gap-2 rounded-full bg-white px-10 py-[19px] text-lg font-bold text-[#111827] shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1)] transition-shadow hover:shadow-lg"
						>
							프로그램 자세히 보기
							<ArrowRight className="size-4" />
						</a>
						<a
							href="/landing/2"
							className="inline-flex items-center gap-2 rounded-full border border-white/50 px-10 py-[18px] text-lg font-bold text-white transition-colors hover:bg-white/10"
						>
							건강검진 예약하기
						</a>
					</div>
					<div className="relative mt-6">
						<p className="text-sm text-white/60">이벤트 기간</p>
						<p className="mt-0.5 font-medium tracking-wide text-white">
							2026.03.01 - 2026.05.31
						</p>
					</div>
				</div>
			</div>
		</section>
	);
}

/* ── 오시는 길 ── */
function Location() {
	return (
		<section id="location" className="bg-white py-20 md:py-28">
			<div className="mx-auto max-w-[1400px] px-5 md:px-8">
				<div className="mb-10 text-center">
					<h2 className="text-3xl font-bold text-[#0f172a] md:text-[48px]">
						오시는 길
					</h2>
					<p className="mt-3 text-base text-[#64748b]">
						편안하게 방문하실 수 있도록 자세히 안내해 드립니다.
					</p>
				</div>

				<div className="grid gap-8 lg:grid-cols-[7fr_5fr]">
					{/* 지도 placeholder */}
					<div className="relative flex min-h-[360px] items-center justify-center rounded-[32px] bg-[#e2e8f0] lg:min-h-[480px]">
						<span className="text-sm text-[#64748b]">지도 영역 (Map API)</span>
						<div className="absolute bottom-6 left-6 flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 shadow-md">
							<MapPin className="size-4 text-[#059669]" />
							<span className="text-sm font-semibold text-[#111827]">
								홍길동내과의원
							</span>
						</div>
					</div>

					{/* 상세 안내 */}
					<div className="flex flex-col gap-5">
						<div className="rounded-3xl border border-[#e5e7eb] bg-white p-6">
							<div className="mb-2 flex items-center gap-2">
								<MapPin className="size-5 text-[#059669]" />
								<h3 className="text-base font-bold text-[#0f172a]">주소</h3>
							</div>
							<p className="text-sm text-[#374151]">
								서울특별시 강동구 구천면로 200, 2층
							</p>
							<p className="mt-1 flex items-center gap-1.5 text-sm text-[#374151]">
								<Phone className="size-4 text-[#059669]" />
								02-1234-5678
							</p>
						</div>

						<TransitBlock
							icon={<Train className="size-5" />}
							title="지하철 이용시"
							rows={[
								{
									badge: "5호선",
									color: "bg-[#7c3aed]",
									text: "천호역 2번 출구 도보 5분",
								},
								{
									badge: "8호선",
									color: "bg-[#ec4899]",
									text: "천호역 3번 출구 도보 7분",
								},
							]}
						/>

						<TransitBlock
							icon={<Bus className="size-5" />}
							title="버스 이용시"
							rows={[
								{ badge: "간선", color: "bg-[#2563eb]", text: "130, 341, 370" },
								{
									badge: "지선",
									color: "bg-[#059669]",
									text: "3214, 3316, 3411",
								},
							]}
							note="'천호역 현대백화점' 정류장 하차"
						/>

						<div className="rounded-3xl border border-[#e5e7eb] bg-white p-6">
							<div className="mb-2 flex items-center gap-2">
								<Car className="size-5 text-[#059669]" />
								<h3 className="text-base font-bold text-[#0f172a]">
									주차 안내
								</h3>
							</div>
							<p className="text-sm leading-relaxed text-[#374151]">
								건물 지하 주차장 이용 가능 (진료 시 2시간 무료)
								<br />
								만차 시 인근 공영주차장 이용 부탁드립니다.
							</p>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

function TransitBlock({
	icon,
	title,
	rows,
	note,
}: {
	icon: React.ReactNode;
	title: string;
	rows: { badge: string; color: string; text: string }[];
	note?: string;
}) {
	return (
		<div className="rounded-3xl border border-[#e5e7eb] bg-white p-6">
			<div className="mb-3 flex items-center gap-2">
				<span className="text-[#059669]">{icon}</span>
				<h3 className="text-base font-bold text-[#0f172a]">{title}</h3>
			</div>
			<ul className="flex flex-col gap-2.5">
				{rows.map((r) => (
					<li key={r.badge} className="flex items-center gap-3">
						<span
							className={`flex min-w-[52px] items-center justify-center rounded-md px-2 py-1 text-xs font-bold text-white ${r.color}`}
						>
							{r.badge}
						</span>
						<span className="text-sm text-[#374151]">{r.text}</span>
					</li>
				))}
			</ul>
			{note ? <p className="mt-3 text-xs text-[#94a3b8]">{note}</p> : null}
		</div>
	);
}

/* ── 푸터 ── */
function Footer() {
	return (
		<footer className="bg-[#020617] py-16 text-[#9ca3af] md:py-20">
			<div className="mx-auto max-w-[1400px] px-5 md:px-8">
				<div className="grid gap-10 border-b border-[#1f2937] pb-10 md:grid-cols-3">
					{/* 브랜드 */}
					<div className="flex flex-col gap-4">
						<div className="flex items-center gap-2.5">
							<span className="flex size-10 items-center justify-center rounded-full bg-[#059669]/20 text-[#22c55e]">
								<HeartPulse className="size-5" />
							</span>
							<span className="text-2xl font-bold text-white">
								홍길동내과의원
							</span>
						</div>
						<p className="max-w-[320px] text-sm leading-relaxed text-[#9ca3af]">
							정확한 진단과 따뜻한 진료로 지역 주민의 건강을 책임지는 주치의가
							되겠습니다.
						</p>
						<div className="flex gap-3">
							<span className="flex size-9 items-center justify-center rounded-full bg-[#1f2937] text-[#9ca3af]">
								<Facebook className="size-4" />
							</span>
							<span className="flex size-9 items-center justify-center rounded-full bg-[#1f2937] text-[#9ca3af]">
								<Share2 className="size-4" />
							</span>
						</div>
					</div>

					{/* 바로가기 */}
					<div>
						<h4 className="mb-4 text-base font-semibold text-white">
							바로가기
						</h4>
						<ul className="flex flex-col gap-2.5 text-sm">
							{["병원 소개", "의료진 소개", "진료 안내", "건강검진센터"].map(
								(item) => (
									<li key={item}>
										<a href="/landing/2" className="hover:text-white">
											{item}
										</a>
									</li>
								),
							)}
						</ul>
					</div>

					{/* 진료시간 안내 */}
					<div>
						<h4 className="mb-4 text-base font-semibold text-white">
							진료시간 안내
						</h4>
						<ul className="flex flex-col gap-2.5 text-sm">
							<li className="flex justify-between">
								<span>평일</span>
								<span className="text-white">09:00 - 18:30</span>
							</li>
							<li className="flex justify-between">
								<span>토요일</span>
								<span className="text-white">09:00 - 13:00</span>
							</li>
							<li className="mt-2 border-t border-[#1f2937] pt-2.5 text-[#22c55e]">
								점심시간 없음 / 연속 진료
							</li>
						</ul>
					</div>
				</div>

				<div className="flex flex-col items-start justify-between gap-3 pt-8 text-xs lg:flex-row lg:items-center">
					<p className="flex flex-wrap gap-x-2 gap-y-1">
						<span>사업자등록번호: 123-45-67890</span>
						<span className="text-[#374151]">|</span>
						<span>대표원장: 홍길동</span>
						<span className="text-[#374151]">|</span>
						<span>주소: 서울특별시 강남구 테헤란로 123 메디컬타워 5층</span>
					</p>
					<p>© 2024 홍길동내과의원. All rights reserved.</p>
				</div>
			</div>
		</footer>
	);
}
