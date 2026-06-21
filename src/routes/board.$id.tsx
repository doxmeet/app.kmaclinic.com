import { createFileRoute, useParams } from "@tanstack/react-router";
import {
	ChevronDown,
	ChevronRight,
	ChevronUp,
	FileText,
	List,
	Maximize2,
	Play,
	Share2,
	Volume2,
} from "lucide-react";
import { AppShell } from "#/components/layout/app-shell.tsx";
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";

export const Route = createFileRoute("/board/$id")({
	component: BoardDetailPage,
});

const POST = {
	type: "휴진 안내",
	title: "[공지] 2026년 설 연휴 기간 진료 및 휴진 일정 안내",
	date: "2026.01.10",
	views: "1,248",
	author: "홍길동내과의원",
	bodyHtml: `
		<p>안녕하세요, 원장 홍길동입니다.</p>
		<p>2026년 새해를 맞아 본 의원의 명절 연휴 휴진 일정을 아래와 같이 안내해 드립니다.</p>
		<p>가족들과 함께 따뜻한 명절 보내시기 바랍니다.</p>
	`,
	imageCaption: "설 연휴 진료 일정 표 · JPG · 2.4MB",
	videoTitle: "새해 인사 및 건강 가이드 영상",
	videoMeta: "MP4 · 148MB · 03:24",
	notices: [
		{
			text: "연휴 기간 중 응급 환자는 인근 대학병원 응급센터를 이용해 주시기 바랍니다.",
		},
		{
			text: "예약 변경 및 기타 문의는 대표전화 ",
			strong: "02-1234-5678",
			tail: " 로 연락 부탁드립니다.",
		},
		{
			text: "연휴 전후로는 진료 대기 시간이 길어질 수 있으니 사전에 예약 후 방문 권장드립니다.",
		},
	],
	prev: "환절기 호흡기 건강 관리 팁",
	next: "독감 예방 접종 안내 (2월)",
};

const RELATED = [
	{ title: "2025년 크리스마스 진료 일정 안내", date: "2025.12.15 등록" },
	{ title: "내과 정기 검진 필수 항목 리스트", date: "2025.12.01 등록" },
	{ title: "겨울철 혈압 관리 주의사항", date: "2025.11.20 등록" },
	{ title: "신규 의료진 영입 소식 (강호동 과장)", date: "2025.11.10 등록" },
];

function BoardDetailPage() {
	const { id } = useParams({ from: "/board/$id" });

	return (
		<AppShell userName="김민준 원장" maxWidth="1000px">
			<div className="flex w-full flex-col gap-8 lg:py-4">
				{/* 상단: 브레드크럼 + 목록으로 */}
				<div className="flex items-center justify-between gap-3">
					<nav className="flex items-center gap-2 text-sm">
						<span className="text-muted-fg">홈</span>
						<ChevronRight className="size-3 text-muted-fg" />
						<span className="font-medium text-body-soft">{POST.type}</span>
					</nav>
					<button
						type="button"
						className="text-sm text-body-soft transition-colors hover:text-ink"
					>
						목록으로
					</button>
				</div>

				{/* 본문 카드 */}
				<article className="overflow-hidden rounded-3xl bg-surface shadow-[0_4px_24px_0_rgba(0,0,0,0.04)]">
					{/* 헤더 */}
					<div className="flex flex-col gap-4 px-6 pt-8 pb-6 sm:px-10 sm:pt-10">
						<Badge
							variant="secondary"
							className="self-start px-3 py-1 text-[13px] text-muted-fg"
						>
							{POST.type}
						</Badge>
						<h1 className="text-2xl font-bold leading-snug text-ink sm:text-[28px]">
							{POST.title}
						</h1>
						<div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1">
							<MetaItem label="등록일" value={POST.date} />
							<span className="hidden h-3 w-px bg-line sm:block" />
							<MetaItem label="조회수" value={POST.views} />
							<span className="hidden h-3 w-px bg-line sm:block" />
							<MetaItem label="작성자" value={POST.author} />
						</div>
					</div>

					<div className="h-px w-full bg-line-soft" />

					{/* 본문 영역 */}
					<div className="flex flex-col gap-10 px-6 py-8 sm:px-10 sm:py-10">
						<div
							className="flex flex-col gap-2 text-[17px] leading-[1.8] text-body [&_p]:m-0"
							// biome-ignore lint/security/noDangerouslySetInnerHtml: 더미 본문 HTML(백엔드 없음)
							dangerouslySetInnerHTML={{ __html: POST.bodyHtml }}
						/>

						{/* 첨부 이미지 */}
						<section className="flex flex-col gap-3">
							<h2 className="text-base font-semibold text-body-soft">
								첨부 이미지
							</h2>
							<div className="overflow-hidden rounded-3xl border border-line-soft bg-muted/40">
								<div className="flex h-72 w-full items-center justify-center bg-muted text-sm text-muted-fg sm:h-96">
									이미지 미리보기
								</div>
							</div>
							<p className="text-[15px] text-muted-fg">{POST.imageCaption}</p>
						</section>

						{/* 첨부 동영상 */}
						<section className="flex flex-col gap-3">
							<h2 className="text-base font-semibold text-body-soft">
								첨부 동영상
							</h2>
							<div className="relative flex h-72 w-full items-center justify-center overflow-hidden rounded-3xl bg-ink sm:h-96">
								<div className="flex flex-col items-center gap-4">
									<span className="flex size-20 items-center justify-center rounded-full border-2 border-white/60 bg-white/20 backdrop-blur-sm">
										<Play className="size-7 fill-white text-white" />
									</span>
									<div className="flex flex-col items-center gap-1 text-center">
										<p className="text-lg font-medium text-white">
											{POST.videoTitle}
										</p>
										<p className="text-sm text-white/60">{POST.videoMeta}</p>
									</div>
								</div>
								<div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 bg-gradient-to-t from-black/80 to-transparent p-6">
									<div className="h-1 w-full rounded-full bg-white/30" />
									<div className="flex items-center justify-between text-[13px] text-white">
										<div className="flex items-center gap-4">
											<Play className="size-4 fill-white text-white" />
											<Volume2 className="size-4 text-white" />
											<span>00:00 / 03:24</span>
										</div>
										<Maximize2 className="size-4 text-white" />
									</div>
								</div>
							</div>
						</section>

						{/* 안내사항 */}
						<div className="rounded-3xl border border-line-soft bg-muted/40 p-6 sm:p-8">
							<h3 className="text-[17px] font-bold text-ink">안내사항</h3>
							<ul className="mt-3 flex flex-col gap-2">
								{POST.notices.map((n) => (
									<li
										key={n.text}
										className="flex gap-2 text-[15px] leading-[1.8] text-body-soft"
									>
										<span className="text-line-strong">•</span>
										<span>
											{n.text}
											{n.strong ? (
												<span className="font-bold text-brand">{n.strong}</span>
											) : null}
											{n.tail}
										</span>
									</li>
								))}
							</ul>
						</div>
					</div>

					{/* 하단: 버튼 + 이전/다음글 */}
					<div className="flex flex-col gap-6 border-t border-line-soft px-6 py-8 sm:px-10 lg:flex-row lg:items-center lg:justify-between">
						<div className="flex items-center gap-3">
							<Button
								className="h-14 rounded-2xl bg-ink px-10 text-[17px] font-medium text-surface hover:bg-ink/90"
								render={<button type="button" />}
							>
								<List className="size-4" />
								목록으로
							</Button>
							<Button
								variant="neutral-outline"
								className="h-14 rounded-2xl px-10 text-[17px] font-medium"
							>
								<Share2 className="size-4" />
								공유하기
							</Button>
						</div>
						<div className="flex flex-col gap-2">
							<button
								type="button"
								className="flex h-9 items-center gap-3 rounded-[10px] bg-app-bg px-4 transition-colors hover:bg-muted"
							>
								<span className="text-sm font-semibold text-muted-fg">
									이전글
								</span>
								<span className="max-w-[200px] flex-1 truncate text-sm text-body-soft">
									{POST.prev}
								</span>
								<ChevronUp className="size-3.5 text-muted-fg" />
							</button>
							<button
								type="button"
								className="flex h-9 items-center gap-3 rounded-[10px] bg-app-bg px-4 transition-colors hover:bg-muted"
							>
								<span className="text-sm font-semibold text-muted-fg">
									다음글
								</span>
								<span className="max-w-[200px] flex-1 truncate text-sm text-body-soft">
									{POST.next}
								</span>
								<ChevronDown className="size-3.5 text-muted-fg" />
							</button>
						</div>
					</div>
				</article>

				{/* 관련된 다른 소식 */}
				<section className="flex flex-col gap-6">
					<h2 className="text-xl font-bold text-ink">관련된 다른 소식</h2>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{RELATED.map((item) => (
							<button
								key={item.title}
								type="button"
								className="flex flex-col items-start gap-4 rounded-3xl border border-line-soft bg-surface p-6 text-left shadow-[0_2px_6px_rgba(0,0,0,0.03)] transition-shadow hover:shadow-md"
							>
								<span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand">
									<FileText className="size-4" />
								</span>
								<div className="flex flex-col gap-2">
									<p className="line-clamp-2 text-[15px] font-bold text-ink">
										{item.title}
									</p>
									<p className="text-[13px] text-muted-fg">{item.date}</p>
								</div>
							</button>
						))}
					</div>
				</section>

				{/* 더미 라우트 파라미터 표시 (개발 참고) */}
				<p className="text-xs text-muted-fg">게시물 ID: {id}</p>
			</div>
		</AppShell>
	);
}

function MetaItem({ label, value }: { label: string; value: string }) {
	return (
		<span className="flex items-center gap-1.5">
			<span className="text-sm font-medium text-body-soft">{label}</span>
			<span className="text-sm text-muted-fg">{value}</span>
		</span>
	);
}
