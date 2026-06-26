import {
	keepPreviousData,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Loader2, Plus, Trash2, X } from "lucide-react";
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
	Autocomplete,
	type AutocompleteOption,
} from "#/components/form/autocomplete.tsx";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "#/components/form/field.tsx";
import { FieldInput } from "#/components/form/field-input.tsx";
import { AppShell } from "#/components/layout/app-shell.tsx";
import { CommitComplete } from "#/components/onboarding/commit-complete.tsx";
import { DesignPreviewScreen } from "#/components/onboarding/design-preview.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import { useDebouncedValue } from "#/hooks/use-debounced-value.ts";
import {
	type CommitResult,
	type HospitalOnboardingInput,
	hospitalOnboarding,
	type PaymentIntent,
	patchDraft,
	startSession,
} from "#/lib/api/onboarding.ts";
import { type RefClinic, searchClinics } from "#/lib/api/ref.ts";
import { toastApiError } from "#/lib/api-error-message.ts";
import { useSession } from "#/lib/auth/use-session.ts";
import {
	buildHospitalPreviewPayload,
	type HospitalPreviewInput,
} from "#/lib/preview.ts";
import { uploadFileToStorage } from "#/lib/upload.ts";

/**
 * 병원 홈페이지 직접 입력 — 문서 §8.3 `POST /onboarding/hospital`.
 * 대화형 온보딩(`/onboarding`)과 달리 전체 정보를 한 폼으로 받아 한 요청에 병원을 생성한다.
 *
 * ⚠ **병원 전용**이다. 의사 프로필 생성·수정은 완전히 분리되어 프로필 관리 페이지
 * (`/doctor/profile`)에서만 한다 — 이 폼에는 프로필 입력이 없다.
 * 성공 결과(결제 유도)는 대화형과 동일하게 `CommitComplete` 가 처리한다.
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
// 텍스트 입력 필드 묶음 — 병원/관리자의 단순 문자열 필드만(파일/배열/세션은 별도).
// ─────────────────────────────────────────────────────────────────────

type FieldsState = {
	hospitalName: string;
	/** ref_clinic 레지스트리에서 선택한 병원 no(문자열, ""=직접입력/미선택). */
	refClinicNo: string;
	/** 레지스트리 선택 병원 좌표(미리보기 지도용, 문자열, ""=없음). 생성은 ref_clinic_no로 자동채움. */
	lat: string;
	lng: string;
	roadAddress: string;
	mainPhone: string;
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
	hospitalName: "",
	refClinicNo: "",
	lat: "",
	lng: "",
	roadAddress: "",
	mainPhone: "",
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
// 병원 모드: 병원명 + 관리자 아이디·비밀번호 모두 필수(문서 §8.3).
// ─────────────────────────────────────────────────────────────────────

function deriveValidation(input: {
	hospitalName: string;
	adminLoginId: string;
	adminPassword: string;
	adminPasswordConfirm: string;
	logoUploading: boolean;
	photosUploading: boolean;
}) {
	const {
		hospitalName,
		adminLoginId,
		adminPassword,
		adminPasswordConfirm,
		logoUploading,
		photosUploading,
	} = input;
	const loginIdInvalid =
		adminLoginId.length > 0 && !LOGIN_ID_RE.test(adminLoginId);
	const loginIdMissing = adminLoginId.trim().length === 0;
	const passwordMismatch =
		adminPasswordConfirm.length > 0 && adminPassword !== adminPasswordConfirm;
	const passwordMissing = adminPassword.length === 0;
	const canSubmit =
		hospitalName.trim().length > 0 &&
		!loginIdMissing &&
		!loginIdInvalid &&
		!passwordMissing &&
		!passwordMismatch &&
		!logoUploading &&
		!photosUploading;
	return {
		loginIdInvalid,
		loginIdMissing,
		passwordMismatch,
		passwordMissing,
		canSubmit,
	};
}

// ─────────────────────────────────────────────────────────────────────
// 페이로드/드래프트 빌더 — 폼 입력 스냅샷에서 §8.3 요청 본문을 만드는 순수 함수.
// ─────────────────────────────────────────────────────────────────────

type FormInput = {
	fields: FieldsState;
	departments: string[];
	treatments: TreatmentRow[];
	logoUrl: string;
	photos: string[];
};

/**
 * 병원 생성 본문(`POST /onboarding/hospital`) — 채워진 값만.
 * ref_clinic_no가 있으면 빈 칸은 서버가 자동채움한다.
 */
function buildHospitalPayload(input: FormInput): HospitalOnboardingInput {
	const { fields, departments, treatments, logoUrl, photos } = input;
	const payload: HospitalOnboardingInput = {};

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
		// 문서 §8.3: 병원 디자인 시안은 `template_key`(t1~t5) 컬럼으로 전달.
		template_key: fields.templateKey,
		logo_url: logoUrl,
	});
	// 레지스트리 선택 시 ref_clinic_no를 병원 본문에 담아 자동채움을 유도(문서 §8.3).
	const refClinicNo = toYear(fields.refClinicNo);
	if (refClinicNo !== undefined) hospital.ref_clinic_no = refClinicNo;
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
 * 자동저장용 draft 직렬화 — `mode:"hospital"` + 병원 키만, **비밀번호 제외**.
 * PATCH /onboarding/session/draft 는 부분 머지이므로 채워진 값만 보낸다.
 */
function buildDraft(input: FormInput): Record<string, unknown> {
	const draft = buildHospitalPayload(input) as Record<string, unknown>;
	// 안전장치: 비밀번호는 어떤 경우에도 draft에 포함하지 않는다.
	delete draft.hospital_admin_password;
	return { mode: "hospital", ...draft };
}

/** 폼 입력 → 미리보기 입력(`HospitalPreviewInput`). 실시간 미리보기 payload 빌드용. */
function toPreviewInput(input: FormInput): HospitalPreviewInput {
	const { fields, departments, treatments, logoUrl, photos } = input;
	return {
		name: fields.hospitalName,
		roadAddress: fields.roadAddress,
		mainPhone: fields.mainPhone,
		lat: fields.lat,
		lng: fields.lng,
		logoUrl,
		templateKey: fields.templateKey,
		hoursWeekday: fields.hoursWeekday,
		hoursSaturday: fields.hoursSaturday,
		hoursSunday: fields.hoursSunday,
		sns: {
			instagram: fields.snsInstagram,
			facebook: fields.snsFacebook,
			youtube: fields.snsYoutube,
			blog: fields.snsBlog,
			kakao: fields.snsKakao,
			x: fields.snsX,
		},
		departments,
		treatments: treatments.map((t) => ({
			name: t.name,
			price_info: t.price_info,
			description: t.description,
		})),
		photos,
	};
}

// ─────────────────────────────────────────────────────────────────────
// 저장된 draft 프리필 — buildDraft의 역방향. 디스패처/세터만 받아 module scope에서 수행.
// ─────────────────────────────────────────────────────────────────────

type PrefillHandlers = {
	dispatchFields: React.Dispatch<FieldsAction>;
	dispatchUploads: React.Dispatch<UploadsAction>;
	setDepartmentsText: React.Dispatch<React.SetStateAction<string>>;
	setTreatments: React.Dispatch<React.SetStateAction<TreatmentRow[]>>;
};

function prefillFromDraft(
	draft: Record<string, unknown>,
	handlers: PrefillHandlers,
) {
	const { dispatchFields, dispatchUploads, setDepartmentsText, setTreatments } =
		handlers;

	const merge: Partial<FieldsState> = {};

	const hospital = asObject(draft.hospital);
	if (hospital) {
		merge.hospitalName = asString(hospital.name);
		merge.refClinicNo = yearToText(hospital.ref_clinic_no);
		merge.roadAddress = asString(hospital.road_address);
		merge.mainPhone = asString(hospital.main_phone);
		if (asString(hospital.template_key)) {
			merge.templateKey = asString(hospital.template_key);
		}
		dispatchUploads({ type: "setLogoUrl", value: asString(hospital.logo_url) });
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
	const lastSnapshotRef = useRef<string | null>(null);
	const latestDraftJsonRef = useRef<string | null>(null);
	latestDraftJsonRef.current = draftSnapshot;

	useEffect(() => {
		if (paused || submittedRef.current) return;
		const draft = JSON.parse(draftSnapshot) as Record<string, unknown>;
		if (isDraftEmptyJson(draft)) return;
		if (justRestoredRef.current) {
			justRestoredRef.current = false;
			lastSnapshotRef.current = draftSnapshot;
			return;
		}
		if (lastSnapshotRef.current === draftSnapshot) return;

		const timer = setTimeout(() => {
			lastSnapshotRef.current = draftSnapshot;
			patchDraft(draft).catch(() => {});
		}, 1200);
		debounceTimerRef.current = timer;
		return () => clearTimeout(timer);
	}, [draftSnapshot, paused, submittedRef, debounceTimerRef, justRestoredRef]);

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

	useEffect(() => {
		return () => flushOnUnmount();
	}, []);
}

function DirectOnboardingForm() {
	const { user } = useSession();
	const queryClient = useQueryClient();

	// 진입/세션 상태(성공 결과 · 복원 가드 · 결제 복귀 · 이어하기 안내) — 단일 reducer.
	const [session, dispatchSession] = useReducer(
		sessionReducer,
		INITIAL_SESSION,
	);
	const { result, restoring, pendingPayment, restoredNotice } = session;

	// 병원/관리자 텍스트 필드(단일 reducer).
	const [fields, dispatchFields] = useReducer(fieldsReducer, INITIAL_FIELDS);
	const { hospitalName, adminLoginId, adminPassword, adminPasswordConfirm } =
		fields;
	const setField = (field: keyof FieldsState, value: string) =>
		dispatchFields({ type: "set", field, value });

	// 업로드 상태(로고/사진 URL · 진행중 플래그) — 단일 reducer.
	const [uploads, dispatchUploads] = useReducer(
		uploadsReducer,
		INITIAL_UPLOADS,
	);
	const { logoUrl, logoUploading, photos, photosUploading } = uploads;

	// 진료과목 / 비급여 항목.
	const [departmentsText, setDepartmentsText] = useState("");
	const [treatments, setTreatments] = useState<TreatmentRow[]>([]);

	// 입력 단계. "form"=정보 입력 → "design"=전체화면 시안 미리보기·선택(결제 직전).
	const [step, setStep] = useState<"form" | "design">("form");

	const logoInputRef = useRef<HTMLInputElement>(null);
	const photosInputRef = useRef<HTMLInputElement>(null);

	// 자동저장/복원용 ref.
	const restoreStartedRef = useRef(false);
	const submittedRef = useRef(false);
	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const justRestoredRef = useRef(false);

	const departments = parseLines(departmentsText);
	const {
		loginIdInvalid,
		loginIdMissing,
		passwordMismatch,
		passwordMissing,
		canSubmit,
	} = deriveValidation({
		hospitalName,
		adminLoginId,
		adminPassword,
		adminPasswordConfirm,
		logoUploading,
		photosUploading,
	});

	// ── 제출 ────────────────────────────────────────────────────────
	const mutation = useMutation({
		mutationFn: (payload: HospitalOnboardingInput) =>
			hospitalOnboarding(payload),
		onSuccess: (data) => {
			submittedRef.current = true;
			if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
			dispatchSession({ type: "setResult", value: data });
			queryClient.invalidateQueries({ queryKey: ["account", "me"] });
		},
		onError: (err) => toastApiError(err),
	});

	const handleLogoPick = (e: React.ChangeEvent<HTMLInputElement>) =>
		handleLogoUpload(e, dispatchUploads);
	const handlePhotosPick = (e: React.ChangeEvent<HTMLInputElement>) =>
		handlePhotosUpload(e, dispatchUploads);

	const formInput: FormInput = {
		fields,
		departments,
		treatments,
		logoUrl,
		photos,
	};

	// ── 진입 복원 (mount 1회) ────────────────────────────────────────
	const restore = useEffectEvent(async () => {
		if (restoreStartedRef.current) return;
		restoreStartedRef.current = true;
		try {
			// 직접 입력 폼은 병원 전용 → 병원 모드 세션을 startOrGet.
			const view = await startSession("hospital");
			// 결제만 남은 병원 → 폼 대신 결제 복귀 화면.
			if (view.status === "pending_payment" && view.pending_payment) {
				dispatchSession({
					type: "setPendingPayment",
					value: view.pending_payment,
				});
				return;
			}
			// 이어하기 가능 + 병원 모드 draft → 폼 프리필(프로필 draft는 무시).
			const draft = view.draft as Record<string, unknown> | null | undefined;
			const isHospitalDraft =
				draft != null &&
				(draft.mode === "hospital" ||
					draft.mode == null ||
					draft.is_clinic_owner === true ||
					draft.hospital != null);
			if (view.resumable === true && draft && isHospitalDraft) {
				prefillFromDraft(draft, {
					dispatchFields,
					dispatchUploads,
					setDepartmentsText,
					setTreatments,
				});
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
	const draftSnapshot = JSON.stringify(buildDraft(formInput));
	useDraftAutosave({
		draftSnapshot,
		paused: restoring || Boolean(result) || Boolean(pendingPayment),
		submittedRef,
		debounceTimerRef,
		justRestoredRef,
	});

	// 폼 제출 → 바로 생성하지 않고 전체화면 시안 선택(미리보기)으로 진입.
	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!canSubmit || mutation.isPending) return;
		setStep("design");
	}

	// 시안 화면에서 "이 디자인으로 결제하기" → 선택한 template_key로 병원 생성 → 결제 단계.
	function handleCreate() {
		if (!canSubmit || mutation.isPending) return;
		mutation.mutate(buildHospitalPayload(formInput));
	}

	const shellUserName = user?.name ?? "원장님";

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

	// 전체화면 시안 미리보기·선택 — 입력값으로 실시간 렌더되는 홈페이지를 보며 시안 선택(결제 직전).
	if (step === "design") {
		return (
			<DesignPreviewScreen
				payload={buildHospitalPreviewPayload(toPreviewInput(formInput))}
				templateKey={fields.templateKey}
				onTemplateChange={(key) => setField("templateKey", key)}
				onBack={() => setStep("form")}
				onConfirm={handleCreate}
				confirming={mutation.isPending}
			/>
		);
	}

	return (
		<Shell userName={shellUserName}>
			<form onSubmit={handleSubmit} className="flex flex-col gap-6">
				<div className="flex flex-col gap-1">
					<PageHeader />
					<p className="text-[15px] leading-7 text-body-soft">
						병원 정보를 입력하고, 다음 화면에서 디자인 시안을 미리 보고 고른 뒤
						결제하면 병원 홈페이지가 만들어집니다.
					</p>
				</div>

				{restoredNotice ? (
					<InfoCallout tone="info">
						<p className="text-sm">
							이전에 입력하던 내용을 불러왔습니다. 이어서 작성해 주세요.
							(비밀번호는 다시 입력해 주세요.)
						</p>
					</InfoCallout>
				) : null}

				<HospitalInfoSection
					fields={fields}
					setField={setField}
					logoUrl={logoUrl}
					logoUploading={logoUploading}
					logoInputRef={logoInputRef}
					onLogoPick={handleLogoPick}
					dispatchUploads={dispatchUploads}
				/>

				<HospitalAdminSection
					fields={fields}
					setField={setField}
					loginIdInvalid={loginIdInvalid}
					loginIdMissing={loginIdMissing}
					passwordMissing={passwordMissing}
					passwordMismatch={passwordMismatch}
				/>

				<DepartmentsSection
					departmentsText={departmentsText}
					setDepartmentsText={setDepartmentsText}
					departments={departments}
				/>

				<TreatmentsSection
					treatments={treatments}
					setTreatments={setTreatments}
				/>

				<PhotosSection
					photos={photos}
					photosUploading={photosUploading}
					photosInputRef={photosInputRef}
					onPick={handlePhotosPick}
					dispatchUploads={dispatchUploads}
				/>

				<SubmitSection
					canSubmit={canSubmit}
					isPending={mutation.isPending}
					hospitalName={hospitalName}
					loginIdInvalid={loginIdInvalid}
					loginIdMissing={loginIdMissing}
					passwordMissing={passwordMissing}
					passwordMismatch={passwordMismatch}
				/>
			</form>
		</Shell>
	);
}

// ─────────────────────────────────────────────────────────────────────
// 하위 컴포넌트 — 섹션 단위 폼(부모 본문을 작게 유지).
// ─────────────────────────────────────────────────────────────────────

type SetField = (field: keyof FieldsState, value: string) => void;

/** 공통 AppShell 래퍼(렌더 분기에서 동일 props 사용). */
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
				병원 홈페이지 직접 입력
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

/** 제출 버튼 + 미충족 안내문. */
function SubmitSection({
	canSubmit,
	isPending,
	hospitalName,
	loginIdInvalid,
	loginIdMissing,
	passwordMissing,
	passwordMismatch,
}: {
	canSubmit: boolean;
	isPending: boolean;
	hospitalName: string;
	loginIdInvalid: boolean;
	loginIdMissing: boolean;
	passwordMissing: boolean;
	passwordMismatch: boolean;
}) {
	return (
		<div className="flex flex-col gap-3">
			{!canSubmit ? (
				<p className="text-sm text-body-soft">
					{hospitalName.trim().length === 0
						? "병원명을 입력해 주세요."
						: loginIdMissing
							? "관리자 아이디를 입력해 주세요."
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
				디자인 선택하고 결제하기
			</Button>
		</div>
	);
}

/** ref_clinic 옵션 고유키(no 우선, 없으면 hira_code/이름). */
function clinicOptionValue(c: RefClinic): string {
	return String(c.no ?? c.hira_code ?? c.name ?? "");
}

/**
 * 병원명 입력 + 전국 병의원 레지스트리(`GET /ref/clinic`) 자동완성.
 * 레지스트리 항목을 고르면 ref_clinic_no가 잡히고 주소·전화가 자동으로 채워진다(문서 §8.3).
 * 목록에 없으면 자유 입력 — 그땐 ref_clinic_no 없이 이름만 저장된다.
 */
function ClinicSearchField({
	name,
	onNameChange,
	onPick,
}: {
	name: string;
	onNameChange: (value: string) => void;
	onPick: (clinic: RefClinic) => void;
}) {
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
		value: clinicOptionValue(c),
		label: c.name ?? "",
		description:
			[c.type_name, c.address].filter(Boolean).join(" · ") || undefined,
	}));
	return (
		<Autocomplete
			options={options}
			value={name}
			onChange={onNameChange}
			onSelect={(opt) => {
				const picked = items.find((c) => clinicOptionValue(c) === opt.value);
				if (picked) onPick(picked);
			}}
			onManualEntry={() => {
				/* 직접 입력 — 입력값 유지, ref_clinic_no 없이 진행 */
			}}
			placeholder="병원명을 검색하세요 (예: 행복내과의원)"
		/>
	);
}

/** 1. 병원 정보 섹션(기본 정보·진료시간·시안·로고·SNS). */
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
	const roadAddressId = useId();
	const mainPhoneId = useId();
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
				<FieldLabel required>병원명</FieldLabel>
				<ClinicSearchField
					name={fields.hospitalName}
					onNameChange={(v) => {
						setField("hospitalName", v);
						// 직접 편집하면 레지스트리 선택을 해제(자동채움·좌표 끔).
						setField("refClinicNo", "");
						setField("lat", "");
						setField("lng", "");
					}}
					onPick={(c) => {
						setField("hospitalName", c.name ?? "");
						setField("refClinicNo", c.no != null ? String(c.no) : "");
						if (c.address) setField("roadAddress", c.address);
						if (c.phone) setField("mainPhone", c.phone);
						// 레지스트리 좌표 → 미리보기 지도용(생성은 ref_clinic_no로 자동채움).
						setField("lat", c.lat != null ? String(c.lat) : "");
						setField("lng", c.lng != null ? String(c.lng) : "");
					}}
				/>
				<FieldDescription>
					병원을 검색해 선택하면 주소·전화가 자동으로 채워집니다. 목록에 없으면
					직접 입력하세요.
				</FieldDescription>
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

/** 2. 병원 관리자 계정 섹션. */
function HospitalAdminSection({
	fields,
	setField,
	loginIdInvalid,
	loginIdMissing,
	passwordMissing,
	passwordMismatch,
}: {
	fields: FieldsState;
	setField: SetField;
	loginIdInvalid: boolean;
	loginIdMissing: boolean;
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
					병원 홈페이지를 관리할 관리자 아이디와 비밀번호를 설정해 주세요.
				</p>
			</InfoCallout>
			<Field>
				<FieldLabel htmlFor={adminLoginIdId} required>
					관리자 아이디
				</FieldLabel>
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
				) : loginIdMissing ? (
					<FieldError>관리자 아이디를 입력해 주세요.</FieldError>
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
				<FieldLabel htmlFor={adminPwId} required>
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
			</Field>
			<Field>
				<FieldLabel htmlFor={adminPwConfirmId} required>
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

/** 3. 진료과목 섹션(줄 단위 입력 → 칩 미리보기). */
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

/** 4. 비급여 항목 섹션(행 추가/삭제). */
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
						{ id: nextRowId(), name: "", price_info: "", description: "" },
					])
				}
			>
				<Plus className="size-4" />
				비급여 항목 추가
			</Button>
		</SectionCard>
	);
}

/** 5. 병원 사진 섹션(다중 업로드/삭제). */
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

/** 직렬화된 draft가 빈 폼(mode 외 입력 없음)인지 — 빈 세션 생성 방지용. */
function isDraftEmptyJson(draft: Record<string, unknown>): boolean {
	for (const key of Object.keys(draft)) {
		if (key !== "mode") return false;
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

/** 연도/숫자(숫자/문자열) → 입력 필드용 텍스트("" 포함). draft 프리필 매핑용. */
function yearToText(value: unknown): string {
	if (typeof value === "number" && Number.isFinite(value)) return String(value);
	if (typeof value === "string") return value;
	return "";
}
