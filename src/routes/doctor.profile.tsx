import { createFileRoute } from "@tanstack/react-router";
import {
	BadgeCheck,
	Calendar,
	Camera,
	FileText,
	Link2,
	Lock,
	Plus,
	Save,
	Search,
	Trash2,
	Upload,
	UploadCloud,
	X,
} from "lucide-react";
import { useId, useState } from "react";
import { BoardSideNav } from "#/components/common/board-side-nav.tsx";
import {
	SectionCard,
	SectionTitle,
} from "#/components/common/section-card.tsx";
import TiptapEditor from "#/components/editor/tiptap-editor.tsx";
import {
	Field,
	FieldGroup,
	FieldLabel,
	FieldRow,
} from "#/components/form/field.tsx";
import { FieldInput } from "#/components/form/field-input.tsx";
import { OptionButton, OptionGroup } from "#/components/form/option-group.tsx";
import { FieldSelect } from "#/components/form/select-field.tsx";
import { AppShell } from "#/components/layout/app-shell.tsx";
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Checkbox } from "#/components/ui/checkbox.tsx";
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

export const Route = createFileRoute("/doctor/profile")({
	component: DoctorProfilePage,
});

// 좌측 메뉴 — 의사 프로필 관리 하위 항목
const SIDE_NAV_ITEMS = [
	{ label: "의원 프로필 관리" },
	{ label: "병원 정보 관리", to: "/hospital/manage" },
	{ label: "게시판 관리", to: "/board" },
];

const EMAIL_DOMAINS = ["naver.com", "gmail.com", "daum.net", "직접 입력"];
const SUBSPECIALTY_OPTIONS = ["소화기", "순환기", "내분비", "호흡기", "신경과"];
const DEGREE_TYPES = ["학사", "석사", "박사"];
const YEAR_OPTIONS = [
	"2010",
	"2012",
	"2015",
	"2017",
	"2020",
	"2022",
	"2024",
	"현재",
];

// 진료 일정 매트릭스
const SCHEDULE_DAYS = ["월", "화", "수", "목", "금", "토", "일"] as const;
const SCHEDULE_ROWS = [
	{
		label: "오전 (09:00 - 13:00)",
		cells: [
			"진료가능",
			"진료가능",
			"휴진",
			"진료가능",
			"진료가능",
			"진료가능",
			"휴진",
		],
	},
	{
		label: "오후 (14:00 - 18:00)",
		cells: [
			"진료가능",
			"진료가능",
			"진료가능",
			"수술",
			"진료가능",
			"휴진",
			"휴진",
		],
	},
	{
		label: "야간 (18:00 - 21:00)",
		cells: ["휴진", "휴진", "휴진", "진료가능", "휴진", "휴진", "휴진"],
	},
] as const;

const STATUS_STYLES: Record<string, string> = {
	진료가능: "bg-brand text-brand-foreground",
	휴진: "bg-muted text-body-soft",
	수술: "bg-muted text-body-soft",
};

const SPECIALTY_TAGS = ["눈성형", "안면윤곽", "최소침습 리프팅"];

const PAPERS = [
	{
		id: "p1",
		title: "Analysis of Facial Reconstruction Techniques in Trauma...",
		journal: "Journal of Plastic and Reconstructive",
		date: "2023.05",
	},
	{
		id: "p2",
		title: "Efficacy of New Suture Methods for Rapid Wound Healing",
		journal: "International Medical Review",
		date: "2022.11",
	},
];

// 자기소개 / 대외활동 본문 초기값 (리치텍스트)
const INTRO_HTML = `<p>눈성형, 코성형, 안면윤곽 수술 및 재건 수술 전문. 최소 침습 기법을 활용한 안티에이징 시술 전문.</p>`;
const MEDIA_HTML = `<p>KBS '생로병사의 비밀' 자문의 출연 (2022.08), MBC 뉴스데스크 '성형 트렌드' 인터뷰 (2023.01), 조선일보 건강 칼럼 연재 중.</p>`;

// ─── 라우트 전용 소품 ───────────────────────────────────────────────

/** 날짜 입력 (캘린더 아이콘) */
function DateField({
	defaultValue,
	placeholder,
	className,
}: {
	defaultValue?: string;
	placeholder?: string;
	className?: string;
}) {
	return (
		<FieldInput
			defaultValue={defaultValue}
			placeholder={placeholder ?? "YYYY.MM"}
			endAdornment={<Calendar className="size-4 text-muted-fg" />}
			className={className}
		/>
	);
}

/** "+ 추가" 점선 버튼 (반복 행 추가용) */
function AddRowButton({ children }: { children: React.ReactNode }) {
	return (
		<button
			type="button"
			className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-line-strong py-3.5 text-base text-body-soft transition-colors hover:border-brand hover:text-brand"
		>
			<Plus className="size-4" />
			{children}
		</button>
	);
}

/** 인증 완료 배지 (의사면허/ORCID 등) — Figma: 파란 솔리드 배지 */
function VerifiedBadge({
	children,
	variant = "default",
}: {
	children: React.ReactNode;
	variant?: React.ComponentProps<typeof Badge>["variant"];
}) {
	return (
		<Badge variant={variant} className="gap-1">
			<BadgeCheck className="size-3" />
			{children}
		</Badge>
	);
}

/** 체크박스 + 라벨 (접근성: id ↔ htmlFor 연결) */
function CheckboxField({
	label,
	defaultChecked,
}: {
	label: string;
	defaultChecked?: boolean;
}) {
	const id = useId();
	return (
		<div className="flex items-center gap-2 text-base text-body">
			<Checkbox id={id} defaultChecked={defaultChecked} />
			<label htmlFor={id}>{label}</label>
		</div>
	);
}

/** 행 삭제(X) 버튼 — 반복 행 우측 끝 회색 원형 아이콘 */
function RemoveRowButton({ label }: { label: string }) {
	return (
		<button
			type="button"
			aria-label={label}
			className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-fg transition-colors hover:bg-muted hover:text-danger-strong"
		>
			<X className="size-4" />
		</button>
	);
}

/** 재직중 토글 + 삭제(X) — 수련/경력/학회 반복 행 우측 컨트롤 */
function CurrentToggle({
	checked,
	onCheckedChange,
	defaultCurrent,
	label,
}: {
	checked?: boolean;
	onCheckedChange?: (v: boolean) => void;
	defaultCurrent?: boolean;
	label: string;
}) {
	return (
		<div className="flex shrink-0 items-center gap-2">
			<span className="flex items-center gap-2 text-base text-ink">
				<Switch
					checked={checked}
					onCheckedChange={onCheckedChange}
					defaultChecked={checked === undefined ? defaultCurrent : undefined}
					aria-label={`${label} 재직중`}
				/>
				재직중
			</span>
			<RemoveRowButton label={`${label} 삭제`} />
		</div>
	);
}

/** 재직중일 때 잠긴(현재) 기간 표시 — 자물쇠 아이콘 + 비활성 */
function LockedPeriodField({ value }: { value: string }) {
	return (
		<FieldInput
			value={value}
			readOnly
			disabled
			className="flex-1 cursor-not-allowed bg-muted text-body-soft"
			endAdornment={<Lock className="size-4 text-muted-fg" />}
		/>
	);
}

function DoctorProfilePage() {
	const [highSchoolType, setHighSchoolType] = useState("졸업");
	const [emailDomain, setEmailDomain] = useState("naver.com");
	const [degree1, setDegree1] = useState("학사");
	const [degree2, setDegree2] = useState("석사");
	const [internCurrent, setInternCurrent] = useState(true);
	const [residentCurrent, setResidentCurrent] = useState(false);
	const [careerCurrent, setCareerCurrent] = useState(true);
	const [introHtml, setIntroHtml] = useState(INTRO_HTML);
	const [mediaHtml, setMediaHtml] = useState(MEDIA_HTML);
	const [media2Html, setMedia2Html] = useState("");

	return (
		<AppShell userName="김민준 원장" maxWidth="1280px">
			<div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
				<BoardSideNav items={SIDE_NAV_ITEMS} activeLabel="의원 프로필 관리" />

				<div className="flex min-w-0 flex-1 flex-col gap-8">
					{/* 페이지 헤더 */}
					<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
						<div className="flex flex-col gap-[7px]">
							<h1 className="text-2xl font-bold text-ink sm:text-[32px]">
								의사 프로필 관리
							</h1>
							<p className="text-base text-body-soft">
								전문성을 입증하기 위한 모든 정보를 한눈에 관리하세요.
							</p>
						</div>
						<Button variant="brand" size="2xl" className="self-start px-8">
							<Save className="size-4" />
							전체 저장
						</Button>
					</div>

					{/* 프로필 사진 — 일반 텍스트 제목 + 하단 디바이더 (블루 막대 없음) */}
					<SectionCard className="gap-6">
						<div className="border-line-soft border-b pb-4">
							<h2 className="text-[24px] text-ink">프로필 사진</h2>
						</div>
						<div className="flex flex-col gap-10 sm:flex-row sm:items-center">
							{/* 사진 placeholder */}
							<div className="relative shrink-0">
								<div className="flex size-[140px] items-center justify-center rounded-2xl border-2 border-line-strong border-dashed bg-muted text-body-soft">
									<FileText className="size-8" />
								</div>
								<span className="-right-2 absolute bottom-0 flex h-9 items-center justify-center rounded-full bg-brand px-3 text-brand-foreground shadow-md">
									<Camera className="size-4" />
								</span>
							</div>
							<div className="flex flex-1 flex-col gap-3">
								<div className="flex flex-col gap-1">
									<span className="text-[17px] text-ink">김민준 원장</span>
									<span className="text-[15px] text-body-soft">
										JPG, PNG 형식 지원 · 최대 5MB · 권장 크기 400x400px
									</span>
								</div>
								<div className="flex flex-wrap gap-3">
									<Button variant="brand" size="2xl" className="font-medium">
										<Upload className="size-4" />
										사진 업로드/수정
									</Button>
									<Button
										variant="neutral-outline"
										size="2xl"
										className="font-medium text-body"
									>
										<Trash2 className="size-4" />
										삭제
									</Button>
								</div>
							</div>
							{/* 홈페이지 미리보기 썸네일 — 라벨 위, 원형 아바타 아래 */}
							<div className="flex w-[200px] shrink-0 flex-col gap-3 rounded-xl bg-app-bg p-5">
								<span className="text-sm text-body-soft">
									홈페이지 미리보기
								</span>
								<div className="flex size-12 items-center justify-center overflow-hidden rounded-full bg-muted text-body-soft">
									<FileText className="size-5" />
								</div>
							</div>
						</div>
					</SectionCard>

					{/* 1. 의사 기본 정보 */}
					<SectionCard>
						<SectionTitle className="mb-6">의사 기본 정보</SectionTitle>
						<FieldGroup className="gap-6">
							<div className="grid gap-6 sm:grid-cols-2">
								<Field>
									<FieldLabel required htmlFor="doctor-name">
										의사 성명
									</FieldLabel>
									<FieldInput id="doctor-name" defaultValue="김철수" />
								</Field>
								<Field>
									<FieldLabel required htmlFor="doctor-name-en">
										영문 성명
									</FieldLabel>
									<FieldInput id="doctor-name-en" defaultValue="KIM CHUL SOO" />
								</Field>
							</div>

							<div className="grid gap-6 sm:grid-cols-2">
								<Field>
									<FieldLabel required>주민등록번호</FieldLabel>
									<FieldRow>
										<FieldInput defaultValue="850101" className="flex-1" />
										<span className="text-body-soft">-</span>
										<FieldInput
											defaultValue="1"
											className="w-14 text-center"
											aria-label="주민등록번호 성별 자리"
										/>
										<FieldInput
											defaultValue="●●●●●●"
											className="flex-1 tracking-widest"
											aria-label="주민등록번호 뒷자리"
										/>
									</FieldRow>
								</Field>

								<Field>
									<FieldLabel required>이메일 주소</FieldLabel>
									<FieldRow className="flex-wrap">
										<FieldInput
											defaultValue="dr.kim"
											className="flex-1"
											aria-label="이메일 아이디"
										/>
										<span className="text-body-soft">@</span>
										<FieldSelect
											value={emailDomain}
											onValueChange={setEmailDomain}
											options={EMAIL_DOMAINS}
											className="w-full sm:w-40"
										/>
									</FieldRow>
								</Field>
							</div>

							<Field>
								<FieldLabel required htmlFor="doctor-phone">
									휴대폰 번호
								</FieldLabel>
								<FieldRow>
									<FieldInput id="doctor-phone" defaultValue="010-1234-5678" />
									<Button
										variant="brand-outline"
										size="2xl"
										className="shrink-0 font-medium"
									>
										인증번호 발송
									</Button>
								</FieldRow>
							</Field>

							{/* 이력서 파일 업로드 */}
							<div className="flex flex-col gap-4 rounded-xl border border-dashed border-line-strong bg-app-bg p-5 sm:flex-row sm:items-center sm:justify-between">
								<div className="flex items-start gap-4">
									<span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-surface text-body-soft">
										<UploadCloud className="size-5" />
									</span>
									<div className="flex flex-col gap-1">
										<span className="text-base font-semibold text-ink">
											이미지 파일 추가하기
										</span>
										<span className="text-sm text-body-soft">
											지원 형식: ZIP, PDF, JPG, PNG / 최대 용량: 파일당 20MB
											미만.
										</span>
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
						</FieldGroup>
					</SectionCard>

					{/* 2. 학력 이력 */}
					<SectionCard>
						<SectionTitle className="mb-6">학력 이력</SectionTitle>
						<FieldGroup className="gap-6">
							<Field>
								<FieldLabel>출신 고등학교</FieldLabel>
								<OptionGroup
									value={highSchoolType}
									onValueChange={setHighSchoolType}
								>
									<OptionButton value="졸업">고등학교 졸업</OptionButton>
									<OptionButton value="검정고시">검정고시 합격</OptionButton>
								</OptionGroup>
								<FieldRow className="flex-wrap">
									<FieldInput
										placeholder="학교명을 입력하세요"
										className="flex-1"
										aria-label="고등학교명"
									/>
									<DateField className="sm:w-48" />
								</FieldRow>
							</Field>

							{/* 진학 경로 선택 카드 */}
							<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
								{[
									{ active: true, text: "국내 의과대학 정시/수시 진학" },
									{
										active: false,
										text: "국내 일반대학 졸업 후 의과대학 편입",
									},
									{ active: false, text: "국내 의학전문대학원 졸업 (의전원)" },
									{
										active: false,
										text: "보건복지부 인정 외국 의과대학 졸업 또는 북한 의사학력 자격 보유",
									},
								].map((card) => (
									<button
										key={card.text}
										type="button"
										className={cn(
											"flex min-h-[88px] items-center rounded-xl border-2 px-4 py-3 text-left text-sm leading-relaxed transition-colors",
											card.active
												? "border-brand bg-brand-50 font-medium text-brand"
												: "border-line bg-surface text-body hover:border-line-strong",
										)}
									>
										{card.text}
									</button>
								))}
							</div>

							{/* 학위 및 전공 - 1 */}
							<div className="flex flex-col gap-4 rounded-xl border border-line-soft bg-app-bg p-5">
								<div className="flex items-center justify-between">
									<span className="flex items-center gap-1 text-base font-semibold text-ink">
										<span className="text-danger">*</span>
										학위 및 전공
									</span>
									<OptionGroup
										value={degree1}
										onValueChange={setDegree1}
										className="w-auto flex-nowrap gap-1.5"
									>
										{DEGREE_TYPES.map((d) => (
											<OptionButton
												key={d}
												value={d}
												className="h-9 min-w-[52px] rounded-full border px-3 text-sm data-[state=on]:border-brand data-[state=on]:bg-brand data-[state=on]:text-brand-foreground"
											>
												{d}
											</OptionButton>
										))}
									</OptionGroup>
								</div>
								<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
									<Field>
										<FieldLabel>학교명</FieldLabel>
										<FieldInput
											defaultValue="서울대학교 의과대학"
											className="bg-surface"
											endAdornment={<Search className="size-4 text-muted-fg" />}
										/>
									</Field>
									<Field>
										<FieldLabel>전공명</FieldLabel>
										<FieldInput defaultValue="의학과" className="bg-surface" />
									</Field>
									<Field>
										<FieldLabel>입학일</FieldLabel>
										<DateField
											defaultValue="2004.03.02"
											className="bg-surface"
										/>
									</Field>
									<Field>
										<FieldLabel>졸업일</FieldLabel>
										<DateField
											defaultValue="2010.02.25"
											className="bg-surface"
										/>
									</Field>
								</div>
								<div className="flex flex-col gap-2">
									<span className="text-base text-ink">학사 편입 여부</span>
									<div className="flex items-center gap-6">
										<CheckboxField label="해당없음" defaultChecked />
										<CheckboxField label="학사편입" />
									</div>
								</div>
							</div>

							{/* 학위 및 전공 - 2 */}
							<div className="flex flex-col gap-4 rounded-xl border border-line-soft bg-app-bg p-5">
								<div className="flex items-center justify-between">
									<span className="text-base font-semibold text-ink">
										학위 및 전공
									</span>
									<OptionGroup
										value={degree2}
										onValueChange={setDegree2}
										className="w-auto flex-nowrap gap-1.5"
									>
										{DEGREE_TYPES.map((d) => (
											<OptionButton
												key={d}
												value={d}
												className="h-9 min-w-[52px] rounded-full border px-3 text-sm data-[state=on]:border-brand data-[state=on]:bg-brand data-[state=on]:text-brand-foreground"
											>
												{d}
											</OptionButton>
										))}
									</OptionGroup>
								</div>
								<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
									<Field>
										<FieldLabel>학교명</FieldLabel>
										<FieldInput
											defaultValue="서울대학교 의과대학"
											className="bg-surface"
											endAdornment={<Search className="size-4 text-muted-fg" />}
										/>
									</Field>
									<Field>
										<FieldLabel>공식학위</FieldLabel>
										<OptionGroup
											value="의학석사"
											className="flex-nowrap gap-1.5"
										>
											<OptionButton
												value="의학석사"
												className="h-14 flex-1 rounded-lg px-2 text-sm"
											>
												의학석사
											</OptionButton>
											<OptionButton
												value="일반석사"
												className="h-14 flex-1 rounded-lg px-2 text-sm"
											>
												일반석사
											</OptionButton>
										</OptionGroup>
									</Field>
									<Field>
										<FieldLabel>졸업 여부</FieldLabel>
										<FieldSelect
											value="졸업"
											options={["졸업", "재학", "수료"]}
											className="bg-surface"
										/>
									</Field>
									<Field>
										<FieldLabel>입학일</FieldLabel>
										<DateField
											defaultValue="2004.03.02"
											className="bg-surface"
										/>
									</Field>
									<Field>
										<FieldLabel>졸업일</FieldLabel>
										<DateField
											defaultValue="2010.02.25"
											className="bg-surface"
										/>
									</Field>
								</div>
							</div>

							<AddRowButton>학위 추가하기</AddRowButton>
						</FieldGroup>
					</SectionCard>

					{/* 3. 수련 활동 */}
					<SectionCard>
						<SectionTitle className="mb-6">수련 활동</SectionTitle>
						<FieldGroup className="gap-6">
							{/* 인턴 — 카드 안 가로 배치 */}
							<div className="flex flex-col gap-4">
								<div className="rounded-2xl border border-line-soft bg-app-bg/50 p-6">
									<div className="flex flex-col gap-6 lg:flex-row lg:items-end">
										<Field className="flex-1">
											<FieldLabel>인턴 근무처</FieldLabel>
											<FieldInput
												defaultValue="서울 아산병원"
												className="bg-surface"
												endAdornment={
													<Search className="size-4 text-muted-fg" />
												}
											/>
										</Field>
										<Field className="flex-1">
											<FieldLabel>수련 기간</FieldLabel>
											<FieldRow className="flex-nowrap">
												<DateField
													defaultValue="2011.03"
													className="min-w-0 flex-1 bg-surface"
												/>
												<span className="shrink-0 text-line-strong">~</span>
												<DateField
													defaultValue="2012.03"
													className="min-w-0 flex-1 bg-surface"
												/>
												<CurrentToggle
													checked={internCurrent}
													onCheckedChange={setInternCurrent}
													label="인턴"
												/>
											</FieldRow>
										</Field>
									</div>
								</div>
								<AddRowButton>인턴 추가</AddRowButton>
							</div>

							{/* 레지던트 — 카드 안 가로 배치 */}
							<div className="flex flex-col gap-4">
								<div className="flex flex-col gap-6 rounded-2xl border border-line-soft bg-app-bg/50 p-6">
									<CheckboxField label="인턴 근무처와 동일" />
									<div className="flex flex-col gap-6 lg:flex-row lg:items-end">
										<Field className="lg:w-[28%]">
											<FieldLabel>레지던트 근무처</FieldLabel>
											<FieldInput
												placeholder="레지던트 수련 병원명을 검색하세요"
												className="bg-surface"
												endAdornment={
													<Search className="size-4 text-muted-fg" />
												}
											/>
										</Field>
										<Field className="lg:w-[20%]">
											<FieldLabel>세부 전공 분과</FieldLabel>
											<FieldSelect
												value=""
												options={SUBSPECIALTY_OPTIONS}
												placeholder="분과명"
												className="bg-surface"
											/>
										</Field>
										<Field className="flex-1">
											<FieldLabel>수련 기간</FieldLabel>
											<FieldRow className="flex-nowrap">
												<DateField
													defaultValue="2012.03"
													className="min-w-0 flex-1 bg-surface"
												/>
												<span className="shrink-0 text-line-strong">~</span>
												<DateField
													defaultValue="2015.03"
													className="min-w-0 flex-1 bg-surface"
												/>
												<CurrentToggle
													checked={residentCurrent}
													onCheckedChange={setResidentCurrent}
													label="레지던트"
												/>
											</FieldRow>
										</Field>
									</div>

									{/* 펠로우 — 파란 강조 카드 */}
									<CheckboxField
										label="펠로우 과정 이력이 있습니다"
										defaultChecked
									/>
									<div className="flex flex-col gap-6 rounded-2xl border border-brand-100 bg-brand-50 p-6">
										<div className="flex flex-wrap gap-6">
											<CheckboxField
												label="인턴 근무처와 동일"
												defaultChecked
											/>
											<CheckboxField
												label="레지던트 근무처와 동일"
												defaultChecked
											/>
										</div>
										<div className="flex flex-col gap-6 lg:flex-row lg:items-end">
											<Field className="lg:w-[28%]">
												<FieldLabel>펠로우 근무처</FieldLabel>
												<FieldInput
													placeholder="펠로우 수련 병원명을 검색하세요"
													className="bg-surface"
													endAdornment={
														<Search className="size-4 text-muted-fg" />
													}
												/>
											</Field>
											<Field className="lg:w-[20%]">
												<FieldLabel>세부 전공 분과</FieldLabel>
												<FieldSelect
													value=""
													options={["분과명"]}
													placeholder="분과명"
													className="bg-surface"
												/>
											</Field>
											<Field className="flex-1">
												<FieldLabel>근무 기간</FieldLabel>
												<FieldRow className="flex-nowrap">
													<DateField
														defaultValue="2012.03"
														className="min-w-0 flex-1 bg-surface"
													/>
													<span className="shrink-0 text-line-strong">~</span>
													<DateField
														defaultValue="2015.03"
														className="min-w-0 flex-1 bg-surface"
													/>
													<CurrentToggle label="펠로우" />
												</FieldRow>
											</Field>
										</div>
									</div>
								</div>
								<AddRowButton>레지던트 추가</AddRowButton>
							</div>
						</FieldGroup>
					</SectionCard>

					{/* 4. 면허 및 자격 */}
					<SectionCard>
						<SectionTitle className="mb-6">면허 및 자격</SectionTitle>
						<FieldGroup className="gap-6">
							<div className="grid gap-6 sm:grid-cols-2">
								<Field>
									<FieldLabel required>의사면허 번호</FieldLabel>
									<FieldInput
										defaultValue="123456"
										endAdornment={<VerifiedBadge>공식인증</VerifiedBadge>}
										className="pr-24"
									/>
								</Field>
								<Field>
									<FieldLabel required>취득일자</FieldLabel>
									<DateField defaultValue="2010.02.25" />
								</Field>
								<Field>
									<FieldLabel>전문의 번호</FieldLabel>
									<FieldRow>
										<FieldInput defaultValue="SP-98765" className="flex-1" />
										<Button
											variant="neutral-outline"
											size="2xl"
											className="shrink-0 font-medium text-brand"
										>
											인증하기
										</Button>
									</FieldRow>
								</Field>
								<Field>
									<FieldLabel>취득일자</FieldLabel>
									<DateField defaultValue="2010.02.25" />
								</Field>
							</div>

							<Field>
								<FieldLabel>분과의/세부전문의</FieldLabel>
								<FieldRow className="flex-wrap">
									<FieldInput
										placeholder="자격 명칭 입력"
										className="flex-1"
										aria-label="분과 자격 명칭"
									/>
									<FieldInput
										placeholder="자격 번호 입력"
										className="flex-1"
										aria-label="분과 자격 번호"
									/>
								</FieldRow>
							</Field>

							{/* 학회에서 주는 인정/전문의 */}
							<div className="flex flex-col gap-4 rounded-xl border border-line-soft bg-app-bg p-5">
								<span className="text-base font-semibold text-ink">
									학회에서 주는 인정/전문의
								</span>
								<div className="flex flex-col gap-3 sm:flex-row sm:items-end">
									<Field className="flex-1">
										<FieldLabel required>발급 학회명</FieldLabel>
										<FieldInput
											defaultValue="소화기내시경학회"
											className="bg-surface"
											endAdornment={<Search className="size-4 text-muted-fg" />}
										/>
									</Field>
									<Field className="flex-1">
										<FieldLabel required>자격 명칭</FieldLabel>
										<FieldSelect
											value="내시경 전문의"
											options={["내시경 전문의", "초음파 인증의"]}
											className="bg-surface"
										/>
									</Field>
									<div className="hidden h-14 items-center sm:flex">
										<RemoveRowButton label="학회 인정/전문의 삭제" />
									</div>
								</div>
								<AddRowButton>학회 인정/ 전문의 추가</AddRowButton>
							</div>
						</FieldGroup>
					</SectionCard>

					{/* 5. 학회 활동 */}
					<SectionCard>
						<SectionTitle className="mb-6">학회 활동</SectionTitle>
						<FieldGroup className="gap-6">
							{/* 일반 회원 활동 */}
							<div className="flex flex-col gap-4">
								<span className="text-base font-semibold text-ink">
									학회 및 의사회{" "}
									<span className="font-normal text-body-soft">
										(일반 회원 활동)
									</span>
								</span>
								<div className="flex flex-col gap-3 lg:flex-row lg:items-end">
									<Field className="lg:w-[160px]">
										<FieldLabel required>구분</FieldLabel>
										<OptionGroup value="학회" className="flex-nowrap gap-1.5">
											<OptionButton
												value="학회"
												className="h-14 flex-1 rounded-lg px-2 text-sm"
											>
												학회
											</OptionButton>
											<OptionButton
												value="의사회"
												className="h-14 flex-1 rounded-lg px-2 text-sm"
											>
												의사회
											</OptionButton>
										</OptionGroup>
									</Field>
									<Field className="flex-1">
										<FieldLabel required>학회 및 기관 명칭</FieldLabel>
										<FieldInput
											placeholder="학회 또는 의사회 이름을 검색하세요"
											endAdornment={<Search className="size-4 text-muted-fg" />}
										/>
									</Field>
									<Field className="flex-1">
										<FieldLabel>연구회 명칭</FieldLabel>
										<FieldInput placeholder="소속 연구회 명칭을 입력하세요" />
									</Field>
									<Field className="lg:w-[180px]">
										<FieldLabel required>회원 자격 구분</FieldLabel>
										<FieldSelect
											value="선택 안함"
											options={["선택 안함", "정회원", "준회원", "평생회원"]}
										/>
									</Field>
									<div className="hidden h-14 items-center lg:flex">
										<RemoveRowButton label="학회 및 의사회 정보 삭제" />
									</div>
								</div>
								<AddRowButton>학회 및 의사회 정보 추가하기</AddRowButton>
							</div>

							{/* 이사진 및 특수 직위 */}
							<div className="flex flex-col gap-4">
								<span className="text-base font-semibold text-ink">
									이사진 및 특수 직위 관리
								</span>
								{/* 이사진 행 1 (재직중) */}
								<div className="rounded-xl border border-line-soft bg-app-bg/50 p-5">
									<div className="flex flex-col gap-3 lg:flex-row lg:items-end">
										<Field className="flex-1">
											<FieldLabel required>학회 명칭</FieldLabel>
											<FieldInput
												defaultValue="대한성형외과학회"
												className="bg-surface"
												endAdornment={
													<Search className="size-4 text-muted-fg" />
												}
											/>
										</Field>
										<Field className="flex-1">
											<FieldLabel required>직위 및 직책</FieldLabel>
											<FieldInput defaultValue="이사" className="bg-surface" />
										</Field>
										<Field className="lg:flex-[2.2]">
											<FieldLabel required>임기 기간</FieldLabel>
											<FieldRow className="flex-nowrap">
												<FieldSelect
													value="2020"
													options={YEAR_OPTIONS}
													className="w-[110px] shrink-0 bg-surface"
												/>
												<span className="shrink-0 text-line-strong">~</span>
												<LockedPeriodField value="현재" />
												<CurrentToggle defaultCurrent label="이사진" />
											</FieldRow>
										</Field>
									</div>
								</div>
								{/* 이사진 행 2 (빈 입력) */}
								<div className="rounded-xl border border-line-soft bg-app-bg/50 p-5">
									<div className="flex flex-col gap-3 lg:flex-row lg:items-end">
										<Field className="flex-1">
											<FieldLabel required>학회 명칭</FieldLabel>
											<FieldInput
												placeholder="KMA 공인 학회 입력"
												className="bg-surface"
											/>
										</Field>
										<Field className="flex-1">
											<FieldLabel required>직위 및 직책</FieldLabel>
											<FieldInput
												placeholder="직위 입력"
												className="bg-surface"
											/>
										</Field>
										<Field className="lg:flex-[2.2]">
											<FieldLabel required>임기 기간</FieldLabel>
											<FieldRow className="flex-nowrap">
												<FieldSelect
													value=""
													options={YEAR_OPTIONS}
													placeholder="시작 년도"
													className="min-w-0 flex-1 bg-surface"
												/>
												<span className="shrink-0 text-line-strong">~</span>
												<FieldSelect
													value=""
													options={YEAR_OPTIONS}
													placeholder="종료 년도"
													className="min-w-0 flex-1 bg-surface"
												/>
												<CurrentToggle label="이사진 2" />
											</FieldRow>
										</Field>
									</div>
								</div>
								<AddRowButton>이사진 및 특수 직위 추가하기</AddRowButton>
							</div>
						</FieldGroup>
					</SectionCard>

					{/* 6. 경력 및 연구 */}
					<SectionCard>
						<SectionTitle className="mb-6">경력 및 연구</SectionTitle>
						<FieldGroup className="gap-6">
							{/* 경력사항 */}
							<div className="flex flex-col gap-4">
								<span className="text-base font-semibold text-ink">
									경력사항
								</span>
								<div className="flex flex-col gap-3 rounded-xl border border-line-soft bg-app-bg/50 p-5 lg:flex-row lg:items-center">
									<FieldInput
										defaultValue="서울대학교병원"
										className="flex-1 bg-surface"
										aria-label="기관명"
									/>
									<FieldInput
										defaultValue="정형외과"
										className="flex-1 bg-surface"
										aria-label="진료과목"
									/>
									<FieldInput
										defaultValue="대표원장"
										className="flex-1 bg-surface"
										aria-label="직위"
									/>
									{careerCurrent ? (
										<LockedPeriodField value="2017.03 - 현재" />
									) : (
										<FieldSelect
											value="2015.03 - 2017.02"
											options={["2017.03 - 현재", "2015.03 - 2017.02"]}
											className="flex-1 bg-surface"
										/>
									)}
									<CurrentToggle
										checked={careerCurrent}
										onCheckedChange={setCareerCurrent}
										label="경력"
									/>
								</div>
								<AddRowButton>경력 추가</AddRowButton>
							</div>

							{/* 포닥 */}
							<div className="flex flex-col gap-4">
								<span className="text-base font-semibold text-ink">포닥</span>
								<div className="flex flex-col gap-3 rounded-xl border border-line-soft bg-app-bg/50 p-5 lg:flex-row lg:items-center">
									<FieldInput
										placeholder="연구 기관명"
										className="flex-1 bg-surface"
										aria-label="연구 기관명"
									/>
									<FieldInput
										placeholder="진료과/부서명"
										className="flex-1 bg-surface"
										aria-label="진료과/부서명"
									/>
									<FieldInput
										placeholder="직책"
										className="flex-1 bg-surface"
										aria-label="직책"
									/>
									<DateField
										placeholder="기간 (YYYY.MM - YYYY.MM)"
										className="flex-1 bg-surface"
									/>
									<CurrentToggle label="포닥" />
								</div>
								<AddRowButton>포닥 추가</AddRowButton>
							</div>
						</FieldGroup>
					</SectionCard>

					{/* 7. 대표 연구 및 논문 */}
					<SectionCard>
						<SectionTitle className="mb-6">대표 연구 및 논문</SectionTitle>
						<div className="flex flex-col gap-5">
							{/* 증빙 파일 — 파란 톤 카드 */}
							<div className="flex items-center justify-between gap-3 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3">
								<div className="flex min-w-0 items-center gap-3">
									<span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-surface text-brand">
										<FileText className="size-5" />
									</span>
									<div className="flex min-w-0 flex-col">
										<span className="truncate text-base font-semibold text-ink">
											대표논문_증빙자료.zip
										</span>
										<span className="text-sm text-body-soft">
											파일 용량: 12.4 MB • 업로드 시간: 방금 전
										</span>
									</div>
								</div>
								<RemoveRowButton label="증빙 파일 삭제" />
							</div>

							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>논문 제목</TableHead>
										<TableHead>학술지명</TableHead>
										<TableHead>게재 년월</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{PAPERS.map((p) => (
										<TableRow key={p.id}>
											<TableCell className="text-ink">{p.title}</TableCell>
											<TableCell className="text-body">{p.journal}</TableCell>
											<TableCell className="text-body">{p.date}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
							<AddRowButton>증빙 서류 추가 업로드</AddRowButton>

							{/* ORCID */}
							<div className="flex flex-col gap-3 rounded-xl border border-line-soft bg-app-bg/50 p-5">
								<span className="flex items-center gap-2 text-base font-semibold text-ink">
									<span className="flex size-5 items-center justify-center rounded-full bg-success font-bold text-[10px] text-white">
										iD
									</span>
									ORCID (Open Researcher and Contributor ID) 연동
								</span>
								<FieldRow>
									<FieldInput
										defaultValue="0000-0002-1825-0097"
										className="flex-1 bg-surface"
									/>
									<Button
										variant="brand"
										size="2xl"
										className="shrink-0 font-medium"
									>
										<Link2 className="size-4" />
										Link &amp; Verify
									</Button>
								</FieldRow>
								<p className="text-sm text-body-soft">
									ORCID 연동 시 출판된 논문 내역을 자동으로 불러와 그리드에
									채워줍니다.
								</p>
							</div>

							{/* DOI 검색 그리드 행 */}
							<div className="flex flex-col gap-3">
								<div className="grid gap-3 px-1 text-sm text-body-soft lg:grid-cols-[1fr_1.5fr_1.5fr_1fr_1.6fr_auto]">
									<span>DOI Search</span>
									<span>논문 제목 (Publication Title)</span>
									<span>저널 이름 (Journal Name)</span>
									<span>게재 년도</span>
									<span>저자 역할</span>
									<span className="w-8" />
								</div>
								<div className="flex flex-col gap-3 rounded-xl border border-line-soft bg-app-bg/50 p-4 lg:grid lg:grid-cols-[1fr_1.5fr_1.5fr_1fr_1.6fr_auto] lg:items-center">
									<FieldInput
										defaultValue="10.1001/jama.2023"
										className="bg-surface"
										aria-label="DOI"
									/>
									<FieldInput
										defaultValue="Analysis of Facial Reconstruction..."
										className="bg-surface"
										aria-label="논문 제목"
									/>
									<FieldInput
										defaultValue="JAMA Network Open"
										className="bg-surface"
										aria-label="저널 이름"
									/>
									<FieldSelect
										value="2024"
										options={YEAR_OPTIONS}
										className="bg-surface"
									/>
									<OptionGroup value="제1저자" className="flex-nowrap gap-1.5">
										<OptionButton
											value="제1저자"
											className="h-14 flex-1 rounded-lg px-1 text-sm"
										>
											제1저자
										</OptionButton>
										<OptionButton
											value="교신"
											className="h-14 flex-1 rounded-lg px-1 text-sm"
										>
											교신
										</OptionButton>
										<OptionButton
											value="공동"
											className="h-14 flex-1 rounded-lg px-1 text-sm"
										>
											공동
										</OptionButton>
									</OptionGroup>
									<div className="flex h-14 items-center justify-center">
										<RemoveRowButton label="논문 행 삭제" />
									</div>
								</div>
							</div>
						</div>
					</SectionCard>

					{/* 8. 기타 — 방송 출연 및 언론 보도 경험 (리치텍스트) */}
					<SectionCard>
						<SectionTitle className="mb-6">기타</SectionTitle>
						<FieldGroup className="gap-6">
							<Field>
								<FieldLabel className="font-semibold" htmlFor="media-editor-1">
									방송 출연 및 언론 보도 경험
								</FieldLabel>
								<TiptapEditor
									value={media2Html}
									setValue={setMedia2Html}
									height={150}
									placeholder="예: KBS 무엇이든 물어보세요 출연 (2023), 조선일보 건강칼럼 연재..."
								/>
							</Field>
							<Field>
								<FieldLabel className="font-semibold" htmlFor="media-editor-2">
									방송 출연 및 언론 보도 경험
								</FieldLabel>
								<TiptapEditor
									value={mediaHtml}
									setValue={setMediaHtml}
									height={150}
									placeholder="예: KBS 무엇이든 물어보세요 출연 (2023), 조선일보 건강칼럼 연재..."
								/>
							</Field>
						</FieldGroup>
					</SectionCard>

					{/* 9. 전문 진료 분야 (리치텍스트 + 태그) */}
					<SectionCard>
						<SectionTitle className="mb-6">전문 진료 분야</SectionTitle>
						<FieldGroup className="gap-6">
							<Field>
								<FieldLabel htmlFor="intro-editor">
									주요 전문 진료 분야
								</FieldLabel>
								<TiptapEditor
									value={introHtml}
									setValue={setIntroHtml}
									height={150}
									placeholder="자기소개, 진료 철학, 주요 전문 진료 분야 등을 자유롭게 작성하세요."
								/>
							</Field>

							<Field>
								<FieldLabel className="font-semibold">
									주요 전문 진료 분야 (최대 5개)
								</FieldLabel>
								<div className="flex flex-wrap gap-2">
									{SPECIALTY_TAGS.map((tag) => (
										<Badge key={tag} variant="soft" size="lg">
											{tag}
										</Badge>
									))}
									<button
										type="button"
										className="flex h-8 items-center gap-1 rounded-full border border-dashed border-line-strong px-3 text-sm text-body-soft transition-colors hover:border-brand hover:text-brand"
									>
										<Plus className="size-3.5" />
										추가
									</button>
								</div>
							</Field>
						</FieldGroup>
					</SectionCard>

					{/* 9. 진료 일정 */}
					<SectionCard>
						<SectionTitle className="mb-6">진료 일정</SectionTitle>
						<div className="flex flex-col gap-4">
							<span className="text-base font-medium text-body">
								서울 아산병원
							</span>
							<div className="overflow-x-auto">
								<table className="w-full min-w-[680px] border-separate border-spacing-0 overflow-hidden rounded-xl border border-line-soft text-center">
									<thead>
										<tr className="bg-app-bg">
											<th className="border-b border-line-soft px-4 py-3 text-sm font-medium text-body">
												구분
											</th>
											{SCHEDULE_DAYS.map((d) => (
												<th
													key={d}
													className={cn(
														"border-b border-line-soft px-2 py-3 text-sm font-medium",
														d === "일" ? "text-danger-strong" : "text-body",
													)}
												>
													{d}
												</th>
											))}
										</tr>
									</thead>
									<tbody>
										{SCHEDULE_ROWS.map((row) => (
											<tr key={row.label}>
												<td className="border-b border-line-soft px-4 py-3 text-left text-sm text-ink">
													{row.label}
												</td>
												{row.cells.map((cell, i) => (
													<td
														key={`${row.label}-${SCHEDULE_DAYS[i]}`}
														className="border-b border-line-soft px-2 py-3"
													>
														<span
															className={cn(
																"inline-flex items-center justify-center rounded-full px-3 py-1.5 text-xs font-medium",
																STATUS_STYLES[cell],
															)}
														>
															{cell}
														</span>
													</td>
												))}
											</tr>
										))}
									</tbody>
								</table>
							</div>

							<span className="mt-2 text-base font-medium text-body">
								분당차병원
							</span>
							<div className="overflow-x-auto">
								<table className="w-full min-w-[680px] border-separate border-spacing-0 overflow-hidden rounded-xl border border-line-soft text-center">
									<thead>
										<tr className="bg-app-bg">
											<th className="border-b border-line-soft px-4 py-3 text-sm font-medium text-body">
												구분
											</th>
											{SCHEDULE_DAYS.map((d) => (
												<th
													key={d}
													className={cn(
														"border-b border-line-soft px-2 py-3 text-sm font-medium",
														d === "일" ? "text-danger-strong" : "text-body",
													)}
												>
													{d}
												</th>
											))}
										</tr>
									</thead>
									<tbody>
										{["오전 (09:00 - 13:00)", "오후 (14:00 - 18:00)"].map(
											(label, ri) => (
												<tr key={label}>
													<td className="border-b border-line-soft px-4 py-3 text-left text-sm text-ink">
														{label}
													</td>
													{SCHEDULE_DAYS.map((d) => (
														<td
															key={`${label}-${d}`}
															className="border-b border-line-soft px-2 py-3"
														>
															<Checkbox
																defaultChecked={
																	d !== "일" &&
																	!(ri === 1 && (d === "목" || d === "토"))
																}
																aria-label={`${label} ${d}`}
															/>
														</td>
													))}
												</tr>
											),
										)}
									</tbody>
								</table>
							</div>

							<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
								<Button
									variant="brand-outline"
									size="lg"
									className="font-medium"
								>
									<Plus className="size-4" />
									근무 기관 추가
								</Button>
								<p className="text-sm text-body-soft">
									※ 각 셀을 클릭하면 상세 진료 스케줄을 입력할 수 있습니다.
								</p>
							</div>
						</div>
					</SectionCard>

					{/* 하단 저장 */}
					<div className="flex justify-center pt-1">
						<Button
							variant="brand"
							size="cta"
							className="px-12 font-semibold sm:w-80"
						>
							<Save className="size-5" />
							프로필 전체 저장하기
						</Button>
					</div>
				</div>
			</div>
		</AppShell>
	);
}
