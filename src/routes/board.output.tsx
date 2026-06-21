import { createFileRoute } from "@tanstack/react-router";
import {
	Check,
	FileText,
	Info,
	Maximize2,
	Pencil,
	Play,
	Plus,
	Save,
	Trash2,
	Volume2,
	X,
} from "lucide-react";
import type * as React from "react";
import { useState } from "react";
import { BoardSideNav } from "#/components/common/board-side-nav.tsx";
import { InfoCallout } from "#/components/common/info-callout.tsx";
import { SectionCard } from "#/components/common/section-card.tsx";
import TiptapEditor from "#/components/editor/tiptap-editor.tsx";
import { AppShell } from "#/components/layout/app-shell.tsx";
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";

export const Route = createFileRoute("/board/output")({
	component: BoardOutputPage,
});

const INITIAL_TYPES = ["공지사항", "이벤트", "칼럼", "휴진 안내"];
const ACTIVE_TYPE = "휴진 안내";

const POST_TITLE = "[공지] 2026년 설 연휴 기간 진료 및 휴진 일정 안내";
const POST_BODY = `안녕하세요, 원장 홍길동입니다.
2026년 새해를 맞아 본 의원의 명절 연휴 휴진 일정을 아래와 같이 안내해 드립니다.
가족들과 함께 따뜻한 명절 보내시기 바랍니다.`;

/** 첨부된 미디어 블록 (회색 placeholder + 캡션 + 삭제). 페이지 전용 소품. */
function AttachmentBlock({
	heading,
	caption,
	preview,
}: {
	heading: string;
	caption: string;
	preview: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-2">
			<p className="text-sm font-semibold text-body-soft">{heading}</p>
			<div className="overflow-hidden rounded-2xl border border-line-soft bg-muted/40">
				{preview}
			</div>
			<div className="flex items-center justify-between">
				<p className="text-base text-muted-fg">{caption}</p>
				<button
					type="button"
					className="flex items-center gap-1 text-[17px] text-danger transition-colors hover:text-danger-strong"
				>
					<Trash2 className="size-4" />
					삭제
				</button>
			</div>
		</div>
	);
}

function BoardOutputPage() {
	const [types, setTypes] = useState(INITIAL_TYPES);
	const [selectedType, setSelectedType] = useState(ACTIVE_TYPE);
	const [title, setTitle] = useState(POST_TITLE);
	const [body, setBody] = useState(POST_BODY);

	function removeType(type: string) {
		setTypes((prev) => prev.filter((t) => t !== type));
	}

	return (
		<AppShell userName="김민준 원장" maxWidth="1280px">
			<div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
				<BoardSideNav activeLabel="게시판 관리" />

				<div className="flex min-w-0 flex-1 flex-col gap-8">
					{/* 페이지 헤더 */}
					<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
						<div className="flex flex-col gap-2">
							<h1 className="text-2xl font-bold text-ink sm:text-[32px]">
								게시판 관리
							</h1>
							<p className="text-base text-body">
								홈페이지에 표시될 게시물을 관리합니다.
							</p>
						</div>
						<Button variant="brand" size="2xl" className="self-start px-8">
							<Save className="size-4" />
							전체 저장
						</Button>
					</div>

					{/* 게시물 수정 카드 */}
					<SectionCard className="flex flex-col gap-6">
						<h2 className="border-b border-line-soft pb-4 text-[22px] font-bold text-ink">
							게시물 수정
						</h2>

						{/* 게시판 유형 선택 (편집: 칩 + 추가 버튼) */}
						<div className="flex flex-col gap-4">
							<p className="text-[17px] font-medium text-body-soft">
								<span className="mr-1 text-danger">*</span>
								게시판 유형 선택
							</p>
							<div className="flex flex-wrap items-center gap-2">
								<button
									type="button"
									aria-label="유형 추가"
									className="flex size-14 items-center justify-center rounded-xl border border-line bg-surface text-body-soft transition-colors hover:border-brand hover:text-brand"
								>
									<Plus className="size-6" />
								</button>
								{types.map((type) => {
									const active = selectedType === type;
									return (
										<div
											key={type}
											className={
												active
													? "flex h-14 items-center gap-2 rounded-xl border border-brand bg-brand pr-3 pl-8 text-[19px] text-brand-foreground"
													: "flex h-14 items-center gap-2 rounded-xl border border-line bg-surface pr-3 pl-8 text-[19px] text-body-soft"
											}
										>
											<button
												type="button"
												onClick={() => setSelectedType(type)}
												className="outline-none"
											>
												{type}
											</button>
											<button
												type="button"
												aria-label={`${type} 삭제`}
												onClick={() => removeType(type)}
												className={
													active
														? "text-brand-foreground/80 hover:text-brand-foreground"
														: "text-muted-fg hover:text-body"
												}
											>
												<X className="size-5" />
											</button>
										</div>
									);
								})}
							</div>
						</div>

						{/* 게시물 제목 */}
						<div className="flex flex-col gap-4">
							<label
								htmlFor="output-title"
								className="text-[17px] font-medium text-body-soft"
							>
								<span className="mr-1 text-danger">*</span>
								게시물 제목
							</label>
							<input
								id="output-title"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="제목을 입력해 주세요"
								className="h-14 w-full rounded-lg border-2 border-brand bg-surface px-4 text-[17px] text-ink outline-none ring-3 ring-brand/15"
							/>
						</div>

						{/* 게시물 내용 (본문 + 첨부 미디어) */}
						<div className="flex flex-col gap-4">
							<p className="text-[17px] font-medium text-body-soft">
								<span className="mr-1 text-danger">*</span>
								게시물 내용
							</p>
							<div className="overflow-hidden rounded-lg border border-line bg-surface">
								<TiptapEditor
									value={body}
									setValue={setBody}
									height={240}
									placeholder="내용을 입력하세요."
								/>
								<div className="flex flex-col gap-6 px-4 py-4">
									<AttachmentBlock
										heading="첨부 이미지 · 설 연휴 진료 일정 표"
										caption="설 연휴 진료 일정 표 · JPG · 2.4MB"
										preview={
											<div className="flex h-56 w-full items-center justify-center bg-muted text-sm text-muted-fg">
												이미지 미리보기
											</div>
										}
									/>

									<AttachmentBlock
										heading="첨부 동영상 · 새해 인사 및 건강 가이드 영상"
										caption="새해_인사_건강가이드.mp4 · 148MB"
										preview={
											<div className="relative flex h-56 w-full items-center justify-center bg-ink/90">
												<div className="flex flex-col items-center gap-3">
													<span className="flex size-14 items-center justify-center rounded-full border-2 border-white/60 bg-white/20 backdrop-blur-sm">
														<Play className="size-5 fill-white text-white" />
													</span>
													<div className="flex flex-col items-center gap-0.5 text-center">
														<p className="text-sm font-medium text-white/90">
															새해 인사 및 건강 가이드 영상
														</p>
														<p className="text-xs text-white/60">
															MP4 · 148MB · 03:24
														</p>
													</div>
												</div>
												<div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8">
													<div className="h-0.5 w-full rounded-full bg-white/30" />
													<div className="flex items-center justify-between text-xs text-white/90">
														<div className="flex items-center gap-3">
															<Play className="size-3.5 fill-white text-white" />
															<Volume2 className="size-3.5 text-white" />
															<span>00:00 / 03:24</span>
														</div>
														<Maximize2 className="size-3.5 text-white" />
													</div>
												</div>
											</div>
										}
									/>
								</div>
								<div className="flex items-center justify-between border-t border-line-soft px-4 py-2.5 text-xs text-muted-fg">
									<span>
										이미지 최대 10MB · 동영상 최대 500MB · JPG, PNG, MP4 지원
									</span>
									<span>287 / 5,000자</span>
								</div>
							</div>
						</div>

						<InfoCallout
							tone="info"
							icon={<Info className="size-4 text-brand" />}
							className="text-sm"
						>
							수정된 게시물은 홈페이지에 즉시 반영됩니다. 게시물 수정 전 내용을
							충분히 검토해 주세요.
						</InfoCallout>

						<div className="flex flex-col-reverse justify-end gap-3 pt-1 sm:flex-row">
							<Button variant="neutral-outline" size="2xl" className="px-8">
								<X className="size-4" />
								취소
							</Button>
							<Button variant="brand" size="2xl" className="px-8 font-semibold">
								<Check className="size-4" />
								게시물 수정 완료하기
							</Button>
						</div>
					</SectionCard>

					{/* 등록된 게시물 (1건) */}
					<SectionCard className="flex flex-col gap-6">
						<div className="flex items-center gap-3 border-b border-line-soft pb-4">
							<h2 className="text-[22px] font-bold text-ink">등록된 게시물</h2>
							<Badge variant="secondary" size="lg">
								전체 1건
							</Badge>
						</div>
						<div className="flex flex-col gap-3 rounded-xl border border-line-soft p-4 sm:flex-row sm:items-center sm:justify-between">
							<div className="flex min-w-0 items-start gap-3">
								<span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand">
									<FileText className="size-5" />
								</span>
								<div className="flex min-w-0 flex-col gap-1">
									<p className="truncate text-base font-medium text-ink">
										{POST_TITLE}
									</p>
									<p className="text-sm text-muted-fg">
										2026.01.10 등록 · 이미지 1개, 동영상 1개 첨부
									</p>
								</div>
							</div>
							<div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
								<Button variant="neutral-outline" size="sm">
									<Pencil className="size-3.5" />
									수정
								</Button>
								<Button variant="destructive" size="sm">
									<Trash2 className="size-3.5" />
									삭제
								</Button>
							</div>
						</div>
					</SectionCard>
				</div>
			</div>
		</AppShell>
	);
}
