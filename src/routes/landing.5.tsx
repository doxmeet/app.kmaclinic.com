import { createFileRoute } from "@tanstack/react-router";
import {
	ArrowRight,
	Bookmark,
	Bus,
	Check,
	Clock,
	Facebook,
	Globe,
	Hospital,
	Instagram,
	List,
	MapPin,
	Phone,
	Plus,
	Train,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/landing/5")({ component: Landing5Page });

// ── 더미 데이터 (bold red "racing red" clinic) ─────────────────
const CLINIC = "홍길동내과의원";
const CLINIC_ALT = "서울아산병원";
const PHONE = "02-1234-5678";
const PHONE_BOOK = "1688-7575";
const ADDRESS = "서울특별시 중구 구천면로 200";
const ADDRESS_SUB = "메디컬타워 2층 (주차장 완비)";
const ADDRESS_ALT = "서울특별시 송파구 올림픽로43길 88";

const NAV = ["진료안내", "의료진 소개", "커뮤니티", "오시는 길"];

const SPECIALTY_TABS = ["내과", "소화기내과", "이비인후과"];

const SPECIALTY_ITEMS = [
	{
		title: "정확한 진단 (AI 보조진단)",
		desc: "최신 AI 기술을 활용한 정밀한 영상 판독",
	},
	{
		title: "디지털 X-ray (저선량 촬영)",
		desc: "안전하고 선명한 고해상도 디지털 영상",
	},
	{
		title: "통합검진 원스톱 시스템",
		desc: "당일 검사부터 결과 상담까지 신속하게",
	},
];

const HOURS = [
	["평일", "09:00 - 18:30", false],
	["토요일", "09:00 - 13:00", false],
	["일요일 / 공휴일", "휴진", true],
] as const;

const DOCTORS = [
	{
		name: "김도형 원장",
		spec: "내과 전문의 / 소화기내과",
		photo: "의사 사진 (남)",
		credentials: [
			"서울아산병원 소화기내과 임상교수",
			"대한소화기내시경학회 정회원",
		],
		am: [true, true, false, true, true],
		pm: [true, false, true, true, true],
	},
	{
		name: "이지연 원장",
		spec: "가정의학과 전문의 / 만성질환",
		photo: "의사 사진 (여)",
		credentials: ["서울대학교병원 가정의학과 전문의", "대한비만학회 인정의"],
		am: [true, false, true, true, true],
		pm: [false, true, true, true, true],
	},
];

const WEEK = ["월", "화", "수", "목", "금"];

const NOTICES = [
	{
		tag: "안내",
		red: true,
		title: "2024년 독감 예방접종 안내",
		desc: "10월 1일부터 전 연령 대상 무료 및 유료 접종...",
	},
	{
		tag: "소식",
		red: false,
		title: "추석 연휴 기간 진료 일정 안내",
		desc: "9월 16일(월)부터 18일(수)까지 응급센터 정상...",
	},
];

const ARTICLES = [
	{
		title: "환절기 면역력을 높이는 5가지 슈퍼푸드",
		meta: "2024.03.15 | 김도형 원장",
		thumb: "건강식품 이미지",
	},
	{
		title: "위대장 내시경, 정기적으로 받아야 하는 이유",
		meta: "2024.03.10 | 이지연 원장",
		thumb: "내시경실 이미지",
	},
];

const PRICES = [
	["독감 예방접종", "4가 백신", "40,000원"],
	["대상포진 예방접종", "싱그릭스", "180,000원"],
	["건강진단서", "일반 진단서 발급", "20,000원"],
	["영문진단서", "영문 진단서 발급", "30,000원"],
	["채용 신체검사", "일반 채용검진", "30,000원"],
];

const PROMO_PERKS = [
	"종합검진 15% 할인",
	"위·대장 내시경 패키지",
	"초음파 검사 포함",
	"전문의 1:1 결과 상담",
];

const TRANSIT = [
	{
		icon: Train,
		color: "#2563eb",
		title: "지하철 이용 시",
		desc: "2호선 잠실나루역 1번 출구\n도보 약 10분 또는 셔틀버스 이용",
	},
	{
		icon: Bus,
		color: "#16a34a",
		title: "버스 이용 시",
		desc: "서울아산병원앞 정류장 하차\n지선 4318, 3412번 등 이용 가능",
	},
];

const FOOTER_HOSPITAL = [
	"병원 소개",
	"의료진 소개",
	"진료 안내",
	"비급여 안내",
];
const FOOTER_SUPPORT = [
	"이용약관",
	"개인정보처리방침",
	"오시는 길",
	"건강 칼럼",
];

const RED = "#e30613";

function Landing5Page() {
	return (
		<div className="min-h-screen bg-white font-sans text-[#111] tracking-[-0.01em]">
			<Header5 />
			<Hero5 />
			<InfoCards5 />
			<Doctors5 />
			<CommunityRow5 />
			<Prices5 />
			<Promo5 />
			<MapSection5 />
			<Footer5 />
		</div>
	);
}

function Header5() {
	return (
		<header className="sticky top-0 z-40 border-b border-[#f3f4f6] bg-white/90 backdrop-blur-md">
			<div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-6">
				<div className="flex items-center gap-2.5">
					<Hospital className="size-6" style={{ color: RED }} />
					<span className="text-xl font-bold tracking-[-0.02em] text-[#111]">
						{CLINIC}
					</span>
				</div>
				<nav className="hidden items-center gap-10 md:flex">
					{NAV.map((item) => (
						<button
							key={item}
							type="button"
							className="text-base font-medium text-[#374151] transition-colors hover:text-[#e30613]"
						>
							{item}
						</button>
					))}
				</nav>
				<div className="text-right">
					<p className="text-[13px] text-[#6b7280]">진료예약 및 상담</p>
					<p className="text-lg font-bold text-[#111]">{PHONE}</p>
				</div>
			</div>
		</header>
	);
}

function Hero5() {
	const [tab, setTab] = useState(0);
	return (
		<section className="relative overflow-hidden bg-white">
			<div className="pointer-events-none absolute -right-40 -top-40 size-[800px] rounded-full bg-[#f9fafb] opacity-50 blur-[50px]" />
			<div className="relative mx-auto grid max-w-[1440px] items-center gap-16 px-6 py-16 md:py-28 lg:grid-cols-2">
				<div>
					<span className="inline-flex items-center gap-2 rounded-full border border-[#fee2e2] bg-[#fef2f2] px-4 py-1.5">
						<span
							className="size-2 rounded-full"
							style={{ backgroundColor: RED }}
						/>
						<span className="text-sm font-bold" style={{ color: RED }}>
							프리미엄 건강 관리의 시작
						</span>
					</span>
					<h1 className="mt-6 text-4xl font-extrabold leading-[1.2] tracking-[-0.025em] md:text-[64px]">
						언제나{" "}
						<span className="relative inline-block" style={{ color: RED }}>
							가족 같은 마음
							<span
								className="absolute -bottom-1 left-0 h-1 w-full rounded-full opacity-70"
								style={{ backgroundColor: RED }}
							/>
						</span>
						으로,
						<br />
						당신의 건강을
						<br />
						먼저 생각합니다.
					</h1>
					<p className="mt-6 max-w-xl text-lg font-medium leading-relaxed text-[#374151]/90">
						대학병원급 최첨단 장비와 풍부한 임상경험을 바탕으로 정확한 진단과
						따뜻한 진료를 약속드립니다. 당신의 평생 건강 주치의가 되겠습니다.
					</p>
					<div className="mt-8 flex flex-wrap gap-3">
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-xl px-7 py-4 text-base font-bold text-white shadow-[0_8px_20px_-6px_rgba(227,6,19,0.5)]"
							style={{ backgroundColor: RED }}
						>
							전화 예약하기
							<ArrowRight className="size-4" />
						</button>
						<button
							type="button"
							className="inline-flex items-center gap-2 rounded-xl border-2 border-[#e5e7eb] bg-white px-7 py-4 text-base font-bold text-[#111]"
						>
							의료진 소개
						</button>
					</div>
				</div>

				{/* 우측: 주요 진료 과목 카드 (+ 오프셋 장식 프레임) */}
				<div className="relative">
					<div className="absolute inset-0 translate-x-4 translate-y-4 rounded-3xl border-2 border-[#e5e7eb]" />
					<div className="relative rounded-3xl border border-[#f3f4f6] bg-white p-8 shadow-[0_10px_30px_-5px_rgba(0,0,0,0.08)]">
						<div className="flex items-center justify-between">
							<h2 className="text-2xl font-bold text-[#111]">주요 진료 과목</h2>
							<span
								className="flex size-10 items-center justify-center rounded-full bg-[#f9fafb]"
								style={{ color: RED }}
							>
								<List className="size-5" />
							</span>
						</div>
						<div className="mt-6 flex gap-1 rounded-xl bg-[#f9fafb] p-1.5">
							{SPECIALTY_TABS.map((t, i) => (
								<button
									key={t}
									type="button"
									onClick={() => setTab(i)}
									className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition-colors ${
										tab === i
											? "bg-white text-[#111] shadow-sm"
											: "text-[#6b7280]"
									}`}
								>
									{t}
								</button>
							))}
						</div>
						<ul className="mt-6 flex flex-col gap-3">
							{SPECIALTY_ITEMS.map((item, i) => (
								<li
									key={item.title}
									className="flex items-center gap-4 rounded-2xl bg-[#f9fafb] p-4"
								>
									<span
										className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold shadow-sm"
										style={{ color: RED }}
									>
										{i + 1}
									</span>
									<div>
										<p className="text-base font-bold text-[#111]">
											{item.title}
										</p>
										<p className="mt-0.5 text-sm text-[#6b7280]">{item.desc}</p>
									</div>
								</li>
							))}
						</ul>
					</div>
				</div>
			</div>
		</section>
	);
}

function InfoCards5() {
	return (
		<section className="bg-[#f9fafb] py-20 md:py-24">
			<div className="mx-auto grid max-w-[1440px] gap-6 px-6 md:grid-cols-2">
				{/* 진료시간 안내 */}
				<div className="relative overflow-hidden rounded-[20px] border border-[#f3f4f6] bg-white p-8 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]">
					<div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-[#f9fafb]" />
					<div className="relative flex items-center justify-between">
						<div className="flex items-center gap-3">
							<span
								className="flex size-12 items-center justify-center rounded-xl bg-[#f9fafb]"
								style={{ color: RED }}
							>
								<Clock className="size-6" />
							</span>
							<h3 className="text-2xl font-bold text-[#111]">진료시간 안내</h3>
						</div>
						<span
							className="rounded-full px-3 py-1 text-xs font-bold text-white"
							style={{ backgroundColor: RED }}
						>
							점심시간 없음
						</span>
					</div>
					<dl className="relative mt-6 flex flex-col gap-4">
						{HOURS.map(([label, value, closed]) => (
							<div
								key={label}
								className="flex items-center justify-between border-b border-[#f3f4f6] pb-4 last:border-0 last:pb-0"
							>
								<dt
									className={`text-[17px] ${closed ? "text-[#9ca3af]" : "text-[#374151]"}`}
								>
									{label}
								</dt>
								<dd
									className="text-lg font-bold"
									style={{ color: closed ? RED : "#111" }}
								>
									{value}
								</dd>
							</div>
						))}
					</dl>
				</div>

				{/* 오시는 길 */}
				<div className="relative overflow-hidden rounded-[20px] border border-[#f3f4f6] bg-white p-8 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]">
					<div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-[#f9fafb]" />
					<div className="relative flex items-center gap-3">
						<span
							className="flex size-12 items-center justify-center rounded-xl bg-[#f9fafb]"
							style={{ color: RED }}
						>
							<MapPin className="size-6" />
						</span>
						<h3 className="text-2xl font-bold text-[#111]">오시는 길</h3>
					</div>
					<p className="relative mt-6 text-xl font-bold text-[#111]">
						{ADDRESS}
					</p>
					<p className="relative mt-1 text-base text-[#6b7280]">
						{ADDRESS_SUB}
					</p>
					<button
						type="button"
						className="relative mt-6 inline-flex items-center gap-1.5 text-base font-bold"
						style={{ color: RED }}
					>
						지도 보기
						<ArrowRight className="size-4" />
					</button>
				</div>
			</div>
		</section>
	);
}

function Doctors5() {
	return (
		<section className="bg-white py-20 md:py-24">
			<div className="mx-auto max-w-[1440px] px-6">
				<div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
					<div>
						<h2 className="text-3xl font-black text-[#111] md:text-[32px]">
							분야별 전문 의료진
						</h2>
						<p className="mt-3 text-lg text-[#374151]">
							최고의 실력과 따뜻한 마음을 가진 의료진을 소개합니다.
						</p>
					</div>
					<button
						type="button"
						className="border-b-2 border-[#374151] pb-1 text-base font-bold text-[#374151]"
					>
						전체 의료진 보기
					</button>
				</div>
				<div className="mt-12 grid gap-12 lg:grid-cols-2">
					{DOCTORS.map((d) => (
						<article
							key={d.name}
							className="flex flex-col gap-10 rounded-3xl border border-[#e5e7eb] p-6 sm:flex-row sm:p-10"
						>
							<div className="flex aspect-[3/4] w-full shrink-0 items-center justify-center rounded-2xl bg-[#f9fafb] text-center text-sm font-medium text-[#9ca3af] sm:h-64 sm:w-48">
								{d.photo}
							</div>
							<div className="min-w-0 flex-1">
								<div className="flex items-start justify-between">
									<div>
										<h3 className="text-2xl font-bold text-[#111]">{d.name}</h3>
										<p
											className="mt-0.5 text-[17px] font-bold"
											style={{ color: RED }}
										>
											{d.spec}
										</p>
									</div>
									<span className="flex size-10 items-center justify-center rounded-xl bg-[#f9fafb] text-[#6b7280]">
										<Bookmark className="size-5" />
									</span>
								</div>
								<ul className="mt-6 flex flex-col gap-4">
									{d.credentials.map((c) => (
										<li
											key={c}
											className="flex items-center gap-3 text-[15px] text-[#374151]"
										>
											<span
												className="size-1.5 shrink-0 rounded-full"
												style={{ backgroundColor: RED }}
											/>
											{c}
										</li>
									))}
								</ul>
								<DoctorSchedule am={d.am} pm={d.pm} />
							</div>
						</article>
					))}
				</div>
			</div>
		</section>
	);
}

function DoctorSchedule({
	am,
	pm,
}: {
	am: readonly boolean[];
	pm: readonly boolean[];
}) {
	const rows: [string, readonly boolean[]][] = [
		["오전", am],
		["오후", pm],
	];
	return (
		<div className="mt-6">
			<div className="grid grid-cols-[1.85fr_repeat(5,1fr)] border-y border-[#e5e7eb] bg-[#f9fafb] text-center text-sm font-bold text-[#111]">
				<span className="py-3">구분</span>
				{WEEK.map((w) => (
					<span key={w} className="py-3">
						{w}
					</span>
				))}
			</div>
			{rows.map(([label, slots]) => (
				<div
					key={label}
					className="grid grid-cols-[1.85fr_repeat(5,1fr)] border-b border-[#e5e7eb] text-center text-sm"
				>
					<span className="py-3 font-bold text-[#111]">{label}</span>
					{slots.map((on, i) => (
						<span
							// biome-ignore lint/suspicious/noArrayIndexKey: fixed weekday columns
							key={i}
							className="py-3 text-[#111]"
						>
							{on ? "●" : "-"}
						</span>
					))}
				</div>
			))}
		</div>
	);
}

function CommunityRow5() {
	return (
		<section className="bg-[#f9fafb] py-20 md:py-24">
			<div className="mx-auto grid max-w-[1440px] gap-8 px-6 lg:grid-cols-3">
				{/* 공지사항 */}
				<div>
					<div className="flex items-center justify-between">
						<h3 className="text-2xl font-bold text-[#111]">공지사항</h3>
						<Plus className="size-5 text-[#9ca3af]" />
					</div>
					<div className="mt-5 flex flex-col gap-4">
						{NOTICES.map((n) => (
							<div
								key={n.title}
								className="rounded-2xl border border-[#e5e7eb] bg-white p-5"
							>
								<span
									className="text-xs font-bold"
									style={{ color: n.red ? RED : "#6b7280" }}
								>
									{n.tag}
								</span>
								<p className="mt-1.5 text-[15px] font-bold text-[#111]">
									{n.title}
								</p>
								<p className="mt-1 text-sm text-[#6b7280]">{n.desc}</p>
							</div>
						))}
					</div>
				</div>

				{/* 건강 칼럼 */}
				<div>
					<div className="flex items-center justify-between">
						<h3 className="text-2xl font-bold text-[#111]">건강 칼럼</h3>
						<Plus className="size-5 text-[#9ca3af]" />
					</div>
					<div className="mt-5 flex flex-col gap-4">
						{ARTICLES.map((a) => (
							<div
								key={a.title}
								className="flex items-center gap-4 rounded-2xl border border-[#e5e7eb] bg-white p-4"
							>
								<div className="flex size-24 shrink-0 items-center justify-center rounded-xl bg-[#f9fafb] text-center text-[11px] font-medium text-[#9ca3af]">
									{a.thumb}
								</div>
								<div>
									<p className="text-[17px] font-bold leading-snug text-[#111]">
										{a.title}
									</p>
									<p className="mt-1.5 text-sm text-[#9ca3af]">{a.meta}</p>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* 프로모션 카드 2개 */}
				<div className="flex flex-col gap-6">
					<div className="relative overflow-hidden rounded-2xl bg-[#111] p-8 text-white">
						<p className="text-sm font-bold" style={{ color: RED }}>
							NEW SERVICE
						</p>
						<h4 className="mt-2 text-xl font-bold">비대면 진료 서비스 개시</h4>
						<p className="mt-2 text-sm text-[#9ca3af]">
							집에서도 편리하게 화상으로 전문의 진료를 받아보세요.
						</p>
						<button
							type="button"
							className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-white"
						>
							자세히 보기
							<ArrowRight className="size-4" />
						</button>
					</div>
					<div
						className="relative overflow-hidden rounded-2xl p-8 text-white"
						style={{ backgroundColor: RED }}
					>
						<p className="text-sm font-bold text-white/60">CHECKUP</p>
						<h4 className="mt-2 text-xl font-bold">맞춤형 건강검진 프로그램</h4>
						<p className="mt-2 text-sm text-white/80">
							개인별 맞춤 정밀 검사로 질병을 조기 발견하세요.
						</p>
						<button
							type="button"
							className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2 text-sm font-bold"
							style={{ color: RED }}
						>
							검진 예약하기
						</button>
					</div>
				</div>
			</div>
		</section>
	);
}

function Prices5() {
	return (
		<section className="bg-white py-20 md:py-24">
			<div className="mx-auto max-w-[1440px] px-6">
				<h2 className="text-[22px] font-bold leading-[33px] text-[#111827]">
					비급여 진료비 안내
				</h2>
				<div className="mt-6 overflow-x-auto">
					<table className="w-full min-w-[480px]">
						<thead>
							<tr className="border-b-2 border-[#e5e7eb]">
								<th className="px-4 py-4 text-left text-[17px] font-semibold text-[#374151]">
									항목
								</th>
								<th className="px-4 py-4 text-left text-[17px] font-semibold text-[#374151]">
									내용
								</th>
								<th className="px-4 py-4 text-right text-[17px] font-semibold text-[#374151]">
									금액
								</th>
							</tr>
						</thead>
						<tbody>
							{PRICES.map(([item, content, amount]) => (
								<tr key={item} className="border-b border-[#e5e7eb]">
									<td className="px-4 py-4 text-base text-[#111]">{item}</td>
									<td className="px-4 py-4 text-base text-[#374151]">
										{content}
									</td>
									<td className="px-4 py-4 text-right text-base font-bold text-[#111]">
										{amount}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				<p className="mt-4 text-sm text-[#374151]">
					건강보험이 적용되지 않는 비급여 항목 기준입니다.
				</p>
			</div>
		</section>
	);
}

function Promo5() {
	return (
		<section className="relative overflow-hidden bg-[linear-gradient(135deg,#1e3a8a_0%,#4c1d95_100%)] py-20 text-center text-white md:py-28">
			<div className="pointer-events-none absolute inset-0 opacity-[0.08]">
				<div className="absolute left-12 top-12 size-40 rotate-12 border border-white/50" />
				<div className="absolute bottom-12 right-20 size-52 -rotate-6 border border-white/50" />
			</div>
			<div className="relative mx-auto flex max-w-[1000px] flex-col items-center px-6">
				<span className="rounded border border-white px-4 py-1.5 text-sm font-bold tracking-[0.05em]">
					특별 이벤트가 프로모션
				</span>
				<h2 className="mt-6 text-3xl font-extrabold leading-tight tracking-[-0.025em] md:text-[44px] md:leading-[66px]">
					봄맞이 종합건강검진 특별 프로그램
				</h2>
				<p className="mt-6 max-w-2xl text-base text-white/80 md:text-lg">
					조기 발견과 예방을 위한 맞춤형 건강검진. 최신 의료장비와 전문 의료진이
					함께합니다.
				</p>
				<div className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-3">
					{PROMO_PERKS.map((perk) => (
						<span
							key={perk}
							className="flex items-center gap-2 text-base font-medium"
						>
							<Check className="size-5 text-[#22c55e]" />
							{perk}
						</span>
					))}
				</div>
				<p className="mt-8 text-sm text-white/60">
					이벤트 기간: 2026.03.01 - 2026.05.31
				</p>
				<button
					type="button"
					className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-[17px] font-bold text-[#1e3a8a] shadow-[0_20px_25px_-5px_rgba(0,0,0,0.15)]"
				>
					프로그램 자세히 보기
					<ArrowRight className="size-5" />
				</button>
			</div>
		</section>
	);
}

function MapSection5() {
	return (
		<section className="grid lg:grid-cols-[1fr_480px]">
			{/* 지도 placeholder */}
			<div className="relative flex min-h-[400px] items-center justify-center bg-[#f9fafb] lg:min-h-[600px]">
				<span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-[#9ca3af]">
					지도 (Map) placeholder
				</span>
				<div className="relative z-10 flex items-center gap-3 rounded-2xl border border-[#f3f4f6] bg-white px-5 py-4 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]">
					<span
						className="flex size-9 items-center justify-center rounded-full text-white"
						style={{ backgroundColor: RED }}
					>
						<MapPin className="size-4" />
					</span>
					<div>
						<p className="text-base font-bold text-[#111]">{CLINIC_ALT}</p>
						<p className="text-xs text-[#6b7280]">{ADDRESS_ALT}</p>
					</div>
				</div>
			</div>
			{/* 교통수단 안내 */}
			<div className="border-l border-[#e5e7eb] bg-white px-8 py-14 md:px-16">
				<h3 className="text-3xl font-black text-[#111]">교통수단 안내</h3>
				<div className="mt-10 flex flex-col gap-8">
					{TRANSIT.map((t) => (
						<div key={t.title} className="flex items-start gap-4">
							<span
								className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#f9fafb]"
								style={{ color: t.color }}
							>
								<t.icon className="size-6" />
							</span>
							<div>
								<p className="text-lg font-bold text-[#111]">{t.title}</p>
								<p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-[#374151]">
									{t.desc}
								</p>
							</div>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

function Footer5() {
	return (
		<footer className="bg-[#111] py-16 text-[#6b7280]">
			<div className="mx-auto max-w-[1440px] px-6">
				<div className="grid gap-10 border-b border-[#374151]/30 pb-12 md:grid-cols-2 lg:grid-cols-4">
					{/* 브랜드 */}
					<div>
						<div className="flex items-center gap-2.5">
							<Hospital className="size-6 text-white" />
							<span className="text-xl font-bold text-white">{CLINIC_ALT}</span>
						</div>
						<p className="mt-4 text-sm leading-relaxed">
							정확한 진단과 따뜻한 진료로 지역 주민의 건강을 책임지는 평생
							주치의가 되겠습니다.
						</p>
						<div className="mt-5 flex gap-2">
							{[Instagram, Facebook, Globe].map((Icon, i) => (
								<span
									// biome-ignore lint/suspicious/noArrayIndexKey: static social icon list
									key={i}
									className="flex size-9 items-center justify-center rounded-full bg-[#374151]/20 text-[#9ca3af]"
								>
									<Icon className="size-4" />
								</span>
							))}
						</div>
					</div>

					{/* 병원 안내 */}
					<div>
						<p className="text-base font-bold text-white">병원 안내</p>
						<ul className="mt-4 flex flex-col gap-2.5 text-sm">
							{FOOTER_HOSPITAL.map((l) => (
								<li key={l}>
									<button
										type="button"
										className="transition-colors hover:text-white"
									>
										{l}
									</button>
								</li>
							))}
						</ul>
					</div>

					{/* 고객 지원 */}
					<div>
						<p className="text-base font-bold text-white">고객 지원</p>
						<ul className="mt-4 flex flex-col gap-2.5 text-sm">
							{FOOTER_SUPPORT.map((l) => (
								<li key={l}>
									<button
										type="button"
										className="transition-colors hover:text-white"
										style={
											l === "개인정보처리방침"
												? { color: RED, fontWeight: 700 }
												: undefined
										}
									>
										{l}
									</button>
								</li>
							))}
						</ul>
					</div>

					{/* 상담 및 예약 */}
					<div className="rounded-2xl border border-[#374151]/30 bg-[#374151]/10 p-6">
						<p className="text-base font-bold text-white">상담 및 예약</p>
						<p className="mt-3 text-2xl font-black text-white">{PHONE_BOOK}</p>
						<p className="mt-1 text-[13px]">
							평일 09:00 - 18:00 (토요일 13:00)
						</p>
						<button
							type="button"
							className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-bold text-white"
							style={{ backgroundColor: RED }}
						>
							<Phone className="size-4" />
							전화하기
						</button>
					</div>
				</div>
				<div className="mt-8 flex flex-col items-center justify-between gap-4 text-[13px] md:flex-row">
					<div className="text-center md:text-left">
						<p>
							대표자: 박승일 | 사업자등록번호: 215-82-01234 | 주소:{" "}
							{ADDRESS_ALT}
						</p>
						<p className="mt-1">© 2024 {CLINIC_ALT}. All rights reserved.</p>
					</div>
					<div className="flex size-12 items-center justify-center rounded-full bg-[#374151]/20 text-center text-[10px] text-[#6b7280] opacity-50">
						인증 배지
					</div>
				</div>
			</div>
		</footer>
	);
}
