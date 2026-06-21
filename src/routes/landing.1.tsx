import { createFileRoute } from "@tanstack/react-router";
import {
	ArrowRight,
	Bus,
	Calendar,
	ChevronRight,
	Clock,
	FileText,
	Hospital,
	MapPin,
	Phone,
	Stethoscope,
	Train,
	Video,
} from "lucide-react";

export const Route = createFileRoute("/landing/1")({ component: Landing1 });

/* ── 디자인 색상 (시안1: 블루 의료 테마) ──
 * brand #1e40af · accent #3b82f6 · light #eff6ff · page #fafafa · ink #0f172a
 */

const NAV = ["병원안내", "진료과/의료진", "이용안내", "건강정보"];

const HOURS = [
	{ label: "평일", value: "09:00 - 18:00" },
	{ label: "점심시간", value: "12:00 - 13:00" },
	{ label: "토요일", value: "09:00 - 13:00" },
];

type Doctor = {
	tag: string;
	name: string;
	role: string;
	specialty: string;
	bio: string[];
	// 월~토 오전/오후 (true = 진료, false = 휴진)
	morning: boolean[];
	afternoon: boolean[];
};

const DOCTORS: Doctor[] = [
	{
		tag: "내과 전문의",
		name: "김도형",
		role: "원장",
		specialty: "소화기내과 / 위대장내시경 / 간클리닉",
		bio: [
			"서울대학교 의과대학 졸업",
			"서울대학교병원 내과 전문의",
			"대한소화기내시경학회 평생회원",
		],
		morning: [true, true, false, true, true, true],
		afternoon: [true, true, true, true, true, false],
	},
	{
		tag: "가정의학과 전문의",
		name: "이지연",
		role: "원장",
		specialty: "만성질환 / 비만클리닉 / 건강검진",
		bio: [
			"연세대학교 의과대학 졸업",
			"세브란스병원 가정의학과 전문의",
			"대한비만학회 정회원",
		],
		morning: [true, true, true, true, true, false],
		afternoon: [true, true, true, true, false, false],
	},
];

const NOTICES = [
	{ title: "독감 예방접종 안내 (4가 백신 입고)", date: "2023.10.05" },
	{ title: "10월 9일 한글날 휴진 안내", date: "2023.09.28" },
	{ title: "국가건강검진 예약 접수 중", date: "2023.09.15" },
	{ title: "코로나19 백신 추가 접종 안내", date: "2023.09.01" },
];

const COLUMNS = [
	{
		title: "환절기 면역력 관리가 중요한 이유",
		sub: "급격한 기온 변화로 인한 신체 리듬 저하 대처법",
	},
	{
		title: "위내시경, 언제부터 받아야 할까?",
		sub: "연령별 권장 검사 주기와 주의사항 안내",
	},
];

const PRICES = [
	{ item: "독감 예방접종", desc: "4가 백신", amount: "40,000원" },
	{ item: "대상포진 예방접종", desc: "싱그릭스", amount: "180,000원" },
	{ item: "건강진단서", desc: "일반 진단서 발급", amount: "20,000원" },
	{ item: "영문진단서", desc: "영문 진단서 발급", amount: "30,000원" },
	{ item: "결핵 예방접종", desc: "백신", amount: "30,000원" },
	{ item: "간염 예방접종", desc: "백신", amount: "30,000원" },
];

const DAYS = ["월", "화", "수", "목", "금", "토"];

function Landing1() {
	return (
		<div className="min-h-screen bg-[#fafafa] font-sans text-[#1e293b] [letter-spacing:-0.5px]">
			<Header />
			<main>
				<Hero />
				<Doctors />
				<Boards />
				<Directions />
				<Pricing />
			</main>
			<Footer />
		</div>
	);
}

/* ── 헤더 ── */
function Header() {
	return (
		<header className="sticky top-0 z-50 border-b border-[#e2e8f0] bg-white/90 backdrop-blur-md">
			<div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 md:h-20 md:px-8">
				<div className="flex items-center gap-6 lg:gap-12">
					<a href="/landing/1" className="flex items-center gap-2.5">
						<span className="flex size-8 items-center justify-center rounded-lg bg-[#1e40af] text-white">
							<Hospital className="size-5" />
						</span>
						<span className="text-lg font-bold text-[#0f172a] md:text-2xl">
							서울아산병원
						</span>
					</a>
					<nav className="hidden items-center gap-8 lg:flex">
						{NAV.map((item) => (
							<a
								key={item}
								href="/landing/1"
								className="text-[15px] text-[#64748b] transition-colors hover:text-[#1e40af]"
							>
								{item}
							</a>
						))}
					</nav>
				</div>
				<a
					href="/landing/1"
					className="text-sm text-[#64748b] transition-colors hover:text-[#1e40af]"
				>
					로그인
				</a>
			</div>
		</header>
	);
}

/* ── 히어로 ── */
function Hero() {
	return (
		<section className="relative overflow-hidden">
			{/* 배경 글로우 */}
			<div className="pointer-events-none absolute inset-0">
				<div className="absolute -top-32 -right-24 size-[480px] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.1),transparent_70%)]" />
				<div className="absolute -bottom-24 -left-24 size-[480px] rounded-full bg-[radial-gradient(circle,rgba(30,64,175,0.05),transparent_70%)]" />
			</div>
			<div className="relative mx-auto max-w-[1440px] px-5 pt-16 pb-20 md:px-8 md:pt-24 md:pb-28">
				<div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
					<div className="flex flex-col gap-6">
						<h1 className="text-[40px] leading-[1.15] font-bold tracking-[-0.7px] text-[#0f172a] md:text-[64px]">
							당신의 건강한 내일을 위한
							<br />
							<span className="bg-gradient-to-r from-[#1e40af] to-[#3b82f6] bg-clip-text text-transparent">
								최고의 선택
							</span>
						</h1>
						<p className="max-w-[520px] text-base leading-relaxed text-[#64748b] md:text-xl">
							최첨단 의료 장비와 분야별 전문 의료진이 환자 중심의 맞춤형 진료를
							제공합니다. 끊임 없는 연구로 더 나은 의료 서비스를 약속드립니다.
						</p>
						<div>
							<a
								href="/landing/1"
								className="inline-flex h-[60px] items-center gap-2 rounded-xl bg-white px-8 text-lg text-[#0f172a] shadow-[0_1px_1px_rgba(0,0,0,0.05)] ring-1 ring-[#e2e8f0] transition-shadow hover:shadow-md"
							>
								<Phone className="size-[18px] text-[#1e40af]" />
								전화예약 1688-7575
							</a>
						</div>
					</div>
					{/* 히어로 이미지 placeholder */}
					<div className="flex aspect-[11/10] w-full items-center justify-center rounded-[32px] bg-gradient-to-br from-[#dbeafe] to-[#eff6ff] text-sm font-medium text-[#1e40af] shadow-[0_10px_40px_-12px_rgba(30,64,175,0.3)]">
						병원 전경 이미지
					</div>
				</div>

				{/* 진료시간 / 오시는 길 카드 */}
				<div className="mt-12 grid gap-6 md:mt-16 lg:grid-cols-2 lg:gap-8">
					<InfoCard icon={<Clock className="size-6" />} title="진료시간 안내">
						<dl className="flex flex-col gap-3">
							{HOURS.map((h) => (
								<div
									key={h.label}
									className="flex items-center justify-between border-b border-[#f1f5f9] pb-3 last:border-0 last:pb-0"
								>
									<dt className="text-[#64748b]">{h.label}</dt>
									<dd className="font-semibold text-[#0f172a]">{h.value}</dd>
								</div>
							))}
						</dl>
						<p className="mt-4 text-sm font-medium text-[#ef4444]">
							* 일요일/공휴일 휴진
						</p>
					</InfoCard>

					<InfoCard icon={<MapPin className="size-6" />} title="오시는 길">
						<p className="text-lg leading-relaxed text-[#64748b]">
							서울특별시 송파구 올림픽로 43길 88 (풍납2동 388-1)
						</p>
						<a
							href="#directions"
							className="mt-5 inline-flex items-center gap-1 text-lg text-[#1e40af]"
						>
							지도 보기
							<ChevronRight className="size-4" />
						</a>
					</InfoCard>
				</div>
			</div>
		</section>
	);
}

function InfoCard({
	icon,
	title,
	children,
}: {
	icon: React.ReactNode;
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className="rounded-3xl border border-[#e2e8f0] bg-white p-7 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.12)] md:p-8">
			<div className="mb-5 flex items-center gap-3">
				<span className="flex size-11 items-center justify-center rounded-xl bg-[#eff6ff] text-[#1e40af]">
					{icon}
				</span>
				<h2 className="text-xl font-bold text-[#0f172a] md:text-2xl">
					{title}
				</h2>
			</div>
			{children}
		</div>
	);
}

/* ── 전문 의료진 소개 ── */
function Doctors() {
	return (
		<section className="bg-white py-20 md:py-24">
			<div className="mx-auto max-w-[1440px] px-5 md:px-8">
				<div className="mb-10 flex items-end justify-between gap-4">
					<div>
						<p className="mb-2 text-sm font-semibold text-[#3b82f6]">
							의료진 소개
						</p>
						<h2 className="text-3xl font-bold text-[#0f172a] md:text-[40px]">
							전문 의료진 소개
						</h2>
					</div>
					<a
						href="/landing/1"
						className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-[#64748b] transition-colors hover:text-[#1e40af]"
					>
						전체보기
						<ChevronRight className="size-4" />
					</a>
				</div>

				<div className="grid gap-8 lg:grid-cols-2">
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
		<article className="overflow-hidden rounded-[32px] border border-[#e2e8f0] bg-[#f8fafc]">
			<div className="flex flex-col gap-0 sm:flex-row">
				{/* 사진 placeholder */}
				<div className="flex aspect-square w-full shrink-0 items-center justify-center bg-[#e5e7eb] text-sm font-medium text-[#94a3b8] sm:size-[260px] lg:size-[280px]">
					<span className="flex flex-col items-center gap-2">
						<Stethoscope className="size-8" />
						의료진 사진
					</span>
				</div>
				<div className="flex flex-1 flex-col gap-4 p-7 md:p-9">
					<div className="flex flex-wrap items-baseline gap-2">
						<span className="rounded-md bg-[#eff6ff] px-2 py-1 text-xs font-medium text-[#1e40af]">
							{doc.tag}
						</span>
						<span className="text-2xl font-bold text-[#0f172a] md:text-[30px]">
							{doc.name}
						</span>
						<span className="text-lg font-medium text-[#64748b]">
							{doc.role}
						</span>
					</div>
					<p className="text-sm font-medium text-[#1e40af]">{doc.specialty}</p>
					<ul className="flex flex-col gap-1.5 text-sm text-[#64748b]">
						{doc.bio.map((line) => (
							<li key={line}>• {line}</li>
						))}
					</ul>
					<Schedule doc={doc} />
				</div>
			</div>
		</article>
	);
}

function Schedule({ doc }: { doc: Doctor }) {
	return (
		<div className="mt-2">
			<p className="mb-2 text-sm font-semibold text-[#0f172a]">진료 일정</p>
			<div className="grid grid-cols-6 gap-1 text-center text-xs">
				{DAYS.map((d) => (
					<div key={d} className="py-1 font-medium text-[#9ca3af]">
						{d}
					</div>
				))}
				{doc.morning.map((open, i) => (
					<Cell key={`am-${DAYS[i]}`} open={open} label="오전" />
				))}
				{doc.afternoon.map((open, i) => (
					<Cell key={`pm-${DAYS[i]}`} open={open} label="오후" tone="day" />
				))}
			</div>
		</div>
	);
}

function Cell({
	open,
	label,
	tone = "am",
}: {
	open: boolean;
	label: string;
	tone?: "am" | "day";
}) {
	if (!open) {
		return <div className="rounded py-1 text-[#d1d5db]">-</div>;
	}
	return (
		<div
			className={
				tone === "am"
					? "rounded bg-[#eff6ff] py-1 font-medium text-[#1e40af]"
					: "rounded bg-[#f3f4f6] py-1 text-[#0f172a]"
			}
		>
			{label}
		</div>
	);
}

/* ── 공지사항 / 건강 칼럼 / CTA ── */
function Boards() {
	return (
		<section className="border-y border-[#e5e7eb] bg-[#f9fafb] py-16 md:py-20">
			<div className="mx-auto grid max-w-[1440px] gap-6 px-5 md:px-8 lg:grid-cols-3 lg:gap-8">
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
								<span className="shrink-0 text-xs text-[#9ca3af]">
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
								<span className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-[#f3f4f6]">
									<span className="flex size-9 items-center justify-center rounded-md bg-[#dbeafe] text-[#1e40af]">
										<FileText className="size-4" />
									</span>
								</span>
								<span className="flex flex-col gap-1">
									<span className="text-sm font-semibold text-[#1e293b]">
										{c.title}
									</span>
									<span className="text-xs text-[#64748b]">{c.sub}</span>
								</span>
							</li>
						))}
					</ul>
				</BoardCard>

				{/* CTA 카드 2개 */}
				<div className="flex flex-col gap-4">
					<CtaCard
						bg="bg-[#0f172a]"
						icon={<Video className="size-9" />}
						title="비대면 진료 안내"
						sub="집에서 편리하게 진료받으세요"
						subColor="text-[#9ca3af]"
					/>
					<CtaCard
						bg="bg-[#1e40af]"
						icon={<Calendar className="size-9" />}
						title="건강검진 프로그램"
						sub="연령별 맞춤 검진 패키지"
						subColor="text-[#bfdbfe]"
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
		<div className="rounded-[20px] border border-[#e5e7eb] bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
			<h3 className="mb-4 text-lg font-bold text-[#0f172a]">{title}</h3>
			{children}
		</div>
	);
}

function CtaCard({
	bg,
	icon,
	title,
	sub,
	subColor,
}: {
	bg: string;
	icon: React.ReactNode;
	title: string;
	sub: string;
	subColor: string;
}) {
	return (
		<a
			href="/landing/1"
			className={`relative flex h-[124px] flex-1 items-center overflow-hidden rounded-[20px] ${bg} p-6 text-white shadow-[0_1px_2px_rgba(0,0,0,0.05)] transition-transform hover:-translate-y-0.5`}
		>
			<span className="flex flex-col gap-1">
				<span className="text-lg font-bold">{title}</span>
				<span className={`text-sm ${subColor}`}>{sub}</span>
			</span>
			<span className="pointer-events-none absolute right-6 bottom-1/2 translate-y-1/2 text-white/15">
				{icon}
			</span>
		</a>
	);
}

/* ── 찾아오시는 길 ── */
function Directions() {
	return (
		<section id="directions" className="bg-white py-20 md:py-24">
			<div className="mx-auto max-w-[1440px] px-5 md:px-8">
				<div className="mb-10 text-center">
					<h2 className="text-3xl font-bold text-[#0f172a] md:text-[40px]">
						찾아오시는 길
					</h2>
					<p className="mt-3 text-base text-[#64748b]">
						편리한 교통편으로 방문하실 수 있습니다.
					</p>
				</div>

				{/* 지도 placeholder */}
				<div className="flex h-[300px] items-center justify-center rounded-3xl bg-[#f3f4f6] md:h-[400px]">
					<div className="flex flex-col items-center gap-3 text-[#64748b]">
						<span className="flex size-16 items-center justify-center rounded-full bg-white shadow-md">
							<MapPin className="size-7 text-[#1e40af]" />
						</span>
						<span className="text-sm">지도 영역 (Kakao/Naver Map API)</span>
					</div>
				</div>

				<div className="mt-8 grid gap-6 md:grid-cols-2 md:gap-8">
					<TransitCard
						icon={<Train className="size-5" />}
						title="지하철 이용시"
						rows={[
							{
								badge: "2",
								color: "bg-[#22c55e]",
								text: "잠실나루역 1번 출구 도보 10분",
							},
							{
								badge: "8",
								color: "bg-[#ec4899]",
								text: "몽촌토성역 1번 출구 도보 15분",
							},
						]}
					/>
					<TransitCard
						icon={<Bus className="size-5" />}
						title="버스 이용시"
						rows={[
							{
								badge: "간선",
								color: "bg-[#dbeafe] text-[#1d4ed8]",
								text: "112, 3318, 3411, 4318 (서울아산병원 앞 하차)",
							},
							{
								badge: "지선",
								color: "bg-[#dcfce7] text-[#15803d]",
								text: "97, 112-5 (서울아산병원 동관 앞 하차)",
							},
						]}
					/>
				</div>
			</div>
		</section>
	);
}

function TransitCard({
	icon,
	title,
	rows,
}: {
	icon: React.ReactNode;
	title: string;
	rows: { badge: string; color: string; text: string }[];
}) {
	return (
		<div className="rounded-3xl border border-[#e2e8f0] bg-white p-7">
			<div className="mb-4 flex items-center gap-2.5">
				<span className="flex size-9 items-center justify-center rounded-lg bg-[#eff6ff] text-[#1e40af]">
					{icon}
				</span>
				<h3 className="text-lg font-bold text-[#0f172a]">{title}</h3>
			</div>
			<ul className="flex flex-col gap-3">
				{rows.map((r) => (
					<li key={r.badge} className="flex items-center gap-3">
						<span
							className={`flex min-w-9 items-center justify-center rounded px-2 py-1 text-xs font-bold ${
								r.color.includes("text-") ? r.color : `${r.color} text-white`
							}`}
						>
							{r.badge}
						</span>
						<span className="text-sm text-[#1e293b]">{r.text}</span>
					</li>
				))}
			</ul>
		</div>
	);
}

/* ── 비급여 진료비 안내 + 프로모션 ── */
function Pricing() {
	return (
		<section className="border-y border-[#e5e7eb] bg-[#f9fafb] py-16 md:py-20">
			<div className="mx-auto grid max-w-[1440px] items-start gap-8 px-5 md:px-8 lg:grid-cols-[1.9fr_1fr] lg:gap-10">
				{/* 가격표 */}
				<div className="overflow-hidden rounded-3xl border border-[#e2e8f0] bg-white">
					<div className="border-b border-[#e2e8f0] px-6 py-5 md:px-8">
						<h2 className="text-xl font-bold text-[#111827] md:text-[22px]">
							비급여 진료비 안내
						</h2>
					</div>
					<div className="overflow-x-auto">
						<table className="w-full min-w-[480px] text-left">
							<thead>
								<tr className="bg-[#f9fafb] text-[#374151]">
									<th className="px-6 py-4 text-[15px] font-semibold md:px-8">
										항목
									</th>
									<th className="px-6 py-4 text-[15px] font-semibold">내용</th>
									<th className="px-6 py-4 text-right text-[15px] font-semibold md:px-8">
										금액
									</th>
								</tr>
							</thead>
							<tbody>
								{PRICES.map((p) => (
									<tr key={p.item} className="border-t border-[#f1f5f9]">
										<td className="px-6 py-4 text-[#1e293b] md:px-8">
											{p.item}
										</td>
										<td className="px-6 py-4 text-[#64748b]">{p.desc}</td>
										<td className="px-6 py-4 text-right font-medium text-[#0f172a] md:px-8">
											{p.amount}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					<p className="px-6 py-4 text-sm text-[#6b7280] md:px-8">
						건강보험이 적용되지 않는 비급여 항목 기준입니다.
					</p>
				</div>

				{/* 프로모션 배너 */}
				<div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1e40af] to-[#3b82f6] p-8 text-white shadow-[0_10px_40px_-12px_rgba(30,64,175,0.5)]">
					<span className="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-semibold tracking-wide uppercase">
						봄맞이 프로모션
					</span>
					<h3 className="mt-4 text-2xl leading-snug font-black md:text-[32px]">
						봄맞이 종합건강검진
						<br />
						특별 프로그램
					</h3>
					<p className="mt-3 text-sm leading-relaxed text-[#dbeafe]">
						조기 발견과 예방을 위한 맞춤형 건강검진. 최신 의료장비와 전문
						의료진이 함께합니다.
					</p>
					<ul className="mt-6 grid grid-cols-2 gap-3 text-sm">
						{[
							"종합검진 15% 할인",
							"위·대장 내시경 패키지",
							"초음파 검사 포함",
							"전문의 1:1 결과 상담",
						].map((f) => (
							<li key={f} className="flex items-center gap-1.5">
								<ChevronRight className="size-4 shrink-0 text-[#bfdbfe]" />
								{f}
							</li>
						))}
					</ul>
					<p className="mt-6 text-xs text-[#bfdbfe]">
						이벤트 기간: 2026.03.01 - 2026.05.31
					</p>
					<a
						href="/landing/1"
						className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-base font-semibold text-[#1e40af] shadow-md transition-shadow hover:shadow-lg"
					>
						프로그램 자세히 보기
						<ArrowRight className="size-4" />
					</a>
				</div>
			</div>
		</section>
	);
}

/* ── 푸터 ── */
function Footer() {
	return (
		<footer className="border-t border-[#1f2937] bg-[#0f172a] py-12 text-[#9ca3af]">
			<div className="mx-auto max-w-[1440px] px-5 md:px-8">
				<div className="flex flex-col justify-between gap-8 border-b border-[#1f2937] pb-8 md:flex-row">
					<div className="flex flex-col gap-3">
						<div className="flex items-center gap-2">
							<span className="flex size-6 items-center justify-center rounded bg-[#1e40af] text-white">
								<Hospital className="size-3.5" />
							</span>
							<span className="text-xl font-bold text-white">서울아산병원</span>
						</div>
						<div className="flex flex-col gap-1 text-[13px] leading-relaxed">
							<p>서울특별시 송파구 올림픽로 43길 88 (풍납2동 388-1)</p>
							<p>대표전화 : 1688-7575 | 팩스 : 02-3010-0000</p>
							<p>사업자등록번호 : 123-45-67890 | 대표자 : 홍길동</p>
						</div>
					</div>
					<div className="flex gap-12">
						<ul className="flex flex-col gap-2 text-sm">
							<li>
								<a href="/landing/1" className="hover:text-white">
									병원소개
								</a>
							</li>
							<li>
								<a href="/landing/1" className="hover:text-white">
									이용약관
								</a>
							</li>
							<li>
								<a href="/landing/1" className="font-medium text-white">
									개인정보처리방침
								</a>
							</li>
						</ul>
						<ul className="flex flex-col gap-2 text-sm">
							<li>
								<a href="/landing/1" className="hover:text-white">
									환자의 권리와 의무
								</a>
							</li>
							<li>
								<a href="/landing/1" className="hover:text-white">
									비급여 진료비 안내
								</a>
							</li>
							<li>
								<a href="/landing/1" className="hover:text-white">
									찾아오시는 길
								</a>
							</li>
						</ul>
					</div>
				</div>
				<div className="flex flex-col items-start justify-between gap-4 pt-6 sm:flex-row sm:items-center">
					<p className="text-xs">
						Copyright © ASAN MEDICAL CENTER. All rights reserved.
					</p>
				</div>
			</div>
		</footer>
	);
}
