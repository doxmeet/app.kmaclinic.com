import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Check, Loader2, Plus, Trash2, X } from "lucide-react";
import {
	useEffect,
	useEffectEvent,
	useId,
	useReducer,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import { AuthGuard } from "#/components/auth/auth-guard.tsx";
import { InfoCallout } from "#/components/common/info-callout.tsx";
import {
	SectionCard,
	SectionTitle,
} from "#/components/common/section-card.tsx";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "#/components/form/field.tsx";
import { FieldInput } from "#/components/form/field-input.tsx";
import { OptionButton, OptionGroup } from "#/components/form/option-group.tsx";
import { FieldSelect } from "#/components/form/select-field.tsx";
import { AppShell } from "#/components/layout/app-shell.tsx";
import { CommitComplete } from "#/components/onboarding/commit-complete.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import {
	type CommitResult,
	type DirectOnboardingInput,
	directOnboarding,
	type PaymentIntent,
	patchDraft,
	startSession,
} from "#/lib/api/onboarding.ts";
import { toastApiError } from "#/lib/api-error-message.ts";
import { useSession } from "#/lib/auth/use-session.ts";
import { uploadFileToStorage } from "#/lib/upload.ts";
import { cn } from "#/lib/utils.ts";

/**
 * 일괄(직접) 입력 온보딩 — 문서 §8.3 `POST /onboarding/direct`.
 * 대화형 온보딩(`/onboarding`)과 달리, 전체 정보를 한 폼으로 받아 한 요청에 즉시
 * 프로필(+병원)을 생성한다. 성공 결과(무료 완료/toss 결제)는 대화형과 동일하게
 * `CommitComplete` 가 처리한다.
 */
export function DirectOnboardingPage() {
	return (
		<AuthGuard>
			<DirectOnboardingForm />
		</AuthGuard>
	);
}

// ─────────────────────────────────────────────────────────────────────
// 폼 상태 타입
// ─────────────────────────────────────────────────────────────────────

const LOGIN_ID_HINT = "영문 소문자·숫자 4~20자";
const LOGIN_ID_RE = /^[a-z0-9]{4,20}$/;

/**
 * 디자인 시안(template_key) — wildcard.kmaclinic.com `components/templates` 규약(t1~t5)과 동일.
 * 키/라벨/설명을 그대로 가져옴(미지정/`default` → 시안1 폴백).
 */
const TEMPLATES: { key: string; label: string; desc: string }[] = [
	{ key: "t1", label: "시안 1", desc: "기본형 · 신뢰감 있는 정통 레이아웃" },
	{ key: "t2", label: "시안 2", desc: "그린 톤 · 친근한 동네 병원형" },
	{ key: "t3", label: "시안 3", desc: "와이드 · 종합병원형 풀스크린" },
	{ key: "t4", label: "시안 4", desc: "모노 · 미니멀 클리닉형" },
	{ key: "t5", label: "시안 5", desc: "포인트 컬러 · 캠페인/이벤트 강조형" },
];

// 학위/면허/수련 구분 enum — wildcard.kmadoc.com `entity-configs.ts`(프로필 subentity 스키마) 기준.
const DEGREE_TYPES = [
	{ value: "high_school", label: "고등학교" },
	{ value: "bachelor", label: "학사" },
	{ value: "master", label: "석사" },
	{ value: "doctorate", label: "박사" },
];
const LICENSE_TYPES = [
	{ value: "doctor", label: "의사면허" },
	{ value: "specialist", label: "전문의" },
	{ value: "subspecialist", label: "분과/세부전문의" },
];
const TRAINING_TYPES = [
	{ value: "intern", label: "인턴" },
	{ value: "resident", label: "레지던트" },
	{ value: "fellow", label: "펠로우" },
];

/** 반복 입력 행의 필드 서술자(generic subentity 에디터용). */
type RowFieldDef = {
	name: string;
	placeholder: string;
	kind?: "text" | "year" | "select";
	options?: { value: string; label: string }[];
};

/**
 * 프로필 subentity 정의(문서 §8.3 `subentities`). 순서·필드명은
 * wildcard.kmadoc.com `entity-configs.ts`(저장 스키마)를 따른다.
 * education/career 는 기존 폼(문서 예시 필드명)을 유지하고 degree_type 만 추가.
 * schedule 의 주간 그리드(grid)는 별도 편집기 영역이라 여기선 기관/역할만 받는다.
 */
const SUBENTITIES: {
	key: string;
	title: string;
	addLabel: string;
	fields: RowFieldDef[];
}[] = [
	{
		key: "education",
		title: "학력",
		addLabel: "학력 추가",
		fields: [
			{
				name: "degree_type",
				placeholder: "학위",
				kind: "select",
				options: DEGREE_TYPES,
			},
			{ name: "official_degree", placeholder: "학위명 (예: 의학박사)" },
			{
				name: "graduation_year",
				placeholder: "졸업연도 (예: 2013)",
				kind: "year",
			},
		],
	},
	{
		key: "license",
		title: "면허·자격",
		addLabel: "면허/자격 추가",
		fields: [
			{
				name: "license_type",
				placeholder: "구분",
				kind: "select",
				options: LICENSE_TYPES,
			},
			{ name: "specialty", placeholder: "진료과/분과" },
			{ name: "license_number", placeholder: "면허번호" },
		],
	},
	{
		key: "training",
		title: "수련",
		addLabel: "수련 추가",
		fields: [
			{
				name: "training_type",
				placeholder: "구분",
				kind: "select",
				options: TRAINING_TYPES,
			},
			{ name: "hospital_name", placeholder: "병원명" },
			{ name: "department", placeholder: "진료과" },
		],
	},
	{
		key: "career",
		title: "경력",
		addLabel: "경력 추가",
		fields: [
			{ name: "institution_name", placeholder: "기관명 (예: 행복내과의원)" },
			{ name: "role", placeholder: "역할 (예: 원장)" },
			{ name: "start_year", placeholder: "시작연도 (예: 2018)", kind: "year" },
		],
	},
	{
		key: "society",
		title: "학회",
		addLabel: "학회 추가",
		fields: [
			{ name: "name_text", placeholder: "학회명" },
			{ name: "position", placeholder: "직위 (예: 정회원, 이사)" },
		],
	},
	{
		key: "paper",
		title: "논문",
		addLabel: "논문 추가",
		fields: [
			{ name: "title", placeholder: "논문 제목" },
			{ name: "journal", placeholder: "학술지" },
			{ name: "pub_year", placeholder: "발행연도", kind: "year" },
		],
	},
	{
		key: "schedule",
		title: "진료 일정",
		addLabel: "근무 기관 추가",
		fields: [
			{ name: "institution_name", placeholder: "근무 기관" },
			{ name: "role", placeholder: "역할 (예: 본원)" },
		],
	},
];

/** 빈 subentity 행 맵(섹션 키 → 빈 배열). */
function emptySubRows(): Record<string, Record<string, string>[]> {
	return Object.fromEntries(SUBENTITIES.map((s) => [s.key, []]));
}

type TreatmentRow = {
	id: string;
	name: string;
	price_info: string;
	description: string;
};

// ─────────────────────────────────────────────────────────────────────
// 진입/세션 상태 묶음 — 복원 가드·결제 복귀·이어하기 안내·성공 결과를
// 하나의 reducer로 통합(서로 연관된 화면 전환 슬라이스).
// ─────────────────────────────────────────────────────────────────────

type SessionState = {
	result: CommitResult | null;
	restoring: boolean;
	pendingPayment: PaymentIntent | null;
	restoredNotice: boolean;
};

const INITIAL_SESSION: SessionState = {
	result: null,
	restoring: true,
	pendingPayment: null,
	restoredNotice: false,
};

type SessionAction =
	| { type: "setResult"; value: CommitResult | null }
	| { type: "setRestoring"; value: boolean }
	| { type: "setPendingPayment"; value: PaymentIntent | null }
	| { type: "setRestoredNotice"; value: boolean };

function sessionReducer(
	state: SessionState,
	action: SessionAction,
): SessionState {
	switch (action.type) {
		case "setResult":
			return { ...state, result: action.value };
		case "setRestoring":
			return { ...state, restoring: action.value };
		case "setPendingPayment":
			return { ...state, pendingPayment: action.value };
		case "setRestoredNotice":
			return { ...state, restoredNotice: action.value };
		default:
			return state;
	}
}

// ─────────────────────────────────────────────────────────────────────
// 업로드 상태 묶음 — 로고/사진 URL·진행중 플래그를 하나의 reducer로 통합.
// ─────────────────────────────────────────────────────────────────────

type UploadsState = {
	logoUrl: string;
	logoUploading: boolean;
	photos: string[];
	photosUploading: boolean;
};

const INITIAL_UPLOADS: UploadsState = {
	logoUrl: "",
	logoUploading: false,
	photos: [],
	photosUploading: false,
};

type UploadsAction =
	| { type: "setLogoUrl"; value: string }
	| { type: "setLogoUploading"; value: boolean }
	| { type: "setPhotos"; value: string[] }
	| { type: "addPhotos"; value: string[] }
	| { type: "removePhoto"; url: string }
	| { type: "setPhotosUploading"; value: boolean };

function uploadsReducer(
	state: UploadsState,
	action: UploadsAction,
): UploadsState {
	switch (action.type) {
		case "setLogoUrl":
			return { ...state, logoUrl: action.value };
		case "setLogoUploading":
			return { ...state, logoUploading: action.value };
		case "setPhotos":
			return { ...state, photos: action.value };
		case "addPhotos":
			return { ...state, photos: [...state.photos, ...action.value] };
		case "removePhoto":
			return {
				...state,
				photos: state.photos.filter((p) => p !== action.url),
			};
		case "setPhotosUploading":
			return { ...state, photosUploading: action.value };
		default:
			return state;
	}
}

// ─────────────────────────────────────────────────────────────────────
// 텍스트 입력 필드 묶음 — 개별 useState 다발을 하나의 reducer로 통합.
// (프로필/병원/관리자의 단순 문자열 필드만 포함. 파일/배열/세션 상태는 별도 useState.)
// ─────────────────────────────────────────────────────────────────────

type FieldsState = {
	displayName: string;
	headline: string;
	primaryDepartment: string;
	specialty: string;
	hospitalName: string;
	roadAddress: string;
	mainPhone: string;
	customerCenterPhone: string;
	hoursWeekday: string;
	hoursSaturday: string;
	hoursSunday: string;
	templateKey: string;
	snsInstagram: string;
	snsFacebook: string;
	snsYoutube: string;
	snsBlog: string;
	snsKakao: string;
	snsX: string;
	adminLoginId: string;
	adminName: string;
	adminPassword: string;
	adminPasswordConfirm: string;
};

const INITIAL_FIELDS: FieldsState = {
	displayName: "",
	headline: "",
	primaryDepartment: "",
	specialty: "",
	hospitalName: "",
	roadAddress: "",
	mainPhone: "",
	customerCenterPhone: "",
	hoursWeekday: "",
	hoursSaturday: "",
	hoursSunday: "",
	templateKey: "t1",
	snsInstagram: "",
	snsFacebook: "",
	snsYoutube: "",
	snsBlog: "",
	snsKakao: "",
	snsX: "",
	adminLoginId: "",
	adminName: "",
	adminPassword: "",
	adminPasswordConfirm: "",
};

type FieldsAction =
	| { type: "set"; field: keyof FieldsState; value: string }
	| { type: "merge"; values: Partial<FieldsState> };

function fieldsReducer(state: FieldsState, action: FieldsAction): FieldsState {
	switch (action.type) {
		case "set":
			return { ...state, [action.field]: action.value };
		case "merge":
			return { ...state, ...action.values };
		default:
			return state;
	}
}

// ─────────────────────────────────────────────────────────────────────
// 파생 검증 — 입력값에서 제출 가능/에러 플래그를 계산(render 중 호출, 순수).
// ─────────────────────────────────────────────────────────────────────

function deriveValidation(input: {
	effectiveOwnerChoice: "" | "false" | "true";
	isClinicOwner: boolean;
	displayName: string;
	hospitalName: string;
	adminLoginId: string;
	adminPassword: string;
	adminPasswordConfirm: string;
	logoUploading: boolean;
	photosUploading: boolean;
}) {
	const {
		effectiveOwnerChoice,
		isClinicOwner,
		displayName,
		hospitalName,
		adminLoginId,
		adminPassword,
		adminPasswordConfirm,
		logoUploading,
		photosUploading,
	} = input;
	const loginIdInvalid =
		adminLoginId.length > 0 && !LOGIN_ID_RE.test(adminLoginId);
	// login_id 입력 시 비밀번호 필수(문서 §8.3 ERROR_400_ADMIN_PASSWORD_REQUIRED).
	const passwordRequired = adminLoginId.length > 0;
	const passwordMismatch =
		adminPasswordConfirm.length > 0 && adminPassword !== adminPasswordConfirm;
	const passwordMissing = passwordRequired && adminPassword.length === 0;
	const canSubmit =
		effectiveOwnerChoice !== "" &&
		displayName.trim().length > 0 &&
		(!isClinicOwner || hospitalName.trim().length > 0) &&
		!loginIdInvalid &&
		!passwordMismatch &&
		!passwordMissing &&
		!logoUploading &&
		!photosUploading;
	return {
		loginIdInvalid,
		passwordRequired,
		passwordMismatch,
		passwordMissing,
		canSubmit,
	};
}

// ─────────────────────────────────────────────────────────────────────
// 페이로드/드래프트 빌더 — 폼 입력 스냅샷에서 §8.3 요청 본문을 만드는 순수 함수.
// 컴포넌트 본문에서 분리해 module scope에 둔다(상태 의존 없이 입력만 받음).
// ─────────────────────────────────────────────────────────────────────

type FormInput = {
	isClinicOwner: boolean;
	fields: FieldsState;
	subRows: Record<string, Record<string, string>[]>;
	departments: string[];
	treatments: TreatmentRow[];
	logoUrl: string;
	photos: string[];
};

function buildPayload(input: FormInput): DirectOnboardingInput {
	const {
		isClinicOwner,
		fields,
		subRows,
		departments,
		treatments,
		logoUrl,
		photos,
	} = input;
	const payload: DirectOnboardingInput = {
		is_clinic_owner: isClinicOwner,
	};

	// 의사 프로필 — 채워진 값만
	const profile = omitEmpty({
		display_name: fields.displayName.trim(),
		headline: fields.headline.trim(),
		primary_department_text: fields.primaryDepartment.trim(),
		specialty_text: fields.specialty.trim(),
	});
	if (Object.keys(profile).length > 0) payload.profile = profile;

	// 프로필 subentity(학력·면허·수련·경력·학회·논문·일정) — 프로필/병원 공통(선택).
	const subentities: Record<string, unknown> = {};
	for (const section of SUBENTITIES) {
		// 채워진 필드를 한 번에 추리고(빈 행 제거) 단일 패스로 누적.
		const list: Record<string, unknown>[] = [];
		for (const row of subRows[section.key] ?? []) {
			const out: Record<string, unknown> = {};
			for (const field of section.fields) {
				const raw = (row[field.name] ?? "").trim();
				if (!raw) continue;
				const value = field.kind === "year" ? toYear(raw) : raw;
				if (value !== undefined) out[field.name] = value;
			}
			if (Object.keys(out).length > 0) list.push(out);
		}
		if (list.length > 0) subentities[section.key] = list;
	}
	if (Object.keys(subentities).length > 0) payload.subentities = subentities;

	// 병원 미선택이면 병원 관련 필드는 모두 제외
	if (!isClinicOwner) return payload;

	// 병원 정보
	const businessHours = omitEmpty({
		weekday: fields.hoursWeekday.trim(),
		saturday: fields.hoursSaturday.trim(),
		sunday: fields.hoursSunday.trim(),
	});
	const snsLinks = omitEmpty({
		instagram: fields.snsInstagram.trim(),
		facebook: fields.snsFacebook.trim(),
		youtube: fields.snsYoutube.trim(),
		blog: fields.snsBlog.trim(),
		kakao_channel: fields.snsKakao.trim(),
		x: fields.snsX.trim(),
	});
	const hospital: Record<string, unknown> = omitEmpty({
		name: fields.hospitalName.trim(),
		road_address: fields.roadAddress.trim(),
		main_phone: fields.mainPhone.trim(),
		customer_center_phone: fields.customerCenterPhone.trim(),
		// 문서 §8.3: 병원 디자인 시안은 `template_key`(t1~t5) 컬럼으로 전달.
		template_key: fields.templateKey,
		logo_url: logoUrl,
	});
	if (Object.keys(businessHours).length > 0)
		hospital.business_hours = businessHours;
	if (Object.keys(snsLinks).length > 0) hospital.sns_links = snsLinks;
	if (Object.keys(hospital).length > 0) payload.hospital = hospital;

	// 병원 관리자
	const hospitalAdmin = omitEmpty({
		login_id: fields.adminLoginId.trim(),
		name: fields.adminName.trim(),
	});
	if (Object.keys(hospitalAdmin).length > 0) {
		payload.hospital_admin = hospitalAdmin;
	}
	if (
		fields.adminLoginId.trim().length > 0 &&
		fields.adminPassword.length > 0
	) {
		payload.hospital_admin_password = fields.adminPassword;
	}

	// 진료과목
	if (departments.length > 0) payload.departments = departments;

	// 비급여 항목
	const treatmentList = treatments
		.map((row) =>
			omitEmpty({
				name: row.name.trim(),
				price_info: row.price_info.trim(),
				description: row.description.trim(),
			}),
		)
		.filter((row) => row.name != null);
	if (treatmentList.length > 0) payload.treatments = treatmentList;

	// 병원 사진
	if (photos.length > 0) payload.photos = photos;

	return payload;
}

/**
 * 자동저장용 draft 직렬화 — buildPayload와 동일하되 **비밀번호 제외**.
 * hospital_admin은 {login_id, name}만 담는다(이미 buildPayload도 동일).
 * PATCH /onboarding/session/draft 는 부분 머지이므로 채워진 값만 보낸다.
 */
function buildDraft(input: FormInput): Record<string, unknown> {
	const draft = buildPayload(input) as Record<string, unknown>;
	// 안전장치: 비밀번호는 어떤 경우에도 draft에 포함하지 않는다.
	delete draft.hospital_admin_password;
	return draft;
}

// ─────────────────────────────────────────────────────────────────────
// 저장된 draft 프리필 — buildDraft의 역방향. 디스패처/세터만 받아 module scope에서 수행.
// ─────────────────────────────────────────────────────────────────────

type PrefillHandlers = {
	setOwnerChoice: React.Dispatch<React.SetStateAction<"" | "false" | "true">>;
	dispatchFields: React.Dispatch<FieldsAction>;
	dispatchUploads: React.Dispatch<UploadsAction>;
	setDepartmentsText: React.Dispatch<React.SetStateAction<string>>;
	setTreatments: React.Dispatch<React.SetStateAction<TreatmentRow[]>>;
	setSubRows: React.Dispatch<
		React.SetStateAction<Record<string, Record<string, string>[]>>
	>;
};

function prefillFromDraft(
	draft: Record<string, unknown>,
	handlers: PrefillHandlers,
) {
	const {
		setOwnerChoice,
		dispatchFields,
		dispatchUploads,
		setDepartmentsText,
		setTreatments,
		setSubRows,
	} = handlers;

	if (typeof draft.is_clinic_owner === "boolean") {
		setOwnerChoice(draft.is_clinic_owner ? "true" : "false");
	}

	const merge: Partial<FieldsState> = {};

	const profile = asObject(draft.profile);
	if (profile) {
		merge.displayName = asString(profile.display_name);
		merge.headline = asString(profile.headline);
		merge.primaryDepartment = asString(profile.primary_department_text);
		merge.specialty = asString(profile.specialty_text);
	}

	const hospital = asObject(draft.hospital);
	if (hospital) {
		merge.hospitalName = asString(hospital.name);
		merge.roadAddress = asString(hospital.road_address);
		merge.mainPhone = asString(hospital.main_phone);
		merge.customerCenterPhone = asString(hospital.customer_center_phone);
		// 자동저장 draft도 template_key로 보관되므로 같은 키로 복원(문서 §8.3).
		if (asString(hospital.template_key)) {
			merge.templateKey = asString(hospital.template_key);
		}
		dispatchUploads({
			type: "setLogoUrl",
			value: asString(hospital.logo_url),
		});
		const businessHours = asObject(hospital.business_hours);
		if (businessHours) {
			merge.hoursWeekday = asString(businessHours.weekday);
			merge.hoursSaturday = asString(businessHours.saturday);
			merge.hoursSunday = asString(businessHours.sunday);
		}
		const snsLinks = asObject(hospital.sns_links);
		if (snsLinks) {
			merge.snsInstagram = asString(snsLinks.instagram);
			merge.snsFacebook = asString(snsLinks.facebook);
			merge.snsYoutube = asString(snsLinks.youtube);
			merge.snsBlog = asString(snsLinks.blog);
			merge.snsKakao = asString(snsLinks.kakao_channel);
			merge.snsX = asString(snsLinks.x);
		}
	}

	const admin = asObject(draft.hospital_admin);
	if (admin) {
		merge.adminLoginId = asString(admin.login_id);
		merge.adminName = asString(admin.name);
		// 비밀번호는 draft에 없으므로 비워둠.
	}

	if (Object.keys(merge).length > 0) {
		dispatchFields({ type: "merge", values: merge });
	}

	if (Array.isArray(draft.departments)) {
		setDepartmentsText(
			draft.departments.filter((d) => typeof d === "string").join("\n"),
		);
	}

	if (Array.isArray(draft.treatments)) {
		setTreatments(
			draft.treatments.map((raw) => {
				const row = asObject(raw) ?? {};
				return {
					id: nextRowId(),
					name: asString(row.name),
					price_info: asString(row.price_info),
					description: asString(row.description),
				};
			}),
		);
	}

	const subentities = asObject(draft.subentities);
	if (subentities) {
		const next = emptySubRows();
		for (const section of SUBENTITIES) {
			const arr = subentities[section.key];
			if (!Array.isArray(arr)) continue;
			next[section.key] = arr.map((raw) => {
				const row = asObject(raw) ?? {};
				const out: Record<string, string> = {};
				for (const field of section.fields) {
					out[field.name] =
						field.kind === "year"
							? yearToText(row[field.name])
							: asString(row[field.name]);
				}
				return out;
			});
		}
		setSubRows(next);
	}

	if (Array.isArray(draft.photos)) {
		dispatchUploads({
			type: "setPhotos",
			value: draft.photos.filter((p) => typeof p === "string"),
		});
	}
}

// ─────────────────────────────────────────────────────────────────────
// 업로드 핸들러 — uploadsReducer 디스패처만 받아 module scope에서 처리.
// ─────────────────────────────────────────────────────────────────────

async function handleLogoUpload(
	e: React.ChangeEvent<HTMLInputElement>,
	dispatchUploads: React.Dispatch<UploadsAction>,
) {
	const file = e.target.files?.[0];
	e.target.value = "";
	if (!file) return;
	dispatchUploads({ type: "setLogoUploading", value: true });
	try {
		const url = await uploadFileToStorage(file, "hospital");
		dispatchUploads({ type: "setLogoUrl", value: url });
	} catch {
		toast.error("로고 업로드에 실패했습니다.");
	} finally {
		dispatchUploads({ type: "setLogoUploading", value: false });
	}
}

async function handlePhotosUpload(
	e: React.ChangeEvent<HTMLInputElement>,
	dispatchUploads: React.Dispatch<UploadsAction>,
) {
	const files = Array.from(e.target.files ?? []);
	e.target.value = "";
	if (files.length === 0) return;
	dispatchUploads({ type: "setPhotosUploading", value: true });
	try {
		const urls = await Promise.all(
			files.map((f) => uploadFileToStorage(f, "hospital")),
		);
		dispatchUploads({ type: "addPhotos", value: urls });
	} catch {
		toast.error("사진 업로드에 실패했습니다.");
	} finally {
		dispatchUploads({ type: "setPhotosUploading", value: false });
	}
}

// ─────────────────────────────────────────────────────────────────────
// 자동저장 훅 — draft 스냅샷을 debounce PATCH하고 언마운트 시 1회 flush.
// 컴포넌트와 공유하는 ref(submitted/debounceTimer/justRestored)는 인자로 받는다.
// ─────────────────────────────────────────────────────────────────────

function useDraftAutosave({
	draftSnapshot,
	paused,
	submittedRef,
	debounceTimerRef,
	justRestoredRef,
}: {
	draftSnapshot: string;
	paused: boolean;
	submittedRef: React.RefObject<boolean>;
	debounceTimerRef: React.RefObject<ReturnType<typeof setTimeout> | null>;
	justRestoredRef: React.RefObject<boolean>;
}) {
	const lastSnapshotRef = useRef<string | null>(null); // 마지막으로 저장(예약)한 직렬화 스냅샷
	const latestDraftJsonRef = useRef<string | null>(null); // 언마운트 flush용 최신 draft
	// 언마운트 flush에서 최신값을 읽기 위한 ref(렌더마다 갱신).
	latestDraftJsonRef.current = draftSnapshot;

	useEffect(() => {
		// 복원 진행 중이거나, 제출 완료/결제 복귀 화면이면 자동저장하지 않는다.
		if (paused || submittedRef.current) return;
		const draft = JSON.parse(draftSnapshot) as Record<string, unknown>;
		// 빈 폼이면 호출하지 않음(불필요한 빈 세션 생성 방지).
		if (isDraftEmptyJson(draft)) return;
		// 복원 직후 첫 스냅샷은 baseline으로만 채택(즉시 재PATCH 방지).
		if (justRestoredRef.current) {
			justRestoredRef.current = false;
			lastSnapshotRef.current = draftSnapshot;
			return;
		}
		// 직전에 저장(예약)한 스냅샷과 동일하면 재호출하지 않는다.
		if (lastSnapshotRef.current === draftSnapshot) return;

		const timer = setTimeout(() => {
			lastSnapshotRef.current = draftSnapshot;
			patchDraft(draft).catch(() => {
				// 자동저장 실패는 조용히 무시(폼 사용을 막지 않음).
			});
		}, 1200);
		debounceTimerRef.current = timer;
		return () => clearTimeout(timer);
	}, [draftSnapshot, paused, submittedRef, debounceTimerRef, justRestoredRef]);

	// 언마운트 flush 로직 — 항상 최신 값을 읽도록 effect event로 분리.
	// (ref들을 cleanup에서 직접 읽지 않으므로 stale-ref 경고/누락 deps가 없다.)
	const flushOnUnmount = useEffectEvent(() => {
		if (submittedRef.current) return;
		if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
		const json = latestDraftJsonRef.current;
		if (!json) return;
		const draft = JSON.parse(json) as Record<string, unknown>;
		if (isDraftEmptyJson(draft)) return;
		if (lastSnapshotRef.current === json) return;
		patchDraft(draft).catch(() => {});
	});

	// 언마운트 시 마지막 변경분 1회 flush(최신 값은 effect event가 읽는다).
	useEffect(() => {
		return () => flushOnUnmount();
	}, []);
}

function DirectOnboardingForm() {
	const { user, account } = useSession();
	const queryClient = useQueryClient();

	// 의사 프로필이 이미 있으면 '의사 프로필만(무료)' 경로는 중복이라 막는다.
	const hasProfile = account?.profile != null;

	// 진입/세션 상태(성공 결과 · 복원 가드 · 결제 복귀 · 이어하기 안내) — 단일 reducer.
	const [session, dispatchSession] = useReducer(
		sessionReducer,
		INITIAL_SESSION,
	);
	const { result, restoring, pendingPayment, restoredNotice } = session;

	// 1. 입력 유형 — "" 미선택 / "false" 프로필만 / "true" 병원까지.
	// 프로필이 이미 있으면 남는 유일 경로(병원까지)를 렌더 시점에 강제한다.
	const [ownerChoice, setOwnerChoice] = useState<"" | "false" | "true">("");
	const effectiveOwnerChoice: "" | "false" | "true" = hasProfile
		? "true"
		: ownerChoice;
	const isClinicOwner = effectiveOwnerChoice === "true";

	// 2~4. 프로필/병원/관리자 텍스트 필드(단일 reducer). 부모는 검증용 값만 분해.
	const [fields, dispatchFields] = useReducer(fieldsReducer, INITIAL_FIELDS);
	const {
		displayName,
		hospitalName,
		adminLoginId,
		adminPassword,
		adminPasswordConfirm,
	} = fields;
	const setField = (field: keyof FieldsState, value: string) =>
		dispatchFields({ type: "set", field, value });

	// 업로드 상태(로고/사진 URL · 진행중 플래그) — 단일 reducer.
	const [uploads, dispatchUploads] = useReducer(
		uploadsReducer,
		INITIAL_UPLOADS,
	);
	const { logoUrl, logoUploading, photos, photosUploading } = uploads;

	// 5~7. 진료과목 / 비급여 항목 / 경력·학력·이력(subentity, 선택).
	const [departmentsText, setDepartmentsText] = useState("");
	const [treatments, setTreatments] = useState<TreatmentRow[]>([]);
	const [subRows, setSubRows] =
		useState<Record<string, Record<string, string>[]>>(emptySubRows);

	const logoInputRef = useRef<HTMLInputElement>(null);
	const photosInputRef = useRef<HTMLInputElement>(null);

	// 자동저장/복원용 ref(자동저장 내부 ref는 useDraftAutosave가 보유).
	const restoreStartedRef = useRef(false); // startSession 1회 가드
	const submittedRef = useRef(false); // 제출 성공 후 자동저장 중단
	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const justRestoredRef = useRef(false); // 복원 직후 첫 스냅샷을 baseline으로만 채택

	// ── 파생 검증 상태(render 중 계산, module-scope 순수 함수) ────────
	const departments = parseLines(departmentsText);
	const {
		loginIdInvalid,
		passwordRequired,
		passwordMismatch,
		passwordMissing,
		canSubmit,
	} = deriveValidation({
		effectiveOwnerChoice,
		isClinicOwner,
		displayName,
		hospitalName,
		adminLoginId,
		adminPassword,
		adminPasswordConfirm,
		logoUploading,
		photosUploading,
	});

	// ── 제출 ────────────────────────────────────────────────────────
	const mutation = useMutation({
		mutationFn: (payload: DirectOnboardingInput) => directOnboarding(payload),
		onSuccess: (data) => {
			// 제출 성공 이후로는 자동저장(언마운트 flush 포함)이 일어나지 않게 한다.
			submittedRef.current = true;
			if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
			dispatchSession({ type: "setResult", value: data });
			queryClient.invalidateQueries({ queryKey: ["account", "me"] });
		},
		onError: (err) => toastApiError(err),
	});

	// 로고/사진 업로드 핸들러 — 로직은 module scope. dispatchUploads만 바인딩.
	const handleLogoPick = (e: React.ChangeEvent<HTMLInputElement>) =>
		handleLogoUpload(e, dispatchUploads);
	const handlePhotosPick = (e: React.ChangeEvent<HTMLInputElement>) =>
		handlePhotosUpload(e, dispatchUploads);

	// 현재 폼 입력을 한 객체로 묶어 module-scope의 순수 builder에 넘긴다.
	const formInput: FormInput = {
		isClinicOwner,
		fields,
		subRows,
		departments,
		treatments,
		logoUrl,
		photos,
	};

	// ── 진입 복원 (mount 1회) ────────────────────────────────────────
	// 복원 본문은 effect event로 분리 — 최신 디스패처/세터를 읽으므로 mount effect의
	// 의존성이 진짜로 없다(StrictMode 이중 mount는 restoreStartedRef로 가드).
	const restore = useEffectEvent(async () => {
		if (restoreStartedRef.current) return;
		restoreStartedRef.current = true;
		try {
			const view = await startSession();
			// 결제만 남은 병원 → 폼 대신 결제 복귀 화면.
			if (view.status === "pending_payment" && view.pending_payment) {
				dispatchSession({
					type: "setPendingPayment",
					value: view.pending_payment,
				});
				return;
			}
			// 이어하기 가능 → 저장된 draft로 폼 프리필.
			if (view.resumable === true && view.draft) {
				prefillFromDraft(view.draft as Record<string, unknown>, {
					setOwnerChoice,
					dispatchFields,
					dispatchUploads,
					setDepartmentsText,
					setTreatments,
					setSubRows,
				});
				// 복원 직후 첫 스냅샷은 baseline으로만 채택(즉시 재PATCH 방지).
				justRestoredRef.current = true;
				dispatchSession({ type: "setRestoredNotice", value: true });
			}
		} catch {
			// 에러는 폼을 막지 않는다(조용히 무시 → 빈 폼).
		} finally {
			dispatchSession({ type: "setRestoring", value: false });
		}
	});
	useEffect(() => {
		restore();
	}, []);

	// ── 자동저장 (debounce ~1200ms) + 언마운트 flush ─────────────────
	// 현재 폼 상태를 매 렌더 직렬화(비번 제외). 문자열이라 deps로 안전하게 비교 가능.
	const draftSnapshot = JSON.stringify(buildDraft(formInput));
	useDraftAutosave({
		draftSnapshot,
		paused: restoring || Boolean(result) || Boolean(pendingPayment),
		submittedRef,
		debounceTimerRef,
		justRestoredRef,
	});

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!canSubmit || mutation.isPending) return;
		mutation.mutate(buildPayload(formInput));
	}

	const shellUserName = user?.name ?? "원장님";

	// 진입 복원 조회 중 — 깜빡임 방지용 짧은 스피너(폼 노출 전).
	// 조회가 느려도 막다른 화면이 되지 않도록 "대화형으로 만들기" 링크는 항상 노출.
	if (restoring) {
		return (
			<Shell userName={shellUserName}>
				<div className="flex flex-col gap-6">
					<PageHeader />
					<div className="flex min-h-60 items-center justify-center">
						<Loader2 className="size-7 animate-spin text-muted-fg" />
					</div>
				</div>
			</Shell>
		);
	}

	// 결제만 남은 병원 복귀 또는 제출 성공 — 둘 다 CommitComplete가 동일하게 처리.
	const completeResult: CommitResult | null = pendingPayment
		? { payment: pendingPayment }
		: result;
	if (completeResult) {
		return (
			<Shell userName={shellUserName}>
				<CommitComplete result={completeResult} />
			</Shell>
		);
	}

	return (
		<Shell userName={shellUserName}>
			<form onSubmit={handleSubmit} className="flex flex-col gap-6">
				{/* 상단 안내 + 대화형 토글(온보딩의 "한 번에 입력하기"와 동일 위치: 우상단) */}
				<div className="flex flex-col gap-1">
					<PageHeader />
					<p className="text-[15px] leading-7 text-body-soft">
						모든 정보를 한 번에 입력해 프로필 또는 병원 홈페이지를 바로
						생성합니다.
					</p>
				</div>

				{/* 이어하기 안내 — 저장된 이전 입력을 불러온 경우 */}
				{restoredNotice ? (
					<InfoCallout tone="info">
						<p className="text-sm">
							이전에 입력하던 내용을 불러왔습니다. 이어서 작성해 주세요.
							{isClinicOwner ? " (비밀번호는 다시 입력해 주세요.)" : ""}
						</p>
					</InfoCallout>
				) : null}

				{/* 1. 입력 유형 */}
				<OwnerChoiceSection
					hasProfile={hasProfile}
					isClinicOwner={isClinicOwner}
					effectiveOwnerChoice={effectiveOwnerChoice}
					setOwnerChoice={setOwnerChoice}
				/>

				{/* 2. 의사 프로필 */}
				<DoctorProfileSection fields={fields} setField={setField} />

				{/* 병원일 때만 노출되는 섹션들 */}
				{isClinicOwner ? (
					<>
						{/* 3. 병원 정보 */}
						<HospitalInfoSection
							fields={fields}
							setField={setField}
							logoUrl={logoUrl}
							logoUploading={logoUploading}
							logoInputRef={logoInputRef}
							onLogoPick={handleLogoPick}
							dispatchUploads={dispatchUploads}
						/>

						{/* 4. 병원 관리자 */}
						<HospitalAdminSection
							fields={fields}
							setField={setField}
							loginIdInvalid={loginIdInvalid}
							passwordRequired={passwordRequired}
							passwordMissing={passwordMissing}
							passwordMismatch={passwordMismatch}
						/>

						{/* 5. 진료과목 */}
						<DepartmentsSection
							departmentsText={departmentsText}
							setDepartmentsText={setDepartmentsText}
							departments={departments}
						/>

						{/* 6. 비급여 항목 */}
						<TreatmentsSection
							treatments={treatments}
							setTreatments={setTreatments}
						/>
					</>
				) : null}

				{/* 7. 경력·학력·이력 (프로필/병원 공통, 선택) — 문서 §8.3 subentities */}
				{effectiveOwnerChoice !== "" ? (
					<SubentitiesSection subRows={subRows} setSubRows={setSubRows} />
				) : null}

				{/* 8. 병원 사진 */}
				{isClinicOwner ? (
					<PhotosSection
						photos={photos}
						photosUploading={photosUploading}
						photosInputRef={photosInputRef}
						onPick={handlePhotosPick}
						dispatchUploads={dispatchUploads}
					/>
				) : null}

				{/* 제출 */}
				<SubmitSection
					canSubmit={canSubmit}
					isPending={mutation.isPending}
					effectiveOwnerChoice={effectiveOwnerChoice}
					isClinicOwner={isClinicOwner}
					displayName={displayName}
					hospitalName={hospitalName}
					loginIdInvalid={loginIdInvalid}
					passwordMissing={passwordMissing}
					passwordMismatch={passwordMismatch}
				/>
			</form>
		</Shell>
	);
}

// ─────────────────────────────────────────────────────────────────────
// 하위 컴포넌트 — 섹션 단위 폼(부모 본문을 작게 유지).
// 각 섹션은 자체 useId로 라벨/입력을 연결한다(부모에서 id를 내려주지 않음).
// ─────────────────────────────────────────────────────────────────────

type SetField = (field: keyof FieldsState, value: string) => void;
type OwnerChoice = "" | "false" | "true";

/** 공통 AppShell 래퍼(4개 렌더 분기에서 동일 props 사용). */
function Shell({
	userName,
	children,
}: {
	userName: string;
	children: React.ReactNode;
}) {
	return (
		<AppShell userName={userName} maxWidth="1280px" innerMaxWidth="820px">
			{children}
		</AppShell>
	);
}

/** 상단 제목 + "대화형으로 만들기" 링크(스피너/폼 분기 공통). */
function PageHeader() {
	return (
		<div className="flex items-center justify-between gap-3">
			<h1 className="text-xl font-bold text-ink sm:text-2xl">
				직접 입력으로 만들기
			</h1>
			<Link
				to="/onboarding"
				className="shrink-0 text-sm font-medium text-brand transition-colors hover:underline"
			>
				대화형으로 만들기
			</Link>
		</div>
	);
}

/** 1. 입력 유형 섹션(프로필만/병원까지 선택 + 안내). */
function OwnerChoiceSection({
	hasProfile,
	isClinicOwner,
	effectiveOwnerChoice,
	setOwnerChoice,
}: {
	hasProfile: boolean;
	isClinicOwner: boolean;
	effectiveOwnerChoice: OwnerChoice;
	setOwnerChoice: React.Dispatch<React.SetStateAction<OwnerChoice>>;
}) {
	return (
		<SectionCard className="flex flex-col gap-5">
			<SectionTitle>입력 유형</SectionTitle>
			<OptionGroup
				value={effectiveOwnerChoice}
				onValueChange={(v) => setOwnerChoice(v as "false" | "true")}
			>
				{/* 이미 의사 프로필이 있으면 '의사 프로필만' 경로는 숨긴다(중복 생성 방지). */}
				{hasProfile ? null : (
					<OptionButton value="false" fluid>
						의사 프로필만 (무료)
					</OptionButton>
				)}
				<OptionButton value="true" fluid>
					병원 홈페이지까지 (유료)
				</OptionButton>
			</OptionGroup>
			<InfoCallout tone="info">
				<p className="text-sm">
					{hasProfile
						? "이미 의사 프로필이 있어 병원 홈페이지만 추가로 만들 수 있어요. 병원 홈페이지는 정기 결제(카드 등록) 후 공개됩니다."
						: isClinicOwner
							? "병원 홈페이지는 정기 결제(카드 등록) 후 공개됩니다. 생성 직후 결제 단계로 이어집니다."
							: effectiveOwnerChoice === "false"
								? "의사 프로필은 무료로 생성됩니다."
								: "프로필만 만들지, 병원 홈페이지까지 만들지 선택해 주세요."}
				</p>
			</InfoCallout>
		</SectionCard>
	);
}

/** 7. 경력·학력·이력(프로필/병원 공통, 선택) 섹션. */
function SubentitiesSection({
	subRows,
	setSubRows,
}: {
	subRows: Record<string, Record<string, string>[]>;
	setSubRows: React.Dispatch<
		React.SetStateAction<Record<string, Record<string, string>[]>>
	>;
}) {
	return (
		<SectionCard className="flex flex-col gap-6">
			<SectionTitle>경력·학력·이력 (선택)</SectionTitle>
			{SUBENTITIES.map((section) => (
				<SubentityEditor
					key={section.key}
					title={section.title}
					addLabel={section.addLabel}
					fields={section.fields}
					rows={subRows[section.key] ?? []}
					onChange={(next) =>
						setSubRows((prev) => ({ ...prev, [section.key]: next }))
					}
				/>
			))}
		</SectionCard>
	);
}

/** 제출 버튼 + 미충족 안내문. */
function SubmitSection({
	canSubmit,
	isPending,
	effectiveOwnerChoice,
	isClinicOwner,
	displayName,
	hospitalName,
	loginIdInvalid,
	passwordMissing,
	passwordMismatch,
}: {
	canSubmit: boolean;
	isPending: boolean;
	effectiveOwnerChoice: OwnerChoice;
	isClinicOwner: boolean;
	displayName: string;
	hospitalName: string;
	loginIdInvalid: boolean;
	passwordMissing: boolean;
	passwordMismatch: boolean;
}) {
	return (
		<div className="flex flex-col gap-3">
			{!canSubmit && effectiveOwnerChoice !== "" ? (
				<p className="text-sm text-body-soft">
					{displayName.trim().length === 0
						? "공개용 이름을 입력해 주세요."
						: isClinicOwner && hospitalName.trim().length === 0
							? "병원명을 입력해 주세요."
							: loginIdInvalid
								? `관리자 아이디는 ${LOGIN_ID_HINT}만 사용할 수 있습니다.`
								: passwordMissing
									? "관리자 비밀번호를 입력해 주세요."
									: passwordMismatch
										? "비밀번호가 일치하지 않습니다."
										: "파일 업로드가 끝나면 제출할 수 있어요."}
				</p>
			) : null}
			<Button
				type="submit"
				variant="brand"
				size="cta"
				className="w-full"
				disabled={!canSubmit || isPending}
			>
				{isPending ? <Loader2 className="size-5 animate-spin" /> : null}
				{isClinicOwner ? "프로필·병원 생성하기" : "프로필 생성하기"}
			</Button>
		</div>
	);
}

/** 2. 의사 프로필 섹션. */
function DoctorProfileSection({
	fields,
	setField,
}: {
	fields: FieldsState;
	setField: SetField;
}) {
	const displayNameId = useId();
	const headlineId = useId();
	const primaryDeptId = useId();
	const specialtyId = useId();
	return (
		<SectionCard className="flex flex-col gap-6">
			<SectionTitle>의사 프로필</SectionTitle>
			<Field>
				<FieldLabel htmlFor={displayNameId} required>
					이름 (공개용)
				</FieldLabel>
				<FieldInput
					id={displayNameId}
					value={fields.displayName}
					onChange={(e) => setField("displayName", e.target.value)}
					placeholder="예: 김민준"
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor={headlineId}>한 줄 소개</FieldLabel>
				<FieldInput
					id={headlineId}
					value={fields.headline}
					onChange={(e) => setField("headline", e.target.value)}
					placeholder="예: 소화기내과 전문의"
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor={primaryDeptId}>대표 진료과</FieldLabel>
				<FieldInput
					id={primaryDeptId}
					value={fields.primaryDepartment}
					onChange={(e) => setField("primaryDepartment", e.target.value)}
					placeholder="예: 소화기내과"
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor={specialtyId}>전문 분야</FieldLabel>
				<FieldInput
					id={specialtyId}
					value={fields.specialty}
					onChange={(e) => setField("specialty", e.target.value)}
					placeholder="예: 내시경, 위·대장 질환"
				/>
			</Field>
		</SectionCard>
	);
}

/** 3. 병원 정보 섹션(기본 정보·진료시간·시안·로고·SNS). */
function HospitalInfoSection({
	fields,
	setField,
	logoUrl,
	logoUploading,
	logoInputRef,
	onLogoPick,
	dispatchUploads,
}: {
	fields: FieldsState;
	setField: SetField;
	logoUrl: string;
	logoUploading: boolean;
	logoInputRef: React.RefObject<HTMLInputElement | null>;
	onLogoPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
	dispatchUploads: React.Dispatch<UploadsAction>;
}) {
	const hospitalNameId = useId();
	const roadAddressId = useId();
	const mainPhoneId = useId();
	const ccPhoneId = useId();
	const hoursWeekdayId = useId();
	const hoursSatId = useId();
	const hoursSunId = useId();
	const snsInstagramId = useId();
	const snsFacebookId = useId();
	const snsYoutubeId = useId();
	const snsBlogId = useId();
	const snsKakaoId = useId();
	const snsXId = useId();
	return (
		<SectionCard className="flex flex-col gap-6">
			<SectionTitle>병원 정보</SectionTitle>
			<Field>
				<FieldLabel htmlFor={hospitalNameId} required>
					병원명
				</FieldLabel>
				<FieldInput
					id={hospitalNameId}
					value={fields.hospitalName}
					onChange={(e) => setField("hospitalName", e.target.value)}
					placeholder="예: 행복내과의원"
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor={roadAddressId}>도로명 주소</FieldLabel>
				<FieldInput
					id={roadAddressId}
					value={fields.roadAddress}
					onChange={(e) => setField("roadAddress", e.target.value)}
					placeholder="예: 서울시 강남구 테헤란로 1"
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor={mainPhoneId}>대표 전화</FieldLabel>
				<FieldInput
					id={mainPhoneId}
					value={fields.mainPhone}
					onChange={(e) => setField("mainPhone", e.target.value)}
					placeholder="예: 02-123-4567"
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor={ccPhoneId}>고객센터 대표번호</FieldLabel>
				<FieldInput
					id={ccPhoneId}
					value={fields.customerCenterPhone}
					onChange={(e) => setField("customerCenterPhone", e.target.value)}
					placeholder="예: 1588-0000"
				/>
			</Field>

			{/* 진료 시간 */}
			<Field>
				<FieldLabel>진료 시간</FieldLabel>
				<FieldDescription>비워두면 저장되지 않습니다.</FieldDescription>
				<div className="flex flex-col gap-3">
					<FieldInput
						id={hoursWeekdayId}
						value={fields.hoursWeekday}
						onChange={(e) => setField("hoursWeekday", e.target.value)}
						placeholder="평일 (예: 09:00-18:00)"
					/>
					<FieldInput
						id={hoursSatId}
						value={fields.hoursSaturday}
						onChange={(e) => setField("hoursSaturday", e.target.value)}
						placeholder="토요일 (예: 09:00-13:00)"
					/>
					<FieldInput
						id={hoursSunId}
						value={fields.hoursSunday}
						onChange={(e) => setField("hoursSunday", e.target.value)}
						placeholder="일요일/공휴일 (예: 휴진)"
					/>
				</div>
			</Field>

			<TemplatePicker
				value={fields.templateKey}
				onChange={(key) => setField("templateKey", key)}
			/>

			{/* 로고 업로드 */}
			<Field>
				<FieldLabel>병원 로고</FieldLabel>
				<input
					ref={logoInputRef}
					type="file"
					accept="image/*"
					aria-label="병원 로고 파일 선택"
					className="hidden"
					onChange={onLogoPick}
				/>
				<div className="flex items-center gap-3">
					<Button
						type="button"
						variant="neutral-outline"
						size="2xl"
						disabled={logoUploading}
						onClick={() => logoInputRef.current?.click()}
					>
						{logoUploading ? <Loader2 className="size-5 animate-spin" /> : null}
						{logoUrl ? "로고 변경" : "로고 업로드"}
					</Button>
					{logoUrl ? (
						<div className="flex items-center gap-2">
							<img
								src={logoUrl}
								alt="병원 로고 미리보기"
								className="size-12 rounded-lg border border-line object-cover"
							/>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								aria-label="로고 삭제"
								onClick={() =>
									dispatchUploads({ type: "setLogoUrl", value: "" })
								}
							>
								<X className="size-4" />
							</Button>
						</div>
					) : null}
				</div>
			</Field>

			{/* SNS */}
			<Field>
				<FieldLabel>SNS 링크</FieldLabel>
				<div className="flex flex-col gap-3">
					<FieldInput
						id={snsInstagramId}
						value={fields.snsInstagram}
						onChange={(e) => setField("snsInstagram", e.target.value)}
						placeholder="인스타그램 URL"
					/>
					<FieldInput
						id={snsFacebookId}
						value={fields.snsFacebook}
						onChange={(e) => setField("snsFacebook", e.target.value)}
						placeholder="페이스북 URL"
					/>
					<FieldInput
						id={snsYoutubeId}
						value={fields.snsYoutube}
						onChange={(e) => setField("snsYoutube", e.target.value)}
						placeholder="유튜브 URL"
					/>
					<FieldInput
						id={snsBlogId}
						value={fields.snsBlog}
						onChange={(e) => setField("snsBlog", e.target.value)}
						placeholder="블로그 URL"
					/>
					<FieldInput
						id={snsKakaoId}
						value={fields.snsKakao}
						onChange={(e) => setField("snsKakao", e.target.value)}
						placeholder="카카오톡 채널 URL"
					/>
					<FieldInput
						id={snsXId}
						value={fields.snsX}
						onChange={(e) => setField("snsX", e.target.value)}
						placeholder="X(트위터) URL"
					/>
				</div>
			</Field>
		</SectionCard>
	);
}

/** 4. 병원 관리자 계정 섹션. */
function HospitalAdminSection({
	fields,
	setField,
	loginIdInvalid,
	passwordRequired,
	passwordMissing,
	passwordMismatch,
}: {
	fields: FieldsState;
	setField: SetField;
	loginIdInvalid: boolean;
	passwordRequired: boolean;
	passwordMissing: boolean;
	passwordMismatch: boolean;
}) {
	const adminLoginIdId = useId();
	const adminNameId = useId();
	const adminPwId = useId();
	const adminPwConfirmId = useId();
	return (
		<SectionCard className="flex flex-col gap-6">
			<SectionTitle>병원 관리자 계정</SectionTitle>
			<InfoCallout tone="info">
				<p className="text-sm">
					관리자 아이디를 입력하면 비밀번호도 함께 설정해야 합니다.
				</p>
			</InfoCallout>
			<Field>
				<FieldLabel htmlFor={adminLoginIdId}>관리자 아이디</FieldLabel>
				<FieldInput
					id={adminLoginIdId}
					value={fields.adminLoginId}
					onChange={(e) => setField("adminLoginId", e.target.value)}
					placeholder="영문 소문자·숫자 4~20자"
					autoComplete="off"
					aria-invalid={loginIdInvalid || undefined}
				/>
				{loginIdInvalid ? (
					<FieldError>
						아이디는 {LOGIN_ID_HINT}만 사용할 수 있습니다.
					</FieldError>
				) : (
					<FieldDescription>{LOGIN_ID_HINT}</FieldDescription>
				)}
			</Field>
			<Field>
				<FieldLabel htmlFor={adminNameId}>관리자 이름</FieldLabel>
				<FieldInput
					id={adminNameId}
					value={fields.adminName}
					onChange={(e) => setField("adminName", e.target.value)}
					placeholder="예: 김민준"
				/>
			</Field>
			<Field>
				<FieldLabel htmlFor={adminPwId} required={passwordRequired}>
					관리자 비밀번호
				</FieldLabel>
				<FieldInput
					id={adminPwId}
					type="password"
					value={fields.adminPassword}
					onChange={(e) => setField("adminPassword", e.target.value)}
					placeholder="비밀번호"
					autoComplete="new-password"
					aria-invalid={passwordMissing || undefined}
				/>
				{passwordMissing ? (
					<FieldError>
						관리자 아이디를 입력하면 비밀번호가 필요합니다.
					</FieldError>
				) : null}
			</Field>
			<Field>
				<FieldLabel htmlFor={adminPwConfirmId} required={passwordRequired}>
					비밀번호 확인
				</FieldLabel>
				<FieldInput
					id={adminPwConfirmId}
					type="password"
					value={fields.adminPasswordConfirm}
					onChange={(e) => setField("adminPasswordConfirm", e.target.value)}
					placeholder="비밀번호 확인"
					autoComplete="new-password"
					aria-invalid={passwordMismatch || undefined}
				/>
				{passwordMismatch ? (
					<FieldError>비밀번호가 일치하지 않습니다.</FieldError>
				) : null}
			</Field>
		</SectionCard>
	);
}

/** 5. 진료과목 섹션(줄 단위 입력 → 칩 미리보기). */
function DepartmentsSection({
	departmentsText,
	setDepartmentsText,
	departments,
}: {
	departmentsText: string;
	setDepartmentsText: React.Dispatch<React.SetStateAction<string>>;
	departments: string[];
}) {
	const departmentsId = useId();
	return (
		<SectionCard className="flex flex-col gap-4">
			<SectionTitle>진료과목</SectionTitle>
			<Field>
				<FieldLabel htmlFor={departmentsId}>
					진료과목 (한 줄에 하나씩)
				</FieldLabel>
				<Textarea
					id={departmentsId}
					value={departmentsText}
					onChange={(e) => setDepartmentsText(e.target.value)}
					placeholder={"소화기내과\n영양상담\n건강검진"}
					className="min-h-28"
				/>
				{departments.length > 0 ? (
					<div className="flex flex-wrap gap-2">
						{departments.map((d) => (
							<span
								key={d}
								className="rounded-full bg-brand-50 px-3 py-1 text-sm text-brand"
							>
								{d}
							</span>
						))}
					</div>
				) : null}
			</Field>
		</SectionCard>
	);
}

/** 6. 비급여 항목 섹션(행 추가/삭제). */
function TreatmentsSection({
	treatments,
	setTreatments,
}: {
	treatments: TreatmentRow[];
	setTreatments: React.Dispatch<React.SetStateAction<TreatmentRow[]>>;
}) {
	return (
		<SectionCard className="flex flex-col gap-4">
			<SectionTitle>비급여 항목</SectionTitle>
			{treatments.length === 0 ? (
				<p className="text-sm text-muted-fg">
					추가 버튼을 눌러 비급여 진료 항목을 입력하세요.
				</p>
			) : null}
			<div className="flex flex-col gap-4">
				{treatments.map((row, i) => (
					<div
						key={row.id}
						className="flex flex-col gap-3 rounded-xl border border-line p-4"
					>
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium text-body-soft">
								항목 {i + 1}
							</span>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								aria-label="항목 삭제"
								onClick={() =>
									setTreatments((prev) => prev.filter((t) => t.id !== row.id))
								}
							>
								<Trash2 className="size-4 text-danger-strong" />
							</Button>
						</div>
						<FieldInput
							value={row.name}
							onChange={(e) =>
								setTreatments((prev) =>
									prev.map((r) =>
										r.id === row.id ? { ...r, name: e.target.value } : r,
									),
								)
							}
							placeholder="항목명 (예: 위내시경)"
						/>
						<FieldInput
							value={row.price_info}
							onChange={(e) =>
								setTreatments((prev) =>
									prev.map((r) =>
										r.id === row.id ? { ...r, price_info: e.target.value } : r,
									),
								)
							}
							placeholder="가격 정보 (예: 50,000원)"
						/>
						<Textarea
							value={row.description}
							onChange={(e) =>
								setTreatments((prev) =>
									prev.map((r) =>
										r.id === row.id ? { ...r, description: e.target.value } : r,
									),
								)
							}
							placeholder="설명 (선택)"
						/>
					</div>
				))}
			</div>
			<Button
				type="button"
				variant="neutral-outline"
				size="xl"
				className="self-start"
				onClick={() =>
					setTreatments((prev) => [
						...prev,
						{
							id: nextRowId(),
							name: "",
							price_info: "",
							description: "",
						},
					])
				}
			>
				<Plus className="size-4" />
				비급여 항목 추가
			</Button>
		</SectionCard>
	);
}

/** 8. 병원 사진 섹션(다중 업로드/삭제). */
function PhotosSection({
	photos,
	photosUploading,
	photosInputRef,
	onPick,
	dispatchUploads,
}: {
	photos: string[];
	photosUploading: boolean;
	photosInputRef: React.RefObject<HTMLInputElement | null>;
	onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
	dispatchUploads: React.Dispatch<UploadsAction>;
}) {
	return (
		<SectionCard className="flex flex-col gap-4">
			<SectionTitle>병원 사진 (선택)</SectionTitle>
			<input
				ref={photosInputRef}
				type="file"
				accept="image/*"
				multiple
				aria-label="병원 사진 파일 선택"
				className="hidden"
				onChange={onPick}
			/>
			<Button
				type="button"
				variant="neutral-outline"
				size="2xl"
				className="self-start"
				disabled={photosUploading}
				onClick={() => photosInputRef.current?.click()}
			>
				{photosUploading ? (
					<Loader2 className="size-5 animate-spin" />
				) : (
					<Plus className="size-5" />
				)}
				사진 추가
			</Button>
			{photos.length > 0 ? (
				<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
					{photos.map((url) => (
						<div
							key={url}
							className="relative overflow-hidden rounded-xl border border-line"
						>
							<img
								src={url}
								alt="병원 사진"
								className="aspect-video w-full object-cover"
							/>
							<button
								type="button"
								aria-label="사진 삭제"
								onClick={() => dispatchUploads({ type: "removePhoto", url })}
								className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/75"
							>
								<X className="size-4" />
							</button>
						</div>
					))}
				</div>
			) : null}
		</SectionCard>
	);
}

/**
 * 디자인 시안(template_key) 카드 선택기 — wildcard 어드민 TemplatePicker 와 동일 UX.
 * `default`/미지정은 시안1(t1)로 표시.
 */
function TemplatePicker({
	value,
	onChange,
}: {
	value: string;
	onChange: (key: string) => void;
}) {
	const current = (value || "t1").toLowerCase();
	return (
		<Field>
			<FieldLabel>디자인 시안</FieldLabel>
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
				{TEMPLATES.map((t) => {
					const selected =
						current === t.key || (current === "default" && t.key === "t1");
					return (
						<button
							key={t.key}
							type="button"
							onClick={() => onChange(t.key)}
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
		</Field>
	);
}

/**
 * 반복 입력(subentity) 에디터 — 행 추가/삭제, 필드 서술자(RowFieldDef) 기반 렌더.
 * 학력·면허·수련·경력·학회·논문·일정에서 공통으로 쓰인다.
 */
function SubentityEditor({
	title,
	addLabel,
	fields,
	rows,
	onChange,
}: {
	title: string;
	addLabel: string;
	fields: RowFieldDef[];
	rows: Record<string, string>[];
	onChange: (next: Record<string, string>[]) => void;
}) {
	// 행마다 안정 key를 부여(__rid). 추가/삭제 시에도 입력 포커스가 유지된다.
	function update(index: number, name: string, value: string) {
		onChange(rows.map((r, i) => (i === index ? { ...r, [name]: value } : r)));
	}
	return (
		<div className="flex flex-col gap-4">
			<p className="text-sm font-semibold text-ink">{title}</p>
			{rows.length > 0 ? (
				<div className="flex flex-col gap-4">
					{rows.map((row, index) => (
						<div
							key={row.__rid ?? `${title}-${index}`}
							className="flex flex-col gap-3 rounded-xl border border-line p-4 sm:flex-row sm:flex-wrap sm:items-start"
						>
							{fields.map((field) =>
								field.kind === "select" ? (
									<div key={field.name} className="min-w-40 flex-1">
										<FieldSelect
											value={row[field.name] ?? ""}
											onValueChange={(v) => update(index, field.name, v)}
											options={field.options ?? []}
											placeholder={field.placeholder}
										/>
									</div>
								) : (
									<FieldInput
										key={field.name}
										value={row[field.name] ?? ""}
										onChange={(e) => update(index, field.name, e.target.value)}
										placeholder={field.placeholder}
										inputMode={field.kind === "year" ? "numeric" : undefined}
										className={
											field.kind === "year" ? "sm:w-40" : "min-w-40 flex-1"
										}
									/>
								),
							)}
							<Button
								type="button"
								variant="ghost"
								size="icon"
								aria-label={`${title} 삭제`}
								className="shrink-0 self-center"
								onClick={() => onChange(rows.filter((_, i) => i !== index))}
							>
								<Trash2 className="size-4 text-danger-strong" />
							</Button>
						</div>
					))}
				</div>
			) : null}
			<Button
				type="button"
				variant="neutral-outline"
				size="xl"
				className="self-start"
				onClick={() =>
					onChange([
						...rows,
						{
							__rid: nextRowId(),
							...Object.fromEntries(fields.map((f) => [f.name, ""])),
						},
					])
				}
			>
				<Plus className="size-4" />
				{addLabel}
			</Button>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────────────────────────────

/** 클라이언트 전용 안정 행 id 생성기(배열 인덱스 key 대체). */
let rowIdCounter = 0;
function nextRowId(): string {
	rowIdCounter += 1;
	return `row-${rowIdCounter}`;
}

/** 줄 단위 텍스트를 trim + 중복 제거한 문자열 배열로. */
function parseLines(text: string): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const raw of text.split("\n")) {
		const line = raw.trim();
		if (line && !seen.has(line)) {
			seen.add(line);
			out.push(line);
		}
	}
	return out;
}

/** "2013" → 2013(숫자), 빈/비숫자는 undefined. */
function toYear(value: string): number | undefined {
	const trimmed = value.trim();
	if (!trimmed) return undefined;
	const n = Number(trimmed);
	return Number.isFinite(n) ? n : undefined;
}

/** 빈 문자열/undefined 값을 제거한 객체를 반환(빈 값 제외 규칙). */
function omitEmpty<T extends Record<string, unknown>>(
	obj: T,
): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(obj)) {
		if (value === undefined || value === null) continue;
		if (typeof value === "string" && value.trim() === "") continue;
		out[key] = value;
	}
	return out;
}

/** 직렬화된 draft가 빈 폼(is_clinic_owner 외 입력 없음)인지 — 빈 세션 생성 방지용. */
function isDraftEmptyJson(draft: Record<string, unknown>): boolean {
	for (const key of Object.keys(draft)) {
		if (key !== "is_clinic_owner") return false;
	}
	return true;
}

/** unknown → 객체(아니면 null). draft 프리필 매핑용. */
function asObject(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: null;
}

/** unknown → 문자열(아니면 ""). draft 프리필 매핑용. */
function asString(value: unknown): string {
	return typeof value === "string" ? value : "";
}

/** 연도(숫자/문자열) → 입력 필드용 텍스트("" 포함). draft 프리필 매핑용. */
function yearToText(value: unknown): string {
	if (typeof value === "number" && Number.isFinite(value)) return String(value);
	if (typeof value === "string") return value;
	return "";
}
