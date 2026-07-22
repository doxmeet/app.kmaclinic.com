import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import {
	ArrowRight,
	Building2,
	CreditCard,
	ExternalLink,
	IdCard,
	Loader2,
	Palette,
	PenLine,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CardShell } from "#/components/common/card-shell.tsx";
import { InfoCallout } from "#/components/common/info-callout.tsx";
import { InfoRows } from "#/components/common/info-rows.tsx";
import { KakaoTalkIcon } from "#/components/common/kakao-icon.tsx";
import { KakaoSupportLink } from "#/components/common/kakao-support-link.tsx";
import { ProfileLivePreview } from "#/components/doctor/profile-live-preview.tsx";
import { DesignPreviewScreen } from "#/components/onboarding/design-preview.tsx";
import { isSlugValid } from "#/components/onboarding/slug.ts";
import { SlugField } from "#/components/onboarding/slug-field.tsx";
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import { setProfileSlug } from "#/lib/api/billing.ts";
import type {
	OnboardingMode,
	Overview,
	OverviewDraft,
	OverviewHospital,
	OverviewProfile,
	PaymentIntent,
} from "#/lib/api/onboarding.ts";
import { deleteHospital, resetSession } from "#/lib/api/onboarding.ts";
import {
	getProfile,
	patchProfile,
	publishProfile,
	unpublishProfile,
} from "#/lib/api/profile.ts";
import { toastApiError } from "#/lib/api-error-message.ts";
import {
	buildProfilePreviewBundleFromDoc,
	PROFILE_TEMPLATE_SWATCHES,
} from "#/lib/profile-preview.ts";
import { KAKAO_CHANNEL_URL } from "#/lib/support.ts";
import { cn } from "#/lib/utils.ts";

/**
 * 온보딩 대시보드 — 내 병원/프로필 카드 목록.
 * 진행중 draft(최대 1)와 생성된 병원 카드를 상태별 액션과 함께 보여준다.
 * 하위 흐름(대화/결제/게시)은 부모 오케스트레이터(`/onboarding`)가 모드로 전환한다.
 */
export function OnboardingDashboard({
	overview,
	onStartConversation,
	onContinueDraft,
	onPay,
	onPublish,
	onRefetch,
}: {
	overview: Overview;
	/** 대화형으로 새로 시작 → conversation 모드(병원/프로필). */
	onStartConversation: (mode: OnboardingMode) => void;
	/** draft "이어서 작성" → conversation 모드. */
	onContinueDraft: () => void;
	/** 병원 카드 "결제하기" → payment 모드. */
	onPay: (payment: PaymentIntent) => void;
	/** 병원 카드 "게시하기" → publish 모드. */
	onPublish: (hospital: OverviewHospital) => void;
	/** 액션(삭제 등) 후 overview 새로고침. */
	onRefetch: () => void;
}) {
	const queryClient = useQueryClient();

	const draft = overview.draft ?? null;
	const profile = overview.profile ?? null;
	const hospitals = overview.hospitals ?? [];
	// 진행 중인 작성(draft)은 한 번에 하나 → 이미 있으면 새로 시작 불가.
	// 이어서 쓰는 동작은 아래 draft 카드의 "이어서 작성"이 담당한다.
	const canStartNewDraft = overview.can_start_new_draft !== false;
	const hasDraft = draft != null;

	// ── draft 폐기(reset) ──────────────────────────────────────────
	const resetMutation = useMutation({
		mutationFn: resetSession,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["onboarding", "overview"] });
			onRefetch();
		},
		onError: (err) => toastApiError(err),
	});

	function handleDeleteDraft() {
		const ok = window.confirm(
			"진행 중이던 대화 내용을 삭제할까요?\n작성하던 초안은 복구할 수 없습니다.",
		);
		if (!ok) return;
		resetMutation.mutate();
	}

	const isEmpty = !hasDraft && hospitals.length === 0 && profile == null;

	return (
		<div className="flex flex-col gap-6">
			{/* 헤더 */}
			<h1 className="text-2xl font-bold text-ink">내 병원·프로필</h1>

			{/* 빈 상태 */}
			{isEmpty ? (
				<EmptyStateCard onStartConversation={onStartConversation} />
			) : null}

			{/* draft 카드 */}
			{draft ? (
				<DraftCard
					draft={draft}
					onContinue={onContinueDraft}
					onDelete={handleDeleteDraft}
					deleting={resetMutation.isPending}
				/>
			) : null}

			{/* 의사 프로필 카드 (overview.profile) */}
			{profile ? <ProfileCard profile={profile} onRefetch={onRefetch} /> : null}

			{/* 병원 카드 목록 */}
			{hospitals.length > 0 ? (
				<div className="flex flex-col gap-4">
					{hospitals.map((h) => (
						<HospitalCard
							key={h.hospital_no ?? h.slug ?? h.name}
							hospital={h}
							onPay={onPay}
							onPublish={onPublish}
							onRefetch={onRefetch}
						/>
					))}
				</div>
			) : null}

			{/* 병원은 만들었지만 프로필이 아직 없으면 제작 유도 */}
			{hospitals.length > 0 && profile == null ? <ProfileNudgeCard /> : null}

			{/* "새로 작성" 버튼 대신 최하단 카드로 병원 (추가) 제작 진입.
			    진행 중 draft가 있으면 새 대화를 시작할 수 없어 숨긴다. */}
			{!isEmpty && canStartNewDraft ? (
				<HospitalCreateCard
					hasHospital={hospitals.length > 0}
					onClick={() => onStartConversation("hospital")}
				/>
			) : null}
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────
// 빈 상태 — 병원(네이비)/프로필(흰색) 선택 카드 2장 + 카카오톡 채널 문의 CTA.
// 병원은 대화형, 프로필은 직접 입력으로 바로 시작한다.
// (의사 프로필 대화형 작성은 노출하지 않음.)
// ─────────────────────────────────────────────────────────────────────

// 두 카드의 아이콘/제목/설명이 같은 높이에 놓이도록 상단 기준으로 정렬한다
// (본문 줄 수가 달라 justify-center로는 행이 어긋난다).
const choiceCardBase =
	"flex min-h-64 cursor-pointer flex-col items-center gap-5 rounded-2xl px-6 pt-16 pb-10 text-center shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand/40 sm:min-h-96 sm:pt-24";

function EmptyStateCard({
	onStartConversation,
}: {
	onStartConversation: (mode: OnboardingMode) => void;
}) {
	const navigate = useNavigate();

	return (
		<div className="flex flex-col gap-10">
			<div className="grid gap-5 sm:grid-cols-2">
				{/* 병원 홈페이지 제작 — 대화형 시작 */}
				<button
					type="button"
					onClick={() => onStartConversation("hospital")}
					className={cn(choiceCardBase, "bg-[#1f3a63] hover:bg-[#264778]")}
				>
					<span className="flex size-14 items-center justify-center rounded-full bg-white/10">
						<Building2 className="size-7 text-white" />
					</span>
					<span className="flex flex-col gap-2">
						<span className="text-xl font-bold text-white">
							병원 홈페이지 제작
						</span>
						<span className="text-base leading-7 text-white/85">
							병원 정보를 입력하고 1분만에 제작해요
						</span>
					</span>
				</button>

				{/* 내 프로필 제작 — 직접 입력 폼으로 이동 */}
				<button
					type="button"
					onClick={() => navigate({ to: "/doctor/profile" })}
					className={cn(
						choiceCardBase,
						"border border-line-soft bg-surface hover:border-brand-200 hover:bg-brand-50/50",
					)}
				>
					<span className="flex size-14 items-center justify-center rounded-full bg-brand-50">
						<IdCard className="size-7 text-brand" />
					</span>
					<span className="flex flex-col gap-2">
						<span className="text-xl font-bold text-brand">내 프로필 제작</span>
						<span className="text-base leading-7 text-brand/80">
							프로필을 정리하세요.
							<br />
							회원님 전용 페이지로
							<br />
							외부에도 간편하게 공유
							<br />
							다국어도 지원 예정입니다.
						</span>
					</span>
				</button>
			</div>

			<KakaoChannelCta />
		</div>
	);
}

/** 이용 안내 — 카카오톡 채널 문의 (온보딩은 FAB 대신 이 CTA 하나로 유도). */
function KakaoChannelCta() {
	return (
		<div className="flex flex-col items-center gap-3.5">
			<p className="text-base font-bold text-ink">이용 방법이 궁금하신가요?</p>
			<a
				href={KAKAO_CHANNEL_URL}
				target="_blank"
				rel="noreferrer noopener"
				className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#fee500] px-6 py-3.5 text-base font-semibold text-[#191919] transition-[filter] hover:brightness-95 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand/40"
			>
				<KakaoTalkIcon className="size-5" />
				카카오톡 채널 문의
			</a>
		</div>
	);
}

// ─────────────────────────────────────────────────────────────────────
// 병원 홈페이지 제작 카드 — 대시보드 최하단의 새 병원 제작 진입점.
// 병원을 이미 만든 사용자에게는 "추가 제작"으로 문구를 바꿔 보여준다.
// ─────────────────────────────────────────────────────────────────────

function HospitalCreateCard({
	hasHospital,
	onClick,
}: {
	/** 이미 만든 병원이 있는지 — 있으면 추가 제작 문구로 노출. */
	hasHospital: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex cursor-pointer flex-col items-center gap-5 rounded-2xl bg-[#1f3a63] px-6 py-14 text-center shadow-sm transition-colors hover:bg-[#264778] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand/40"
		>
			<span className="flex size-14 items-center justify-center rounded-full bg-white/10">
				<Building2 className="size-7 text-white" />
			</span>
			<span className="flex flex-col gap-2">
				<span className="text-xl font-bold text-white">
					{hasHospital ? "병원 홈페이지 추가 제작" : "병원 홈페이지 제작"}
				</span>
				<span className="text-base leading-7 text-white/85">
					{hasHospital
						? "새 병원 정보를 입력하고 홈페이지를 하나 더 만들어요"
						: "병원 정보를 입력하고 1분만에 제작해요"}
				</span>
			</span>
		</button>
	);
}

// ─────────────────────────────────────────────────────────────────────
// 프로필 제작 유도 카드 — 병원은 만들었지만 프로필이 아직 없을 때.
// ─────────────────────────────────────────────────────────────────────

function ProfileNudgeCard() {
	const navigate = useNavigate();

	return (
		<button
			type="button"
			onClick={() => navigate({ to: "/doctor/profile" })}
			className="flex flex-col items-center gap-5 rounded-2xl border border-line-soft bg-surface px-6 py-14 text-center shadow-sm transition-colors hover:border-brand-200 hover:bg-brand-50/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand/40"
		>
			<span className="flex size-14 items-center justify-center rounded-full bg-brand-50">
				<IdCard className="size-7 text-brand" />
			</span>
			<span className="text-xl font-bold text-brand">내 프로필 제작</span>
			<span className="flex flex-col gap-5 text-base leading-7 text-brand/80">
				<span>
					병원 홈페이지를 제작하셨다면
					<br />내 의사 정보를 환자에게 알려주세요
				</span>
				<span>
					내 프로필을 제작해야
					<br />
					병원 홈페이지에 정보를 띄울 수 있어요
				</span>
			</span>
		</button>
	);
}

// ─────────────────────────────────────────────────────────────────────
// draft 카드
// ─────────────────────────────────────────────────────────────────────

function DraftCard({
	draft,
	onContinue,
	onDelete,
	deleting,
}: {
	draft: OverviewDraft;
	onContinue: () => void;
	onDelete: () => void;
	deleting: boolean;
}) {
	const progress = clampPercent(draft.progress_percent);
	const title = draft.name?.trim() ? draft.name : "진행 중인 작성";
	const nextQuestion = draft.next_question?.trim() ? draft.next_question : null;
	// 세션 모드 — mode('hospital'|'profile') 우선, 구 is_clinic_owner는 하위호환.
	const draftMode: "hospital" | "profile" | null =
		draft.mode === "hospital" || draft.mode === "profile"
			? draft.mode
			: draft.is_clinic_owner != null
				? draft.is_clinic_owner
					? "hospital"
					: "profile"
				: null;

	return (
		<CardShell
			title={title}
			action={
				<div className="flex flex-wrap items-center justify-end gap-2">
					<Badge variant="warning">작성 중</Badge>
					{draftMode ? (
						<Badge variant="soft">
							{draftMode === "hospital" ? "병원 홈페이지" : "프로필"}
						</Badge>
					) : null}
				</div>
			}
		>
			<div className="flex flex-col gap-4 p-5 sm:p-8">
				<div className="flex flex-col gap-2">
					<div className="flex items-center justify-between gap-3">
						<span className="text-base text-body-soft">진행률</span>
						<span className="text-base font-medium text-body-soft">
							{progress}% 완료
						</span>
					</div>
					<div className="h-2 w-full overflow-hidden rounded-full bg-line-soft">
						<div
							className="h-full rounded-full bg-brand transition-all duration-500"
							style={{ width: `${progress}%` }}
						/>
					</div>
				</div>

				{nextQuestion ? (
					<div className="rounded-xl border border-line bg-app-bg px-4 py-3">
						<p className="text-[15px] font-medium text-body-soft">다음 질문</p>
						<p className="mt-1 text-base text-body">{nextQuestion}</p>
					</div>
				) : null}

				<div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
					<Button
						variant="destructive"
						size="xl"
						className="border-[#fee2e2] bg-white text-[#f87171] hover:bg-[#fef2f2]"
						onClick={onDelete}
						disabled={deleting}
					>
						{deleting ? (
							<Loader2 className="size-4 animate-spin" />
						) : (
							<Trash2 className="size-4" />
						)}
						삭제
					</Button>
					<Button variant="brand" size="xl" onClick={onContinue}>
						이어서 작성
						<ArrowRight className="size-4" />
					</Button>
				</div>
			</div>
		</CardShell>
	);
}

// ─────────────────────────────────────────────────────────────────────
// 의사 프로필 카드 (overview.profile)
//  게시 가능 여부는 status로 판단(editing → 발행, published → 공개 링크).
//  완성도(%)는 프로필이 아닌 draft에만 오므로 여기서는 표시하지 않는다.
// ─────────────────────────────────────────────────────────────────────

function ProfileCard({
	profile,
	onRefetch,
}: {
	profile: OverviewProfile;
	onRefetch: () => void;
}) {
	const queryClient = useQueryClient();
	const published =
		profile.status === "published" || profile.is_published === true;
	const slug = profile.slug?.trim() || null;
	const name = profile.display_name?.trim() || "원장님";
	const kmadocUrl = slug ? `https://${slug}.kmadoc.com` : null;
	const [slugInput, setSlugInput] = useState("");
	const needsSlug = !slug;
	const validSlug = isSlugValid(slugInput);

	// 공개 전 디자인 시안 선택(전체화면). 열릴 때만 /profile/me 를 불러 미리보기.
	const [designOpen, setDesignOpen] = useState(false);
	const [pickedTemplate, setPickedTemplate] = useState<string | null>(null);
	const { data: previewDoc } = useQuery({
		queryKey: ["profile", "me"],
		queryFn: getProfile,
		enabled: designOpen,
	});
	const currentTemplate =
		pickedTemplate ??
		(typeof previewDoc?.template_key === "string"
			? previewDoc.template_key
			: "blue");
	const templateMutation = useMutation({
		mutationFn: (tk: string) => patchProfile({ template_key: tk }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["profile", "me"] });
			queryClient.invalidateQueries({ queryKey: ["onboarding", "overview"] });
			setDesignOpen(false);
			setPickedTemplate(null);
			toast.success("디자인 시안을 저장했어요.");
			onRefetch();
		},
		onError: (err) => toastApiError(err),
	});

	// 발행하기 → 프로필 발행 API(병원 publish와 대칭). slug 미설정 시 먼저 설정 후 공개.
	const publishMutation = useMutation({
		mutationFn: async () => {
			if (needsSlug) await setProfileSlug(slugInput.trim());
			return publishProfile();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["onboarding", "overview"] });
			toast.success("프로필을 공개했어요.");
			onRefetch();
		},
		onError: (err) => toastApiError(err),
	});
	const unpublishMutation = useMutation({
		mutationFn: unpublishProfile,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["onboarding", "overview"] });
			toast.success("프로필 공개를 해제했어요.");
			onRefetch();
		},
		onError: (err) => toastApiError(err),
	});

	const rows: Array<{ label: string; value: string }> = [];
	if (slug) rows.push({ label: "공개 주소", value: `${slug}.kmadoc.com` });

	// 전체화면 디자인 시안 선택 — 저장된 프로필로 미리보며 시안을 고르고 바로 저장.
	if (designOpen) {
		return (
			<DesignPreviewScreen
				swatches={PROFILE_TEMPLATE_SWATCHES}
				templateKey={currentTemplate}
				preview={
					<ProfileLivePreview
						payload={buildProfilePreviewBundleFromDoc(
							previewDoc,
							currentTemplate,
						)}
					/>
				}
				onTemplateChange={setPickedTemplate}
				onBack={() => {
					setDesignOpen(false);
					setPickedTemplate(null);
				}}
				onConfirm={() => templateMutation.mutate(currentTemplate)}
				confirming={templateMutation.isPending}
				confirmLabel="이 디자인 저장"
			/>
		);
	}

	return (
		<CardShell
			title={`${name} 프로필`}
			action={
				<Badge variant={published ? "success" : "soft"}>
					{published ? "공개 중" : "작성 중"}
				</Badge>
			}
		>
			{/* 공개 주소 — 구독 상태 카드와 동일한 InfoRows */}
			{rows.length > 0 ? <InfoRows rows={rows} /> : null}

			{/* 상태별 게시 액션 — status 기준 */}
			<div
				className={cn(
					"flex flex-col gap-3 p-5 sm:p-8",
					rows.length > 0 && "border-t border-line-soft",
				)}
			>
				{published ? (
					<>
						<InfoCallout tone="success">
							<p className="text-base">
								의사 프로필이 공개 중입니다. 내용 편집은 "프로필 관리"에서 할 수
								있어요.
							</p>
						</InfoCallout>
						<div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
							<Button
								nativeButton={false}
								render={<Link to="/doctor/profile" />}
								variant="neutral-outline"
								size="xl"
							>
								<PenLine className="size-4" />
								프로필 관리
							</Button>
							{kmadocUrl ? (
								<Button
									nativeButton={false}
									render={
										// biome-ignore lint/a11y/useAnchorContent: Button이 자식으로 콘텐츠를 주입한다.
										<a
											href={kmadocUrl}
											target="_blank"
											rel="noreferrer"
											aria-label="공개 페이지 보기"
										/>
									}
									variant="brand-outline"
									size="xl"
								>
									<ExternalLink className="size-4" />
									공개 페이지 보기
								</Button>
							) : null}
							<Button
								variant="neutral-outline"
								size="xl"
								onClick={() => unpublishMutation.mutate()}
								disabled={unpublishMutation.isPending}
							>
								{unpublishMutation.isPending ? (
									<Loader2 className="size-4 animate-spin" />
								) : null}
								공개 해제
							</Button>
						</div>
					</>
				) : (
					<>
						<InfoCallout tone="info">
							<p className="text-base">
								의사 프로필이 아직 비공개예요. "프로필 관리"에서 내용을 채운 뒤
								공개 주소를 정하고 공개하면 게시됩니다.
							</p>
						</InfoCallout>
						{needsSlug ? (
							<SlugField
								label="공개 주소"
								domain=".kmadoc.com"
								value={slugInput}
								onChange={setSlugInput}
								placeholder="예: hong-gildong"
								invalid={slugInput.length > 0 && !validSlug}
								description="공개 시 사용할 주소예요. 한 번 정하면 바꿀 수 없어요."
							/>
						) : null}
						<div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
							<Button
								variant="neutral-outline"
								size="xl"
								onClick={() => setDesignOpen(true)}
							>
								<Palette className="size-4" />
								디자인 선택
							</Button>
							<Button
								nativeButton={false}
								render={<Link to="/doctor/profile" />}
								variant="neutral-outline"
								size="xl"
							>
								<PenLine className="size-4" />
								프로필 관리
							</Button>
							<Button
								variant="brand"
								size="xl"
								onClick={() => publishMutation.mutate()}
								disabled={
									publishMutation.isPending || (needsSlug && !validSlug)
								}
							>
								{publishMutation.isPending ? (
									<Loader2 className="size-4 animate-spin" />
								) : null}
								공개하기
							</Button>
						</div>
					</>
				)}
			</div>
		</CardShell>
	);
}

// ─────────────────────────────────────────────────────────────────────
// 병원 카드
// ─────────────────────────────────────────────────────────────────────

function HospitalCard({
	hospital,
	onPay,
	onPublish,
	onRefetch,
}: {
	hospital: OverviewHospital;
	onPay: (payment: PaymentIntent) => void;
	onPublish: (hospital: OverviewHospital) => void;
	onRefetch: () => void;
}) {
	const queryClient = useQueryClient();
	const status = hospital.status;
	const title = hospital.name?.trim() ? hospital.name : "이름 미정 병원";

	const deleteMutation = useMutation({
		mutationFn: (no: number) => deleteHospital(no),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["onboarding", "overview"] });
			onRefetch();
		},
		onError: (err) => toastApiError(err),
	});

	function handleDelete() {
		if (hospital.hospital_no == null) return;
		const ok = window.confirm(
			`'${title}' 병원을 삭제할까요?\n결제 전 입력한 내용은 복구할 수 없습니다.`,
		);
		if (!ok) return;
		deleteMutation.mutate(hospital.hospital_no);
	}

	const rows = hospitalRows(hospital);
	const hasActions =
		status === "pending_payment" ||
		status === "ready_to_publish" ||
		status === "published";

	return (
		<CardShell title={title} action={<HospitalStatusBadge status={status} />}>
			{/* 메타 정보 — 구독 상태 카드와 동일한 InfoRows */}
			{rows.length > 0 ? <InfoRows rows={rows} /> : null}

			{/* 상태별 액션 */}
			{hasActions ? (
				<div
					className={cn(
						"flex flex-col gap-3 p-5 sm:p-8",
						rows.length > 0 && "border-t border-line-soft",
					)}
				>
					{status === "pending_payment" ? (
						<>
							<InfoCallout tone="warning">
								<p className="text-base">
									아직 결제 전이에요. 정기 결제 카드를 등록하면 병원 홈페이지를
									공개할 수 있습니다.
								</p>
								<KakaoSupportLink
									variant="inline"
									className="mt-1.5 text-base"
									label="결제가 안 되면 카카오톡으로 문의하기"
								/>
							</InfoCallout>
							<div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
								<Button
									variant="destructive"
									size="xl"
									className="border-[#fee2e2] bg-white text-[#f87171] hover:bg-[#fef2f2]"
									onClick={handleDelete}
									disabled={deleteMutation.isPending}
								>
									{deleteMutation.isPending ? (
										<Loader2 className="size-4 animate-spin" />
									) : (
										<Trash2 className="size-4" />
									)}
									삭제
								</Button>
								<Button
									variant="brand"
									size="xl"
									disabled={!hospital.payment}
									onClick={() => hospital.payment && onPay(hospital.payment)}
								>
									결제하기
									<ArrowRight className="size-4" />
								</Button>
							</div>
						</>
					) : null}

					{status === "ready_to_publish" ? (
						<>
							<InfoCallout tone="info">
								<p className="text-base">
									결제가 완료됐어요. 공개 주소를 정하고 공개하면 병원 홈페이지가
									공개됩니다.
								</p>
							</InfoCallout>
							<div className="flex justify-end">
								<Button
									variant="brand"
									size="xl"
									onClick={() => onPublish(hospital)}
								>
									공개하기
									<ArrowRight className="size-4" />
								</Button>
							</div>
						</>
					) : null}

					{status === "published" ? (
						<>
							{hospital.subscription_status === "past_due" ? (
								<InfoCallout tone="warning">
									<p className="text-base">
										정기 결제가 연체된 상태입니다. 구독 관리에서 결제수단을
										갱신해 주세요.
									</p>
									<KakaoSupportLink
										variant="inline"
										className="mt-1.5 text-base"
										label="결제가 안 되면 카카오톡으로 문의하기"
									/>
								</InfoCallout>
							) : (
								<InfoCallout tone="success">
									<p className="text-base">
										병원 홈페이지가 공개 중입니다. 콘텐츠 등 일상 관리는 별도
										관리자 페이지에서 진행해 주세요.
									</p>
								</InfoCallout>
							)}
							<div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
								{hospital.hospital_no != null ? (
									<Button
										nativeButton={false}
										render={
											<Link
												to="/subscription/$hospitalNo"
												params={{ hospitalNo: String(hospital.hospital_no) }}
											/>
										}
										variant="neutral-outline"
										size="xl"
									>
										<CreditCard className="size-4" />
										구독 관리
									</Button>
								) : null}
								{hospital.slug?.trim() ? (
									<Button
										nativeButton={false}
										render={
											// biome-ignore lint/a11y/useAnchorContent: Button이 자식으로 콘텐츠를 주입한다.
											<a
												href={`https://${hospital.slug}.kmaclinic.com`}
												target="_blank"
												rel="noreferrer"
												aria-label="공개 페이지 보기"
											/>
										}
										variant="brand-outline"
										size="xl"
									>
										<ExternalLink className="size-4" />
										공개 페이지 보기
									</Button>
								) : null}
							</div>
						</>
					) : null}
				</div>
			) : null}
		</CardShell>
	);
}

function HospitalStatusBadge({ status }: { status: string }) {
	// 카드의 flex-col 안에서 stretch되어 가로로 늘어나지 않도록 w-fit 고정.
	if (status === "pending_payment") {
		return (
			<Badge variant="warning" className="w-fit">
				결제 대기
			</Badge>
		);
	}
	if (status === "ready_to_publish") {
		return (
			<Badge variant="soft" className="w-fit">
				공개 대기
			</Badge>
		);
	}
	if (status === "published") {
		return (
			<Badge variant="success" className="w-fit">
				공개 중
			</Badge>
		);
	}
	return (
		<Badge variant="outline" className="w-fit">
			{status}
		</Badge>
	);
}

/** 병원 카드 InfoRows용 라벨/값 행 (지역·공개 주소·구독 상태·다음 갱신). */
function hospitalRows(
	hospital: OverviewHospital,
): Array<{ label: string; value: string }> {
	const rows: Array<{ label: string; value: string }> = [];

	if (hospital.region?.trim()) {
		rows.push({ label: "지역", value: hospital.region });
	}
	if (hospital.slug?.trim()) {
		rows.push({ label: "공개 주소", value: `${hospital.slug}.kmaclinic.com` });
	}
	if (hospital.subscription_status?.trim()) {
		rows.push({
			label: "구독 상태",
			value: subscriptionStatusLabel(hospital.subscription_status),
		});
	}
	const periodEnd = formatDate(hospital.current_period_end);
	if (periodEnd) {
		rows.push({ label: "다음 갱신 예정", value: periodEnd });
	}

	return rows;
}

// ─────────────────────────────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────────────────────────────

function clampPercent(value: number | undefined): number {
	if (typeof value !== "number" || Number.isNaN(value)) return 0;
	return Math.max(0, Math.min(100, Math.round(value)));
}

function subscriptionStatusLabel(status: string): string {
	const map: Record<string, string> = {
		active: "이용 중",
		past_due: "결제 연체",
		canceled: "해지됨",
		paused: "일시 정지",
	};
	return map[status] ?? status;
}

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
	year: "numeric",
	month: "long",
	day: "numeric",
});

function formatDate(value: string | null | undefined): string | null {
	if (!value) return null;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	return dateFormatter.format(date);
}
