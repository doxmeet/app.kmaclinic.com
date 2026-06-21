import { createFileRoute } from "@tanstack/react-router";
import {
	ArrowRight,
	Bus,
	Calendar,
	Car,
	Check,
	ChevronRight,
	Clock,
	FileText,
	GraduationCap,
	HeartPulse,
	MapPin,
	Phone,
	Stethoscope,
	Train,
} from "lucide-react";

export const Route = createFileRoute("/landing/3")({ component: Landing3Page });

// ── 더미 데이터 ─────────────────────────────────────────────
const CLINIC = "홍길동내과의원";
const PHONE = "02-1234-5678";
const ADDRESS = "서울특별시 강동구 구천면로 200, 2층 (천호동, 메디컬빌딩)";

const NAV = ["진료안내", "의료진소개", "커뮤니티", "오시는길"];

const EQUIPMENT = [
	"GE LOGIQ 초음파",
	"디지털 X-ray",
	"HbA1c 검사",
	"올림푸스 전자내시경",
];

const DOCTORS = [
	{
		role: "대표원장",
		name: "홍길동",
		spec: "내과 전문의",
		quote: "“20년 경력 풍부한 임상 경험, 꼼꼼하고 정확하게 진료합니다.”",
		career: [
			"한국대학교 의과대학 졸업",
			"한국대학교병원 전공의 수련 및 전문의 취득",
			"전) 서울종합병원 내과 과장",
		],
		days: ["월", "화", "수", "목", "금", "토"],
		hours: "진료 시간: 월·화·수·목·금·토 전일 진료",
		accent: "indigo" as const,
	},
	{
		role: "부원장",
		name: "김경기",
		spec: "내과 전문의",
		quote: "“환자 한 분 한 분의 목소리에 귀 기울이는 따뜻한 주치의.”",
		career: [
			"경기대학교 의과대학 졸업",
			"경기대학교병원 전공의 및 전임의 수료",
			"대한당뇨병학회 정회원",
		],
		days: ["월", "수", "금", "토"],
		hours: "진료 시간: 월·수·금 전일 / 토 오전 (화·목 휴진)",
		accent: "teal" as const,
	},
];

const DOCTOR_ACCENT = {
	indigo: {
		badge: "bg-[#4f46e5] text-white",
		spec: "text-[#4f46e5]",
		icon: "text-[#818cf8]",
		dayOn: "bg-[#4f46e5] text-white",
	},
	teal: {
		badge: "bg-[#0d9488] text-white",
		spec: "text-[#0d9488]",
		icon: "text-[#2dd4bf]",
		dayOn: "bg-[#0d9488] text-white",
	},
} as const;

const ALL_DAYS = ["월", "화", "수", "목", "금", "토", "일"];

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

const NOTICES = [
	{
		title: "[안내] 2026년 국가 건강검진 예약 및 실시 안내",
		date: "2026-05-15",
		isNew: true,
	},
	{
		title: "[휴진] 6월 6일 현충일 공휴일 휴진 안내",
		date: "2026-05-10",
		isNew: false,
	},
	{
		title: "[알림] 토요일 접수는 12시 30분에 마감됩니다",
		date: "2026-05-01",
		isNew: false,
	},
];

const COLUMNS = [
	{
		tag: "만성질환",
		emoji: "🩸",
		title: "고혈압 환자 여름철 생활 수칙",
		author: "홍길동 원장",
		teal: false,
	},
	{
		tag: "소화기",
		emoji: "🔬",
		title: "속 쓰림과 위내시경이 필요한 순간",
		author: "김경기 원장",
		teal: true,
	},
];

const TRANSIT = [
	{
		icon: Train,
		title: "지하철 이용 시",
		desc: "5호선 천호역 3번 출구에서 도보 150m\n(직진 후 현대백화점 지나 메디컬빌딩 2층)",
	},
	{
		icon: Bus,
		title: "버스 이용 시",
		desc: "'천호역·현대백화점' 정류장 하차 후 천호시장 방향으로 도보 3분 (130, 341, 3318, 3411 등)",
	},
	{
		icon: Car,
		title: "자동차·주차",
		desc: "네비: '홍길동내과의원' 또는 '서울 강동구 구천면로 200' / 건물 뒤편 지하주차장 (내원 환자 2시간 무료)",
	},
];

// 디자인 고유 색감 (indigo + teal "trusted healthcare"):
// indigo #4f46e5 / deep #1e1b4b / teal #0d9488

function Landing3Page() {
	return (
		<div className="min-h-screen bg-white font-sans text-[#374151] tracking-[-0.01em]">
			<Header3 />
			<Hero3 />
			<Doctors3 />
			<Prices3 />
			<Promo3 />
			<Community3 />
			<Location3 />
			<Footer3 />
		</div>
	);
}

function Header3() {
	return (
		<header className="sticky top-0 z-40 border-b border-[#eef2ff] bg-white/85 backdrop-blur-md">
			<div className="mx-auto flex h-[72px] max-w-[1400px] items-center justify-between px-6 md:px-12">
				<div className="flex items-center gap-3">
					<span className="flex size-10 items-center justify-center rounded-xl bg-[#4f46e5] text-white shadow-[0_8px_18px_-6px_rgba(79,70,229,0.6)]">
						<HeartPulse className="size-5" />
					</span>
					<span className="text-lg font-bold text-[#0a0a23]">{CLINIC}</span>
				</div>
				<nav className="hidden items-center gap-9 md:flex">
					{NAV.map((item) => (
						<button
							key={item}
							type="button"
							className="text-[15px] font-medium text-[#374151] transition-colors hover:text-[#4f46e5]"
						>
							{item}
						</button>
					))}
				</nav>
				<div className="text-right">
					<p className="text-[11px] font-medium text-[#9ca3af]">예약 및 문의</p>
					<p className="text-base font-bold text-[#4f46e5]">{PHONE}</p>
				</div>
			</div>
		</header>
	);
}

function Hero3() {
	return (
		<section className="relative overflow-hidden bg-[linear-gradient(135deg,#f0f4ff_0%,#eef2ff_50%,#f5f3ff_100%)]">
			{/* 장식용 블러 블롭 */}
			<div className="pointer-events-none absolute -top-40 -left-40 size-[600px] rounded-full bg-[#8b5cf6]/10 blur-[80px]" />
			<div className="pointer-events-none absolute top-40 -right-40 size-[500px] rounded-full bg-[#14b8a6]/10 blur-[80px]" />

			<div className="relative mx-auto grid max-w-[1400px] items-center gap-12 px-6 py-16 md:px-20 md:py-24 lg:grid-cols-[1fr_540px]">
				<div>
					<span className="inline-flex items-center gap-2 rounded-full bg-[#e0e7ff] px-4 py-1.5">
						<span className="size-1.5 rounded-full bg-[#6366f1]" />
						<span className="text-xs font-bold uppercase tracking-[0.1em] text-[#4f46e5]">
							TRUSTED HEALTHCARE
						</span>
					</span>
					<h1 className="mt-6 text-4xl font-normal leading-[1.18] text-[#1e1b4b] tracking-[-0.02em] md:text-[56px]">
						언제나 <span className="font-black">가족 같은 마음</span>으로,
						<br />
						<span className="font-black">당신의 건강</span>을 먼저 생각합니다.
					</h1>
					<div className="mt-6 h-1 w-16 rounded-full bg-[#818cf8]" />

					<div className="mt-8 flex flex-col gap-4 text-base text-[#374151]">
						<div className="flex items-center gap-4">
							<span className="flex size-9 items-center justify-center rounded-full bg-[#4f46e5] text-white">
								<Phone className="size-4" />
							</span>
							<span>
								대표 전화번호:{" "}
								<span className="font-bold text-[#4f46e5]">{PHONE}</span>
							</span>
						</div>
						<div className="flex items-center gap-4">
							<span className="flex size-9 items-center justify-center rounded-full bg-[#111827] text-white">
								<MapPin className="size-4" />
							</span>
							<span>병원 주소: {ADDRESS}</span>
						</div>
					</div>

					<div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
						<HourCard
							label="평일"
							value="09:00 ~ 18:30"
							note="(점심 13:00~14:00)"
						/>
						<HourCard
							label="토요일"
							value="09:00 ~ 13:00"
							note="(점심없이 진료)"
						/>
						<HourCard label="일·공휴일" value="휴진" danger />
					</div>

					<div className="mt-8 grid gap-6 rounded-2xl border border-white/80 bg-white/60 p-6 shadow-[0_8px_32px_0_rgba(99,102,241,0.12)] backdrop-blur-md sm:grid-cols-2">
						<div>
							<p className="text-xs font-bold uppercase tracking-[0.1em] text-[#9ca3af]">
								진료과목
							</p>
							<p className="mt-2 text-sm font-bold leading-relaxed text-[#1f2937]">
								내과, 소아청소년과, 이비인후과
							</p>
						</div>
						<div>
							<p className="text-xs font-bold uppercase tracking-[0.1em] text-[#9ca3af]">
								보유기기
							</p>
							<ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-[#374151]">
								{EQUIPMENT.map((e) => (
									<li key={e}>• {e}</li>
								))}
							</ul>
						</div>
					</div>

					<button
						type="button"
						className="mt-6 inline-flex items-center gap-2 rounded-full bg-[linear-gradient(131deg,#4f46e5_0%,#7c3aed_100%)] px-10 py-4 text-lg font-bold text-white shadow-[0_8px_12px_rgba(99,102,241,0.4)]"
					>
						<Phone className="size-5" />
						전화하기
					</button>
				</div>

				{/* 우측 병원 카드 (이미지 placeholder) */}
				<div className="relative rounded-2xl border border-white/80 bg-white/60 p-2 shadow-[0_8px_32px_0_rgba(99,102,241,0.12)] backdrop-blur-md">
					<div className="relative overflow-hidden rounded-xl">
						<div className="flex aspect-[3/2] items-center justify-center bg-[linear-gradient(135deg,#dbeafe,#e0e7ff)] text-sm font-medium text-[#6366f1]">
							병원 내부 이미지
						</div>
						<span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#4f46e5] shadow-sm">
							<span className="size-1.5 rounded-full bg-[#6366f1]" />
							TRUSTED HEALTHCARE
						</span>
					</div>
					<div className="flex items-center justify-between gap-3 p-6">
						<div>
							<p className="text-xl font-bold text-[#1e1b4b]">{CLINIC}</p>
							<p className="mt-1 text-sm text-[#6b7280]">
								평일 09:00~18:30 / 토요일 09:00~13:00
							</p>
							<p className="mt-3 flex items-center gap-1.5 text-xs text-[#9ca3af]">
								<MapPin className="size-3.5" />
								{ADDRESS}
							</p>
						</div>
						<span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#eef2ff] text-[#4f46e5]">
							<Stethoscope className="size-6" />
						</span>
					</div>
				</div>
			</div>
		</section>
	);
}

function HourCard({
	label,
	value,
	note,
	danger,
}: {
	label: string;
	value: string;
	note?: string;
	danger?: boolean;
}) {
	return (
		<div
			className={`flex flex-col items-center justify-center gap-1 rounded-2xl border p-4 text-center shadow-[0_8px_32px_0_rgba(99,102,241,0.12)] backdrop-blur-md ${
				danger
					? "border-[#fee2e2] bg-[#fef2f2]/60"
					: "border-white/80 bg-white/60"
			}`}
		>
			{!danger && <Clock className="size-5 text-[#4f46e5]" />}
			<span
				className={`text-sm font-bold uppercase tracking-wide ${danger ? "text-[#ef4444]" : "text-[#4f46e5]"}`}
			>
				{label}
			</span>
			<span
				className={`text-base font-black ${danger ? "text-[#dc2626]" : "text-[#312e81]"}`}
			>
				{value}
			</span>
			{note && <span className="text-[13px] text-[#9ca3af]">{note}</span>}
		</div>
	);
}

function SectionHeading3({
	title,
	subtitle,
}: {
	title: string;
	subtitle: string;
}) {
	return (
		<div className="text-center">
			<h2 className="text-3xl font-bold text-[#1e1b4b] md:text-[44px]">
				{title}
			</h2>
			<p className="mx-auto mt-4 max-w-xl text-base text-[#6b7280] md:text-lg">
				{subtitle}
			</p>
			<div className="mx-auto mt-6 h-0.5 w-28 rounded-full bg-[#c7d2fe]" />
		</div>
	);
}

function Doctors3() {
	return (
		<section className="relative overflow-hidden bg-white py-20 md:py-28">
			<div className="mx-auto max-w-[1400px] px-6 md:px-20">
				<SectionHeading3
					title="의료진 소개"
					subtitle="풍부한 임상경험과 전문성을 갖춘 의료진이 진료합니다"
				/>
				<div className="mt-12 grid gap-8 md:grid-cols-2">
					{DOCTORS.map((d) => {
						const accent = DOCTOR_ACCENT[d.accent];
						return (
							<article
								key={d.name}
								className="overflow-hidden rounded-2xl border border-[#eef2ff] bg-white shadow-[0_8px_32px_0_rgba(99,102,241,0.12)]"
							>
								<div className="h-1.5 w-full bg-[linear-gradient(90deg,#4f46e5,#14b8a6)]" />
								<div className="flex aspect-[16/9] items-center justify-center bg-[linear-gradient(135deg,#1e1b4b,#312e81)] text-sm font-medium text-white/70">
									의료진 사진
								</div>
								<div className="p-8">
									<div className="flex items-center gap-3">
										<span
											className={`rounded-full px-3 py-1 text-xs font-bold ${accent.badge}`}
										>
											{d.role}
										</span>
										<h3 className="text-2xl font-bold text-[#1e1b4b]">
											{d.name}
										</h3>
									</div>
									<p className={`mt-3 text-base font-semibold ${accent.spec}`}>
										{d.spec}
									</p>
									<p className="mt-2 text-[15px] italic text-[#6b7280]">
										{d.quote}
									</p>
									<ul className="mt-4 flex flex-col gap-2">
										{d.career.map((c) => (
											<li
												key={c}
												className="flex items-start gap-2.5 text-sm text-[#6b7280]"
											>
												<GraduationCap
													className={`mt-0.5 size-4 shrink-0 ${accent.icon}`}
												/>
												{c}
											</li>
										))}
									</ul>
									<div className="mt-6 flex flex-wrap gap-1.5">
										{ALL_DAYS.map((day) => {
											const on = d.days.includes(day);
											return (
												<span
													key={day}
													className={`flex size-9 items-center justify-center rounded-md text-sm font-medium ${
														on ? accent.dayOn : "bg-[#f1f5f9] text-[#9ca3af]"
													}`}
												>
													{day}
												</span>
											);
										})}
									</div>
									<p className="mt-4 text-sm text-[#6b7280]">{d.hours}</p>
								</div>
							</article>
						);
					})}
				</div>
			</div>
		</section>
	);
}

function Prices3() {
	return (
		<section className="relative overflow-hidden bg-white py-20 md:py-28">
			<div className="pointer-events-none absolute -top-40 -left-24 size-[800px] rounded-full bg-[#5f3cfe]/10 blur-[50px]" />
			<div className="pointer-events-none absolute -bottom-40 -right-24 size-[700px] rounded-full bg-[#059669]/[0.08] blur-[50px]" />
			<div className="relative mx-auto max-w-[1400px] px-6 md:px-20">
				<div className="flex items-center gap-3">
					<span className="flex size-12 items-center justify-center rounded-2xl bg-[#eef2ff] text-[#5f3cfe]">
						<FileText className="size-6" />
					</span>
					<h2 className="text-2xl font-bold text-[#111827]">
						비급여 진료비 안내
					</h2>
				</div>
				<div className="mt-6 overflow-hidden border-t-2 border-[#111827]">
					<table className="w-full">
						<thead>
							<tr className="bg-[#f8f9ff]">
								<th className="px-4 py-4 text-left text-[17px] font-semibold text-[#1e1b4b] md:px-8">
									항목
								</th>
								<th className="hidden px-8 py-4 text-left text-[17px] font-semibold text-[#1e1b4b] sm:table-cell">
									내용
								</th>
								<th className="px-4 py-4 text-right text-[17px] font-semibold text-[#1e1b4b] md:px-8">
									금액
								</th>
							</tr>
						</thead>
						<tbody>
							{PRICES.map(([item, content, amount]) => (
								<tr key={item} className="border-b border-[#e5e7eb]">
									<td className="px-4 py-4 text-base font-medium text-[#111827] md:px-8">
										{item}
										<span className="mt-0.5 block text-sm font-normal text-[#6b7280] sm:hidden">
											{content}
										</span>
									</td>
									<td className="hidden px-8 py-4 text-base text-[#6b7280] sm:table-cell">
										{content}
									</td>
									<td className="px-4 py-4 text-right text-[17px] font-bold text-[#5f3cfe] md:px-8">
										{amount}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				<p className="mt-4 flex items-center gap-2 text-base text-[#6b7280]">
					<span className="size-1.5 rounded-full bg-[#9ca3af]" />
					건강보험이 적용되지 않는 비급여 항목 기준입니다.
				</p>
			</div>
		</section>
	);
}

function Promo3() {
	return (
		<section className="relative overflow-hidden bg-[linear-gradient(165deg,#5f3cfe_0%,#059669_100%)] py-20 text-center md:py-28">
			<div className="pointer-events-none absolute -top-72 -right-24 size-[600px] rounded-full bg-white/5 blur-[50px]" />
			<div className="pointer-events-none absolute -bottom-48 -left-12 size-[400px] rounded-full bg-white/5 blur-[40px]" />
			<div className="relative mx-auto flex max-w-[1200px] flex-col items-center px-6 md:px-16">
				<span className="rounded-full border border-white/30 bg-white/20 px-4 py-1.5 text-sm font-bold uppercase tracking-[0.1em] text-white backdrop-blur-sm">
					봄 맞이 특별 이벤트
				</span>
				<h2 className="mt-6 text-3xl font-black text-white md:text-5xl">
					봄맞이 종합건강검진 특별 프로그램
				</h2>
				<p className="mt-6 max-w-2xl text-base text-white/80 md:text-lg">
					조기 발견과 예방을 위한 맞춤형 건강검진.
					<br className="hidden md:block" />
					최신 의료장비와 전문 의료진이 정성을 다해 함께합니다.
				</p>
				<div className="mt-10 flex flex-wrap justify-center gap-x-8 gap-y-3">
					{PROMO_PERKS.map((perk) => (
						<span
							key={perk}
							className="flex items-center gap-2 text-base font-medium text-white/90"
						>
							<Check className="size-[18px]" />
							{perk}
						</span>
					))}
				</div>
				<button
					type="button"
					className="mt-12 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-[17px] font-bold text-[#5f3cfe] shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1)]"
				>
					프로그램 자세히 보기
					<ArrowRight className="size-4" />
				</button>
				<p className="mt-6 text-sm text-white/60">
					이벤트 기간: 2026.03.01 - 2026.05.31
				</p>
			</div>
		</section>
	);
}

function Community3() {
	return (
		<section className="relative overflow-hidden bg-[linear-gradient(135deg,#f8f9ff_0%,#f3f4ff_50%,#faf9ff_100%)] py-20 md:py-24">
			<div className="pointer-events-none absolute -top-12 -left-24 size-[600px] rounded-full bg-[#8b5cf6]/10 blur-[40px]" />
			<div className="pointer-events-none absolute -bottom-12 -right-12 size-[500px] rounded-full bg-[#14b8a6]/[0.08] blur-[40px]" />
			<div className="relative mx-auto grid max-w-[1400px] gap-6 px-6 md:px-20 lg:grid-cols-3">
				{/* 공지사항 */}
				<div className="rounded-2xl border border-white/80 bg-white/60 p-8 shadow-[0_8px_32px_0_rgba(99,102,241,0.12)] backdrop-blur-md">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<span className="flex size-10 items-center justify-center rounded-xl bg-[#e0e7ff] text-[#4f46e5]">
								<Calendar className="size-5" />
							</span>
							<h3 className="text-xl font-bold text-[#111827]">공지사항</h3>
						</div>
						<button type="button" className="text-sm font-bold text-[#4f46e5]">
							다보기 +
						</button>
					</div>
					<ul className="mt-6 flex flex-col">
						{NOTICES.map((n, i) => (
							<li
								key={n.title}
								className={`flex items-start justify-between gap-3 py-4 ${i > 0 ? "border-t border-[#f3f4f6]" : ""}`}
							>
								<div className="flex items-start gap-3">
									<span
										className={`mt-2 size-1.5 shrink-0 rounded-full ${n.isNew ? "bg-[#6366f1]" : "bg-[#a5b4fc]"}`}
									/>
									<div>
										<p className="text-sm font-bold text-[#111827]">
											{n.title}
										</p>
										<p className="mt-1 text-xs text-[#9ca3af]">{n.date}</p>
									</div>
								</div>
								{n.isNew && (
									<span className="shrink-0 rounded bg-[#fee2e2] px-2 py-0.5 text-[10px] font-bold text-[#dc2626]">
										NEW
									</span>
								)}
							</li>
						))}
					</ul>
				</div>

				{/* 건강 칼럼 */}
				<div className="rounded-2xl border border-white/80 bg-white/60 p-8 shadow-[0_8px_32px_0_rgba(99,102,241,0.12)] backdrop-blur-md">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<span className="flex size-10 items-center justify-center rounded-xl bg-[#ccfbf1] text-[#0d9488]">
								<HeartPulse className="size-5" />
							</span>
							<h3 className="text-xl font-bold text-[#111827]">건강 칼럼</h3>
						</div>
						<button type="button" className="text-sm font-bold text-[#0d9488]">
							다보기 +
						</button>
					</div>
					<div className="mt-6 flex flex-col gap-4">
						{COLUMNS.map((c) => (
							<div
								key={c.title}
								className={`flex items-start gap-4 rounded-xl border-l-4 p-5 ${
									c.teal
										? "border-[#14b8a6] bg-[#f0fdfa]/50"
										: "border-[#6366f1] bg-[#eef2ff]/50"
								}`}
							>
								<span
									className={`flex size-11 items-center justify-center rounded-xl text-xl ${c.teal ? "bg-[#ccfbf1]" : "bg-[#e0e7ff]"}`}
								>
									{c.emoji}
								</span>
								<div>
									<span
										className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
											c.teal
												? "bg-[#ccfbf1] text-[#0d9488]"
												: "bg-[#e0e7ff] text-[#4f46e5]"
										}`}
									>
										{c.tag}
									</span>
									<p className="mt-2 text-sm font-bold text-[#111827]">
										{c.title}
									</p>
									<p className="mt-0.5 text-xs text-[#6b7280]">{c.author}</p>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* 바로가기 카드들 */}
				<div className="flex flex-col gap-6">
					<LinkCard
						title="의료진 칼럼 바로가기"
						desc={"우리 동네 주치의 홍길동내과 의료진이\n직접 작성한 건강 정보"}
						gradient="linear-gradient(135deg,#4f46e5,#6d28d9)"
					/>
					<LinkCard
						title="비급여 진료비 안내"
						desc={"비급여 항목 및 수수료를\n투명하게 공개합니다."}
						gradient="linear-gradient(135deg,#14b8a6,#059669)"
					/>
				</div>
			</div>
		</section>
	);
}

function LinkCard({
	title,
	desc,
	gradient,
}: {
	title: string;
	desc: string;
	gradient: string;
}) {
	return (
		<button
			type="button"
			className="relative flex min-h-[200px] flex-col items-start justify-center overflow-hidden rounded-2xl p-8 text-left text-white"
			style={{ backgroundImage: gradient }}
		>
			<HeartPulse className="pointer-events-none absolute -bottom-4 -right-4 size-24 text-white/10" />
			<h3 className="text-xl font-bold">{title}</h3>
			<p className="mt-2 whitespace-pre-line text-sm text-white/80">{desc}</p>
			<span className="mt-6 flex size-10 items-center justify-center rounded-full bg-white/20">
				<ArrowRight className="size-4" />
			</span>
		</button>
	);
}

function Location3() {
	return (
		<section className="relative overflow-hidden bg-white py-20 md:py-28">
			<div className="pointer-events-none absolute top-32 -right-24 size-[700px] rounded-full bg-[#6366f1]/[0.06] blur-[60px]" />
			<div className="relative mx-auto max-w-[1400px] px-6 md:px-20">
				<SectionHeading3
					title="찾아오시는 길"
					subtitle="편리한 교통편으로 쉽게 내원하실 수 있습니다"
				/>
				{/* 지도 placeholder */}
				<div className="mt-12 overflow-hidden rounded-2xl border border-[#eef2ff] bg-white p-4 shadow-[0_8px_32px_0_rgba(99,102,241,0.12)]">
					<div className="relative flex h-[360px] items-center justify-center rounded-xl bg-[linear-gradient(135deg,#eef2ff,#f0fdfa)]">
						<span className="absolute inset-x-1/4 top-1/2 hidden border-t-2 border-dashed border-[#c7d2fe] md:block" />
						<div className="flex flex-col items-center gap-3">
							<span className="flex size-16 items-center justify-center rounded-2xl bg-white text-[#4f46e5] shadow-md">
								<MapPin className="size-7" />
							</span>
							<span className="rounded-lg bg-white px-5 py-2 text-sm font-bold text-[#1e1b4b] shadow-md">
								{CLINIC}
							</span>
							<span className="text-sm text-[#6b7280]">
								지도 (Map) placeholder
							</span>
						</div>
					</div>
				</div>
				{/* 교통편 카드 */}
				<div className="mt-8 grid gap-6 md:grid-cols-3">
					{TRANSIT.map((t) => (
						<div
							key={t.title}
							className="rounded-2xl border border-[#eef2ff] bg-white p-7 shadow-[0_8px_32px_0_rgba(99,102,241,0.12)]"
						>
							<div className="flex items-center gap-3">
								<span className="flex size-11 items-center justify-center rounded-xl bg-[#eef2ff] text-[#4f46e5]">
									<t.icon className="size-5" />
								</span>
								<h4 className="text-lg font-bold text-[#1e1b4b]">{t.title}</h4>
							</div>
							<p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-[#6b7280]">
								{t.desc}
							</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

function Footer3() {
	return (
		<footer className="bg-[#1e1b4b] py-16 text-white/70">
			<div className="mx-auto max-w-[1400px] px-6 md:px-20">
				<div className="flex flex-col items-center justify-between gap-6 border-b border-white/10 pb-8 md:flex-row">
					<div className="flex items-center gap-3">
						<span className="flex size-10 items-center justify-center rounded-xl bg-[#4f46e5] text-white">
							<HeartPulse className="size-5" />
						</span>
						<span className="text-lg font-bold text-white">{CLINIC}</span>
					</div>
					<nav className="flex flex-wrap items-center justify-center gap-8">
						{NAV.map((item) => (
							<button
								key={item}
								type="button"
								className="text-sm transition-colors hover:text-white"
							>
								{item}
							</button>
						))}
					</nav>
					<div className="flex items-center gap-2">
						{[Phone, MapPin, ChevronRight].map((Icon, i) => (
							<span
								// biome-ignore lint/suspicious/noArrayIndexKey: static icon list
								key={i}
								className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white/70"
							>
								<Icon className="size-4" />
							</span>
						))}
					</div>
				</div>
				<p className="mt-6 text-center text-xs leading-relaxed text-white/50">
					기관명: {CLINIC} | 대표자: 홍길동 | 사업자등록번호: 123-45-67890 |
					의원개설신고번호: 제 2015-1234567호 | 전화: {PHONE} | Copyright © 2026{" "}
					{CLINIC}. All Rights Reserved.
				</p>
			</div>
		</footer>
	);
}
