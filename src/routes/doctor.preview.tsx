import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, Building2, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "#/components/ui/badge.tsx";
import { cn } from "#/lib/utils.ts";

export const Route = createFileRoute("/doctor/preview")({
	component: DoctorPreviewPage,
});

// ── 더미 데이터 (백엔드 연동 없음, 공개 프로필 미리보기 예시) ──────────────

const DOCTOR = {
	name: "김민준",
	nameEn: "Kim Min-jun",
	role: "대표원장 · 소화기내과 전문의",
	slug: "kim-minjun",
};

const BASIC_INFO: { label: string; value: ReactNode }[] = [
	{ label: "이름", value: "김민준 (Kim Min-jun)" },
	{ label: "성별 / 생년월일", value: "남성 / 1978.05.12" },
	{
		label: "면허번호",
		value: (
			<span className="inline-flex items-center gap-2">
				의사면허 제123456호
				<Badge variant="soft" className="gap-1">
					<BadgeCheck className="size-3" aria-hidden />
					인증됨
				</Badge>
			</span>
		),
	},
	{ label: "연락처", value: "010-1234-5678" },
	{ label: "이메일", value: "dr.kim@snu.ac.kr" },
	{
		label: "소속 병원 및 진료 과목",
		value: "서울대학교병원 / 소화기내과, 순환기내과",
	},
];

type CareerItem = {
	period: string;
	title: string;
	detail?: string;
	highlight?: boolean;
};

const CAREER: CareerItem[] = [
	{
		period: "2002 졸업",
		title: "서울대학교 의과대학 (학사)",
		detail: "의학 전공 · 수석 졸업",
		highlight: true,
	},
	{
		period: "2005 졸업",
		title: "서울대학교 의과대학원 (석사)",
		detail: "내과학 전공",
	},
	{ period: "2002 ~ 2003", title: "서울대학교병원 인턴 수련 완료" },
	{
		period: "2003 ~ 2007",
		title: "서울대학교병원 내과 레지던트",
		detail: "소화기내과 세부 전공",
	},
	{
		period: "2018 ~ 2020",
		title: "서울아산병원 소화기내과 펠로우 (Fellowship)",
	},
	{
		period: "2020 ~ 2022",
		title: "하버드 의과대학 부속병원 미세수술 통합연구 포스트닥터",
	},
	{
		period: "2022 ~ 현재",
		title: "분당서울대학교병원 소화기내과 조교수",
		highlight: true,
	},
];

const SPECIALTIES = ["소화기내과 분과전문의", "순환기내과 세부전문의"];

const PRACTICE_AREAS = [
	"위장질환",
	"소화기내과",
	"대장질환",
	"위내시경",
	"대장내시경",
	"기능성 위장질환",
	"역류성 식도염",
	"과민성 대장증후군",
];

type Paper = { title: string; role: string; date: string };

const PAPERS: Paper[] = [
	{
		title: "Evaluation of Gastrointestinal Motility...",
		role: "제1저자",
		date: "2023.06",
	},
	{
		title: "Clinical Utility of Capsule Endoscopy...",
		role: "공동저자",
		date: "2022.11",
	},
];

const DAYS = ["월", "화", "수", "목", "금"] as const;

type Slot = "진료" | "수술" | "연구" | "-";

type Schedule = {
	hospital: string;
	rows: { label: string; slots: Slot[] }[];
};

const SCHEDULES: Schedule[] = [
	{
		hospital: "서울아산병원",
		rows: [
			{ label: "오전 (AM)", slots: ["진료", "-", "진료", "-", "진료"] },
			{ label: "오후 (PM)", slots: ["진료", "수술", "-", "수술", "진료"] },
		],
	},
	{
		hospital: "분당서울대학교병원",
		rows: [
			{ label: "오전 (AM)", slots: ["-", "진료", "-", "진료", "-"] },
			{ label: "오후 (PM)", slots: ["-", "진료", "연구", "진료", "-"] },
		],
	},
];

// ── 공개 프로필 전용 레이아웃 (AppShell / AuthGuard 미사용) ─────────────────

function DoctorPreviewPage() {
	return (
		<div className="min-h-screen bg-surface text-body">
			<PublicHeader />
			<HeroBanner />
			<main className="mx-auto flex w-full max-w-[830px] flex-col gap-12 px-5 pt-[100px] pb-20 md:px-0">
				<BasicInfoSection />
				<CareerSection />
				<CredentialsSection />
				<PapersSection />
				<ScheduleSection />
			</main>
			<PublicFooter />
		</div>
	);
}

function PublicHeader() {
	return (
		<header className="sticky top-0 z-20 border-line-soft border-b bg-surface/90 backdrop-blur">
			<div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-5">
				<div className="flex items-center gap-2">
					<div className="flex size-9 items-center justify-center rounded-lg bg-brand font-bold text-brand-foreground text-lg">
						D
					</div>
					<span className="font-semibold text-ink">닥스밋 닥터</span>
				</div>
				<span className="text-muted-fg text-sm">{DOCTOR.slug}.kmadoc.com</span>
			</div>
		</header>
	);
}

function HeroBanner() {
	return (
		<section className="relative">
			{/* 배너 이미지 placeholder (회색 박스 + 라벨) */}
			<div className="flex h-[200px] items-center justify-center overflow-hidden bg-brand text-brand-foreground/70 text-sm md:h-[320px]">
				배너 이미지 (placeholder)
			</div>
			<div className="mx-auto w-full max-w-[830px] px-5 md:px-0">
				<div className="relative">
					{/* 아바타 placeholder */}
					<div className="-top-20 absolute left-5 flex size-[120px] items-center justify-center rounded-full border-4 border-white bg-line-soft text-center text-muted-fg text-xs shadow-[0px_0px_0px_1px_rgba(15,15,15,0.05),0px_2px_4px_0px_rgba(15,15,15,0.1)] md:left-0 md:size-[160px]">
						사진
					</div>
					<div className="pt-12 md:pt-[100px]">
						<h1 className="font-bold text-[36px] text-ink leading-tight md:text-[48px]">
							{DOCTOR.name}
						</h1>
						<p className="mt-3 text-[18px] text-body-soft md:text-[20px]">
							{DOCTOR.role}
						</p>
					</div>
				</div>
			</div>
		</section>
	);
}

// ── 공통 섹션 소품 (라우트 전용) ────────────────────────────────────────────

function Section({
	title,
	action,
	children,
}: {
	title: string;
	action?: ReactNode;
	children: ReactNode;
}) {
	return (
		<section className="flex flex-col gap-6">
			<div className="flex items-center justify-between">
				<h2 className="font-bold text-[24px] text-ink leading-8">{title}</h2>
				{action}
			</div>
			{children}
		</section>
	);
}

function Card({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"overflow-hidden rounded-xl border border-line-soft bg-surface",
				className,
			)}
		>
			{children}
		</div>
	);
}

function BasicInfoSection() {
	return (
		<Section title="기본 정보">
			<Card>
				<dl>
					{BASIC_INFO.map((row, i) => (
						<div
							key={row.label}
							className={cn(
								"flex flex-col gap-1 px-6 py-3 sm:flex-row sm:items-center sm:gap-0",
								i < BASIC_INFO.length - 1 && "border-line-soft border-b",
							)}
						>
							<dt className="text-body-soft text-sm sm:w-[160px] sm:shrink-0 sm:text-[17px]">
								{row.label}
							</dt>
							<dd className="text-[17px] text-ink-soft">{row.value}</dd>
						</div>
					))}
				</dl>
			</Card>
		</Section>
	);
}

function CareerSection() {
	return (
		<Section title="경력 및 학력">
			<Card className="px-6 py-6">
				<ol className="flex flex-col">
					{CAREER.map((item, i) => (
						<li key={`${item.period}-${item.title}`} className="flex gap-8">
							{/* 타임라인 마커 + 세로선 */}
							<div className="flex flex-col items-center pt-2">
								<span
									className={cn(
										"size-4 shrink-0 rounded-full border-2 bg-surface",
										item.highlight
											? "border-brand bg-brand"
											: "border-line-strong",
									)}
								/>
								{i < CAREER.length - 1 ? (
									<span className="w-0.5 flex-1 bg-line-soft" />
								) : null}
							</div>
							<div className="flex flex-1 flex-col gap-1 pb-7">
								<div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-4">
									<span
										className={cn(
											"shrink-0 font-semibold text-sm tabular-nums sm:w-24",
											item.highlight ? "text-brand" : "text-body-soft",
										)}
									>
										{item.period}
									</span>
									<span className="text-[17px] text-ink-soft">
										{item.title}
									</span>
								</div>
								{item.detail ? (
									<p className="text-body-soft text-sm sm:pl-[112px]">
										{item.detail}
									</p>
								) : null}
							</div>
						</li>
					))}
				</ol>
			</Card>
		</Section>
	);
}

function CredentialsSection() {
	return (
		<Section title="전문 자격 및 진료 분야">
			<div className="flex flex-col gap-4">
				<Card className="px-6">
					<div className="flex flex-col gap-3 border-line-soft border-b py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
						<div className="flex flex-wrap items-center gap-2 sm:gap-4">
							<span className="text-[17px] text-ink">의사 면허</span>
							<span className="text-[17px] text-body-soft">
								(제123456호 / 보건복지부)
							</span>
						</div>
						<Badge
							variant="success"
							className="gap-1.5 self-start sm:self-auto"
						>
							<ShieldCheck className="size-3" aria-hidden />
							인증 완료
						</Badge>
					</div>
					<div className="flex flex-col gap-3 py-5">
						<p className="text-body-soft text-sm">보유 전문의 자격</p>
						<div className="flex flex-wrap gap-2">
							{SPECIALTIES.map((s) => (
								<span
									key={s}
									className="rounded-lg bg-brand-50 px-3 py-1.5 font-medium text-[15px] text-brand"
								>
									{s}
								</span>
							))}
						</div>
					</div>
				</Card>

				<div className="rounded-xl border border-line-soft bg-app-bg p-6">
					<p className="mb-4 text-body-soft text-sm">주요 진료 분야</p>
					<div className="flex flex-wrap gap-2">
						{PRACTICE_AREAS.map((area) => (
							<span
								key={area}
								className="rounded-lg border border-line-soft bg-surface px-4 py-2 font-medium text-[16px] text-body shadow-[0px_1px_1px_rgba(0,0,0,0.05)]"
							>
								{area}
							</span>
						))}
					</div>
				</div>
			</div>
		</Section>
	);
}

function PapersSection() {
	return (
		<Section title="연구 및 대표 논문">
			<Card>
				<table className="w-full text-left">
					<thead>
						<tr className="border-line-soft border-b bg-app-bg text-body-soft text-sm">
							<th className="px-6 py-3 font-medium">논문 제목 (Title)</th>
							<th className="hidden w-[138px] px-6 py-3 font-medium sm:table-cell">
								역할 (Role)
							</th>
							<th className="w-[120px] px-6 py-3 font-medium">게재일 (Date)</th>
						</tr>
					</thead>
					<tbody>
						{PAPERS.map((p, i) => (
							<tr
								key={p.title}
								className={cn(
									i < PAPERS.length - 1 && "border-line-soft border-b",
								)}
							>
								<td className="px-6 py-4 text-[15px] text-ink-soft">
									{p.title}
									<span className="mt-1 block sm:hidden">
										<Badge variant="secondary">{p.role}</Badge>
									</span>
								</td>
								<td className="hidden px-6 py-4 sm:table-cell">
									<Badge variant="secondary">{p.role}</Badge>
								</td>
								<td className="px-6 py-4 text-[15px] text-body-soft tabular-nums">
									{p.date}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</Card>
		</Section>
	);
}

function slotClass(slot: Slot) {
	if (slot === "진료") return "bg-brand-50 font-medium text-brand";
	if (slot === "수술" || slot === "연구") return "font-medium text-body-soft";
	return "text-muted-fg";
}

function ScheduleSection() {
	return (
		<Section
			title="주간 진료 일정"
			action={
				<span className="flex items-center gap-1.5 text-body-soft text-sm">
					<span className="size-3 rounded-sm bg-brand-50" />
					진료가능
				</span>
			}
		>
			<div className="flex flex-col gap-4">
				{SCHEDULES.map((sch) => (
					<Card key={sch.hospital}>
						<div className="flex items-center gap-2 border-line-soft border-b px-6 py-4">
							<Building2 className="size-4 text-muted-fg" aria-hidden />
							<h3 className="font-semibold text-[16px] text-ink">
								{sch.hospital}
							</h3>
						</div>
						<div className="overflow-x-auto">
							<table className="w-full min-w-[560px] text-center text-[15px]">
								<thead>
									<tr className="border-line-soft border-b bg-app-bg text-body-soft">
										<th className="w-24 px-2 py-3 font-medium">시간</th>
										{DAYS.map((d) => (
											<th key={d} className="px-2 py-3 font-medium">
												{d}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{sch.rows.map((row, ri) => (
										<tr
											key={row.label}
											className={cn(
												ri < sch.rows.length - 1 && "border-line-soft border-b",
											)}
										>
											<td className="px-2 py-4 text-left font-medium text-body-soft">
												{row.label}
											</td>
											{row.slots.map((slot, si) => (
												<td
													key={`${row.label}-${DAYS[si]}`}
													className="px-1 py-2"
												>
													<span
														className={cn(
															"inline-flex min-w-12 items-center justify-center rounded-md px-3 py-1.5",
															slotClass(slot),
														)}
													>
														{slot}
													</span>
												</td>
											))}
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</Card>
				))}
			</div>
		</Section>
	);
}

function PublicFooter() {
	return (
		<footer className="border-line-soft border-t bg-app-bg">
			<div className="mx-auto flex w-full max-w-[1200px] flex-col gap-2 px-5 py-10 text-muted-fg text-sm">
				<p className="font-semibold text-body-soft">
					{DOCTOR.name} {DOCTOR.role}
				</p>
				<p>
					본 페이지는 공개 의사 프로필({DOCTOR.slug}.kmadoc.com)의 디자인
					미리보기 예시입니다. 실제 데이터와 다를 수 있습니다.
				</p>
				<p>© 2026 닥스밋 닥터. All rights reserved.</p>
			</div>
		</footer>
	);
}
