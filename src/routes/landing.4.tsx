import { createFileRoute } from "@tanstack/react-router";
import {
	ArrowUpRight,
	Check,
	ChevronRight,
	ClipboardCheck,
	Clock,
	HeartPulse,
	Mail,
	MapPin,
	Megaphone,
	Phone,
	Stethoscope,
	User,
	X,
} from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/landing/4")({ component: Landing4Page });

// ── 더미 데이터 (premium navy "대학병원급") ─────────────────────
const CLINIC = "홍길동내과의원";
const PHONE = "02-1234-5678";
const EMAIL = "info@honggildongmed.com";
const ADDRESS = "서울특별시 강남구 테헤란로 123, 메디컬타워 5층";

const NAV = ["진료안내", "의료진소개", "커뮤니티", "오시는길"];

const HOURS = [
	["평일", "09:00 - 18:30", false],
	["토요일", "09:00 - 14:00", false],
	["점심시간", "13:00 - 14:00", false],
	["일요일/공휴일", "휴진", true],
] as const;

const FEATURES = [
	{
		title: "심혈관 클리닉",
		desc: "고혈압, 고지혈증, 부정맥 등 심혈관 질환의 체계적인 관리",
		dark: false,
	},
	{
		title: "소화기 내시경",
		desc: "위/대장 수면내시경, 용종절제술, 초음파 검사",
		dark: false,
	},
	{
		title: "호흡기/알레르기",
		desc: "천식, 만성기침, 알레르기 비염 검사 및 치료",
		dark: false,
	},
	{
		title: "건강검진 센터",
		desc: "국가건강검진, 5대암검진, 채용검진, 맞춤형 종합검진",
		dark: true,
	},
	{
		title: "의료진 안내 바로가기",
		desc: "2인 전문의 책임 진료",
		dark: false,
	},
	{
		title: "병원 찾아오시는 길 안내",
		desc: "천호역 3번 출구",
		dark: false,
	},
];

const NOTICES = [
	{
		tag: "안내",
		icon: Megaphone,
		color: "#2563eb",
		title: "2026년 국가 건강검진 예약 및 실시 안내",
	},
	{
		tag: "알림",
		icon: Clock,
		color: "#ef4444",
		title: "토요일 접수는 오후 12시 30분에 마감됩니다.",
	},
];

const ARTICLES = [
	{
		tag: "만성질환",
		icon: HeartPulse,
		color: "#14b8a6",
		title: "고혈압 환자가 여름철 폭염 속에서 지켜야 할 수칙",
		author: "홍길동 원장",
	},
	{
		tag: "소화기",
		icon: null,
		color: "#737373",
		title: "속 쓰림과 소화불량, 위내시경이 필요한 순간",
		author: "김경기 원장",
	},
];

const DOCTORS = [
	{
		name: "홍길동 원장",
		spec: "내과 전문의, 대학병원 출신",
		bullets: [
			"20년 이상의 임상경험",
			"심혈관, 소화기, 호흡기 전문",
			"국가건강검진 1000건 이상",
		],
	},
	{
		name: "김경기 원장",
		spec: "소화기 전문의, 대학병원 출신",
		bullets: [
			"15년 이상의 임상경험",
			"위염, 위궤양, 위내시경 전문",
			"내시경 수술 500건 이상",
		],
	},
];

const TRANSIT = [
	"지하철 2호선 천호역 3번 출구 도보 3분",
	"지하철 3호선 천호역 3번 출구 도보 5분",
	"지하철 4호선 천호역 3번 출구 도보 7분",
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

function Landing4Page() {
	const [bannerOpen, setBannerOpen] = useState(true);
	return (
		<div className="min-h-screen bg-[#f8fafc] font-sans text-[#0a192f] tracking-[-0.01em]">
			{bannerOpen && <AlertBanner4 onClose={() => setBannerOpen(false)} />}
			<Nav4 />
			<Hero4 />
			<Announcements4 />
			<Doctors4 />
			<Location4 />
			<Prices4 />
			<Promo4 />
			<Footer4 />
		</div>
	);
}

function AlertBanner4({ onClose }: { onClose: () => void }) {
	return (
		<div className="bg-[#0a192f] px-4 py-3 text-white">
			<div className="mx-auto flex max-w-[1280px] items-center justify-center gap-3 text-center">
				<span className="shrink-0 rounded bg-[#ef4444] px-2 py-0.5 text-xs font-bold">
					공지
				</span>
				<p className="text-sm font-medium">
					독감 예방접종 안내: 10월 1일부터 무료/유료 접종이 시작됩니다. 사전
					예약 바랍니다.
				</p>
				<button
					type="button"
					onClick={onClose}
					className="ml-auto shrink-0 text-white/70 transition-colors hover:text-white"
					aria-label="배너 닫기"
				>
					<X className="size-4" />
				</button>
			</div>
		</div>
	);
}

function Nav4() {
	return (
		<div className="sticky top-3 z-40 px-4">
			<div className="mx-auto flex max-w-[1280px] items-center justify-between rounded-full border border-white/50 bg-white/70 px-6 py-3 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] backdrop-blur-md md:px-8">
				<div className="flex items-center gap-2.5">
					<span className="flex size-9 items-center justify-center rounded-xl bg-[#0a192f] text-white">
						<Stethoscope className="size-5" />
					</span>
					<span className="text-xl font-bold tracking-[-0.02em] text-[#0a192f]">
						{CLINIC}
					</span>
				</div>
				<nav className="hidden items-center gap-8 md:flex">
					{NAV.map((item) => (
						<button
							key={item}
							type="button"
							className="text-sm font-medium text-[#102a43] transition-colors hover:text-[#2563eb]"
						>
							{item}
						</button>
					))}
				</nav>
			</div>
		</div>
	);
}

function Hero4() {
	return (
		<section className="relative overflow-hidden">
			<div className="pointer-events-none absolute -top-24 -right-24 size-[500px] rounded-full bg-[#eff6ff] opacity-50 blur-[32px]" />
			<div className="pointer-events-none absolute -bottom-24 -left-24 size-[500px] rounded-full bg-[#eef2ff] opacity-50 blur-[32px]" />
			<div className="relative mx-auto max-w-[1280px] px-4 py-16 md:py-24">
				<div className="text-center">
					<h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-[#0a192f] md:text-6xl lg:text-[72px] lg:leading-[72px]">
						정확한 진단,정확한 처방
						<br />
						<span className="bg-[linear-gradient(90deg,#102a43,#2563eb)] bg-clip-text text-transparent">
							따뜻한 치유
						</span>
					</h1>
					<p className="mx-auto mt-6 max-w-2xl text-lg font-light leading-normal text-[#525252] md:text-[32px] md:leading-[48px]">
						{CLINIC}은 대학병원급 첨단 장비와 풍부한 임상경험을 바탕으로 지역
						주민의 평생 건강을 책임집니다.
					</p>
				</div>

				{/* 벤토 대시보드 그리드 */}
				<div className="mt-14 grid gap-4 lg:grid-cols-[400px_1fr]">
					{/* 좌측: 빠른 통화 + 진료시간 */}
					<div className="flex flex-col gap-4">
						<div className="relative overflow-hidden rounded-3xl border border-white/80 bg-white/70 p-7 shadow-[0_10px_30px_-5px_rgba(16,42,67,0.15)] backdrop-blur-md">
							<div className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-[#f0f4f8]" />
							<div className="relative">
								<span className="flex size-12 items-center justify-center rounded-2xl bg-[#d9e2ec] text-[#102a43]">
									<Phone className="size-6" />
								</span>
								<p className="mt-4 text-lg font-bold text-[#0a192f]">
									상담 및 예약문의
								</p>
								<p className="mt-1 text-3xl font-extrabold text-[#102a43]">
									{PHONE}
								</p>
								<p className="mt-1 text-sm text-[#737373]">
									(해피콜 센터 운영)
								</p>
							</div>
						</div>
						<div className="rounded-3xl border border-[#f1f5f9] bg-white p-7 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]">
							<div className="flex items-center justify-between">
								<p className="text-lg font-bold text-[#0a192f]">진료시간</p>
								<span className="inline-flex items-center gap-1.5 rounded-full bg-[#dcfce7] px-3 py-1 text-xs font-bold text-[#15803d]">
									<span className="size-1.5 rounded-full bg-[#22c55e]" />
									진료중
								</span>
							</div>
							<dl className="mt-4 flex flex-col gap-3">
								{HOURS.map(([label, value, closed]) => (
									<div
										key={label}
										className="flex items-center justify-between text-sm"
									>
										<dt className="text-[#737373]">{label}</dt>
										<dd
											className={`font-bold ${closed ? "text-[#ef4444]" : "text-[#102a43]"}`}
										>
											{value}
										</dd>
									</div>
								))}
							</dl>
						</div>
					</div>

					{/* 우측: 6개 기능 카드 */}
					<div className="rounded-3xl border border-white/80 bg-white/70 p-4 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)] backdrop-blur-md sm:p-6">
						<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
							{FEATURES.map((f) =>
								f.dark ? (
									<div
										key={f.title}
										className="relative col-span-1 overflow-hidden rounded-3xl bg-[#0a192f] p-6 text-white"
									>
										<HeartPulse className="pointer-events-none absolute -bottom-4 -right-4 size-24 text-white/5" />
										<span className="flex size-11 items-center justify-center rounded-2xl bg-white/10">
											<ClipboardCheck className="size-5" />
										</span>
										<h3 className="mt-4 text-xl font-bold">{f.title}</h3>
										<p className="mt-2 text-sm text-[#d9e2ec]">{f.desc}</p>
										<span className="mt-4 inline-flex items-center gap-1 text-sm font-bold">
											예약하기
											<ArrowUpRight className="size-4" />
										</span>
									</div>
								) : (
									<div
										key={f.title}
										className="group relative flex flex-col rounded-3xl bg-[#f8fafc] p-6 transition-colors hover:bg-[#eff6ff]"
									>
										<h3 className="text-xl font-bold text-[#0a192f]">
											{f.title}
										</h3>
										<p className="mt-2 text-sm text-[#737373]">{f.desc}</p>
										<ArrowUpRight className="absolute bottom-5 right-5 size-5 text-[#a3a3a3] transition-colors group-hover:text-[#2563eb]" />
									</div>
								),
							)}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

function Announcements4() {
	return (
		<section className="mx-auto max-w-[1280px] px-4 py-12">
			<div className="grid gap-6 md:grid-cols-2">
				{/* 공지사항 */}
				<div className="rounded-[32px] border border-[#f1f5f9] bg-white p-[33px] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]">
					<div className="flex items-center justify-between">
						<h3 className="text-2xl font-bold text-[#0a192f]">공지사항</h3>
						<button
							type="button"
							className="inline-flex items-center text-sm text-[#737373]"
						>
							더보기
							<ChevronRight className="size-2.5" />
						</button>
					</div>
					<div className="mt-6 flex flex-col gap-4">
						{NOTICES.map((n) => (
							<div
								key={n.title}
								className="flex items-center gap-4 rounded-[20px] bg-[#f8fafc] p-[21px]"
							>
								<span
									className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white shadow-sm"
									style={{ color: n.color }}
								>
									<n.icon className="size-4" />
								</span>
								<div className="flex flex-col gap-1">
									<span className="self-start rounded-md border border-[#f1f5f9] bg-white px-[11px] py-[5px] text-xs font-bold text-[#737373]">
										{n.tag}
									</span>
									<p className="text-base font-medium text-[#0a192f]">
										{n.title}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>

				{/* 건강 칼럼 */}
				<div className="rounded-[32px] border border-[#f1f5f9] bg-white p-[33px] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]">
					<div className="flex items-center justify-between">
						<h3 className="text-2xl font-bold text-[#0a192f]">건강 칼럼</h3>
						<button
							type="button"
							className="inline-flex items-center text-sm text-[#737373]"
						>
							더보기
							<ChevronRight className="size-2.5" />
						</button>
					</div>
					<div className="mt-6 flex flex-col gap-4">
						{ARTICLES.map((a) => (
							<div
								key={a.title}
								className="flex items-center gap-4 rounded-[20px] bg-[#f8fafc] p-[21px]"
							>
								<span
									className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white shadow-sm"
									style={{ color: a.color }}
								>
									{a.icon && <a.icon className="size-4" />}
								</span>
								<div className="flex flex-col gap-1">
									<span className="self-start rounded-md border border-[#f1f5f9] bg-white px-[11px] py-[5px] text-xs font-bold text-[#737373]">
										{a.tag}
									</span>
									<p className="text-base font-medium text-[#0a192f]">
										{a.title}
									</p>
									<p className="text-xs text-[#a3a3a3]">{a.author}</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}

function SectionHeading4({
	title,
	subtitle,
}: {
	title: string;
	subtitle: string;
}) {
	return (
		<div className="text-center">
			<h2 className="text-3xl font-bold text-[#0a192f] md:text-4xl">{title}</h2>
			<p className="mt-3 text-base text-[#737373] md:text-lg">{subtitle}</p>
		</div>
	);
}

function Doctors4() {
	return (
		<section className="relative overflow-hidden bg-white py-20 md:py-24">
			<div className="mx-auto max-w-[1280px] px-4">
				<SectionHeading4
					title="의료진 소개"
					subtitle="풍부한 임상경험을 갖춘 전문의가 직접 진료합니다."
				/>
				<div className="mt-12 grid gap-6 md:grid-cols-2">
					{DOCTORS.map((d) => (
						<article
							key={d.name}
							className="rounded-[32px] border border-[#f1f5f9] bg-white p-[33px] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]"
						>
							<div className="flex items-center gap-6">
								<span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-[#0a192f] text-white">
									<User className="size-9" />
								</span>
								<div>
									<h3 className="text-2xl font-bold text-[#0a192f]">
										{d.name}
									</h3>
									<p className="mt-1 text-base text-[#737373]">{d.spec}</p>
								</div>
							</div>
							<ul className="mt-6 flex flex-col gap-4">
								{d.bullets.map((b) => (
									<li key={b} className="text-sm text-[#737373]">
										{b}
									</li>
								))}
							</ul>
						</article>
					))}
				</div>
			</div>
		</section>
	);
}

function Location4() {
	return (
		<section className="bg-[#f8fafc] py-20 md:py-24">
			<div className="mx-auto max-w-[1280px] px-4">
				<SectionHeading4
					title="오시는 길"
					subtitle="우리 병원의 위치와 교통 정보를 안내합니다."
				/>
				<div className="mt-12 grid gap-6 md:grid-cols-2">
					{/* 병원 위치 */}
					<div className="flex flex-col gap-6 rounded-[32px] border border-[#f1f5f9] bg-white p-[33px] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]">
						<div className="flex items-center gap-4">
							<span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-[#eff6ff] text-[#2563eb]">
								<MapPin className="size-6" />
							</span>
							<div>
								<h3 className="text-xl font-bold text-[#0a192f]">병원 위치</h3>
								<p className="mt-0.5 text-sm text-[#737373]">{ADDRESS}</p>
							</div>
						</div>
						<ul className="flex flex-col gap-4">
							{TRANSIT.map((t) => (
								<li
									key={t}
									className="flex items-center gap-3 text-sm text-[#737373]"
								>
									<MapPin className="size-3.5 shrink-0 text-[#a3a3a3]" />
									{t}
								</li>
							))}
						</ul>
					</div>

					{/* 연락처 */}
					<div className="flex flex-col gap-6 rounded-[32px] border border-[#f1f5f9] bg-white p-[33px] shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05)]">
						<div className="flex items-center gap-4">
							<span className="flex size-16 shrink-0 items-center justify-center rounded-full bg-[#f0fdf4] text-[#16a34a]">
								<Phone className="size-4" />
							</span>
							<div>
								<h3 className="text-xl font-bold text-[#0a192f]">연락처</h3>
								<p className="mt-0.5 text-sm text-[#737373]">
									상담 및 예약 문의
								</p>
							</div>
						</div>
						<ul className="flex flex-col gap-4">
							<li className="flex items-center gap-3 text-sm text-[#737373]">
								<Phone className="size-3.5 shrink-0 text-[#a3a3a3]" />
								{PHONE} (해피콜 센터)
							</li>
							<li className="flex items-center gap-3 text-sm text-[#737373]">
								<Mail className="size-3.5 shrink-0 text-[#a3a3a3]" />
								{EMAIL}
							</li>
							<li className="flex items-center gap-3 text-sm text-[#737373]">
								<Clock className="size-3.5 shrink-0 text-[#a3a3a3]" />
								운영시간: 평일 09:00-18:30
							</li>
						</ul>
					</div>
				</div>
			</div>
		</section>
	);
}

function Prices4() {
	return (
		<section className="bg-white py-20 md:py-24">
			<div className="mx-auto max-w-[1280px] px-4">
				<h2 className="text-[22px] font-bold leading-[33px] text-[#0f172a]">
					비급여 진료비 안내
				</h2>
				<div className="mt-4 overflow-x-auto border-t border-[#e2e8f0] pt-4">
					<table className="w-full min-w-[480px]">
						<thead>
							<tr className="bg-[#f8fafc]">
								<th className="px-8 py-4 text-left text-[17px] font-semibold text-[#525252]">
									항목
								</th>
								<th className="px-8 py-4 text-left text-[17px] font-semibold text-[#525252]">
									내용
								</th>
								<th className="px-8 py-4 text-right text-[17px] font-semibold text-[#525252]">
									금액
								</th>
							</tr>
						</thead>
						<tbody>
							{PRICES.map(([item, content, amount]) => (
								<tr key={item} className="border-b border-[#e2e8f0]">
									<td className="px-8 py-4 text-[17px] text-[#1e293b]">
										{item}
									</td>
									<td className="px-8 py-4 text-[17px] text-[#525252]">
										{content}
									</td>
									<td className="px-8 py-4 text-right text-[17px] font-bold text-[#0f172a]">
										{amount}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				<p className="mt-4 text-base text-[#64748b]">
					건강보험이 적용되지 않는 비급여 항목 기준입니다.
				</p>
			</div>
		</section>
	);
}

function Promo4() {
	return (
		<section className="relative overflow-hidden bg-[linear-gradient(90deg,#1e293b,#334155,#1e293b)] py-20 text-center text-white md:py-28">
			<div className="pointer-events-none absolute inset-0 opacity-[0.07]">
				<div className="absolute left-10 top-10 size-40 rotate-12 border border-white/40" />
				<div className="absolute bottom-10 right-16 size-56 -rotate-6 border border-white/40" />
			</div>
			<div className="relative mx-auto flex max-w-[1000px] flex-col items-center px-6">
				<span className="rounded-sm border border-white/60 px-4 py-1.5 text-sm font-bold uppercase tracking-[0.1em]">
					여름 맞이 이벤트
				</span>
				<h2 className="mt-6 text-3xl font-extrabold md:text-5xl md:leading-[60px]">
					봄맞이 종합건강검진 특별 프로그램
				</h2>
				<p className="mt-6 max-w-2xl text-base text-white/80 md:text-lg">
					조기 발견과 예방을 위한 맞춤형 건강검진. 최신 의료장비와 전문 의료진이
					함께합니다.
				</p>
				<div className="mt-10 flex flex-wrap justify-center gap-x-12 gap-y-3">
					{PROMO_PERKS.map((perk) => (
						<span
							key={perk}
							className="flex items-center gap-2 text-base font-medium"
						>
							<Check className="size-4" />
							{perk}
						</span>
					))}
				</div>
				<p className="mt-8 text-sm text-white/60">
					이벤트 기간: 2026.03.01 - 2026.05.31
				</p>
				<button
					type="button"
					className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 text-[17px] font-bold text-[#1e293b] shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1)]"
				>
					프로그램 자세히 보기
					<ArrowUpRight className="size-5" />
				</button>
			</div>
		</section>
	);
}

function Footer4() {
	return (
		<footer className="bg-[#0a192f] py-12 text-[#d9e2ec]">
			<div className="mx-auto flex max-w-[1280px] flex-col justify-between gap-6 px-4 md:flex-row md:items-center">
				<div>
					<p className="text-lg font-bold text-[#d9e2ec]">{CLINIC}</p>
					<p className="mt-2 text-sm">{ADDRESS}</p>
					<p className="mt-1 text-sm">
						대표전화: {PHONE} | 사업자등록번호: 123-45-67890
					</p>
				</div>
				<p className="text-xs text-white/50">
					© 2026 Hong Gildong Internal Medicine. All rights reserved.
				</p>
			</div>
		</footer>
	);
}
