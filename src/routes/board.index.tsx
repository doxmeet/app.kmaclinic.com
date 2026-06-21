import { createFileRoute } from "@tanstack/react-router";
import { FileText, Info, Save, Send } from "lucide-react";
import { useState } from "react";
import { BoardSideNav } from "#/components/common/board-side-nav.tsx";
import { InfoCallout } from "#/components/common/info-callout.tsx";
import { SectionCard } from "#/components/common/section-card.tsx";
import TiptapEditor from "#/components/editor/tiptap-editor.tsx";
import { AppShell } from "#/components/layout/app-shell.tsx";
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";

export const Route = createFileRoute("/board/")({ component: BoardManagePage });

const BOARD_TYPES = ["공지사항", "이벤트", "휴진 안내"];

function BoardManagePage() {
	const [selectedType, setSelectedType] = useState<string | null>(null);
	const [title, setTitle] = useState("");
	const [content, setContent] = useState("");

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

					{/* 새 게시물 등록 카드 */}
					<SectionCard className="flex flex-col gap-6">
						<h2 className="border-b border-line-soft pb-4 text-[22px] font-bold text-ink">
							새 게시물 등록
						</h2>

						{/* 게시판 유형 선택 */}
						<div className="flex flex-col gap-4">
							<p className="text-[17px] font-medium text-body-soft">
								<span className="mr-1 text-danger">*</span>
								게시판 유형 선택
							</p>
							<div className="flex flex-wrap gap-2">
								{BOARD_TYPES.map((type) => {
									const active = selectedType === type;
									return (
										<button
											key={type}
											type="button"
											onClick={() => setSelectedType(active ? null : type)}
											className={
												active
													? "flex h-14 items-center justify-center rounded-xl border border-brand bg-brand px-8 text-[17px] font-medium text-brand-foreground transition-colors"
													: "flex h-14 items-center justify-center rounded-xl border border-line bg-surface px-8 text-[17px] text-body-soft transition-colors hover:border-line-strong"
											}
										>
											{type}
										</button>
									);
								})}
							</div>
						</div>

						{/* 게시판 제목 */}
						<div className="flex flex-col gap-4">
							<label
								htmlFor="board-title"
								className="text-[17px] font-medium text-body-soft"
							>
								<span className="mr-1 text-danger">*</span>
								게시판 제목
							</label>
							<input
								id="board-title"
								value={title}
								onChange={(e) => setTitle(e.target.value)}
								placeholder="제목을 입력해 주세요"
								className="h-14 w-full rounded-lg border border-line bg-surface px-4 text-[17px] text-ink outline-none transition-colors placeholder:text-muted-fg focus-visible:border-brand focus-visible:ring-3 focus-visible:ring-brand/15"
							/>
						</div>

						{/* 게시물 내용 */}
						<div className="flex flex-col gap-4">
							<p className="text-[17px] font-medium text-body-soft">
								<span className="mr-1 text-danger">*</span>
								게시물 내용
							</p>
							<div className="overflow-hidden rounded-lg border border-line bg-surface">
								<TiptapEditor
									value={content}
									setValue={setContent}
									height={320}
									placeholder="내용을 입력하세요. 이미지와 동영상을 첨부하여 상세한 안내가 가능합니다."
								/>
								<div className="flex items-center justify-between border-t border-line-soft px-4 py-2.5 text-xs text-muted-fg">
									<span>
										이미지 최대 10MB · 동영상 최대 500MB · JPG, PNG, MP4 지원
									</span>
									<span>{content.length} / 5,000자</span>
								</div>
							</div>
						</div>

						<InfoCallout
							tone="info"
							icon={<Info className="size-4 text-brand" />}
							className="text-sm"
						>
							등록된 게시물은 홈페이지에 즉시 반영됩니다. 게시물 등록 전 내용을
							충분히 검토해 주세요.
						</InfoCallout>

						<div className="flex justify-center pt-1">
							<Button variant="brand" size="2xl" className="px-8 font-semibold">
								<Send className="size-4" />
								게시물 등록하기
							</Button>
						</div>
					</SectionCard>

					{/* 등록된 게시물 (빈 상태) */}
					<SectionCard className="flex flex-col gap-6">
						<div className="flex items-center gap-3 border-b border-line-soft pb-4">
							<h2 className="text-[22px] font-bold text-ink">등록된 게시물</h2>
							<Badge variant="secondary" size="lg">
								전체 0건
							</Badge>
						</div>
						<div className="flex flex-col items-center gap-4 py-16 text-center">
							<span className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-fg">
								<FileText className="size-6" />
							</span>
							<div className="flex flex-col gap-2">
								<p className="text-[17px] text-body-soft">
									등록된 게시물이 없습니다
								</p>
								<p className="text-[15px] text-muted-fg">
									위 양식을 통해 첫 번째 게시물을 등록해 보세요.
								</p>
							</div>
						</div>
					</SectionCard>
				</div>
			</div>
		</AppShell>
	);
}
