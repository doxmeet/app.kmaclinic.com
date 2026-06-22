import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { BrandLogo } from "#/components/layout/brand-logo.tsx";
import { SiteFooter } from "#/components/layout/site-footer.tsx";
import { Badge } from "#/components/ui/badge.tsx";

export const Route = createFileRoute("/demo")({
	// 개발용 카탈로그 — 운영(production) 빌드에서만 홈으로 리다이렉트(노출 차단).
	// 로컬(dev 서버, mode=localhost)·dev 배포(app-dev, mode=dev)에서는 접근 허용.
	beforeLoad: () => {
		if (import.meta.env.MODE === "production") {
			throw redirect({ to: "/" });
		}
	},
	component: ShowcaseIndex,
});

type Screen = { to: string; title: string; note?: string; ready?: boolean };
type Group = { title: string; desc: string; screens: Screen[] };

const GROUPS: Group[] = [
	{
		title: "실서비스 플로우 (API 연동)",
		desc: "로그인 → 온보딩 → 결제",
		screens: [
			{ to: "/login", title: "로그인", note: "Doxmeet OAuth", ready: true },
			{ to: "/onboarding", title: "대화형 온보딩", note: "AI 챗", ready: true },
			{
				to: "/billing/callback",
				title: "결제 콜백 (Toss)",
				note: "내부",
				ready: true,
			},
		],
	},
	{
		title: "운영자 콘솔 (API 연동)",
		desc: "요양기관 · 회원 · 면허",
		screens: [
			{ to: "/admin/institutions", title: "요양기관 현황", ready: true },
			{ to: "/admin/users", title: "회원 관리", ready: true },
			{ to: "/admin/licenses", title: "면허 검증", ready: true },
			{ to: "/error/payment-failed", title: "정기결제 실패", ready: true },
		],
	},
	{
		title: "병원 정보 (디자인 참고)",
		desc: "온보딩으로 대체된 기존 위저드",
		screens: [
			{ to: "/hospital/register", title: "기본 병원 정보 등록", ready: true },
			{ to: "/hospital/confirm", title: "병원 정보 확인", ready: true },
			{ to: "/hospital/billing", title: "병원 정보 등록 · 과금", ready: true },
			{ to: "/hospital/preview", title: "미리보기", ready: true },
			{ to: "/hospital/manage", title: "병원 정보 관리", ready: true },
		],
	},
	{
		title: "프로필 · 게시판 (별도 도메인)",
		desc: "kmadoc.com · slug.kmaclinic.com",
		screens: [
			{
				to: "/doctor/preview",
				title: "의사 프로필 공개 미리보기",
				note: "예시",
				ready: true,
			},
			{
				to: "/doctor/profile",
				title: "의사 프로필 관리",
				note: "Tiptap",
				ready: true,
			},
			{ to: "/board", title: "게시판 관리", note: "Tiptap", ready: true },
			{ to: "/board/output", title: "게시판 관리 · 출력", ready: true },
			{ to: "/board/1", title: "게시판 상세 조회", ready: true },
		],
	},
	{
		title: "재사용 UI",
		desc: "달력 · 업로드 · 자동완성 · 선택필드",
		screens: [
			{ to: "/components", title: "컴포넌트 데모", ready: true },
			{ to: "/playground/editor", title: "Tiptap 에디터 테스트", ready: true },
		],
	},
	{
		title: "랜딩 시안",
		desc: "마케팅 랜딩 페이지 대안 5종",
		screens: [
			{ to: "/landing/1", title: "시안 1", ready: true },
			{ to: "/landing/2", title: "시안 2", ready: true },
			{ to: "/landing/3", title: "시안 3", ready: true },
			{ to: "/landing/4", title: "시안 4", ready: true },
			{ to: "/landing/5", title: "시안 5", ready: true },
		],
	},
];

function ShowcaseIndex() {
	return (
		<div className="flex min-h-screen flex-col bg-app-bg">
			<header className="border-b border-line bg-surface">
				<div className="mx-auto flex max-w-[1080px] items-center justify-between px-4 py-4 sm:px-6">
					<BrandLogo label="KMA Clinic" to="/" />
					<Badge variant="soft" size="lg">
						디자인 구현 카탈로그
					</Badge>
				</div>
			</header>

			<main className="mx-auto w-full max-w-[1080px] flex-1 px-4 py-10 sm:px-6">
				<Link
					to="/"
					className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-fg transition-colors hover:text-brand"
				>
					<ArrowLeft className="size-4" />
					서비스 홈으로
				</Link>
				<div className="mt-4 flex flex-col gap-2">
					<h1 className="text-2xl font-bold text-ink sm:text-3xl">
						전체 화면 카탈로그 (데모)
					</h1>
					<p className="text-base text-body">
						구현된 모든 화면을 한눈에 모아본 내부용 데모입니다. “실서비스 플로우
						· 운영자 콘솔”은 이 콘솔(app)의 실제 화면이고, 그 외 병원 홈페이지 ·
						게시판 · 의사 프로필 · 랜딩은{" "}
						<strong>별도 도메인으로 분리될 미리보기</strong>
						입니다.
					</p>
				</div>

				<div className="mt-8 grid gap-6 md:grid-cols-2">
					{GROUPS.map((group) => (
						<section
							key={group.title}
							className="rounded-2xl border border-line bg-surface p-5 sm:p-6"
						>
							<div className="flex items-baseline justify-between gap-2">
								<h2 className="text-lg font-bold text-ink">{group.title}</h2>
								<span className="text-sm text-muted-fg">{group.desc}</span>
							</div>
							<ul className="mt-4 flex flex-col gap-1.5">
								{group.screens.map((s) => (
									<li key={s.to}>
										<a
											href={s.to}
											className="group flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted"
										>
											<span className="flex items-center gap-2">
												<span className="text-[15px] font-medium text-ink">
													{s.title}
												</span>
												{s.note ? (
													<span className="text-xs text-muted-fg">
														{s.note}
													</span>
												) : null}
												{s.ready ? (
													<Badge variant="success" className="ml-1">
														완료
													</Badge>
												) : (
													<Badge variant="secondary" className="ml-1">
														작업중
													</Badge>
												)}
											</span>
											<ArrowUpRight className="size-4 text-muted-fg transition-colors group-hover:text-brand" />
										</a>
									</li>
								))}
							</ul>
						</section>
					))}
				</div>
			</main>

			<SiteFooter />
		</div>
	);
}
