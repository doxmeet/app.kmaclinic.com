import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	AlertCircle,
	Camera,
	Check,
	ImageIcon,
	Loader2,
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
import { uploadFileToStorage } from "#/lib/upload.ts";
import { cn } from "#/lib/utils.ts";

/**
 * 의사 프로필 관리 — 실연동(문서 §6.10 / §8.11).
 * `GET /profile/me`로 단일 doc(코어 + id-키 컬렉션)을 로드해 폼에 바인딩하고,
 * "전체 저장" 시 편집 상태를 **JSON Merge Patch**로 `PATCH /profile/me` 한다.
 *  - 컬렉션 항목: 유지=전체 전송(order/is_public 포함), 삭제=`{id:null}`, 추가=새 id.
 *  - 미설정 컬렉션 필드는 보내지 않으므로(merge-patch) 서버의 다른 필드는 보존된다.
 */

// ─────────────────────────────────────────────────────────────────────
// 컬렉션 설정 — 문서 §6.10.3~6.10.9 필드명(ASCII 계약)에 맞춤.
// ─────────────────────────────────────────────────────────────────────

type FieldKind = "text" | "year" | "date" | "select" | "bool" | "ref";
/** ref 자동완성 소스(레지스트리 엔드포인트가 있는 것만). */
type RefSourceKey = "medical_school" | "society";
type ColField = {
	name: string;
	label: string;
	kind?: FieldKind;
	options?: { value: string; label: string }[];
	placeholder?: string;
	/** kind:"ref"일 때 — 선택 시 표시 텍스트(name)와 FK(noField)를 함께 저장. */
	ref?: { source: RefSourceKey; noField: string };
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
		{ value: "high_school", label: "고등학교" },
		{ value: "bachelor", label: "학사" },
		{ value: "master", label: "석사" },
		{ value: "doctorate", label: "박사" },
	],
	eduPath: [
		{ value: "direct", label: "정시/수시" },
		{ value: "transfer", label: "편입" },
		{ value: "graduate_school", label: "의전원" },
		{ value: "foreign", label: "외국/북한" },
	],
	highSchool: [
		{ value: "graduated", label: "졸업" },
		{ value: "ged", label: "검정고시" },
	],
	eduStatus: [
		{ value: "graduated", label: "졸업" },
		{ value: "attending", label: "재학" },
		{ value: "completed", label: "수료" },
		{ value: "dropped", label: "중퇴" },
	],
	license: [
		{ value: "doctor", label: "의사면허" },
		{ value: "specialist", label: "전문의" },
		{ value: "subspecialist", label: "분과/세부전문의" },
	],
	training: [
		{ value: "intern", label: "인턴" },
		{ value: "resident", label: "레지던트" },
		{ value: "fellow", label: "펠로우" },
	],
	career: [
		{ value: "hospital", label: "병원" },
		{ value: "postdoc", label: "포닥" },
	],
	membership: [
		{ value: "general", label: "일반" },
		{ value: "board", label: "임원" },
	],
	authorship: [
		{ value: "first", label: "제1저자" },
		{ value: "second", label: "제2저자" },
		{ value: "co", label: "공동" },
		{ value: "corresponding", label: "교신" },
	],
} as const;

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
				name: "education_path",
				label: "진학 경로",
				kind: "select",
				options: [...SELECT.eduPath],
			},
			{
				name: "high_school_type",
				label: "고교 구분",
				kind: "select",
				options: [...SELECT.highSchool],
			},
			{
				name: "school_name_text",
				label: "학교명",
				kind: "ref",
				ref: { source: "medical_school", noField: "medical_school_no" },
				placeholder: "의과대학을 검색하세요",
			},
			{ name: "major", label: "전공", placeholder: "예: 의학과" },
			{
				name: "official_degree",
				label: "공식 학위",
				placeholder: "예: 의학박사",
			},
			{ name: "start_year", label: "입학연도", kind: "year" },
			{ name: "graduation_year", label: "졸업연도", kind: "year" },
			{
				name: "status",
				label: "상태",
				kind: "select",
				options: [...SELECT.eduStatus],
			},
			{ name: "is_transfer", label: "편입", kind: "bool" },
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
				name: "specialty",
				label: "진료과/분과",
				placeholder: "예: 소화기내과",
			},
			{ name: "license_number", label: "면허번호" },
			{ name: "acquired_at", label: "취득일", kind: "date" },
			{ name: "specialist_number", label: "전문의 번호" },
			{
				name: "cert_name",
				label: "인증서명",
				placeholder: "예: 내시경 인증의",
			},
			{ name: "cert_number", label: "인증 번호" },
			{ name: "issuing_society", label: "발급 학회" },
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
				placeholder: "예: 서울아산병원",
			},
			{ name: "department", label: "진료과" },
			{ name: "subspecialty", label: "세부 전공" },
			{ name: "start_date", label: "시작일", kind: "date" },
			{ name: "end_date", label: "종료일", kind: "date" },
			{ name: "is_current", label: "수련 중", kind: "bool" },
		],
	},
	{
		key: "career",
		title: "경력",
		addLabel: "경력 추가",
		fields: [
			{
				name: "career_type",
				label: "구분",
				kind: "select",
				options: [...SELECT.career],
			},
			{ name: "org_name", label: "기관명", placeholder: "예: 서울대학교병원" },
			{ name: "title", label: "직위", placeholder: "예: 대표원장" },
			{ name: "department", label: "진료과" },
			{ name: "start_date", label: "시작일", kind: "date" },
			{ name: "end_date", label: "종료일", kind: "date" },
			{ name: "is_current", label: "재직 중", kind: "bool" },
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
			{
				name: "membership_type",
				label: "회원 구분",
				kind: "select",
				options: [...SELECT.membership],
			},
			{ name: "grade", label: "회원 등급", placeholder: "예: 정회원" },
			{ name: "role", label: "역할" },
			{ name: "position", label: "직위/직책", placeholder: "예: 이사" },
			{
				name: "research_group",
				label: "연구회/분과",
				placeholder: "예: 췌담도 연구회",
			},
			{ name: "since_year", label: "가입연도", kind: "year" },
			{ name: "term_start_year", label: "임기 시작연도", kind: "year" },
			{ name: "term_end_year", label: "임기 종료연도", kind: "year" },
			{ name: "is_current", label: "활동 중", kind: "bool" },
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

// 프로필 공개 템플릿(template_key) — green/purple/mono/blue 4종.
const TEMPLATE_OPTIONS = [
	{ value: "blue", label: "블루", desc: "기본형 · 신뢰감 있는 정통 레이아웃" },
	{ value: "green", label: "그린", desc: "그린 톤 · 친근하고 편안한 느낌" },
	{ value: "purple", label: "퍼플", desc: "퍼플 포인트 · 세련된 전문가형" },
	{ value: "mono", label: "모노", desc: "모노 · 미니멀하고 정돈된 스타일" },
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

/** 코어 스칼라 키 — 저장 시 항상 전송하는 사용자 편집 필드. */
const CORE_KEYS = [
	"display_name",
	"name_en",
	"gender",
	"birth_date",
	"headline",
	"primary_department_text",
	"specialty_text",
	"intro_text",
	"media_text",
	"etc_text",
	"contact_phone",
	"contact_email",
	"naver_url",
	"kakao_url",
	"orcid_id",
	"template_key",
	"photo_url",
	"cover_url",
] as const;
type CoreKey = (typeof CORE_KEYS)[number];

// 각 토글이 가리는 섹션/필드 라벨과 일치시킨다(문서 §6.10.1 field_visibility 매핑).
const VISIBILITY_KEYS: { key: string; label: string }[] = [
	{ key: "specialty", label: "전문 진료 분야" },
	{ key: "etc", label: "기타" },
	{ key: "photo", label: "프로필 사진" },
	{ key: "contact", label: "연락처" },
	{ key: "media", label: "방송 출연 및 언론 보도" },
	{ key: "schedule", label: "소속 병원·진료 일정" },
];

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
	return Object.fromEntries(VISIBILITY_KEYS.map((v) => [v.key, true]));
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
					[action.key]: !state.visibility[action.key],
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

/** schedule 하위 스칼라 필드(note 등) 설정. */
function setScheduleField(row: Row, field: string, value: unknown): Row {
	const schedule = asObject(row.values.schedule) ?? {};
	return {
		...row,
		values: { ...row.values, schedule: { ...schedule, [field]: value } },
	};
}

/** doc → 편집 상태(컬렉션은 order 정렬한 행 배열로 평탄화). */
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

/** id-키 컬렉션 객체 → order 정렬 행 배열. */
function rowsOf(coll: unknown): Row[] {
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

/** 설정된 필드가 모두 비어 있는 신규 행인지(빈 행 생성 방지). */
function isRowEmpty(row: Row, fields: ColField[]): boolean {
	return fields.every((f) => {
		if (f.kind === "bool") return true;
		const v = row.values[f.name];
		return v == null || (typeof v === "string" && v.trim() === "");
	});
}

/** 컬렉션 행 → 저장 항목(설정 필드 + order + is_public[+is_confirmed]). */
function buildItem(
	row: Row,
	index: number,
	config: CollConfig,
): Record<string, unknown> {
	const item: Record<string, unknown> = {
		order: index,
		is_public: row.values.is_public !== false,
	};
	for (const f of config.fields) {
		item[f.name] =
			f.kind === "year"
				? numOrNull(row.values[f.name])
				: f.kind === "bool"
					? row.values[f.name] === true
					: textOrNull(row.values[f.name]);
		// ref 필드는 표시 텍스트와 함께 FK(noField)도 전송(미선택/직접입력 시 null).
		if (f.kind === "ref" && f.ref) {
			item[f.ref.noField] = numOrNull(row.values[f.ref.noField]);
		}
	}
	return item;
}

/** 소속병원 행 → 저장 항목(institution/ref_clinic_no/일정 포함). */
function buildAffiliation(row: Row, index: number): Record<string, unknown> {
	const schedule = asObject(row.values.schedule) ?? {};
	return {
		order: index,
		is_public: row.values.is_public !== false,
		institution_name: textOrNull(row.values.institution_name),
		ref_clinic_no: numOrNull(row.values.ref_clinic_no),
		title: textOrNull(row.values.title),
		department: textOrNull(row.values.department),
		join_date: textOrNull(row.values.join_date),
		role: textOrNull(row.values.role),
		// schedule.grid는 요일×{am,pm} boolean, note는 일정 전체 비고(문서 모델).
		schedule: {
			grid: normalizeGrid(schedule.grid),
			note: textOrNull(schedule.note),
		},
	};
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
	build: (row: Row, index: number) => Record<string, unknown>,
	isEmpty: (row: Row) => boolean,
): Record<string, unknown> {
	const sub: Record<string, unknown> = {};
	let index = 0;
	for (const row of rows) {
		if (row.deleted) {
			if (!row.isNew) sub[row.id] = null;
			continue;
		}
		if (row.isNew && isEmpty(row)) continue;
		sub[row.id] = build(row, index);
		index += 1;
	}
	return sub;
}

/** 편집 상태 → JSON Merge Patch(문서 §8.11.1). */
function buildPatch(state: EditState): ProfilePatch {
	const patch: ProfilePatch = {};
	for (const key of CORE_KEYS) patch[key] = textOrNull(state.core[key]);
	patch.primary_department_no = numOrNull(state.primaryDepartmentNo);
	patch.specialty_tags = state.specialtyTags;
	patch.field_visibility = state.visibility;

	for (const config of COLLECTIONS) {
		const sub = collectionPatch(
			state.colls[config.key],
			(row, index) => buildItem(row, index, config),
			(row) => isRowEmpty(row, config.fields),
		);
		if (Object.keys(sub).length > 0) patch[config.key] = sub;
	}

	const aff = collectionPatch(
		state.affiliations,
		buildAffiliation,
		(row) =>
			textOrNull(row.values.institution_name) == null &&
			numOrNull(row.values.ref_clinic_no) == null,
	);
	if (Object.keys(aff).length > 0) patch.affiliations = aff;

	return patch;
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

	const saveMutation = useMutation({
		mutationFn: () => patchProfile(buildPatch(state)),
		onSuccess: (updated) => {
			queryClient.setQueryData(["profile", "me"], updated);
			queryClient.invalidateQueries({ queryKey: ["profile", "completion"] });
			toast.success("프로필을 저장했어요.");
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

	return (
		<AppShell
			userName={userName}
			maxWidth="1280px"
			innerMaxWidth="720px"
			bottomBar={
				<StickyActionBar
					className="shadow-[0_-6px_20px_-8px_rgba(15,39,68,0.18)]"
					right={
						<Button
							variant="brand"
							size="2xl"
							className="px-8 font-semibold"
							disabled={saveMutation.isPending}
							onClick={() => saveMutation.mutate()}
						>
							{saveMutation.isPending ? (
								<Loader2 className="size-5 animate-spin" />
							) : (
								<Save className="size-5" />
							)}
							프로필 저장
						</Button>
					}
				/>
			}
		>
			<div className="flex flex-col gap-6">
				<ProfileHeader completion={completionPercent} />

				<PhotoSection state={state} dispatch={dispatch} />
				<BasicInfoSection state={state} dispatch={dispatch} />
				<TemplateSection state={state} dispatch={dispatch} />
				<VisibilitySection state={state} dispatch={dispatch} />

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

/** 공개 프로필 시안(template_key) — 병원 시안 선택과 동일한 카드 타일 스타일. */
function TemplateSection({
	state,
	dispatch,
}: {
	state: EditState;
	dispatch: React.Dispatch<EditAction>;
}) {
	const current = state.core.template_key || "blue";
	return (
		<SectionCard className="flex flex-col gap-5">
			<SectionTitle>공개 프로필 시안</SectionTitle>
			<div className="grid grid-cols-2 gap-3">
				{TEMPLATE_OPTIONS.map((t) => {
					const selected = current === t.value;
					return (
						<button
							key={t.value}
							type="button"
							onClick={() =>
								dispatch({
									type: "setCore",
									key: "template_key",
									value: t.value,
								})
							}
							className={cn(
								"flex flex-col gap-1.5 rounded-xl border p-5 text-left transition-colors",
								selected
									? "border-brand bg-brand-50 ring-1 ring-brand"
									: "border-line hover:border-line-strong",
							)}
						>
							<div className="flex items-center justify-between gap-2">
								<span className="text-base font-semibold text-ink">
									{t.label}
								</span>
								{selected ? (
									<span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground">
										<Check className="size-4" />
									</span>
								) : null}
							</div>
							<span className="text-sm text-body-soft">{t.desc}</span>
						</button>
					);
				})}
			</div>
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
	const [uploading, setUploading] = useState<"photo" | "cover" | null>(null);
	const photoUrl = state.core.photo_url;

	async function pick(
		e: React.ChangeEvent<HTMLInputElement>,
		key: "photo_url" | "cover_url",
	) {
		const file = e.target.files?.[0];
		e.target.value = "";
		if (!file) return;
		setUploading(key === "photo_url" ? "photo" : "cover");
		try {
			const url = await uploadFileToStorage(file, "profile");
			dispatch({ type: "setCore", key, value: url });
		} catch {
			toast.error("이미지 업로드에 실패했습니다.");
		} finally {
			setUploading(null);
		}
	}

	const coverUrl = state.core.cover_url;

	return (
		<SectionCard className="flex flex-col gap-8">
			<SectionTitle>프로필 사진 · 배너</SectionTitle>

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

			{/* 상단 배너 — 가로형(16:5) 미리보기, 별도 줄 */}
			<div className="flex flex-col gap-3">
				<span className="text-sm font-medium text-body">상단 배너</span>
				<div className="flex aspect-16/5 w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-line-strong bg-muted text-body-soft">
					{coverUrl ? (
						<img
							src={coverUrl}
							alt="상단 배너 미리보기"
							className="size-full object-cover"
						/>
					) : (
						<ImageIcon className="size-7" />
					)}
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<div className="flex flex-wrap gap-2 sm:ml-auto">
						<PhotoUploadButton
							label={coverUrl ? "배너 변경" : "배너 업로드"}
							uploading={uploading === "cover"}
							onPick={(e) => pick(e, "cover_url")}
						/>
						{coverUrl ? (
							<Button
								variant="neutral-outline"
								size="2xl"
								onClick={() =>
									dispatch({ type: "setCore", key: "cover_url", value: "" })
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
	return (
		<SectionCard className="flex flex-col gap-6">
			<SectionTitle>기본 정보</SectionTitle>
			<TextField
				label="성명"
				value={state.core.display_name}
				onChange={set("display_name")}
			/>
			<TextField
				label="영문 성명"
				value={state.core.name_en}
				onChange={set("name_en")}
			/>
			<Field>
				<FieldLabel>성별</FieldLabel>
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
			/>
			<TextField
				label="한 줄 소개(헤드라인)"
				value={state.core.headline}
				onChange={set("headline")}
				placeholder="예: 대표원장 · 소화기내과 전문의"
			/>
			<PrimaryDepartmentField state={state} dispatch={dispatch} />
			<TextField
				label="전문 진료 분야(설명)"
				value={state.core.specialty_text}
				onChange={set("specialty_text")}
				placeholder="예: 내시경, 위·대장 질환"
			/>
			<SpecialtyTagsField state={state} dispatch={dispatch} />
			<TextAreaField
				label="자기소개"
				value={state.core.intro_text}
				onChange={set("intro_text")}
			/>
			<TextAreaField
				label="방송 출연 및 언론 보도"
				value={state.core.media_text}
				onChange={set("media_text")}
			/>
			<TextAreaField
				label="기타"
				value={state.core.etc_text}
				onChange={set("etc_text")}
			/>
			<TextField
				label="연락처 전화"
				value={state.core.contact_phone}
				onChange={set("contact_phone")}
				placeholder="예: 02-123-4567"
			/>
			<TextField
				label="연락처 이메일"
				value={state.core.contact_email}
				onChange={set("contact_email")}
				placeholder="예: doctor@example.com"
			/>
			<TextField
				label="네이버 링크"
				value={state.core.naver_url}
				onChange={set("naver_url")}
				placeholder="https://"
			/>
			<TextField
				label="카카오 링크"
				value={state.core.kakao_url}
				onChange={set("kakao_url")}
				placeholder="https://"
			/>
			<TextField
				label="ORCID iD"
				value={state.core.orcid_id}
				onChange={set("orcid_id")}
				placeholder="0000-0000-0000-0000"
			/>
		</SectionCard>
	);
}

/** 대표 진료과 — /ref/department 자동완성(선택 시 no, 자유입력 시 text만). */
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
				목록에서 고르면 표준 진료과로 저장되고, 없으면 직접 입력됩니다.
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
			<FieldLabel>주요 전문 진료 분야 (최대 5개)</FieldLabel>
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

function VisibilitySection({
	state,
	dispatch,
}: {
	state: EditState;
	dispatch: React.Dispatch<EditAction>;
}) {
	return (
		<SectionCard className="flex flex-col gap-5">
			<SectionTitle>공개 항목 설정</SectionTitle>
			<FieldDescription>
				끄면 공개 프로필(kmadoc.com)에서 해당 항목이 숨겨집니다.
			</FieldDescription>
			<div className="grid gap-3">
				{VISIBILITY_KEYS.map((v) => (
					<div
						key={v.key}
						className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 text-base text-ink"
					>
						<span>{v.label}</span>
						<Switch
							checked={state.visibility[v.key] !== false}
							onCheckedChange={() =>
								dispatch({ type: "toggleVisibility", key: v.key })
							}
							aria-label={`${v.label} 공개`}
						/>
					</div>
				))}
			</div>
		</SectionCard>
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
							{config.fields.map((f) => (
								<CollField
									key={f.name}
									field={f}
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
							))}
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
	value,
	setField,
}: {
	field: ColField;
	value: unknown;
	setField: (name: string, value: unknown) => void;
}) {
	const str = asString(value);
	if (field.kind === "bool") {
		return (
			<Field>
				<FieldLabel>{field.label}</FieldLabel>
				<div className="flex h-10 items-center">
					<Switch
						checked={value === true}
						onCheckedChange={(v) => setField(field.name, v === true)}
						aria-label={field.label}
					/>
				</div>
			</Field>
		);
	}
	if (field.kind === "ref" && field.ref) {
		const ref = field.ref;
		return (
			<Field>
				<FieldLabel>{field.label}</FieldLabel>
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
			<FieldLabel>{field.label}</FieldLabel>
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
						(field.kind === "date"
							? "YYYY-MM-DD"
							: field.kind === "year"
								? "예: 2020"
								: undefined)
					}
					inputMode={field.kind === "year" ? "numeric" : undefined}
				/>
			)}
		</Field>
	);
}

/** 소속병원(affiliations) — 병원 검색 + 진료 일정 그리드. */
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
								field="join_date"
								label="입사일"
								placeholder="YYYY-MM-DD"
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
		queryFn: () => searchClinics({ keyword, limit: 20 }),
		enabled: keyword.length >= 2,
		staleTime: 60_000,
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
	const isOn = (day: string, band: string) =>
		asObject(grid[day])?.[band] === true;
	const toggle = (day: string, band: string, value: boolean) =>
		dispatch({ type: "setGrid", id: row.id, day, band, value });

	return (
		<div className="flex flex-col gap-3">
			<span className="text-sm font-medium text-body">진료 일정</span>

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

function TextField({
	label,
	value,
	onChange,
	placeholder,
}: {
	label: string;
	value: string;
	onChange: (v: string) => void;
	placeholder?: string;
}) {
	return (
		<Field>
			<FieldLabel>{label}</FieldLabel>
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
}: {
	label: string;
	value: string;
	onChange: (v: string) => void;
}) {
	return (
		<Field>
			<FieldLabel>{label}</FieldLabel>
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
