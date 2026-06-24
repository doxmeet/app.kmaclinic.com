import { Link } from "@tanstack/react-router";
import {
	ArrowRight,
	Check,
	Eye,
	Plus,
	Search,
	ShieldCheck,
	Upload,
} from "lucide-react";
import { useReducer } from "react";
import {
	SectionCard,
	SectionTitle,
} from "#/components/common/section-card.tsx";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
	FieldRow,
} from "#/components/form/field.tsx";
import { FieldInput } from "#/components/form/field-input.tsx";
import { FieldSelect } from "#/components/form/select-field.tsx";
import {
	PageActions,
	StickyActionBar,
} from "#/components/layout/action-bar.tsx";
import { AppShell } from "#/components/layout/app-shell.tsx";
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

const STEPS = [{ label: "병원 정보 입력" }, { label: "프로필 페이지 작성" }];

const YEAR_OPTIONS = ["2026년", "2024년", "2018년", "2010년", "2000년"];
const DEPARTMENTS = [
	"내과",
	"이비인후과",
	"소아청소년과",
	"피부과",
	"가정의학과",
	"정형외과",
];
const SELECTED_DEPARTMENTS = ["내과", "이비인후과"];

const SUBWAY_LINES = ["1호선", "2호선", "5호선", "8호선", "9호선"];
const WALK_OPTIONS = ["도보 1분", "도보 3분", "도보 5분", "도보 10분"];
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

type NonCovered = {
	id: string;
	item: string;
	detail: string;
	price: string;
};

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

type FormState = {
	year: string;
	day: string;
	openTime: string;
	closeTime: string;
	lunchEnabled: boolean;
	lunch: string;
	selectedDepts: string[];
	subwayLine: string;
	walk: string;
	themeColor: string;
};

type FormAction =
	| { type: "setYear"; value: string }
	| { type: "setDay"; value: string }
	| { type: "setOpenTime"; value: string }
	| { type: "setCloseTime"; value: string }
	| { type: "setLunchEnabled"; value: boolean }
	| { type: "setLunch"; value: string }
	| { type: "toggleDept"; value: string }
	| { type: "setSubwayLine"; value: string }
	| { type: "setWalk"; value: string }
	| { type: "setThemeColor"; value: string };

const INITIAL_FORM_STATE: FormState = {
	year: YEAR_OPTIONS[0],
	day: DAY_OPTIONS[0],
	openTime: "09:00",
	closeTime: "19:00",
	lunchEnabled: true,
	lunch: "12:30 ~ 13:30 (1시간)",
	selectedDepts: SELECTED_DEPARTMENTS,
	subwayLine: "5호선",
	walk: "도보 5분",
	themeColor: "blue",
};

function formReducer(state: FormState, action: FormAction): FormState {
	switch (action.type) {
		case "setYear":
			return { ...state, year: action.value };
		case "setDay":
			return { ...state, day: action.value };
		case "setOpenTime":
			return { ...state, openTime: action.value };
		case "setCloseTime":
			return { ...state, closeTime: action.value };
		case "setLunchEnabled":
			return { ...state, lunchEnabled: action.value };
		case "setLunch":
			return { ...state, lunch: action.value };
		case "toggleDept":
			return {
				...state,
				selectedDepts: state.selectedDepts.includes(action.value)
					? state.selectedDepts.filter((d) => d !== action.value)
					: [...state.selectedDepts, action.value],
			};
		case "setSubwayLine":
			return { ...state, subwayLine: action.value };
		case "setWalk":
			return { ...state, walk: action.value };
		case "setThemeColor":
			return { ...state, themeColor: action.value };
		default:
			return state;
	}
}

const BOTTOM_BAR = (
	<StickyActionBar
		left={
			<Button variant="neutral-outline" size="xl">
				<Eye className="size-4" />
				미리보기
			</Button>
		}
		center={
			<span>
				다른 의사들은 평균 <span className="font-bold text-brand">40개</span>{" "}
				항목을 작성했습니다
			</span>
		}
		right={
			<Button
				variant="brand"
				size="xl"
				nativeButton={false}
				render={<Link to="/hospital/confirm" />}
			>
				병원 정보 확인
				<ArrowRight className="size-4" />
			</Button>
		}
	/>
);

function DoctorField({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex flex-col gap-2">
			<span className="text-base text-body-soft">{label}</span>
			<input
				readOnly
				defaultValue={value}
				aria-label={label}
				className="h-14 w-full rounded-xl border border-line bg-muted px-5 text-base text-muted-fg"
			/>
		</div>
	);
}

function PageHeader() {
	return (
		<header className="flex flex-col gap-2">
			<h1 className="text-2xl font-bold text-ink sm:text-[28px]">
				병원 정보 및 템플릿 설정
			</h1>
			<p className="text-[15px] text-body-soft sm:text-[17px]">
				병원 운영에 필요한 기본 정보와 의료진 정보를 구성하고 홈페이지 디자인을
				관리하세요.
			</p>
		</header>
	);
}

function HospitalInfoSection({
	state,
	dispatch,
}: {
	state: FormState;
	dispatch: React.Dispatch<FormAction>;
}) {
	return (
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
							value={state.year}
							onValueChange={(value) => dispatch({ type: "setYear", value })}
							options={YEAR_OPTIONS}
						/>
					</Field>
				</div>

				<Field>
					<FieldLabel required>진료 시간</FieldLabel>
					<div className="flex flex-wrap items-center gap-3">
						<FieldSelect
							value={state.day}
							onValueChange={(value) => dispatch({ type: "setDay", value })}
							options={DAY_OPTIONS}
							className="min-w-[200px] flex-[1.2] basis-full sm:basis-0"
						/>
						<FieldSelect
							value={state.openTime}
							onValueChange={(value) =>
								dispatch({ type: "setOpenTime", value })
							}
							options={TIME_OPTIONS}
							className="min-w-[110px] flex-1"
						/>
						<span className="shrink-0 text-body-soft">~</span>
						<FieldSelect
							value={state.closeTime}
							onValueChange={(value) =>
								dispatch({ type: "setCloseTime", value })
							}
							options={TIME_OPTIONS}
							className="min-w-[110px] flex-1"
						/>
					</div>
					{/* 점심/휴게 시간: 토글 + (켜짐 시) 전체폭 시간 선택 — Figma엔 회색 박스 없음 */}
					<div className="flex flex-col gap-3">
						<div className="flex w-fit items-center gap-2 text-base text-ink">
							<Switch
								checked={state.lunchEnabled}
								onCheckedChange={(value) =>
									dispatch({ type: "setLunchEnabled", value })
								}
								aria-label="점심/휴게 시간 설정"
							/>
							점심/휴게 시간 설정
						</div>
						{state.lunchEnabled ? (
							<FieldSelect
								value={state.lunch}
								onValueChange={(value) => dispatch({ type: "setLunch", value })}
								options={LUNCH_OPTIONS}
							/>
						) : null}
					</div>
				</Field>

				<Field>
					<FieldLabel required>운영 진료과목</FieldLabel>
					<div className="flex flex-wrap items-center gap-2">
						<button
							type="button"
							className="flex size-10 items-center justify-center rounded-lg border border-dashed border-line-strong text-body-soft transition-colors hover:border-brand hover:text-brand"
							aria-label="진료과목 추가"
						>
							<Plus className="size-4" />
						</button>
						{DEPARTMENTS.map((dept) => {
							const active = state.selectedDepts.includes(dept);
							return (
								<button
									key={dept}
									type="button"
									onClick={() => dispatch({ type: "toggleDept", value: dept })}
									className={cn(
										"flex h-10 items-center rounded-full border px-5 text-[15px] transition-colors",
										active
											? "border-brand bg-brand-50 font-bold text-brand"
											: "border-line bg-surface font-medium text-body-soft hover:border-line-strong",
									)}
								>
									{dept}
								</button>
							);
						})}
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
					<div className="flex h-14 items-center gap-3 rounded-lg border border-brand bg-brand-50 px-4">
						<ShieldCheck className="size-4 shrink-0 text-brand" />
						<span className="text-base font-bold text-brand">
							보건복지부 지정 인증의료기관
						</span>
						<span className="ml-auto rounded bg-success px-2 py-0.5 text-xs font-bold text-white">
							인증 완료
						</span>
					</div>
				</Field>
			</FieldGroup>
		</SectionCard>
	);
}

function MedicalStaffSection() {
	return (
		<SectionCard>
			<SectionTitle className="mb-8">의료진 검색 및 등록</SectionTitle>
			<div className="flex flex-col gap-8">
				<FieldInput
					placeholder="추가할 의사 성명 또는 의사면허번호를 검색하세요"
					endAdornment={<Search className="size-4 text-muted-fg" />}
				/>
				{INITIAL_DOCTORS.map((doctor, index) => (
					<div key={doctor.id} className="flex flex-col gap-4">
						<div className="flex items-center gap-2">
							<span className="flex size-7 items-center justify-center rounded-full bg-brand-50 text-sm text-brand">
								{index + 1}
							</span>
							<span className="text-base font-medium text-body-soft">
								의료진 {index + 1}
							</span>
						</div>
						<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
							<DoctorField label="의사 이름" value={doctor.name} />
							<DoctorField label="진료과목" value={doctor.department} />
							<DoctorField label="진료 시간" value={doctor.hours} />
							<DoctorField label="의료면허 번호" value={doctor.license} />
						</div>
					</div>
				))}
			</div>
		</SectionCard>
	);
}

function LocationParkingSection({
	state,
	dispatch,
}: {
	state: FormState;
	dispatch: React.Dispatch<FormAction>;
}) {
	return (
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

				<Field>
					<FieldLabel>대중교통 이용 안내 설정</FieldLabel>
					<FieldRow className="flex-wrap">
						<FieldSelect
							value={state.subwayLine}
							onValueChange={(value) =>
								dispatch({ type: "setSubwayLine", value })
							}
							options={SUBWAY_LINES}
							className="w-full sm:w-32"
						/>
						<FieldInput defaultValue="천호역 2번 출구" className="flex-1" />
						<FieldSelect
							value={state.walk}
							onValueChange={(value) => dispatch({ type: "setWalk", value })}
							options={WALK_OPTIONS}
							className="w-full sm:w-36"
						/>
					</FieldRow>
					<FieldInput
						defaultValue="130, 341, 370"
						placeholder="간선 버스 번호 입력"
					/>
					<FieldInput
						defaultValue="3214, 3316, 3411"
						placeholder="지선 버스 번호 입력"
					/>
					<FieldInput
						defaultValue="천호역 현대백화점"
						placeholder="정류장 명칭 입력"
					/>
				</Field>

				<Field>
					<FieldLabel htmlFor="parking-info">기본 주차 조건 및 혜택</FieldLabel>
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
	);
}

function NaverMapSection() {
	return (
		<SectionCard>
			<SectionTitle className="mb-6">위치 및 주차 정보 설정</SectionTitle>
			<FieldGroup className="gap-6">
				<Field>
					<FieldLabel required htmlFor="naver-link">
						네이버 지도 URL 연결
					</FieldLabel>
					<FieldInput
						id="naver-link"
						defaultValue="https://map.naver.com/v5/entry/place/12345678"
					/>
					<div className="flex h-14 items-center rounded-lg border border-brand bg-brand-50 px-5 text-base font-medium text-brand">
						<Check className="mr-2 size-4 shrink-0" />
						연동 완료 : 네이버 플레이스 데이터가 성공적으로 추출되어 아래 필드에
						자동 입력되었습니다.
					</div>
					<div className="flex h-14 items-center rounded-lg border border-danger-strong bg-danger-bg px-5 text-base font-medium text-danger-strong">
						<Check className="mr-2 size-4 shrink-0" />
						연동 실패 : 네이버 플레이스 데이터가 추출되지 않았습니다. 다시
						시도해 주세요.
					</div>
				</Field>

				<Field>
					<FieldLabel>위치 주소</FieldLabel>
					<div className="flex h-14 items-center rounded-lg border border-line bg-muted px-5 text-base text-muted-fg">
						서울특별시 강동구 구천면로 200, 2층
					</div>
				</Field>

				<Field>
					<FieldLabel>연락처</FieldLabel>
					<div className="flex h-14 items-center rounded-lg border border-line bg-muted px-5 text-base text-muted-fg">
						02-1234-5678
					</div>
				</Field>

				<Field>
					<FieldLabel>대중교통 안내 정보</FieldLabel>
					<div className="flex h-14 items-center rounded-lg border border-line bg-muted px-5 text-base text-muted-fg">
						지하철 이용시: 5호선 천호역 2번 출구 도보 5분
					</div>
					<div className="flex h-14 items-center rounded-lg border border-line bg-muted px-5 text-base text-muted-fg">
						버스 이용시: 간선 130, 341, 370 / 지선 3214, 3316, 3411
						(&apos;천호역 현대백화점&apos; 정류장 하차)
					</div>
				</Field>

				<Field>
					<FieldLabel className="block">
						주차 안내 정보{" "}
						<span className="font-normal text-muted-fg">
							건물 지하 주차장 이용 가능 (진료 시 2시간 무료) / 만차 시 인근
							공영주차장 이용 부탁드립니다.
						</span>
					</FieldLabel>
					<div className="h-14 rounded-lg border border-line bg-muted" />
					<FieldDescription className="text-body-soft">
						네이버 플레이스에 등록된 최신 주차 운영 정책이 반영되었습니다.
					</FieldDescription>
				</Field>
			</FieldGroup>
		</SectionCard>
	);
}

function NonCoveredSection() {
	return (
		<SectionCard>
			<SectionTitle className="mb-6">비급여 정보</SectionTitle>
			<div className="flex flex-col gap-5">
				<div className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto]">
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
					<Field className="sm:w-44">
						<FieldLabel required htmlFor="nc-price">
							금액
						</FieldLabel>
						<FieldInput
							id="nc-price"
							defaultValue="50,000"
							endAdornment={<span className="text-body">원</span>}
						/>
					</Field>
				</div>
				<div className="flex justify-end">
					<Button variant="brand-outline" size="xl" className="font-medium">
						<Plus className="size-4" />
						항목 추가
					</Button>
				</div>

				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>항목</TableHead>
							<TableHead>내용</TableHead>
							<TableHead className="text-right">금액</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{INITIAL_NON_COVERED.map((row) => (
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
					<Button variant="neutral-outline" size="xl" className="font-medium">
						항목 수정
					</Button>
				</div>
			</div>
		</SectionCard>
	);
}

function HomepageDesignSection({
	state,
	dispatch,
}: {
	state: FormState;
	dispatch: React.Dispatch<FormAction>;
}) {
	return (
		<SectionCard>
			<SectionTitle className="mb-1">홈페이지 디자인 & 문구 설정</SectionTitle>
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
							const active = state.themeColor === color.value;
							return (
								<button
									key={color.value}
									type="button"
									onClick={() =>
										dispatch({ type: "setThemeColor", value: color.value })
									}
									className={cn(
										"flex h-14 w-[140px] items-center justify-center gap-2.5 rounded-lg border bg-surface text-base transition-colors",
										active
											? "border-[1.5px] border-brand font-bold text-brand"
											: "border-line font-medium text-body-soft hover:border-line-strong",
									)}
									aria-pressed={active}
								>
									<span
										className="size-[18px] rounded-full"
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
					<div className="flex flex-col items-start justify-between gap-4 rounded-lg border-2 border-dashed border-line-soft bg-surface p-6 sm:flex-row sm:items-center sm:px-10">
						<div className="flex items-center gap-6">
							<span className="flex size-[52px] items-center justify-center rounded-full bg-muted text-muted-fg">
								<Upload className="size-5" />
							</span>
							<div className="flex flex-col gap-0.5">
								<span className="text-[17px] font-bold text-ink">
									로고 업로드하기
								</span>
								<span className="text-sm text-body-soft">
									지원 형식: JPG, PNG / 최대 용량: 파일당 20MB 미만.
								</span>
							</div>
						</div>
						<Button
							variant="brand"
							size="2xl"
							className="shrink-0 px-8 font-semibold"
						>
							파일 선택
						</Button>
					</div>
				</Field>

				<Button
					variant="neutral-outline"
					size="2xl"
					className="w-full font-semibold shadow-sm"
				>
					<Eye className="size-5" />
					홈페이지 미리보기
				</Button>
			</FieldGroup>
		</SectionCard>
	);
}

export function HospitalRegisterPage() {
	const [state, dispatch] = useReducer(formReducer, INITIAL_FORM_STATE);

	return (
		<AppShell
			steps={STEPS}
			current={0}
			userName="김의사"
			bottomBar={BOTTOM_BAR}
		>
			<div className="flex flex-col gap-6">
				<PageHeader />
				<HospitalInfoSection state={state} dispatch={dispatch} />
				<MedicalStaffSection />
				<LocationParkingSection state={state} dispatch={dispatch} />
				<NaverMapSection />
				<NonCoveredSection />
				<HomepageDesignSection state={state} dispatch={dispatch} />

				<PageActions>
					<Button variant="neutral-outline" size="cta" className="sm:w-44">
						이전으로
					</Button>
					<Button
						variant="brand"
						size="cta"
						className="sm:w-72"
						nativeButton={false}
						render={<Link to="/hospital/confirm" />}
					>
						정보 저장 및 다음 단계
					</Button>
				</PageActions>
			</div>
		</AppShell>
	);
}
