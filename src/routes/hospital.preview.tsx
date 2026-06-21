import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Clock, ImageIcon, MapPin, Phone } from "lucide-react";
import { AppShell } from "#/components/layout/app-shell.tsx";
import { Button } from "#/components/ui/button.tsx";

export const Route = createFileRoute("/hospital/preview")({
	component: HospitalPreviewPage,
});

const STEPS = [{ label: "병원 정보 입력" }, { label: "프로필 페이지 작성" }];

const PUBLIC_NAV = ["병원안내", "진료과/의료진", "이용안내", "건강정보"];

const THEME_SWATCHES = [
	{ color: "#2a64f6", selected: true },
	{ color: "#8b5cf6", selected: false },
	{ color: "#334155", selected: false },
	{ color: "#ef4444", selected: false },
	{ color: "#74ef44", selected: false },
];

const HOURS = [
	{ label: "평일", value: "09:00 - 18:00" },
	{ label: "점심시간", value: "12:00 - 13:00" },
	{ label: "토요일", value: "09:00 - 13:00" },
];

function HospitalPreviewPage() {
	return (
		<AppShell steps={STEPS} current={0} userName="김의사" maxWidth="1280px">
			<div className="flex flex-col gap-4">
				{/* 미리보기 모드 안내 바 */}
				<div className="flex flex-col gap-4 rounded-xl bg-[#111827] px-8 py-4 text-white lg:flex-row lg:items-center lg:justify-between">
					<div className="flex items-center gap-4">
						<span className="shrink-0 rounded-md bg-[#f3f4f6] px-3 py-1 text-[17px] text-[#4b5563]">
							미리보기 모드
						</span>
						<span className="text-base text-[#d1d5db]">
							현재 화면은 환자들에게 노출될 실제 페이지의 프리뷰 상태입니다.
						</span>
					</div>
					<div className="hidden items-center gap-2 lg:flex">
						{THEME_SWATCHES.map((swatch) => (
							<span
								key={swatch.color}
								className="flex size-9 items-center justify-center rounded-full"
								style={{
									backgroundColor: swatch.color,
									border: swatch.selected
										? "4px solid #ffffff"
										: "1px solid #e2e8f0",
								}}
							>
								<span
									className="size-3.5 rounded-full"
									style={{ backgroundColor: swatch.color }}
								/>
							</span>
						))}
					</div>
					<div className="flex items-center gap-3">
						<Button
							variant="neutral-outline"
							size="sm"
							className="rounded-md border-[#4b5563] bg-transparent px-5 text-[15px] font-medium text-white hover:bg-white/10"
							nativeButton={false}
							render={<Link to="/hospital/confirm" />}
						>
							수정 계속하기
						</Button>
						<Button
							size="sm"
							className="rounded-md bg-brand px-5 text-[15px] font-semibold text-white hover:bg-brand-700"
						>
							최종 프로필 발행
						</Button>
					</div>
				</div>

				{/* 공개 페이지 미리보기 */}
				<div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
					{/* 공개 헤더 */}
					<header className="flex items-center justify-between gap-4 border-b border-line px-6 py-4 sm:px-8">
						<div className="flex items-center gap-8">
							<div className="flex items-center gap-2">
								<span className="flex size-8 items-center justify-center rounded-lg bg-[#1e40af] text-sm font-bold text-white">
									병
								</span>
								<span className="text-xl font-semibold text-[#0f172a]">
									서울아산병원
								</span>
							</div>
							<nav className="hidden items-center gap-7 lg:flex">
								{PUBLIC_NAV.map((item) => (
									<span
										key={item}
										className="text-[15px] text-body-soft transition-colors hover:text-ink"
									>
										{item}
									</span>
								))}
							</nav>
						</div>
						<div className="flex items-center gap-4">
							<span className="hidden text-sm text-body-soft sm:inline">
								로그인
							</span>
							<span className="inline-flex items-center gap-1 rounded-full bg-[#1e40af] px-5 py-2.5 text-sm text-white">
								진료예약
								<ChevronRight className="size-3.5" />
							</span>
						</div>
					</header>

					{/* 히어로 */}
					<div className="bg-gradient-to-br from-brand-50/60 to-surface px-6 py-12 sm:px-12 sm:py-16">
						<div className="grid items-center gap-10 lg:grid-cols-[1fr_minmax(0,520px)]">
							<div className="flex flex-col gap-6">
								<span className="inline-flex w-fit items-center rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-sm text-[#1e40af]">
									TRUSTED HEALTHCARE
								</span>
								<h2 className="text-4xl leading-tight font-bold text-[#0f172a] sm:text-5xl">
									당신의 건강한 내일을 위한
									<br />
									<span className="bg-gradient-to-r from-[#1e40af] to-[#3b82f6] bg-clip-text text-transparent">
										최고의 선택
									</span>
								</h2>
								<p className="max-w-xl text-lg leading-relaxed text-body-soft">
									최첨단 의료 장비와 분야별 전문 의료진이 환자 중심의 맞춤형
									진료를 제공합니다. 끊임 없는 연구로 더 나은 의료 서비스를
									약속드립니다.
								</p>
								<div>
									<span className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-8 py-4 text-lg text-[#0f172a] shadow-sm">
										전화예약 1688-7575
										<Phone className="size-4.5" />
									</span>
								</div>
							</div>
							{/* 대표 이미지 placeholder */}
							<div className="flex aspect-[11/10] flex-col items-center justify-center gap-2 rounded-[32px] border border-line-soft bg-app-bg text-body-soft">
								<ImageIcon className="size-8" />
								<span className="text-sm">병원 대표 이미지</span>
							</div>
						</div>

						{/* 정보 카드 */}
						<div className="mt-12 grid gap-6 lg:grid-cols-2">
							<div className="flex flex-col gap-6 rounded-3xl border border-line-soft bg-surface p-8 shadow-sm">
								<span className="flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand">
									<Clock className="size-6" />
								</span>
								<h3 className="text-xl text-[#0f172a]">진료시간 안내</h3>
								<dl className="flex flex-col gap-3">
									{HOURS.map((row) => (
										<div
											key={row.label}
											className="flex items-center justify-between border-b border-line-soft pb-2"
										>
											<dt className="text-base text-body-soft">{row.label}</dt>
											<dd className="text-base text-[#0f172a]">{row.value}</dd>
										</div>
									))}
									<p className="pt-1 text-center text-sm text-danger-strong">
										* 일요일/공휴일 휴진
									</p>
								</dl>
							</div>

							<div className="flex flex-col gap-6 rounded-3xl border border-line-soft bg-surface p-8 shadow-sm">
								<span className="flex size-12 items-center justify-center rounded-xl bg-brand-50 text-brand">
									<MapPin className="size-6" />
								</span>
								<h3 className="text-xl text-[#0f172a]">오시는 길</h3>
								<p className="text-base leading-relaxed text-body-soft">
									서울특별시 송파구 올림픽로 43길 88
									<br />
									(풍납2동 388-1)
								</p>
								<span className="inline-flex w-fit items-center gap-1 text-base text-[#1e40af]">
									지도 보기
									<ChevronRight className="size-3.5" />
								</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		</AppShell>
	);
}
