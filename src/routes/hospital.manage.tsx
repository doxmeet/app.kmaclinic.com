import { createFileRoute } from "@tanstack/react-router";
import {
	CheckCircle2,
	Eye,
	FileText,
	Plus,
	Save,
	Search,
	ShieldCheck,
	UploadCloud,
	X,
} from "lucide-react";
import { useState } from "react";
import { BoardSideNav } from "#/components/common/board-side-nav.tsx";
import { InfoCallout } from "#/components/common/info-callout.tsx";
import {
	SectionCard,
	SectionTitle,
} from "#/components/common/section-card.tsx";
import {
	Field,
	FieldGroup,
	FieldLabel,
	FieldRow,
} from "#/components/form/field.tsx";
import { FieldInput } from "#/components/form/field-input.tsx";
import { FieldSelect } from "#/components/form/select-field.tsx";
import { AppShell } from "#/components/layout/app-shell.tsx";
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Switch } from "#/components/ui/switch.tsx";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table.tsx";
import { cn } from "#/lib/utils.ts";

export const Route = createFileRoute("/hospital/manage")({
	component: HospitalManagePage,
});

// ─── 더미 데이터 ────────────────────────────────────────────────────

const YEAR_OPTIONS = ["2026년", "2024년", "2018년", "2010년", "2000년"];
const DEPARTMENTS = ["내과", "이비인후과", "소아청소년과", "피부과"];
const SELECTED_DEPARTMENTS = ["내과", "이비인후과"];
const DAY_OPTIONS = [
	"평일(주 5일 일괄 설정)",
	"월요일",
	"화요일",
	"수요일",
	"목요일",
	"금요일",
	"토요일",
];
const TIME_OPTIONS = [
	"08:00",
	"09:00",
	"10:00",
	"12:30",
	"13:30",
	"18:00",
	"19:00",
	"20:00",
];
const LUNCH_OPTIONS = [
	"12:00 ~ 13:00 (1시간)",
	"12:30 ~ 13:30 (1시간)",
	"13:00 ~ 14:00 (1시간)",
];
const SUBWAY_LINES = ["1호선", "2호선", "5호선", "8호선", "9호선"];
const WALK_OPTIONS = ["도보 1분", "도보 3분", "도보 5분", "도보 10분"];

type Doctor = {
	id: string;
	name: string;
	department: string;
	hours: string;
	license: string;
};

const INITIAL_DOCTORS: Doctor[] = [
	{
		id: "d1",
		name: "김민준",
		department: "내과, 가정의학과",
		hours: "평일 09:00~18:00",
		license: "제12345호",
	},
	{
		id: "d2",
		name: "이수진",
		department: "소화기내과",
		hours: "평일 10:00~19:00",
		license: "제67890호",
	},
];

type NonCovered = { id: string; item: string; detail: string; price: string };

const INITIAL_NON_COVERED: NonCovered[] = [
	{ id: "n1", item: "독감 예방접종", detail: "4가 백신", price: "40,000원" },
	{
		id: "n2",
		item: "대상포진 예방접종",
		detail: "싱그릭스",
		price: "180,000원",
	},
	{
		id: "n3",
		item: "건강진단서",
		detail: "일반 진단서 발급",
		price: "20,000원",
	},
	{
		id: "n4",
		item: "영문진단서",
		detail: "영문 진단서 발급",
		price: "30,000원",
	},
	{
		id: "n5",
		item: "채용 신체검사",
		detail: "일반 채용검진",
		price: "30,000원",
	},
];

const THEME_COLORS = [
	{ value: "blue", label: "파랑", swatch: "#2a64f6" },
	{ value: "purple", label: "보라", swatch: "#8b5cf6" },
	{ value: "mono", label: "모노", swatch: "#334155" },
	{ value: "red", label: "레드", swatch: "#ef4444" },
	{ value: "green", label: "그린", swatch: "#11d168" },
] as const;

// ─── 라우트 전용 소품 ───────────────────────────────────────────────

/** 네이버 연동으로 자동 입력된 읽기 전용 정보 행 */
function SyncedRow({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-2">
			<span className="text-base text-ink">{label}</span>
			<div className="rounded-lg border border-line-soft bg-app-bg px-4 py-3.5 text-[17px] text-body">
				{children}
			</div>
		</div>
	);
}

function HospitalManagePage() {
	const [year, setYear] = useState(YEAR_OPTIONS[0]);
	const [day, setDay] = useState(DAY_OPTIONS[0]);
	const [openTime, setOpenTime] = useState("09:00");
	const [closeTime, setCloseTime] = useState("19:00");
	const [lunchEnabled, setLunchEnabled] = useState(true);
	const [lunch, setLunch] = useState("12:30 ~ 13:30 (1시간)");
	const [selectedDepts, setSelectedDepts] =
		useState<string[]>(SELECTED_DEPARTMENTS);
	const [subwayLine, setSubwayLine] = useState("5호선");
	const [walk, setWalk] = useState("도보 5분");
	const [themeColor, setThemeColor] = useState<string>("blue");
	const [doctors] = useState<Doctor[]>(INITIAL_DOCTORS);
	const [nonCovered] = useState<NonCovered[]>(INITIAL_NON_COVERED);

	const toggleDept = (dept: string) =>
		setSelectedDepts((prev) =>
			prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept],
		);

	return (
		<AppShell userName="김민준 원장" maxWidth="1280px">
			<div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
				<BoardSideNav activeLabel="병원 정보 관리" />

				<div className="flex min-w-0 flex-1 flex-col gap-8">
					{/* 페이지 헤더 */}
					<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
						<div className="flex flex-col gap-2">
							<h1 className="text-2xl font-bold text-ink sm:text-[32px]">
								병원 홈페이지 관리
							</h1>
							<p className="text-base text-body">
								홈페이지에 표시될 병원 정보를 관리합니다.
							</p>
						</div>
						<Button variant="brand" className="h-11 self-start px-5">
							<Save className="size-4" />
							전체 저장
						</Button>
					</div>

					{/* 상단 - 병원 대표 이미지 관리 */}
					<SectionCard>
						<p className="text-lg font-bold text-ink">병원 대표 이미지 관리</p>
						<div className="mt-5 mb-5 border-t border-line-soft" />
						<div className="flex flex-col gap-4 rounded-xl border border-dashed border-line-strong p-5 sm:flex-row sm:items-center sm:justify-between">
							<div className="flex items-start gap-4">
								<span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-app-bg text-body-soft">
									<UploadCloud className="size-5" />
								</span>
								<div className="flex flex-col gap-1">
									<p className="text-base font-semibold text-ink">
										이미지 파일 추가하기
									</p>
									<p className="text-sm text-body-soft">
										지원 형식: ZIP, PDF, JPG, PNG / 최대 용량: 파일당 20MB 미만.
									</p>
								</div>
							</div>
							<div className="flex items-center gap-4 sm:shrink-0">
								<span className="hidden text-sm text-muted-fg lg:inline">
									또는 파일을 여기에 끌어다 놓으세요
								</span>
								<Button
									variant="brand"
									size="xl"
									className="shrink-0 font-medium"
								>
									파일 선택
								</Button>
							</div>
						</div>
					</SectionCard>

					{/* 1. 병원 정보 */}
					<SectionCard>
						<SectionTitle className="mb-6">병원 정보</SectionTitle>
						<FieldGroup>
							<Field>
								<FieldLabel required htmlFor="hospital-name">
									병원명
								</FieldLabel>
								<FieldInput
									id="hospital-name"
									placeholder="공식 병원명을 입력하세요"
								/>
							</Field>

							<Field>
								<FieldLabel required htmlFor="hospital-address">
									주소
								</FieldLabel>
								<FieldRow>
									<FieldInput
										id="hospital-address"
										placeholder="도로명 주소를 검색하세요"
									/>
									<Button
										variant="brand-outline"
										size="2xl"
										className="shrink-0 font-medium"
									>
										우편번호 찾기
									</Button>
								</FieldRow>
							</Field>

							<div className="grid gap-6 sm:grid-cols-2">
								<Field>
									<FieldLabel required htmlFor="hospital-phone">
										대표 연락처
									</FieldLabel>
									<FieldInput id="hospital-phone" placeholder="02-000-0000" />
								</Field>
								<Field>
									<FieldLabel required>개설 년도</FieldLabel>
									<FieldSelect
										value={year}
										onValueChange={setYear}
										options={YEAR_OPTIONS}
									/>
								</Field>
							</div>

							<Field>
								<FieldLabel required>진료 시간</FieldLabel>
								<FieldRow className="flex-wrap">
									<FieldSelect
										value={day}
										onValueChange={setDay}
										options={DAY_OPTIONS}
										className="w-full sm:flex-1"
									/>
									<div className="flex flex-1 items-center gap-3">
										<FieldSelect
											value={openTime}
											onValueChange={setOpenTime}
											options={TIME_OPTIONS}
										/>
										<span className="text-body-soft">~</span>
										<FieldSelect
											value={closeTime}
											onValueChange={setCloseTime}
											options={TIME_OPTIONS}
										/>
									</div>
								</FieldRow>
								<div className="flex flex-col gap-3 rounded-lg border border-line-soft bg-app-bg p-4 sm:flex-row sm:items-center">
									<span className="flex items-center gap-2 text-base text-ink">
										<Switch
											checked={lunchEnabled}
											onCheckedChange={setLunchEnabled}
											aria-label="점심/휴게 시간 설정"
										/>
										점심/휴게 시간 설정
									</span>
									{lunchEnabled ? (
										<div className="sm:flex-1">
											<FieldSelect
												value={lunch}
												onValueChange={setLunch}
												options={LUNCH_OPTIONS}
											/>
										</div>
									) : null}
								</div>
							</Field>

							<Field>
								<FieldLabel required>운영 진료과목</FieldLabel>
								<div className="flex flex-wrap gap-2">
									{DEPARTMENTS.map((dept) => {
										const active = selectedDepts.includes(dept);
										return (
											<button
												key={dept}
												type="button"
												onClick={() => toggleDept(dept)}
												className={cn(
													"flex h-10 items-center rounded-full border px-4 text-sm font-medium transition-colors",
													active
														? "border-brand bg-surface text-brand"
														: "border-line bg-surface text-body hover:border-line-strong",
												)}
												aria-pressed={active}
											>
												{dept}
											</button>
										);
									})}
									<button
										type="button"
										className="flex size-10 items-center justify-center rounded-full border border-dashed border-line-strong text-body-soft transition-colors hover:border-brand hover:text-brand"
										aria-label="진료과목 추가"
									>
										<Plus className="size-4" />
									</button>
								</div>
							</Field>

							<Field>
								<FieldLabel required htmlFor="hospital-cert">
									인증 정보
								</FieldLabel>
								<FieldInput
									id="hospital-cert"
									defaultValue="서울대학교 의과대학"
									endAdornment={<Search className="size-4 text-muted-fg" />}
								/>
								<div className="flex h-14 items-center justify-between rounded-lg border border-brand bg-brand-50 px-4">
									<span className="flex items-center gap-2.5 text-base font-bold text-brand">
										<ShieldCheck className="size-4" />
										보건복지부 지정 인증의료기관
									</span>
									<Badge variant="success">인증 완료</Badge>
								</div>
							</Field>
						</FieldGroup>
					</SectionCard>

					{/* 2. 의료진 검색 및 등록 */}
					<SectionCard>
						<SectionTitle className="mb-6">의료진 검색 및 등록</SectionTitle>
						<div className="flex flex-col gap-5">
							<FieldInput
								placeholder="추가할 의사 성명 또는 의사면허번호를 검색하세요"
								endAdornment={<Search className="size-4 text-muted-fg" />}
							/>
							<div className="flex flex-col gap-6">
								{doctors.map((doctor, index) => (
									<div key={doctor.id} className="flex flex-col gap-3">
										<div className="flex items-center gap-2">
											<span className="flex size-6 items-center justify-center rounded-full bg-brand-50 text-sm font-medium text-brand">
												{index + 1}
											</span>
											<span className="text-base font-semibold text-ink">
												의료진 {index + 1}
											</span>
										</div>
										<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.4fr]">
											<Field>
												<FieldLabel>의사 이름</FieldLabel>
												<FieldInput
													defaultValue={doctor.name}
													className="bg-app-bg"
												/>
											</Field>
											<Field>
												<FieldLabel>진료과목</FieldLabel>
												<FieldInput
													defaultValue={doctor.department}
													className="bg-app-bg"
												/>
											</Field>
											<Field>
												<FieldLabel>진료 시간</FieldLabel>
												<FieldInput
													defaultValue={doctor.hours}
													className="bg-app-bg"
												/>
											</Field>
											<Field>
												<FieldLabel>의료면허 번호</FieldLabel>
												<FieldInput
													defaultValue={doctor.license}
													className="bg-app-bg"
												/>
											</Field>
										</div>
									</div>
								))}
							</div>
						</div>
					</SectionCard>

					{/* 3. 위치 및 주차 정보 */}
					<SectionCard>
						<SectionTitle className="mb-6">위치 및 주차 정보</SectionTitle>
						<FieldGroup>
							<Field>
								<FieldLabel required htmlFor="naver-url">
									네이버 지도 URL 링크 연결
								</FieldLabel>
								<FieldInput
									id="naver-url"
									placeholder="네이버 플레이스 지도 공유 링크(URL)를 입력하세요"
								/>
							</Field>
							<Field>
								<FieldLabel required htmlFor="org-address">
									의료기관 주소 정보
								</FieldLabel>
								<FieldInput
									id="org-address"
									defaultValue="서울특별시 강동구 구천면로 200, 2층"
								/>
							</Field>
							<Field>
								<FieldLabel required htmlFor="org-phone">
									대표 연락처
								</FieldLabel>
								<FieldInput id="org-phone" defaultValue="02-1234-5678" />
							</Field>

							<div className="flex flex-col gap-5">
								<p className="text-base font-bold text-ink">
									대중교통 이용 안내 설정
								</p>
								<Field>
									<FieldLabel className="text-sm text-body-soft">
										지하철 정보
									</FieldLabel>
									<FieldRow className="flex-wrap">
										<FieldSelect
											value={subwayLine}
											onValueChange={setSubwayLine}
											options={SUBWAY_LINES}
											className="w-full sm:flex-1"
										/>
										<FieldInput
											defaultValue="천호역 2번 출구"
											className="flex-1"
										/>
										<FieldSelect
											value={walk}
											onValueChange={setWalk}
											options={WALK_OPTIONS}
											className="w-full sm:flex-1"
										/>
									</FieldRow>
								</Field>
								<Field>
									<FieldLabel className="text-sm text-body-soft">
										간선 버스 번호 입력
									</FieldLabel>
									<FieldInput defaultValue="130, 341, 370" />
								</Field>
								<Field>
									<FieldLabel className="text-sm text-body-soft">
										지선 버스 번호 입력
									</FieldLabel>
									<FieldInput defaultValue="3214, 3316, 3411" />
								</Field>
								<Field>
									<FieldLabel className="text-sm text-body-soft">
										정류장 명칭 입력
									</FieldLabel>
									<FieldInput defaultValue="천호역 현대백화점" />
								</Field>
							</div>

							<Field>
								<FieldLabel htmlFor="parking-info">
									기본 주차 조건 및 혜택
								</FieldLabel>
								<FieldInput
									id="parking-info"
									defaultValue="건물 지하 주차장 이용 가능 (진료 시 2시간 무료)"
								/>
							</Field>
							<Field>
								<FieldLabel htmlFor="parking-full">
									만차 또는 예외 시 안내 문구
								</FieldLabel>
								<FieldInput
									id="parking-full"
									defaultValue="만차 시 인근 공영주차장 이용 부탁드립니다."
								/>
							</Field>
						</FieldGroup>
					</SectionCard>

					{/* 4. 위치 및 주차 정보 설정 (네이버 연동 자동 입력) */}
					<SectionCard>
						<SectionTitle className="mb-6">위치 및 주차 정보 설정</SectionTitle>
						<div className="flex flex-col gap-5">
							<Field>
								<FieldLabel required htmlFor="naver-sync-url">
									네이버 지도 URL 연결을 통한 자동 입력
								</FieldLabel>
								<FieldInput
									id="naver-sync-url"
									defaultValue="https://map.naver.com/v5/entry/place/12345678"
								/>
							</Field>
							<InfoCallout
								tone="info"
								icon={<CheckCircle2 className="size-5 text-brand" />}
								className="font-medium text-brand"
							>
								연동 완료 : 네이버 플레이스 데이터가 성공적으로 추출되어 아래
								필드에 자동 입력되었습니다.
							</InfoCallout>
							<InfoCallout
								tone="danger"
								icon={<CheckCircle2 className="size-5 text-danger-strong" />}
								className="font-medium text-danger-strong"
							>
								연동 실패 : 네이버 플레이스 데이터가 추출되지 않았습니다. 다시
								시도해 주세요.
							</InfoCallout>
							<SyncedRow label="위치 주소">
								서울특별시 강동구 구천면로 200, 2층
							</SyncedRow>
							<SyncedRow label="연락처">02-1234-5678</SyncedRow>
							<div className="flex flex-col gap-2">
								<span className="text-base text-ink">대중교통 안내 정보</span>
								<div className="rounded-lg border border-line-soft bg-app-bg px-4 py-3.5 text-[17px] text-body">
									지하철 이용시: 5호선 천호역 2번 출구 도보 5분
								</div>
								<div className="rounded-lg border border-line-soft bg-app-bg px-4 py-3.5 text-[17px] text-body">
									버스 이용시: 간선 130, 341, 370 / 지선 3214, 3316, 3411
									('천호역 현대백화점' 정류장 하차)
								</div>
							</div>
							<div className="flex flex-col gap-1.5">
								<SyncedRow label="주차 안내 정보">
									건물 지하 주차장 이용 가능 (진료 시 2시간 무료) / 만차 시 인근
									공영주차장 이용 부탁드립니다.
								</SyncedRow>
								<p className="text-sm text-body-soft">
									네이버 플레이스에 등록된 최신 주차 운영 정책이 반영되었습니다.
								</p>
							</div>
						</div>
					</SectionCard>

					{/* 5. 비급여 정보 */}
					<SectionCard>
						<SectionTitle className="mb-6">비급여 정보</SectionTitle>
						<div className="flex flex-col gap-5">
							<div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_1.7fr]">
								<Field>
									<FieldLabel required htmlFor="nc-item">
										항목명
									</FieldLabel>
									<FieldInput id="nc-item" placeholder="예: 영양수액" />
								</Field>
								<Field>
									<FieldLabel required htmlFor="nc-detail">
										상세 내용
									</FieldLabel>
									<FieldInput id="nc-detail" placeholder="설명을 입력하세요" />
								</Field>
								<Field>
									<FieldLabel required htmlFor="nc-price">
										금액
									</FieldLabel>
									<FieldInput
										id="nc-price"
										placeholder="50,000"
										endAdornment={<span className="text-body">원</span>}
									/>
								</Field>
							</div>
							<div className="flex justify-end">
								<Button
									variant="brand-outline"
									size="xl"
									className="font-medium"
								>
									<Plus className="size-4" />
									항목 추가
								</Button>
							</div>

							<div className="border-t border-line-soft" />

							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>항목</TableHead>
										<TableHead>내용</TableHead>
										<TableHead className="text-right">금액</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{nonCovered.map((row) => (
										<TableRow key={row.id}>
											<TableCell className="font-medium">{row.item}</TableCell>
											<TableCell className="text-body">{row.detail}</TableCell>
											<TableCell className="text-right font-medium">
												{row.price}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
							<div className="flex justify-end">
								<Button
									variant="neutral-outline"
									size="xl"
									className="font-medium"
								>
									항목 수정
								</Button>
							</div>
						</div>
					</SectionCard>

					{/* 6. 홈페이지 디자인 & 운영 설정 */}
					<SectionCard>
						<SectionTitle className="mb-1">
							홈페이지 디자인 & 문구 설정
						</SectionTitle>
						<p className="mb-6 text-sm text-body-soft">
							의원 홈페이지의 대표 키 컬러와 대표 문구를 구성합니다.
						</p>
						<FieldGroup>
							<Field>
								<FieldLabel required htmlFor="main-copy">
									홈페이지 대문 문구
								</FieldLabel>
								<FieldInput
									id="main-copy"
									defaultValue="당신의 건강한 내일을 위한 최고의 선택!"
								/>
							</Field>
							<Field>
								<FieldLabel required htmlFor="sub-copy">
									홈페이지 서브 문구
								</FieldLabel>
								<FieldInput
									id="sub-copy"
									placeholder="당신의 건강한 내일을 위한 최고의 선택!"
								/>
							</Field>

							<Field>
								<FieldLabel required>템플릿 칼라 선택</FieldLabel>
								<div className="flex flex-wrap gap-3">
									{THEME_COLORS.map((color) => {
										const active = themeColor === color.value;
										return (
											<button
												key={color.value}
												type="button"
												onClick={() => setThemeColor(color.value)}
												className={cn(
													"flex h-12 items-center gap-2 rounded-xl border-2 px-4 text-base transition-colors",
													active
														? "border-brand bg-surface font-medium text-brand"
														: "border-line bg-surface text-body hover:border-line-strong",
												)}
												aria-pressed={active}
											>
												<span
													className="size-5 rounded-full"
													style={{ backgroundColor: color.swatch }}
												/>
												{color.label}
											</button>
										);
									})}
								</div>
							</Field>

							<Field>
								<FieldLabel required>로고 선택</FieldLabel>
								<div className="flex h-[110px] items-center justify-between gap-3 rounded-lg border-2 border-brand/20 bg-[#f8faff] px-10">
									<div className="flex min-w-0 items-center gap-6">
										<span className="flex size-[52px] shrink-0 items-center justify-center rounded-full border border-brand/10 bg-surface text-brand shadow-sm">
											<FileText className="size-5" />
										</span>
										<div className="flex min-w-0 flex-col gap-1">
											<span className="truncate text-[19px] font-bold text-ink">
												logo_company.jpg
											</span>
											<span className="text-base text-body-soft">
												파일 용량: 12.4 MB • 업로드 시간: 방금 전
											</span>
										</div>
									</div>
									<button
										type="button"
										className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#f3f4f6] text-body-soft transition-colors hover:text-danger-strong"
										aria-label="로고 삭제"
									>
										<X className="size-4" />
									</button>
								</div>
							</Field>

							<Button
								variant="neutral-outline"
								size="2xl"
								className="w-full font-semibold text-ink"
							>
								<Eye className="size-5" />[ 미리보기 ]
							</Button>
						</FieldGroup>
					</SectionCard>

					{/* 하단 저장 */}
					<div className="flex justify-center pt-1">
						<Button
							variant="brand"
							size="cta"
							className="px-12 font-semibold sm:w-80"
						>
							병원 정보 전체 저장하기
						</Button>
					</div>
				</div>
			</div>
		</AppShell>
	);
}
