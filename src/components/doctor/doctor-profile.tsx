import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import {
	AlertCircle,
	Camera,
	Loader2,
	Palette,
	Plus,
	RotateCcw,
	Save,
	Trash2,
	X,
} from "lucide-react";
import { useEffect, useId, useReducer, useState } from "react";
import { toast } from "sonner";
import { AuthGuard } from "#/components/auth/auth-guard.tsx";
import {
	SectionCard,
	SectionTitle,
} from "#/components/common/section-card.tsx";
import { ProfileLivePreview } from "#/components/doctor/profile-live-preview.tsx";
import {
	Autocomplete,
	type AutocompleteOption,
} from "#/components/form/autocomplete.tsx";
import {
	Field,
	FieldDescription,
	FieldLabel,
} from "#/components/form/field.tsx";
import { FieldInput } from "#/components/form/field-input.tsx";
import { FieldSelect } from "#/components/form/select-field.tsx";
import { StickyActionBar } from "#/components/layout/action-bar.tsx";
import { AppShell } from "#/components/layout/app-shell.tsx";
import { DesignPreviewScreen } from "#/components/onboarding/design-preview.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Checkbox } from "#/components/ui/checkbox.tsx";
import { Switch } from "#/components/ui/switch.tsx";
import { useDebouncedValue } from "#/hooks/use-debounced-value.ts";
import {
	getCompletion,
	getProfile,
	type ProfileDoc,
	type ProfilePatch,
	patchProfile,
} from "#/lib/api/profile.ts";
import {
	type RefClinic,
	searchClinics,
	searchDepartments,
	searchMedicalSchools,
	searchSocieties,
} from "#/lib/api/ref.ts";
import { toastApiError } from "#/lib/api-error-message.ts";
import {
	PROFILE_TEMPLATE_SWATCHES,
	type ProfilePreviewBundle,
} from "#/lib/profile-preview.ts";
import { uploadFileToStorage } from "#/lib/upload.ts";
import { cn } from "#/lib/utils.ts";

/**
 * 의사 프로필 관리 — 실연동(profile-frontend-guide.md).
 * `GET /profile/me`로 단일 doc(코어 + 컬렉션)을 로드해 폼에 바인딩하고,
 * "전체 저장" 시 편집 상태를 **JSON Merge Patch**로 `PATCH /profile/me` 한다.
 *  - 컬렉션 읽기=정렬된 배열(+id), 쓰기=id-키 객체. `order` 필드는 없다(서버 자동 정렬).
 *  - 컬렉션 항목: 유지=전체 전송(is_public 포함), 삭제=`{id:null}`, 추가=새 id.
 *  - 기본정보 공개여부는 `field_visibility`(키=코어 필드명). display_name·대표 진료과는 항상 공개.
 *  - 미설정 컬렉션 필드는 보내지 않으므로(merge-patch) 서버의 다른 필드는 보존된다.
 */

// ─────────────────────────────────────────────────────────────────────
// 컬렉션 설정 — profile-frontend-guide.md §3.2 필드명(ASCII 계약)에 맞춤.
// ─────────────────────────────────────────────────────────────────────

type FieldKind = "text" | "year" | "select" | "ref";
/** ref 자동완성 소스(레지스트리 엔드포인트가 있는 것만). */
type RefSourceKey = "medical_school" | "society" | "clinic";
type ColField = {
	name: string;
	label: string;
	kind?: FieldKind;
	options?: { value: string; label: string }[];
	placeholder?: string;
	/** kind:"ref"일 때 — 선택 시 표시 텍스트(name)와 FK(noField)를 함께 저장. */
	ref?: { source: RefSourceKey; noField: string };
	/** 행 값에 따라 표시/숨김(예: license issuing_society는 subspecialist/certified만). */
	showWhen?: (values: Record<string, unknown>) => boolean;
	/** 행 값에 따라 라벨 변경(예: license_number는 구분별 라벨). */
	labelOf?: (values: Record<string, unknown>) => string;
};

/** 컬렉션 키(affiliations는 전용 에디터라 제외). */
type CollKey =
	| "education"
	| "license"
	| "training"
	| "career"
	| "society"
	| "paper";

const SELECT = {
	degree: [
		{ value: "bachelor", label: "학사" },
		{ value: "master", label: "석사" },
		{ value: "doctorate", label: "박사" },
	],
	license: [
		{ value: "doctor", label: "의사면허" },
		{ value: "specialist", label: "전문의" },
		{ value: "subspecialist", label: "분과/세부전문의" },
		{ value: "certified", label: "인증의" },
	],
	training: [
		{ value: "intern", label: "인턴" },
		{ value: "resident", label: "레지던트" },
		{ value: "fellow", label: "펠로우" },
	],
	authorship: [
		{ value: "first", label: "제1저자" },
		{ value: "second", label: "제2저자" },
		{ value: "co", label: "공동저자" },
		{ value: "corresponding", label: "교신저자" },
	],
} as const;

/** license_number 라벨 분기(§3.2): doctor=의사면허, specialist=전문의, subspecialist/certified=인증번호. */
const LICENSE_NUMBER_LABEL: Record<string, string> = {
	doctor: "의사면허번호",
	specialist: "전문의면허번호",
	subspecialist: "인증번호",
	certified: "인증번호",
};

/** issuing_society 노출/ department·subspecialty 노출 분기. */
const isSubOrCertified = (v: Record<string, unknown>) =>
	v.license_type === "subspecialist" || v.license_type === "certified";
const isResidentOrFellow = (v: Record<string, unknown>) =>
	v.training_type === "resident" || v.training_type === "fellow";

type CollConfig = {
	key: CollKey;
	title: string;
	addLabel: string;
	fields: ColField[];
};

const COLLECTIONS: CollConfig[] = [
	{
		key: "education",
		title: "학력",
		addLabel: "학력 추가",
		fields: [
			{
				name: "degree_type",
				label: "학위",
				kind: "select",
				options: [...SELECT.degree],
			},
			{
				name: "school_name_text",
				label: "학교명",
				kind: "ref",
				ref: { source: "medical_school", noField: "medical_school_no" },
				placeholder: "의과대학을 검색하세요",
			},
			{ name: "major", label: "전공", placeholder: "예: 의학과" },
			{ name: "start_year", label: "입학연도", kind: "year" },
			{ name: "graduation_year", label: "졸업연도", kind: "year" },
		],
	},
	{
		key: "license",
		title: "면허·자격",
		addLabel: "면허/자격 추가",
		fields: [
			{
				name: "license_type",
				label: "구분",
				kind: "select",
				options: [...SELECT.license],
			},
			{
				name: "license_number",
				label: "면허번호",
				labelOf: (v) =>
					LICENSE_NUMBER_LABEL[String(v.license_type)] ?? "면허번호",
			},
			{ name: "acquired_year", label: "취득연도", kind: "year" },
			{
				name: "issuing_society",
				label: "발급 학회",
				placeholder: "예: 대한소화기내시경학회",
				showWhen: isSubOrCertified,
			},
		],
	},
	{
		key: "training",
		title: "수련",
		addLabel: "수련 추가",
		fields: [
			{
				name: "training_type",
				label: "구분",
				kind: "select",
				options: [...SELECT.training],
			},
			{
				name: "hospital_name",
				label: "병원명",
				kind: "ref",
				ref: { source: "clinic", noField: "ref_clinic_no" },
				placeholder: "병원을 검색하세요",
			},
			{
				name: "department",
				label: "진료과",
				showWhen: isResidentOrFellow,
			},
			{
				name: "subspecialty",
				label: "세부 전공",
				showWhen: isResidentOrFellow,
			},
			{ name: "start_year", label: "시작연도", kind: "year" },
			{ name: "end_year", label: "종료연도", kind: "year" },
		],
	},
	{
		key: "career",
		title: "경력",
		addLabel: "경력 추가",
		fields: [
			{ name: "org_name", label: "기관명", placeholder: "예: 서울대학교병원" },
			{ name: "title", label: "직위", placeholder: "예: 대표원장" },
			{ name: "department", label: "진료과" },
			{ name: "start_year", label: "시작연도", kind: "year" },
			{
				name: "end_year",
				label: "종료연도(현재 재직 중이면 비움)",
				kind: "year",
			},
		],
	},
	{
		key: "society",
		title: "학회",
		addLabel: "학회 추가",
		fields: [
			{
				name: "name_text",
				label: "학회/의사회명",
				kind: "ref",
				ref: { source: "society", noField: "society_no" },
				placeholder: "학회를 검색하세요",
			},
			{ name: "grade", label: "회원 구분", placeholder: "예: 정회원" },
			{ name: "position", label: "직위/직책", placeholder: "예: 학술 이사" },
			{ name: "since_year", label: "가입연도", kind: "year" },
		],
	},
	{
		key: "paper",
		title: "논문",
		addLabel: "논문 추가",
		fields: [
			{ name: "title", label: "제목" },
			{ name: "journal", label: "학술지" },
			{ name: "pub_year", label: "발행연도", kind: "year" },
			{
				name: "authorship",
				label: "저자 역할",
				kind: "select",
				options: [...SELECT.authorship],
			},
			{ name: "doi", label: "DOI" },
			{ name: "url", label: "URL" },
		],
	},
];

const GENDER_OPTIONS = [
	{ value: "male", label: "남성" },
	{ value: "female", label: "여성" },
];

/** 진료 일정 그리드 — 요일 × 시간대(am/pm) boolean(true=진료가능, false=휴진) + schedule.note. */
const GRID_DAYS = [
	{ key: "mon", label: "월" },
	{ key: "tue", label: "화" },
	{ key: "wed", label: "수" },
	{ key: "thu", label: "목" },
	{ key: "fri", label: "금" },
	{ key: "sat", label: "토" },
	{ key: "sun", label: "일" },
] as const;
const GRID_BANDS = [
	{ key: "am", label: "오전" },
	{ key: "pm", label: "오후" },
] as const;
/** 진료 주기 — 비어 있으면 매주, 선택 시 해당 주차만(§3.2 schedule.week_recurrence). */
const WEEK_OPTIONS = ["1", "2", "3", "4", "5"] as const;

/** 코어 스칼라 키 — 저장 시 항상 전송하는 사용자 편집 필드(§3.1). */
const CORE_KEYS = [
	"display_name",
	"name_en",
	"gender",
	"birth_date",
	"headline",
	"primary_department_text",
	"intro_text",
	"media_text",
	"photo_url",
	"kakao_url",
	"contact_phone",
	"contact_email",
	"orcid_id",
	"template_key",
] as const;
type CoreKey = (typeof CORE_KEYS)[number];

/**
 * field_visibility 토글 가능한 기본정보 필드(§3.3). 키 = 코어 필드명.
 * display_name·primary_department는 **항상 공개**라 토글 대상에서 제외한다.
 */
const VISIBILITY_FIELDS: { key: string; label: string }[] = [
	{ key: "photo_url", label: "프로필 사진" },
	{ key: "name_en", label: "영문 성명" },
	{ key: "gender", label: "성별" },
	{ key: "birth_date", label: "생년월일" },
	{ key: "headline", label: "헤드라인" },
	{ key: "specialty_tags", label: "주요 전문 진료 분야" },
	{ key: "intro_text", label: "자기소개" },
	{ key: "media_text", label: "방송 출연 및 언론 보도" },
	{ key: "contact_phone", label: "연락처 전화" },
	{ key: "contact_email", label: "연락처 이메일" },
	{ key: "kakao_url", label: "카카오 링크" },
	{ key: "orcid_id", label: "ORCID iD" },
];
const VISIBILITY_FIELD_KEYS = VISIBILITY_FIELDS.map((v) => v.key);

// ─────────────────────────────────────────────────────────────────────
// 편집 상태
// ─────────────────────────────────────────────────────────────────────

type Row = {
	id: string;
	isNew: boolean;
	deleted: boolean;
	values: Record<string, unknown>;
};

type EditState = {
	core: Record<CoreKey, string>;
	/** 대표 진료과 ref no(문자열, ""=ref 미선택·자유입력). */
	primaryDepartmentNo: string;
	specialtyTags: string[];
	visibility: Record<string, boolean>;
	colls: Record<CollKey, Row[]>;
	affiliations: Row[];
};

type EditAction =
	| { type: "load"; doc: ProfileDoc }
	| { type: "setCore"; key: CoreKey; value: string }
	| { type: "setPrimaryDept"; no: string; text: string }
	| { type: "setSpecialtyTags"; tags: string[] }
	| { type: "toggleVisibility"; key: string }
	| { type: "addRow"; coll: CollKey | "affiliations" }
	| {
			type: "updateRow";
			coll: CollKey | "affiliations";
			id: string;
			field: string;
			value: unknown;
	  }
	| { type: "removeRow"; coll: CollKey | "affiliations"; id: string }
	| {
			type: "setGrid";
			id: string;
			day: string;
			band: string;
			value: boolean;
	  }
	| { type: "setBand"; id: string; band: "am" | "pm"; value: string }
	| { type: "setWeeks"; id: string; weeks: string[] }
	| { type: "setScheduleNote"; id: string; value: string };

const EMPTY_STATE: EditState = {
	core: Object.fromEntries(CORE_KEYS.map((k) => [k, ""])) as Record<
		CoreKey,
		string
	>,
	primaryDepartmentNo: "",
	specialtyTags: [],
	visibility: defaultVisibility(),
	colls: {
		education: [],
		license: [],
		training: [],
		career: [],
		society: [],
		paper: [],
	},
	affiliations: [],
};

function defaultVisibility(): Record<string, boolean> {
	return Object.fromEntries(VISIBILITY_FIELD_KEYS.map((k) => [k, true]));
}

function editReducer(state: EditState, action: EditAction): EditState {
	switch (action.type) {
		case "load":
			return loadState(action.doc);
		case "setCore":
			return { ...state, core: { ...state.core, [action.key]: action.value } };
		case "setPrimaryDept":
			return {
				...state,
				primaryDepartmentNo: action.no,
				core: { ...state.core, primary_department_text: action.text },
			};
		case "setSpecialtyTags":
			return { ...state, specialtyTags: action.tags };
		case "toggleVisibility":
			return {
				...state,
				visibility: {
					...state.visibility,
					[action.key]: state.visibility[action.key] === false,
				},
			};
		case "addRow":
			return withRows(state, action.coll, (rows) => [
				...rows,
				{
					id: genId(action.coll, rows),
					isNew: true,
					deleted: false,
					values: { is_public: true },
				},
			]);
		case "updateRow":
			return withRows(state, action.coll, (rows) =>
				rows.map((r) =>
					r.id === action.id
						? { ...r, values: { ...r.values, [action.field]: action.value } }
						: r,
				),
			);
		case "removeRow":
			// 신규 행은 목록에서 제거, 기존 행은 deleted 표시(저장 시 null 전송) — 단일 패스.
			return withRows(state, action.coll, (rows) => {
				const out: Row[] = [];
				for (const r of rows) {
					if (r.id !== action.id) out.push(r);
					else if (!r.isNew) out.push({ ...r, deleted: true });
				}
				return out;
			});
		case "setGrid":
			return withRows(state, "affiliations", (rows) =>
				rows.map((r) => (r.id === action.id ? setGridCell(r, action) : r)),
			);
		case "setBand":
			return withRows(state, "affiliations", (rows) =>
				rows.map((r) =>
					r.id === action.id ? setTimeBand(r, action.band, action.value) : r,
				),
			);
		case "setWeeks":
			return withRows(state, "affiliations", (rows) =>
				rows.map((r) =>
					r.id === action.id
						? setScheduleField(r, "week_recurrence", action.weeks)
						: r,
				),
			);
		case "setScheduleNote":
			return withRows(state, "affiliations", (rows) =>
				rows.map((r) =>
					r.id === action.id ? setScheduleField(r, "note", action.value) : r,
				),
			);
		default:
			return state;
	}
}

function withRows(
	state: EditState,
	coll: CollKey | "affiliations",
	fn: (rows: Row[]) => Row[],
): EditState {
	if (coll === "affiliations") {
		return { ...state, affiliations: fn(state.affiliations) };
	}
	return { ...state, colls: { ...state.colls, [coll]: fn(state.colls[coll]) } };
}

/** 그리드 셀(요일×시간대) boolean 설정 — true=진료가능, false=휴진. */
function setGridCell(
	row: Row,
	action: { day: string; band: string; value: boolean },
): Row {
	const schedule = asObject(row.values.schedule) ?? {};
	const grid = asObject(schedule.grid) ?? {};
	const dayObj = {
		...(asObject(grid[action.day]) ?? {}),
		[action.band]: action.value,
	};
	const nextGrid = { ...grid, [action.day]: dayObj };
	return {
		...row,
		values: { ...row.values, schedule: { ...schedule, grid: nextGrid } },
	};
}

/** schedule.time_bands[am|pm] 시간대 라벨 설정. */
function setTimeBand(row: Row, band: "am" | "pm", value: string): Row {
	const schedule = asObject(row.values.schedule) ?? {};
	const bands = asObject(schedule.time_bands) ?? {};
	return {
		...row,
		values: {
			...row.values,
			schedule: { ...schedule, time_bands: { ...bands, [band]: value } },
		},
	};
}

/** schedule 하위 스칼라 필드(note·week_recurrence 등) 설정. */
function setScheduleField(row: Row, field: string, value: unknown): Row {
	const schedule = asObject(row.values.schedule) ?? {};
	return {
		...row,
		values: { ...row.values, schedule: { ...schedule, [field]: value } },
	};
}

/** doc → 편집 상태(컬렉션은 서버 정렬 순서를 그대로 보존). */
function loadState(doc: ProfileDoc): EditState {
	const core = Object.fromEntries(
		CORE_KEYS.map((k) => [k, asString((doc as Record<string, unknown>)[k])]),
	) as Record<CoreKey, string>;
	return {
		core,
		primaryDepartmentNo:
			doc.primary_department_no != null
				? String(doc.primary_department_no)
				: "",
		specialtyTags: Array.isArray(doc.specialty_tags)
			? doc.specialty_tags.filter((t): t is string => typeof t === "string")
			: [],
		visibility: { ...defaultVisibility(), ...(doc.field_visibility ?? {}) },
		colls: {
			education: rowsOf(doc.education),
			license: rowsOf(doc.license),
			training: rowsOf(doc.training),
			career: rowsOf(doc.career),
			society: rowsOf(doc.society),
			paper: rowsOf(doc.paper),
		},
		affiliations: rowsOf(doc.affiliations),
	};
}

/**
 * 컬렉션(읽기) → 행 배열. GET 응답은 **정렬된 배열(+id)**이 정상이며, 과거 id-키 객체
 * 형태도 함께 수용한다(객체일 때만 order 폴백 정렬).
 */
function rowsOf(coll: unknown): Row[] {
	if (Array.isArray(coll)) {
		return coll.map((raw, i) => {
			const values = asObject(raw) ?? {};
			// 서버 항목의 id(문자열/숫자)를 그대로 보존해야 PATCH 수정/삭제가 정확히 타겟된다.
			const id = values.id != null ? String(values.id) : `srv_${i}`;
			return { id, isNew: false, deleted: false, values };
		});
	}
	const obj = asObject(coll);
	if (!obj) return [];
	return Object.entries(obj)
		.map(([id, raw]) => ({
			id,
			isNew: false,
			deleted: false,
			values: asObject(raw) ?? {},
		}))
		.sort((a, b) => orderOf(a.values) - orderOf(b.values));
}

function orderOf(values: Record<string, unknown>): number {
	const o = values.order;
	return typeof o === "number" ? o : Number.parseInt(String(o ?? 0), 10) || 0;
}

let idCounter = 0;
function genId(prefix: string, rows: Row[]): string {
	const existing = new Set(rows.map((r) => r.id));
	let id: string;
	do {
		idCounter += 1;
		id = `${prefix}_new_${idCounter}`;
	} while (existing.has(id));
	return id;
}

// ─────────────────────────────────────────────────────────────────────
// merge-patch 빌드
// ─────────────────────────────────────────────────────────────────────

/** 빈 문자열은 null(삭제), 그 외는 그대로. */
function textOrNull(v: unknown): string | null {
	const s = typeof v === "string" ? v.trim() : "";
	return s.length > 0 ? s : null;
}

/** 연도/숫자: 유효 숫자면 number, 아니면 null. */
function numOrNull(v: unknown): number | null {
	const s = typeof v === "string" ? v.trim() : v;
	if (s === "" || s == null) return null;
	const n = Number(s);
	return Number.isFinite(n) ? n : null;
}

/** field_visibility 맵 — 알려진 토글 키만(레거시 섹션 키 유출 방지). */
function buildVisibility(
	vis: Record<string, boolean>,
): Record<string, boolean> {
	return Object.fromEntries(
		VISIBILITY_FIELD_KEYS.map((k) => [k, vis[k] !== false]),
	);
}

/** 설정된 필드가 모두 비어 있는 신규 행인지(빈 행 생성 방지). */
function isRowEmpty(row: Row, fields: ColField[]): boolean {
	return fields.every((f) => {
		const v = row.values[f.name];
		return v == null || (typeof v === "string" && v.trim() === "");
	});
}

/** 컬렉션 행 → 저장 항목(설정 필드 + is_public). 숨긴(showWhen=false) 필드는 null로 비운다. */
function buildItem(row: Row, config: CollConfig): Record<string, unknown> {
	const item: Record<string, unknown> = {
		is_public: row.values.is_public !== false,
	};
	for (const f of config.fields) {
		const ref = f.kind === "ref" ? f.ref : undefined;
		if (f.showWhen && !f.showWhen(row.values)) {
			item[f.name] = null;
			if (ref) item[ref.noField] = null;
			continue;
		}
		item[f.name] =
			f.kind === "year"
				? numOrNull(row.values[f.name])
				: textOrNull(row.values[f.name]);
		// ref 필드는 표시 텍스트와 함께 FK(noField)도 전송(미선택/직접입력 시 null).
		if (ref) item[ref.noField] = numOrNull(row.values[ref.noField]);
	}
	return item;
}

/** 소속병원 행 → 저장 항목(institution/ref_clinic_no/일정 포함). */
function buildAffiliation(row: Row): Record<string, unknown> {
	const schedule = asObject(row.values.schedule) ?? {};
	return {
		is_public: row.values.is_public !== false,
		institution_name: textOrNull(row.values.institution_name),
		ref_clinic_no: numOrNull(row.values.ref_clinic_no),
		title: textOrNull(row.values.title),
		department: textOrNull(row.values.department),
		role: textOrNull(row.values.role),
		// schedule: 진료 주기 + 시간대 라벨 + 요일×{am,pm} boolean grid + 비고(§3.2).
		schedule: {
			week_recurrence: normalizeWeeks(schedule.week_recurrence),
			time_bands: normalizeTimeBands(schedule.time_bands),
			grid: normalizeGrid(schedule.grid),
			note: textOrNull(schedule.note),
		},
	};
}

/** week_recurrence: 빈 배열/비배열은 null(매주), 그 외는 주차 문자열 배열. */
function normalizeWeeks(raw: unknown): string[] | null {
	if (!Array.isArray(raw)) return null;
	const weeks = raw.filter(
		(w): w is string => typeof w === "string" && w !== "",
	);
	return weeks.length ? weeks : null;
}

/** time_bands: { am, pm } 시간대 라벨. 둘 다 비면 null. */
function normalizeTimeBands(raw: unknown): { am?: string; pm?: string } | null {
	const o = asObject(raw);
	if (!o) return null;
	const out: { am?: string; pm?: string } = {};
	const am = textOrNull(o.am);
	const pm = textOrNull(o.pm);
	if (am != null) out.am = am;
	if (pm != null) out.pm = pm;
	return am == null && pm == null ? null : out;
}

/** grid를 요일×{am,pm} boolean으로 정규화(레거시 enum/야간 값은 제거). */
function normalizeGrid(
	raw: unknown,
): Record<string, { am?: boolean; pm?: boolean }> {
	const obj = asObject(raw);
	if (!obj) return {};
	const out: Record<string, { am?: boolean; pm?: boolean }> = {};
	for (const [day, cells] of Object.entries(obj)) {
		const c = asObject(cells);
		if (!c) continue;
		const entry: { am?: boolean; pm?: boolean } = {};
		if (typeof c.am === "boolean") entry.am = c.am;
		if (typeof c.pm === "boolean") entry.pm = c.pm;
		if ("am" in entry || "pm" in entry) out[day] = entry;
	}
	return out;
}

/** 컬렉션 patch 조각: 유지 행=전체 전송, 삭제 행=null. */
function collectionPatch(
	rows: Row[],
	build: (row: Row) => Record<string, unknown>,
	isEmpty: (row: Row) => boolean,
): Record<string, unknown> {
	const sub: Record<string, unknown> = {};
	for (const row of rows) {
		if (row.deleted) {
			if (!row.isNew) sub[row.id] = null;
			continue;
		}
		if (row.isNew && isEmpty(row)) continue;
		sub[row.id] = build(row);
	}
	return sub;
}

const affiliationIsEmpty = (row: Row) =>
	textOrNull(row.values.institution_name) == null &&
	numOrNull(row.values.ref_clinic_no) == null;

/** 편집 상태 → JSON Merge Patch(§4). */
function buildPatch(state: EditState): ProfilePatch {
	const patch: ProfilePatch = {};
	for (const key of CORE_KEYS) patch[key] = textOrNull(state.core[key]);
	patch.primary_department_no = numOrNull(state.primaryDepartmentNo);
	patch.specialty_tags = state.specialtyTags;
	patch.field_visibility = buildVisibility(state.visibility);

	for (const config of COLLECTIONS) {
		const sub = collectionPatch(
			state.colls[config.key],
			(row) => buildItem(row, config),
			(row) => isRowEmpty(row, config.fields),
		);
		if (Object.keys(sub).length > 0) patch[config.key] = sub;
	}

	const aff = collectionPatch(
		state.affiliations,
		buildAffiliation,
		affiliationIsEmpty,
	);
	if (Object.keys(aff).length > 0) patch.affiliations = aff;

	return patch;
}

/**
 * 편집 상태 → 미리보기 번들(`/profile/me` 형태, 컬렉션은 배열). buildPatch와 같은 행 빌더를
 * 재사용하되 id-키 대신 배열로 모은다. `templateOverride`로 스와치 실시간 선택을 반영.
 */
function buildProfilePreviewBundle(
	state: EditState,
	templateOverride?: string,
): ProfilePreviewBundle {
	const profile: Record<string, unknown> = {};
	for (const key of CORE_KEYS) {
		const v = state.core[key]?.trim();
		if (v) profile[key] = v;
	}
	profile.template_key = (
		templateOverride ||
		state.core.template_key ||
		"blue"
	).toLowerCase();
	const deptNo = numOrNull(state.primaryDepartmentNo);
	if (deptNo != null) profile.primary_department_no = deptNo;
	profile.specialty_tags = state.specialtyTags;
	profile.field_visibility = buildVisibility(state.visibility);

	const bundle: ProfilePreviewBundle = { profile };
	for (const config of COLLECTIONS) {
		const items: Record<string, unknown>[] = [];
		for (const r of state.colls[config.key]) {
			if (r.deleted || (r.isNew && isRowEmpty(r, config.fields))) continue;
			items.push(buildItem(r, config));
		}
		bundle[config.key] = items;
	}
	const affiliations: Record<string, unknown>[] = [];
	for (const r of state.affiliations) {
		if (r.deleted || affiliationIsEmpty(r)) continue;
		affiliations.push(buildAffiliation(r));
	}
	bundle.affiliations = affiliations;
	return bundle;
}

// ─────────────────────────────────────────────────────────────────────
// 페이지
// ─────────────────────────────────────────────────────────────────────

export function DoctorProfilePage() {
	return (
		<AuthGuard>
			<ProfileEditor />
		</AuthGuard>
	);
}

function ProfileEditor() {
	const queryClient = useQueryClient();
	const [state, dispatch] = useReducer(editReducer, EMPTY_STATE);
	// 전체화면 디자인 시안 선택(공개 전 미리보기). selectedTemplate는 화면에서 고르는 임시값.
	const [designOpen, setDesignOpen] = useState(false);
	const [selectedTemplate, setSelectedTemplate] = useState("blue");

	const {
		data: doc,
		isPending,
		isError,
		error,
		refetch,
	} = useQuery({
		queryKey: ["profile", "me"],
		queryFn: getProfile,
		// 편집 중 포커스 복귀 리페치가 편집 상태를 덮어쓰지 않도록 끈다.
		refetchOnWindowFocus: false,
	});
	const { data: completion } = useQuery({
		queryKey: ["profile", "completion"],
		queryFn: getCompletion,
	});

	// 로드/저장으로 doc이 바뀌면 편집 상태를 동기화(load는 멱등). 저장 성공 시
	// setQueryData가 doc을 갱신하므로 이 effect가 새 문서로 다시 채운다.
	useEffect(() => {
		if (doc) dispatch({ type: "load", doc });
	}, [doc]);

	// 전체 프로필 저장(PATCH). templateOverride를 주면 그 시안으로 template_key를 덮어쓴다
	// (디자인 화면의 "이 디자인 선택"이 저장과 동일 동작을 하도록 — 선택 시안 포함 전체 저장).
	const saveMutation = useMutation({
		mutationFn: (templateOverride?: string) => {
			const patch = buildPatch(state);
			if (templateOverride) patch.template_key = templateOverride;
			return patchProfile(patch);
		},
		onSuccess: (updated) => {
			queryClient.setQueryData(["profile", "me"], updated);
			queryClient.invalidateQueries({ queryKey: ["profile", "completion"] });
			toast.success("프로필을 저장했어요.");
			setDesignOpen(false); // 디자인 화면에서 저장한 경우 닫고 편집기로 복귀
		},
		onError: (err) => toastApiError(err),
	});

	const userName = state.core.display_name?.trim() || "원장님";

	if (isPending) {
		return (
			<AppShell userName="원장님" maxWidth="1280px" innerMaxWidth="720px">
				<div className="flex min-h-80 items-center justify-center">
					<Loader2 className="size-7 animate-spin text-brand" />
				</div>
			</AppShell>
		);
	}

	if (isError) {
		return (
			<AppShell userName="원장님" maxWidth="1280px" innerMaxWidth="720px">
				<SectionCard className="flex flex-col items-center gap-4 py-16 text-center">
					<AlertCircle className="size-8 text-danger" />
					<p className="text-base text-ink">프로필을 불러오지 못했습니다.</p>
					<Button
						variant="neutral-outline"
						size="lg"
						onClick={() => {
							toastApiError(error);
							refetch();
						}}
					>
						<RotateCcw className="size-4" />
						다시 시도
					</Button>
				</SectionCard>
			</AppShell>
		);
	}

	const completionPercent = completion?.completion_percent;

	// 전체화면 디자인 시안 선택 — 현재 편집 내용 그대로 미리보며 시안 고르기.
	// "이 디자인 선택" → "프로필 저장"과 동일하게 선택 시안을 포함해 전체 프로필을 저장.
	if (designOpen) {
		return (
			<DesignPreviewScreen
				swatches={PROFILE_TEMPLATE_SWATCHES}
				templateKey={selectedTemplate}
				preview={
					<ProfileLivePreview
						payload={buildProfilePreviewBundle(state, selectedTemplate)}
					/>
				}
				onTemplateChange={setSelectedTemplate}
				onBack={() => setDesignOpen(false)}
				onConfirm={() => {
					// 편집 상태에 시안 반영 + 전체 저장(저장 성공 시 onSuccess가 화면을 닫음).
					dispatch({
						type: "setCore",
						key: "template_key",
						value: selectedTemplate,
					});
					saveMutation.mutate(selectedTemplate);
				}}
				confirming={saveMutation.isPending}
				confirmLabel="이 디자인 선택"
			/>
		);
	}

	return (
		<AppShell
			userName={userName}
			maxWidth="1280px"
			innerMaxWidth="720px"
			bottomBar={
				<StickyActionBar
					className="shadow-[0_-6px_20px_-8px_rgba(15,39,68,0.18)]"
					right={
						<>
							<Button
								variant="neutral-outline"
								size="2xl"
								className="font-semibold"
								onClick={() => {
									setSelectedTemplate(state.core.template_key || "blue");
									setDesignOpen(true);
								}}
							>
								<Palette className="size-5" />
								디자인 선택
							</Button>
							<Button
								variant="brand"
								size="2xl"
								className="px-8 font-semibold"
								disabled={saveMutation.isPending}
								onClick={() => saveMutation.mutate(undefined)}
							>
								{saveMutation.isPending ? (
									<Loader2 className="size-5 animate-spin" />
								) : (
									<Save className="size-5" />
								)}
								프로필 저장
							</Button>
						</>
					}
				/>
			}
		>
			<div className="flex flex-col gap-6">
				<ProfileHeader completion={completionPercent} />

				<PhotoSection state={state} dispatch={dispatch} />
				<BasicInfoSection state={state} dispatch={dispatch} />

				{COLLECTIONS.map((config) => (
					<CollectionSection
						key={config.key}
						config={config}
						rows={state.colls[config.key]}
						dispatch={dispatch}
					/>
				))}

				<AffiliationsSection rows={state.affiliations} dispatch={dispatch} />
			</div>
		</AppShell>
	);
}

// ─────────────────────────────────────────────────────────────────────
// 섹션 컴포넌트
// ─────────────────────────────────────────────────────────────────────

function ProfileHeader({ completion }: { completion?: number }) {
	const pct =
		typeof completion === "number"
			? Math.max(0, Math.min(100, completion))
			: null;
	return (
		<SectionCard className="flex flex-col gap-5">
			<div className="flex flex-col gap-1.5">
				<h1 className="text-2xl font-bold text-ink sm:text-[28px]">
					의사 프로필 관리
				</h1>
				<p className="text-base text-body-soft">
					전문성을 입증하기 위한 정보를 한눈에 관리하세요.
				</p>
			</div>
			{pct !== null ? (
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between text-sm">
						<span className="text-body-soft">입력 완료도</span>
						<span className="font-semibold text-brand">{pct}%</span>
					</div>
					<div className="h-2 w-full overflow-hidden rounded-full bg-line-soft">
						<div
							className="h-full rounded-full bg-brand transition-all duration-500"
							style={{ width: `${pct}%` }}
						/>
					</div>
				</div>
			) : null}
		</SectionCard>
	);
}

function PhotoSection({
	state,
	dispatch,
}: {
	state: EditState;
	dispatch: React.Dispatch<EditAction>;
}) {
	const [uploading, setUploading] = useState<"photo" | null>(null);
	const photoUrl = state.core.photo_url;

	async function pick(
		e: React.ChangeEvent<HTMLInputElement>,
		key: "photo_url",
	) {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;
		setUploading("photo");
		try {
			const url = await uploadFileToStorage(file, "profile");
			dispatch({ type: "setCore", key, value: url });
		} catch {
			toast.error("이미지 업로드에 실패했습니다.");
		} finally {
			setUploading(null);
		}
	}

	return (
		<SectionCard className="flex flex-col gap-8">
			<div className="flex items-center justify-between gap-3">
				<SectionTitle>프로필 사진</SectionTitle>
				<VisibilityToggle
					on={state.visibility.photo_url !== false}
					onToggle={() =>
						dispatch({ type: "toggleVisibility", key: "photo_url" })
					}
					label="프로필 사진"
				/>
			</div>

			{/* 프로필 사진 — 전체폭, 원본은 contain으로 보이고 양옆 여백은 블러로 채움 */}
			<div className="flex flex-col gap-3">
				<span className="text-sm font-medium text-body">프로필 사진</span>
				<div className="relative flex aspect-5/2 w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-line-strong bg-muted text-body-soft">
					{photoUrl ? (
						<>
							<img
								src={photoUrl}
								alt=""
								aria-hidden
								className="absolute inset-0 size-full scale-110 object-cover blur-xl"
							/>
							<img
								src={photoUrl}
								alt="프로필 사진 미리보기"
								className="relative size-full object-contain"
							/>
						</>
					) : (
						<Camera className="size-7" />
					)}
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<div className="flex flex-wrap gap-2 sm:ml-auto">
						<PhotoUploadButton
							label={photoUrl ? "사진 변경" : "사진 업로드"}
							uploading={uploading === "photo"}
							onPick={(e) => pick(e, "photo_url")}
						/>
						{photoUrl ? (
							<Button
								variant="neutral-outline"
								size="2xl"
								onClick={() =>
									dispatch({ type: "setCore", key: "photo_url", value: "" })
								}
							>
								<Trash2 className="size-4" />
								삭제
							</Button>
						) : null}
					</div>
				</div>
			</div>
		</SectionCard>
	);
}

function PhotoUploadButton({
	label,
	uploading,
	onPick,
}: {
	label: string;
	uploading: boolean;
	onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
	const id = useId();
	return (
		<>
			<input
				id={id}
				type="file"
				accept="image/*"
				className="hidden"
				aria-label={label}
				onChange={onPick}
			/>
			<Button
				variant="brand"
				size="2xl"
				disabled={uploading}
				onClick={() => document.getElementById(id)?.click()}
			>
				{uploading ? <Loader2 className="size-4 animate-spin" /> : null}
				{label}
			</Button>
		</>
	);
}

function BasicInfoSection({
	state,
	dispatch,
}: {
	state: EditState;
	dispatch: React.Dispatch<EditAction>;
}) {
	const set = (key: CoreKey) => (v: string) =>
		dispatch({ type: "setCore", key, value: v });
	// 토글 가능한 필드의 공개여부 props(§3.3). display_name·대표 진료과는 항상 공개라 vis 없음.
	const vis = (key: string, label: string): VisProps => ({
		on: state.visibility[key] !== false,
		onToggle: () => dispatch({ type: "toggleVisibility", key }),
		label,
	});
	return (
		<SectionCard className="flex flex-col gap-6">
			<SectionTitle>기본 정보</SectionTitle>
			<FieldDescription>
				오른쪽 토글로 공개 프로필(kmadoc.com)에 항목을 노출할지 정할 수 있어요.
				성명·대표 진료과는 항상 공개됩니다.
			</FieldDescription>
			<TextField
				label="성명"
				value={state.core.display_name}
				onChange={set("display_name")}
			/>
			<TextField
				label="영문 성명"
				value={state.core.name_en}
				onChange={set("name_en")}
				vis={vis("name_en", "영문 성명")}
			/>
			<Field>
				<FieldHeader label="성별" vis={vis("gender", "성별")} />
				<FieldSelect
					value={state.core.gender}
					onValueChange={set("gender")}
					options={GENDER_OPTIONS}
					placeholder="선택 안함"
				/>
			</Field>
			<TextField
				label="생년월일"
				value={state.core.birth_date}
				onChange={set("birth_date")}
				placeholder="YYYY-MM-DD"
				vis={vis("birth_date", "생년월일")}
			/>
			<PrimaryDepartmentField state={state} dispatch={dispatch} />
			<TextField
				label="한 줄 소개(헤드라인)"
				value={state.core.headline}
				onChange={set("headline")}
				placeholder="예: 대표원장 · 소화기내과 전문의"
				vis={vis("headline", "헤드라인")}
			/>
			<SpecialtyTagsField state={state} dispatch={dispatch} />
			<TextAreaField
				label="자기소개"
				value={state.core.intro_text}
				onChange={set("intro_text")}
				vis={vis("intro_text", "자기소개")}
			/>
			<TextAreaField
				label="방송 출연 및 언론 보도"
				value={state.core.media_text}
				onChange={set("media_text")}
				vis={vis("media_text", "방송 출연 및 언론 보도")}
			/>
			<TextField
				label="연락처 전화"
				value={state.core.contact_phone}
				onChange={set("contact_phone")}
				placeholder="예: 02-123-4567"
				vis={vis("contact_phone", "연락처 전화")}
			/>
			<TextField
				label="연락처 이메일"
				value={state.core.contact_email}
				onChange={set("contact_email")}
				placeholder="예: doctor@example.com"
				vis={vis("contact_email", "연락처 이메일")}
			/>
			<TextField
				label="카카오 링크"
				value={state.core.kakao_url}
				onChange={set("kakao_url")}
				placeholder="https://"
				vis={vis("kakao_url", "카카오 링크")}
			/>
			<TextField
				label="ORCID iD"
				value={state.core.orcid_id}
				onChange={set("orcid_id")}
				placeholder="0000-0000-0000-0000"
				vis={vis("orcid_id", "ORCID iD")}
			/>
		</SectionCard>
	);
}

/** 대표 진료과 — /ref/department 자동완성(선택 시 no, 자유입력 시 text만). 항상 공개. */
function PrimaryDepartmentField({
	state,
	dispatch,
}: {
	state: EditState;
	dispatch: React.Dispatch<EditAction>;
}) {
	const text = state.core.primary_department_text;
	const keyword = useDebouncedValue(text.trim());
	const { data } = useQuery({
		queryKey: ["ref", "department", keyword],
		queryFn: () => searchDepartments({ keyword }),
		enabled: keyword.length >= 1,
		staleTime: 60_000,
	});
	const items = data?.items ?? [];
	const options: AutocompleteOption[] = items.map((d) => ({
		value: String(d.no ?? d.name ?? ""),
		label: d.name ?? "",
		description: d.code ? String(d.code) : undefined,
	}));
	return (
		<Field>
			<FieldLabel>대표 진료과</FieldLabel>
			<Autocomplete
				options={options}
				value={text}
				onChange={(v) => dispatch({ type: "setPrimaryDept", no: "", text: v })}
				onSelect={(opt) =>
					dispatch({
						type: "setPrimaryDept",
						no: opt.value,
						text: opt.label,
					})
				}
				onManualEntry={() => {}}
				placeholder="진료과를 검색하세요 (예: 소화기내과)"
			/>
			<FieldDescription>
				목록에서 고르면 표준 진료과로 저장되고, 없으면 직접 입력됩니다. 항상
				공개됩니다.
			</FieldDescription>
		</Field>
	);
}

/** 전문 분야 태그(최대 5). */
function SpecialtyTagsField({
	state,
	dispatch,
}: {
	state: EditState;
	dispatch: React.Dispatch<EditAction>;
}) {
	const [draft, setDraft] = useState("");
	const tags = state.specialtyTags;
	const full = tags.length >= 5;

	function add() {
		const v = draft.trim();
		if (!v || full || tags.includes(v)) return;
		dispatch({ type: "setSpecialtyTags", tags: [...tags, v] });
		setDraft("");
	}

	return (
		<Field>
			<FieldHeader
				label="주요 전문 진료 분야 (최대 5개)"
				vis={{
					on: state.visibility.specialty_tags !== false,
					onToggle: () =>
						dispatch({ type: "toggleVisibility", key: "specialty_tags" }),
					label: "주요 전문 진료 분야",
				}}
			/>
			<div className="flex flex-wrap gap-2">
				{tags.map((tag) => (
					<span
						key={tag}
						className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-sm text-brand"
					>
						{tag}
						<button
							type="button"
							aria-label={`${tag} 삭제`}
							onClick={() =>
								dispatch({
									type: "setSpecialtyTags",
									tags: tags.filter((t) => t !== tag),
								})
							}
						>
							<X className="size-3.5" />
						</button>
					</span>
				))}
			</div>
			{full ? null : (
				<div className="flex gap-2">
					<FieldInput
						value={draft}
						onChange={(e) => setDraft(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								add();
							}
						}}
						placeholder="태그 입력 후 Enter"
					/>
					<Button
						type="button"
						variant="neutral-outline"
						size="2xl"
						onClick={add}
						disabled={!draft.trim()}
					>
						추가
					</Button>
				</div>
			)}
		</Field>
	);
}

/** 일반 컬렉션(학력/면허/수련/경력/학회/논문) 반복 에디터. */
function CollectionSection({
	config,
	rows,
	dispatch,
}: {
	config: CollConfig;
	rows: Row[];
	dispatch: React.Dispatch<EditAction>;
}) {
	const visible = rows.filter((r) => !r.deleted);

	return (
		<SectionCard className="flex flex-col gap-5">
			<SectionTitle>{config.title}</SectionTitle>
			{visible.length === 0 ? (
				<p className="text-sm text-muted-fg">
					추가 버튼을 눌러 {config.title} 정보를 입력하세요.
				</p>
			) : null}
			<div className="flex flex-col gap-4">
				{visible.map((row) => (
					<div
						key={row.id}
						className="flex flex-col gap-3 rounded-xl border border-line p-4"
					>
						<div className="grid gap-3">
							{config.fields.map((f) =>
								f.showWhen && !f.showWhen(row.values) ? null : (
									<CollField
										key={f.name}
										field={f}
										label={f.labelOf ? f.labelOf(row.values) : f.label}
										value={row.values[f.name]}
										setField={(field, value) =>
											dispatch({
												type: "updateRow",
												coll: config.key,
												id: row.id,
												field,
												value,
											})
										}
									/>
								),
							)}
						</div>
						<div className="flex items-center justify-between gap-4 border-t border-line-soft pt-3">
							<div className="flex flex-wrap items-center gap-4">
								<RowToggle
									label="공개"
									checked={row.values.is_public !== false}
									onChange={(v) =>
										dispatch({
											type: "updateRow",
											coll: config.key,
											id: row.id,
											field: "is_public",
											value: v,
										})
									}
								/>
							</div>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								aria-label={`${config.title} 삭제`}
								onClick={() =>
									dispatch({ type: "removeRow", coll: config.key, id: row.id })
								}
							>
								<Trash2 className="size-4 text-danger-strong" />
							</Button>
						</div>
					</div>
				))}
			</div>
			<Button
				type="button"
				variant="neutral-outline"
				size="xl"
				className="self-start"
				onClick={() => dispatch({ type: "addRow", coll: config.key })}
			>
				<Plus className="size-4" />
				{config.addLabel}
			</Button>
		</SectionCard>
	);
}

type RefRow = Record<string, unknown>;
type RefSource = {
	minLen: number;
	placeholder: string;
	search: (keyword: string) => Promise<{ items: RefRow[] }>;
	describe?: (item: RefRow) => string | undefined;
};

/** 의과대학 type 한글화(영문 노출 방지). 미정의 값은 표시 생략. */
const MEDICAL_SCHOOL_TYPE: Record<string, string> = {
	university: "의과대학",
	graduate: "의학전문대학원",
};

/** ref 자동완성 소스(레지스트리 GET이 존재하는 항목만). */
const REF_SOURCES: Record<RefSourceKey, RefSource> = {
	medical_school: {
		minLen: 1,
		placeholder: "의과대학을 검색하세요",
		search: (keyword) => searchMedicalSchools({ keyword, limit: 20 }),
		describe: (i) =>
			[
				typeof i.region === "string" ? i.region : null,
				MEDICAL_SCHOOL_TYPE[String(i.type)] ?? null,
				i.status === "predecessor" ? "전신" : null,
			]
				.filter(Boolean)
				.join(" · ") || undefined,
	},
	society: {
		minLen: 1,
		placeholder: "학회를 검색하세요",
		search: (keyword) => searchSocieties({ keyword, limit: 20 }),
		describe: (i) =>
			[i.category, i.is_official ? "공식" : null].filter(Boolean).join(" · ") ||
			undefined,
	},
	clinic: {
		minLen: 1,
		placeholder: "병원을 검색하세요",
		search: (keyword) => searchClinics({ keyword, limit: 20 }),
		describe: (i) =>
			[i.type_name, i.address].filter(Boolean).join(" · ") || undefined,
	},
};

const refIdOf = (item: RefRow) => String(item.no ?? item.name ?? "");

/** 레지스트리 자동완성 — 고르면 name/no를, 직접 입력하면 name만(no="") 올린다. */
function RefAutocomplete({
	source,
	value,
	placeholder,
	onPick,
}: {
	source: RefSourceKey;
	value: string;
	placeholder?: string;
	onPick: (name: string, no: string) => void;
}) {
	const src = REF_SOURCES[source];
	const keyword = useDebouncedValue(value.trim());
	const { data } = useQuery({
		queryKey: ["ref", source, keyword],
		queryFn: () => src.search(keyword),
		enabled: keyword.length >= src.minLen,
		staleTime: 60_000,
		placeholderData: keepPreviousData,
	});
	const items = data?.items ?? [];
	const options: AutocompleteOption[] = items.map((it) => ({
		value: refIdOf(it),
		label: String(it.name ?? ""),
		description: src.describe?.(it),
	}));
	return (
		<Autocomplete
			options={options}
			value={value}
			onChange={(v) => onPick(v, "")}
			onSelect={(opt) => {
				const picked = items.find((it) => refIdOf(it) === opt.value);
				onPick(
					String(picked?.name ?? opt.label),
					picked?.no != null ? String(picked.no) : "",
				);
			}}
			onManualEntry={() => {}}
			placeholder={placeholder ?? src.placeholder}
		/>
	);
}

function CollField({
	field,
	label,
	value,
	setField,
}: {
	field: ColField;
	label: string;
	value: unknown;
	setField: (name: string, value: unknown) => void;
}) {
	const str = asString(value);
	if (field.kind === "ref" && field.ref) {
		const ref = field.ref;
		return (
			<Field>
				<FieldLabel>{label}</FieldLabel>
				<RefAutocomplete
					source={ref.source}
					value={str}
					placeholder={field.placeholder}
					onPick={(name, no) => {
						setField(field.name, name);
						setField(ref.noField, no);
					}}
				/>
			</Field>
		);
	}
	return (
		<Field>
			<FieldLabel>{label}</FieldLabel>
			{field.kind === "select" ? (
				<FieldSelect
					value={str}
					onValueChange={(v) => setField(field.name, v)}
					options={field.options ?? []}
					placeholder="선택"
				/>
			) : (
				<FieldInput
					value={str}
					onChange={(e) => setField(field.name, e.target.value)}
					placeholder={
						field.placeholder ??
						(field.kind === "year" ? "예: 2020" : undefined)
					}
					inputMode={field.kind === "year" ? "numeric" : undefined}
				/>
			)}
		</Field>
	);
}

/** 소속병원(affiliations) — 병원 검색 + 진료 일정. */
function AffiliationsSection({
	rows,
	dispatch,
}: {
	rows: Row[];
	dispatch: React.Dispatch<EditAction>;
}) {
	const visible = rows.filter((r) => !r.deleted);
	return (
		<SectionCard className="flex flex-col gap-5">
			<SectionTitle>소속 병원 · 진료 일정</SectionTitle>
			{visible.length === 0 ? (
				<p className="text-sm text-muted-fg">
					근무 중인 병원과 진료 일정을 추가하세요.
				</p>
			) : null}
			<div className="flex flex-col gap-6">
				{visible.map((row) => (
					<div
						key={row.id}
						className="flex flex-col gap-4 rounded-xl border border-line p-4"
					>
						<AffiliationInstitutionField row={row} dispatch={dispatch} />
						<div className="grid gap-3">
							<AffField
								row={row}
								field="title"
								label="직함"
								dispatch={dispatch}
							/>
							<AffField
								row={row}
								field="department"
								label="진료과"
								dispatch={dispatch}
							/>
							<AffField
								row={row}
								field="role"
								label="역할"
								placeholder="예: 본원"
								dispatch={dispatch}
							/>
						</div>
						<ScheduleGrid row={row} dispatch={dispatch} />
						<div className="flex items-center justify-between gap-4 border-t border-line-soft pt-3">
							<RowToggle
								label="공개"
								checked={row.values.is_public !== false}
								onChange={(v) =>
									dispatch({
										type: "updateRow",
										coll: "affiliations",
										id: row.id,
										field: "is_public",
										value: v,
									})
								}
							/>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								aria-label="소속 병원 삭제"
								onClick={() =>
									dispatch({
										type: "removeRow",
										coll: "affiliations",
										id: row.id,
									})
								}
							>
								<Trash2 className="size-4 text-danger-strong" />
							</Button>
						</div>
					</div>
				))}
			</div>
			<Button
				type="button"
				variant="neutral-outline"
				size="xl"
				className="self-start"
				onClick={() => dispatch({ type: "addRow", coll: "affiliations" })}
			>
				<Plus className="size-4" />
				근무 기관 추가
			</Button>
		</SectionCard>
	);
}

function AffField({
	row,
	field,
	label,
	placeholder,
	dispatch,
}: {
	row: Row;
	field: string;
	label: string;
	placeholder?: string;
	dispatch: React.Dispatch<EditAction>;
}) {
	return (
		<Field>
			<FieldLabel>{label}</FieldLabel>
			<FieldInput
				value={asString(row.values[field])}
				onChange={(e) =>
					dispatch({
						type: "updateRow",
						coll: "affiliations",
						id: row.id,
						field,
						value: e.target.value,
					})
				}
				placeholder={placeholder}
			/>
		</Field>
	);
}

function AffiliationInstitutionField({
	row,
	dispatch,
}: {
	row: Row;
	dispatch: React.Dispatch<EditAction>;
}) {
	const name = asString(row.values.institution_name);
	const keyword = useDebouncedValue(name.trim());
	const { data } = useQuery({
		queryKey: ["ref", "clinic", keyword],
		// signal로 이전 요청 취소(자모 검색은 매 입력마다 후보가 바뀜).
		queryFn: ({ signal }) => searchClinics({ keyword, limit: 20 }, signal),
		// 한글 자모 검색이라 최소 글자수 게이트 없음 — 빈 문자열만 스킵.
		enabled: keyword.length >= 1,
		staleTime: 60_000,
		placeholderData: keepPreviousData,
	});
	const items = data?.items ?? [];
	const options: AutocompleteOption[] = items.map((c) => ({
		value: String(c.no ?? c.hira_code ?? c.name ?? ""),
		label: c.name ?? "",
		description:
			[c.type_name, c.address].filter(Boolean).join(" · ") || undefined,
	}));
	function update(field: string, value: unknown) {
		dispatch({
			type: "updateRow",
			coll: "affiliations",
			id: row.id,
			field,
			value,
		});
	}
	return (
		<Field>
			<FieldLabel>근무 기관</FieldLabel>
			<Autocomplete
				options={options}
				value={name}
				onChange={(v) => {
					update("institution_name", v);
					update("ref_clinic_no", "");
				}}
				onSelect={(opt) => {
					const picked = items.find(
						(c: RefClinic) =>
							String(c.no ?? c.hira_code ?? c.name ?? "") === opt.value,
					);
					update("institution_name", picked?.name ?? opt.label);
					update("ref_clinic_no", picked?.no != null ? String(picked.no) : "");
				}}
				onManualEntry={() => {}}
				placeholder="병원을 검색하세요"
			/>
		</Field>
	);
}

function ScheduleGrid({
	row,
	dispatch,
}: {
	row: Row;
	dispatch: React.Dispatch<EditAction>;
}) {
	const schedule = asObject(row.values.schedule) ?? {};
	const grid = asObject(schedule.grid) ?? {};
	const note = asString(schedule.note);
	const bands = asObject(schedule.time_bands) ?? {};
	const weeks = Array.isArray(schedule.week_recurrence)
		? schedule.week_recurrence.filter((w): w is string => typeof w === "string")
		: [];
	const isOn = (day: string, band: string) =>
		asObject(grid[day])?.[band] === true;
	const toggle = (day: string, band: string, value: boolean) =>
		dispatch({ type: "setGrid", id: row.id, day, band, value });
	const setWeeks = (next: string[]) =>
		dispatch({ type: "setWeeks", id: row.id, weeks: next });
	const toggleWeek = (w: string) =>
		setWeeks(
			weeks.includes(w) ? weeks.filter((x) => x !== w) : [...weeks, w].sort(),
		);

	return (
		<div className="flex flex-col gap-4">
			<span className="text-sm font-medium text-body">진료 일정</span>

			{/* 진료 주기 — 비어 있으면 매주, 선택 시 해당 주차만 */}
			<div className="flex flex-col gap-2">
				<span className="text-xs text-body-soft">진료 주기</span>
				<div className="flex flex-wrap gap-2">
					<ToggleChip active={weeks.length === 0} onClick={() => setWeeks([])}>
						매주
					</ToggleChip>
					{WEEK_OPTIONS.map((w) => (
						<ToggleChip
							key={w}
							active={weeks.includes(w)}
							onClick={() => toggleWeek(w)}
						>
							{w}주차
						</ToggleChip>
					))}
				</div>
			</div>

			{/* 시간대 라벨(오전/오후) */}
			<div className="grid gap-3 sm:grid-cols-2">
				<Field>
					<FieldLabel>오전 시간대</FieldLabel>
					<FieldInput
						value={asString(bands.am)}
						onChange={(e) =>
							dispatch({
								type: "setBand",
								id: row.id,
								band: "am",
								value: e.target.value,
							})
						}
						placeholder="예: 09:00-13:00"
					/>
				</Field>
				<Field>
					<FieldLabel>오후 시간대</FieldLabel>
					<FieldInput
						value={asString(bands.pm)}
						onChange={(e) =>
							dispatch({
								type: "setBand",
								id: row.id,
								band: "pm",
								value: e.target.value,
							})
						}
						placeholder="예: 14:00-18:00"
					/>
				</Field>
			</div>

			{/* 데스크탑/태블릿: 보더 테이블 + 진료가능/휴진 알약 토글 */}
			<div className="hidden overflow-hidden rounded-xl border border-line-soft md:block">
				<table className="w-full border-collapse text-center text-sm">
					<thead>
						<tr className="bg-app-bg">
							<th className="border-b border-line-soft px-4 py-3 text-left font-medium text-body-soft">
								구분
							</th>
							{GRID_DAYS.map((d) => (
								<th
									key={d.key}
									className={cn(
										"border-b border-line-soft px-2 py-3 font-medium",
										d.key === "sun" ? "text-danger-strong" : "text-body",
									)}
								>
									{d.label}
								</th>
							))}
						</tr>
					</thead>
					<tbody className="[&>tr:last-child>td]:border-b-0">
						{GRID_BANDS.map((band) => (
							<tr key={band.key}>
								<td className="border-b border-line-soft px-4 py-3 text-left text-ink">
									{band.label}
								</td>
								{GRID_DAYS.map((day) => {
									const on = isOn(day.key, band.key);
									return (
										<td
											key={day.key}
											className="border-b border-line-soft px-2 py-3"
										>
											<button
												type="button"
												onClick={() => toggle(day.key, band.key, !on)}
												aria-pressed={on}
												aria-label={`${day.label} ${band.label}`}
												className={cn(
													"inline-flex min-w-[64px] items-center justify-center rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
													on
														? "bg-brand text-brand-foreground"
														: "bg-muted text-body-soft hover:bg-line-soft",
												)}
											>
												{on ? "진료가능" : "휴진"}
											</button>
										</td>
									);
								})}
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* 모바일: 요일 헤더 + 시간대별 체크박스 줄 */}
			<div className="flex flex-col gap-3 md:hidden">
				<div className="grid grid-cols-7 gap-1 px-1 text-center text-xs font-medium">
					{GRID_DAYS.map((d) => (
						<span
							key={d.key}
							className={d.key === "sun" ? "text-danger-strong" : "text-body"}
						>
							{d.label}
						</span>
					))}
				</div>
				{GRID_BANDS.map((band) => (
					<div
						key={band.key}
						className="flex flex-col gap-2 rounded-xl border border-line-soft p-2"
					>
						<div className="rounded-md bg-app-bg px-3 py-1.5 text-center text-xs font-medium text-body">
							{band.label}
						</div>
						<div className="grid grid-cols-7 gap-1 py-1">
							{GRID_DAYS.map((day) => {
								const on = isOn(day.key, band.key);
								return (
									<div key={day.key} className="flex justify-center">
										<Checkbox
											checked={on}
											onCheckedChange={(value) =>
												toggle(day.key, band.key, value === true)
											}
											aria-label={`${day.label} ${band.label}`}
											className="size-6 rounded-md [&_svg]:size-4"
										/>
									</div>
								);
							})}
						</div>
					</div>
				))}
			</div>

			<p className="text-xs text-muted-fg">
				※ 셀을 눌러 요일·시간대별 진료 여부(진료가능/휴진)를 설정하세요.
			</p>

			<Field>
				<FieldLabel>일정 비고</FieldLabel>
				<FieldInput
					value={note}
					onChange={(e) =>
						dispatch({
							type: "setScheduleNote",
							id: row.id,
							value: e.target.value,
						})
					}
					placeholder="예: 화요일 오후는 수술로 휴진"
				/>
			</Field>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────
// 소품
// ─────────────────────────────────────────────────────────────────────

type VisProps = { on: boolean; onToggle: () => void; label: string };

/** 라벨 + (선택) 공개/비공개 토글을 한 줄에 배치. */
function FieldHeader({ label, vis }: { label: string; vis?: VisProps }) {
	return (
		<div className="flex items-center justify-between gap-3">
			<FieldLabel>{label}</FieldLabel>
			{vis ? <VisibilityToggle {...vis} /> : null}
		</div>
	);
}

/** 기본정보 필드별 공개/비공개 토글(field_visibility). */
function VisibilityToggle({ on, onToggle, label }: VisProps) {
	return (
		<span className="flex shrink-0 items-center gap-1.5 text-xs font-medium">
			<span className={on ? "text-brand" : "text-muted-fg"}>
				{on ? "공개" : "비공개"}
			</span>
			<Switch
				size="sm"
				checked={on}
				onCheckedChange={onToggle}
				aria-label={`${label} 공개`}
			/>
		</span>
	);
}

/** 진료 주기 주차 선택용 알약 토글. */
function ToggleChip({
	active,
	onClick,
	children,
}: {
	active: boolean;
	onClick: () => void;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-pressed={active}
			className={cn(
				"rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
				active
					? "bg-brand text-brand-foreground"
					: "bg-muted text-body-soft hover:bg-line-soft",
			)}
		>
			{children}
		</button>
	);
}

function TextField({
	label,
	value,
	onChange,
	placeholder,
	vis,
}: {
	label: string;
	value: string;
	onChange: (v: string) => void;
	placeholder?: string;
	vis?: VisProps;
}) {
	return (
		<Field>
			<FieldHeader label={label} vis={vis} />
			<FieldInput
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
			/>
		</Field>
	);
}

function TextAreaField({
	label,
	value,
	onChange,
	vis,
}: {
	label: string;
	value: string;
	onChange: (v: string) => void;
	vis?: VisProps;
}) {
	return (
		<Field>
			<FieldHeader label={label} vis={vis} />
			<textarea
				value={value}
				onChange={(e) => onChange(e.target.value)}
				rows={3}
				aria-label={label}
				className="w-full rounded-lg border border-line bg-surface px-4 py-3 text-base text-ink outline-none transition-colors placeholder:text-muted-fg focus:border-brand"
			/>
		</Field>
	);
}

function RowToggle({
	label,
	checked,
	onChange,
}: {
	label: string;
	checked: boolean;
	onChange: (v: boolean) => void;
}) {
	return (
		<span className="flex items-center gap-2 text-sm text-ink">
			<Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
			{label}
		</span>
	);
}

// ─────────────────────────────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────────────────────────────

function asObject(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

function asString(value: unknown): string {
	if (typeof value === "string") return value;
	if (typeof value === "number") return String(value);
	return "";
}
