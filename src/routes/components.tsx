import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Calendar, type DateRange } from "#/components/common/calendar.tsx";
import {
	FileDropzone,
	FileUploadError,
	FileUploadProgress,
	UploadedFile,
	type UploadedFileItem,
	UploadedFileList,
} from "#/components/common/file-dropzone.tsx";
import {
	SectionCard,
	SectionTitle,
} from "#/components/common/section-card.tsx";
import {
	Autocomplete,
	type AutocompleteOption,
} from "#/components/form/autocomplete.tsx";
import {
	SelectField,
	type SelectFieldOption,
} from "#/components/form/select-field.tsx";

export const Route = createFileRoute("/components")({
	component: ComponentsPage,
});

// ── 더미 데이터 ─────────────────────────────────────────────
const SCHOOL_OPTIONS: AutocompleteOption[] = [
	{
		value: "snu-med",
		label: "서울 대학교 의과대학",
		description: "의과대학 · 서울특별시 종로구",
	},
	{
		value: "amc",
		label: "서울 아산병원",
		description: "상급종합병원 · 서울특별시 송파구",
	},
	{
		value: "snu-grad",
		label: "서울 대학교 대학원",
		description: "대학원 · 서울특별시 관악구",
	},
	{
		value: "uos",
		label: "서울 시립대학교",
		description: "종합대학교 · 서울특별시 동대문구",
	},
	{
		value: "yonsei-med",
		label: "연세 대학교 의과대학",
		description: "의과대학 · 서울특별시 서대문구",
	},
	{
		value: "korea-med",
		label: "고려 대학교 의과대학",
		description: "의과대학 · 서울특별시 성북구",
	},
];

const DAY_OPTIONS: SelectFieldOption[] = [
	{ value: "weekday", label: "평일 (주 5일 일괄 설정)" },
	{ value: "sat", label: "토요일 (주말 진료)" },
	{ value: "sun", label: "일요일 (주말 휴진/진료)" },
	{ value: "holiday", label: "공휴일" },
	{ value: "custom", label: "요일별 개별 설정 (월~금)" },
];

const INITIAL_FILES: UploadedFileItem[] = [
	{
		id: "f1",
		name: "소화기내과_공인인증_사본.zip",
		size: "9.4 MB",
		verified: true,
	},
	{ id: "f2", name: "경력증명서_심혈관센터.jpg", size: "9.4 MB" },
	{ id: "f3", name: "학술_논문_사본.pdf", size: "9.4 MB" },
];

function Section({
	title,
	caption,
	children,
}: {
	title: string;
	caption?: string;
	children: React.ReactNode;
}) {
	return (
		<SectionCard className="flex flex-col gap-6">
			<div className="flex flex-col gap-1">
				<SectionTitle>{title}</SectionTitle>
				{caption ? (
					<p className="pl-3 text-sm text-muted-fg">{caption}</p>
				) : null}
			</div>
			{children}
		</SectionCard>
	);
}

function ComponentsPage() {
	// 1) 달력
	const [singleDate, setSingleDate] = useState<Date | null>(
		new Date(2026, 4, 12),
	);
	const [range, setRange] = useState<DateRange>({
		start: new Date(2026, 4, 9),
		end: new Date(2026, 4, 13),
	});

	// 2) 업로드
	const [files, setFiles] = useState<UploadedFileItem[]>(INITIAL_FILES);
	const single: UploadedFileItem = {
		id: "single",
		name: "대표연구_증빙서류_고윤송.pdf",
		size: "12.4 MB",
		uploadedAt: "방금 전",
	};
	const totalLabel = `총 ${files.length}개의 파일 (42.1 MB)`;

	// 3) 자동완성
	const [school, setSchool] = useState("서울");
	const [manualMode, setManualMode] = useState(false);

	// 4) 선택 필드
	const [day, setDay] = useState("weekday");
	const [dayError, setDayError] = useState<string | undefined>(undefined);

	return (
		<div className="min-h-screen bg-app-bg">
			<div className="mx-auto w-full max-w-[1100px] px-4 py-10 sm:px-6">
				<header className="mb-8 flex flex-col gap-1">
					<h1 className="text-2xl font-bold text-ink">공통 위젯 데모</h1>
					<p className="text-base text-body">
						재사용 가능한 4개 위젯 (달력 / 파일 업로드 / 자동완성 / 선택 필드).
					</p>
				</header>

				<div className="flex flex-col gap-8">
					{/* 1) 달력 */}
					<Section
						title="달력 (Calendar)"
						caption="단일 선택 + 범위 선택. 월 드롭다운, 이전/다음, 오늘 표시 모두 React만으로 구현."
					>
						<div className="flex flex-wrap gap-6">
							<div className="flex flex-col gap-2">
								<span className="text-sm font-medium text-body-soft">
									단일 선택 (mode="single")
								</span>
								<Calendar
									mode="single"
									value={singleDate}
									onChange={setSingleDate}
									defaultMonth={new Date(2026, 4, 1)}
									onCancel={() => setSingleDate(null)}
								/>
								<p className="text-sm text-muted-fg">
									선택:{" "}
									{singleDate ? singleDate.toLocaleDateString("ko-KR") : "없음"}
								</p>
							</div>
							<div className="flex flex-col gap-2">
								<span className="text-sm font-medium text-body-soft">
									범위 선택 (mode="range")
								</span>
								<Calendar
									mode="range"
									value={range}
									onChange={setRange}
									defaultMonth={new Date(2026, 4, 1)}
									onCancel={() => setRange({ start: null, end: null })}
								/>
							</div>
						</div>
					</Section>

					{/* 2) 파일 업로드/다운로드 */}
					<Section
						title="파일 업로드 / 다운로드 (FileDropzone)"
						caption="드래그&드롭 UI는 시각만 (실제 업로드 no-op). 진행/완료/복수/실패 상태 포함."
					>
						<div className="flex flex-col gap-6">
							<div className="flex flex-col gap-2">
								<span className="text-sm text-muted-fg">
									1. 초기 상태 (드롭존)
								</span>
								<FileDropzone onSelect={() => {}} />
							</div>

							<div className="flex flex-col gap-2">
								<span className="text-sm text-muted-fg">2. 업로드 중</span>
								<FileUploadProgress
									percent={75}
									loaded="15.3MB"
									total="20.4MB"
									onCancel={() => {}}
								/>
							</div>

							<div className="flex flex-col gap-2">
								<span className="text-sm text-muted-fg">
									3. 단일 첨부 완료 (다운로드 / 삭제)
								</span>
								<UploadedFile
									file={single}
									onDownload={() => {}}
									onRemove={() => {}}
								/>
							</div>

							<div className="flex flex-col gap-2">
								<span className="text-sm text-muted-fg">
									4. 복수 파일 (검증 배지 + 추가 업로드)
								</span>
								<UploadedFileList
									files={files}
									totalLabel={totalLabel}
									onDownload={() => {}}
									onRemove={(id) =>
										setFiles((prev) => prev.filter((f) => f.id !== id))
									}
									onAddMore={() =>
										setFiles((prev) => [
											...prev,
											{
												id: `f${prev.length + 1}-${Date.now()}`,
												name: "추가서류_샘플.pdf",
												size: "3.2 MB",
											},
										])
									}
								/>
							</div>

							<div className="flex flex-col gap-2">
								<span className="text-sm text-muted-fg">5. 업로드 실패</span>
								<FileUploadError onRetry={() => {}} onDismiss={() => {}} />
							</div>
						</div>
					</Section>

					{/* 3) 자동완성 검색 */}
					<Section
						title="자동완성 검색 (Autocomplete)"
						caption="입력값으로 필터 + 매칭 하이라이트. 키보드(↑/↓/Enter/Esc) 및 클릭 선택, 직접 입력 모드 전환."
					>
						<div className="max-w-[480px]">
							{manualMode ? (
								<div className="flex flex-col gap-2">
									<span className="text-base font-bold text-body-soft">
										학교명 (직접 입력 모드)
									</span>
									<div className="flex h-14 items-center justify-between rounded-lg border border-line bg-surface px-4">
										<input
											value={school}
											onChange={(e) => setSchool(e.target.value)}
											className="h-full flex-1 bg-transparent text-[17px] text-ink-soft outline-none"
										/>
										<button
											type="button"
											onClick={() => setManualMode(false)}
											className="text-sm text-brand"
										>
											검색으로
										</button>
									</div>
									<p className="px-1 text-sm text-muted-fg">
										리스트에 없는 경우 직접 입력 중입니다.
									</p>
								</div>
							) : (
								<div className="flex flex-col gap-2">
									<span className="text-base font-bold text-body-soft">
										학교명
									</span>
									<Autocomplete
										options={SCHOOL_OPTIONS}
										value={school}
										onChange={setSchool}
										onSelect={() => {}}
										onManualEntry={() => setManualMode(true)}
										placeholder="졸업한 의과대학 이름을 검색하세요"
									/>
									<p className="px-1 text-sm text-muted-fg">
										졸업한 의과대학 이름을 검색하여 선택해 주세요.
									</p>
								</div>
							)}
						</div>
					</Section>

					{/* 4) 선택 필드 */}
					<Section
						title="선택 필드 (SelectField)"
						caption="라벨 + 56px 드롭다운. 열림 시 brand 외곽 + 셰브론 회전, 선택 항목 강조."
					>
						<div className="flex flex-wrap items-start gap-8">
							<div className="w-[300px]">
								<SelectField
									label="진료일 구분"
									required
									options={DAY_OPTIONS}
									value={day}
									onChange={(v) => {
										setDay(v);
										setDayError(undefined);
									}}
									description="진료 시간을 적용할 요일 구분을 선택하세요."
								/>
								<p className="mt-2 text-sm text-muted-fg">
									선택: {DAY_OPTIONS.find((o) => o.value === day)?.label}
								</p>
							</div>

							<div className="w-[300px]">
								<SelectField
									label="에러 상태 예시"
									required
									options={DAY_OPTIONS}
									value={undefined}
									onChange={() => setDayError(undefined)}
									placeholder="선택해 주세요"
									error={
										dayError ?? "필수 항목입니다. 진료일 구분을 선택해 주세요."
									}
								/>
							</div>

							<div className="w-[300px]">
								<SelectField
									label="비활성 상태"
									options={DAY_OPTIONS}
									value="holiday"
									disabled
								/>
							</div>
						</div>
					</Section>
				</div>
			</div>
		</div>
	);
}
