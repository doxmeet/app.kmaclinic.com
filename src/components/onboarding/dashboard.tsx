import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Building2, IdCard, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { CardShell } from "#/components/common/card-shell.tsx";
import { InfoCallout } from "#/components/common/info-callout.tsx";
import { KakaoTalkIcon } from "#/components/common/kakao-icon.tsx";
import { KakaoSupportLink } from "#/components/common/kakao-support-link.tsx";
import { isSlugValid } from "#/components/onboarding/slug.ts";
import { SlugField } from "#/components/onboarding/slug-field.tsx";
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
	publishHospital,
	setHospitalSlug,
	setProfileSlug,
} from "#/lib/api/billing.ts";
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
	publishProfile,
	unpublishProfile,
} from "#/lib/api/profile.ts";
import { toastApiError } from "#/lib/api-error-message.ts";
import { KAKAO_CHANNEL_URL } from "#/lib/support.ts";
import { cn } from "#/lib/utils.ts";

const OVERVIEW_KEY = ["onboarding", "overview"] as const;

/**
 * 온보딩 대시보드 — 내 병원/프로필 목록.
 * PC(lg+)에서 좌측 2/3는 병원(진행중 draft 포함), 우측 1/3은 의사 프로필 카드로 나눈다.
 * 하위 흐름(대화/결제)은 부모 오케스트레이터(`/onboarding`)가 모드로 전환하고,
 * 공개 주소 설정(게시)은 병원 카드 안에서 인라인으로 처리한다.
 */
export function OnboardingDashboard({
	overview,
	onStartConversation,
	onContinueDraft,
	onPay,
	onRefetch,
}: {
	overview: Overview;
	/** 대화형으로 새로 시작 → conversation 모드(병원/프로필). */
	onStartConversation: (mode: OnboardingMode) => void;
	/** draft "이어서 작성" → conversation 모드. */
	onContinueDraft: () => void;
	/** 병원 카드 "결제하기" → payment 모드. */
	onPay: (payment: PaymentIntent) => void;
	/** 액션(삭제/게시 등) 후 overview 새로고침. */
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
			queryClient.invalidateQueries({ queryKey: OVERVIEW_KEY });
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

	// 빈 상태 — 선택 카드 2장은 좁은 폭이 보기 좋아 720px로 가운데 정렬.
	if (isEmpty) {
		return (
			<div className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
				<h1 className="text-2xl font-bold text-ink">내 병원·프로필</h1>
				<EmptyStateCard onStartConversation={onStartConversation} />
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			{/* 헤더 */}
			<h1 className="text-2xl font-bold text-ink">내 병원·프로필</h1>

			<div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
				{/* ── 좌측 2/3: 병원 ─────────────────────────────── */}
				<div className="flex min-w-0 flex-col gap-5">
					{draft ? (
						<DraftCard
							draft={draft}
							onContinue={onContinueDraft}
							onDelete={handleDeleteDraft}
							deleting={resetMutation.isPending}
						/>
					) : null}

					{hospitals.map((h) => (
						<HospitalCard
							key={h.hospital_no ?? h.slug ?? h.name}
							hospital={h}
							onPay={onPay}
							onRefetch={onRefetch}
						/>
					))}

					{/* 최하단 네이비 배너로 병원 (추가) 제작 진입.
					    진행 중 draft가 있으면 새 대화를 시작할 수 없어 숨긴다. */}
					{canStartNewDraft ? (
						<HospitalCreateCard
							hasHospital={hospitals.length > 0}
							onClick={() => onStartConversation("hospital")}
						/>
					) : null}
				</div>

				{/* ── 우측 1/3: 의사 프로필 ──────────────────────── */}
				<div className="min-w-0">
					{profile ? (
						<ProfileCard profile={profile} onRefetch={onRefetch} />
					) : (
						<ProfileEmptyCard />
					)}
				</div>
			</div>
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
// 병원 홈페이지 제작 카드 — 병원 목록 최하단의 새 병원 제작 진입점.
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
			className="flex cursor-pointer flex-col items-center gap-5 rounded-2xl bg-[#1f3a63] px-6 py-6 text-center shadow-sm transition-colors hover:bg-[#264778] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand/40"
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
			variant="form"
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
			<div className="flex flex-col gap-4 px-5 pb-5 sm:px-8 sm:pb-8">
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
// 의사 프로필 카드 (우측 1/3 열)
//  사진·대표 진료과는 overview에 없어 /profile/me에서 가져온다(React Query 캐시 공유).
//  게시 가능 여부는 status로 판단(editing → 공개하기, published → url 복사).
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
	const [slugInput, setSlugInput] = useState("");
	const needsSlug = !slug;
	const validSlug = isSlugValid(slugInput);

	const { data: doc } = useQuery({
		queryKey: ["profile", "me"],
		queryFn: getProfile,
	});
	const photoUrl =
		typeof doc?.photo_url === "string" && doc.photo_url.trim()
			? doc.photo_url
			: null;
	const department =
		typeof doc?.primary_department_text === "string"
			? doc.primary_department_text.trim()
			: "";

	// 공개하기 → 프로필 발행 API(병원 publish와 대칭). slug 미설정 시 먼저 설정 후 공개.
	const publishMutation = useMutation({
		mutationFn: async () => {
			if (needsSlug) await setProfileSlug(slugInput.trim());
			return publishProfile();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: OVERVIEW_KEY });
			toast.success("프로필을 공개했어요.");
			onRefetch();
		},
		onError: (err) => toastApiError(err),
	});
	const unpublishMutation = useMutation({
		mutationFn: unpublishProfile,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: OVERVIEW_KEY });
			toast.success("프로필 공개를 해제했어요.");
			onRefetch();
		},
		onError: (err) => toastApiError(err),
	});

	async function copyProfileUrl() {
		if (!slug) return;
		const url = `https://${slug}.kmadoc.com`;
		try {
			await navigator.clipboard.writeText(url);
			toast.success("프로필 주소를 복사했어요.");
		} catch {
			toast.error(`복사하지 못했어요. 주소: ${url}`);
		}
	}

	return (
		<section className="flex flex-col items-center gap-6 rounded-xl border border-line-soft bg-surface p-6 text-center shadow-sm sm:p-8">
			{photoUrl ? (
				<img
					src={photoUrl}
					alt={`${name} 사진`}
					className="size-44 rounded-xl bg-muted object-cover"
				/>
			) : (
				<img src="/profile.png" alt="" className="w-40" />
			)}

			<div className="flex flex-col gap-1">
				<p className="text-xl font-bold text-ink">{name}</p>
				{department ? (
					<p className="text-base text-body-soft">{department}</p>
				) : null}
			</div>

			<div className="flex w-full flex-col gap-2.5">
				{/* 좁은 카드에서 파란 글로우가 도드라져 그림자는 뺀다. */}
				<Button
					nativeButton={false}
					render={<Link to="/doctor/profile" />}
					variant="brand"
					size="xl"
					className="w-full shadow-none"
				>
					프로필 수정하기
				</Button>

				{published && slug ? (
					<Button
						variant="neutral-outline"
						size="xl"
						className="w-full"
						onClick={copyProfileUrl}
					>
						프로필 URL 복사
					</Button>
				) : (
					<>
						{needsSlug ? (
							<div className="text-left">
								<SlugField
									label="공개 주소"
									domain=".kmadoc.com"
									value={slugInput}
									onChange={setSlugInput}
									placeholder="예: hong-gildong"
									disabled={publishMutation.isPending}
									invalid={slugInput.length > 0 && !validSlug}
									description={
										<>
											공개 시 사용할 주소예요.
											<br />한 번 정하면 바꿀 수 없어요.
										</>
									}
								/>
							</div>
						) : null}
						<Button
							variant="neutral-outline"
							size="xl"
							className="w-full"
							onClick={() => publishMutation.mutate()}
							disabled={publishMutation.isPending || (needsSlug && !validSlug)}
						>
							{publishMutation.isPending ? (
								<Loader2 className="size-4 animate-spin" />
							) : null}
							프로필 공개하기
						</Button>
					</>
				)}
			</div>

			{published ? (
				<button
					type="button"
					onClick={() => unpublishMutation.mutate()}
					disabled={unpublishMutation.isPending}
					className="cursor-pointer text-[15px] text-body-soft underline-offset-4 hover:underline disabled:opacity-50"
				>
					공개 해제
				</button>
			) : null}
		</section>
	);
}

/** 프로필이 아직 없을 때 — 일러스트 + 제작 유도 (public/profile.png). */
function ProfileEmptyCard() {
	return (
		<section className="flex flex-col items-center gap-6 rounded-xl border border-line-soft bg-surface p-6 text-center shadow-sm sm:p-8">
			<img src="/profile.png" alt="" className="w-40" />
			<div className="flex flex-col gap-2">
				<h2 className="text-xl font-bold text-ink">내 프로필</h2>
				<p className="text-base leading-7 break-keep text-body-soft">
					프로필을 추가해야
					<br />
					병원 의료진 소개에
					<br />
					추가하실 수 있습니다.
				</p>
			</div>
			<Button
				nativeButton={false}
				render={<Link to="/doctor/profile" />}
				variant="brand"
				size="xl"
				className="w-full shadow-none"
			>
				내 프로필 추가하기
			</Button>
		</section>
	);
}

// ─────────────────────────────────────────────────────────────────────
// 병원 카드
//  published: 홈페이지 주소 행 + 관리 버튼 행.
//  ready_to_publish: 카드 안에서 바로 주소 입력 + "주소 정하기"(인라인 게시).
//  pending_payment: 결제 유도(삭제/결제하기).
// ─────────────────────────────────────────────────────────────────────

function HospitalCard({
	hospital,
	onPay,
	onRefetch,
}: {
	hospital: OverviewHospital;
	onPay: (payment: PaymentIntent) => void;
	onRefetch: () => void;
}) {
	const queryClient = useQueryClient();
	const status = hospital.status;
	const title = hospital.name?.trim() ? hospital.name : "이름 미정 병원";
	const slug = hospital.slug?.trim() || null;

	const deleteMutation = useMutation({
		mutationFn: (no: number) => deleteHospital(no),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: OVERVIEW_KEY });
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

	// ── 인라인 게시(공개 주소 설정) — ready_to_publish 카드 안에서 바로 처리 ──
	const [slugInput, setSlugInput] = useState(() => slug ?? "");
	const [touched, setTouched] = useState(false);
	const validSlug = isSlugValid(slugInput.trim());

	const publishMutation = useMutation({
		mutationFn: async () => {
			if (hospital.hospital_no == null) {
				throw new Error("병원 정보를 찾을 수 없습니다.");
			}
			await setHospitalSlug(hospital.hospital_no, slugInput.trim());
			await publishHospital(hospital.hospital_no);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: OVERVIEW_KEY });
			toast.success("병원 홈페이지를 공개했어요.");
			onRefetch();
		},
		onError: (err) => toastApiError(err),
	});

	function handlePublish() {
		if (!validSlug || publishMutation.isPending) return;
		const ok = window.confirm(
			`'${slugInput.trim()}.kmaclinic.com' 주소로 홈페이지를 공개할까요?\n주소는 한번 정해지면 바꿀 수 없습니다.`,
		);
		if (!ok) return;
		publishMutation.mutate();
	}

	return (
		// 대시보드 카드는 헤더-본문 구분선 없이 한 덩어리로 보여준다(variant="form").
		// 본문 상단 여백은 헤더의 하단 패딩이 담당하므로 pt는 주지 않는다.
		<CardShell
			title={title}
			action={<HospitalStatusBadge status={status} />}
			variant="form"
		>
			{status === "published" ? (
				<div className="flex flex-col gap-4 px-5 pb-5 sm:gap-5 sm:px-8 sm:pb-8">
					{slug ? (
						<div className="flex flex-col gap-1 sm:flex-row sm:items-center">
							<span className="text-[15px] text-body-soft sm:w-35 sm:shrink-0 sm:text-[17px]">
								홈페이지 주소
							</span>
							<span className="text-[16px] text-ink sm:text-[17px]">
								{slug}.kmaclinic.com
							</span>
						</div>
					) : null}
					{hospital.subscription_status === "past_due" ? (
						<InfoCallout tone="warning">
							<p className="text-base">
								정기 결제가 연체된 상태입니다. 구독 관리에서 결제수단을 갱신해
								주세요.
							</p>
							<KakaoSupportLink
								variant="inline"
								className="mt-1.5 text-base"
								label="결제가 안 되면 카카오톡으로 문의하기"
							/>
						</InfoCallout>
					) : null}
					<HospitalActionPills hospital={hospital} published />
				</div>
			) : null}

			{status === "ready_to_publish" ? (
				<div className="flex flex-col gap-5 px-5 pb-5 sm:px-8 sm:pb-8">
					<SlugField
						label="홈페이지 주소"
						domain=".kmaclinic.com"
						value={slugInput}
						onChange={(v) => {
							setSlugInput(v);
							setTouched(true);
						}}
						placeholder="예: hong-gildong"
						disabled={publishMutation.isPending}
						invalid={touched && slugInput.trim().length > 0 && !validSlug}
						description="주소는 한번 정해지면 바꿀 수 없어요."
					/>
					<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<HospitalActionPills hospital={hospital} published={false} />
						<Button
							variant="brand"
							size="xl"
							onClick={handlePublish}
							disabled={!validSlug || publishMutation.isPending}
						>
							{publishMutation.isPending ? (
								<Loader2 className="size-4 animate-spin" />
							) : null}
							주소 정하기
							<ArrowRight className="size-4" />
						</Button>
					</div>
				</div>
			) : null}

			{status === "pending_payment" ? (
				<div className="flex flex-col gap-3 px-5 pb-5 sm:px-8 sm:pb-8">
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
				</div>
			) : null}
		</CardShell>
	);
}

/**
 * 병원 관리 버튼 행 — 구독관리/관리페이지/페이지보기.
 * 관리페이지는 공개 사이트의 `/admin`. slug가 없으면(공개 전) 페이지보기와 함께 비활성.
 */
function HospitalActionPills({
	hospital,
	published,
}: {
	hospital: OverviewHospital;
	published: boolean;
}) {
	const slug = hospital.slug?.trim() || null;
	return (
		<div className="flex flex-wrap gap-2">
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
					구독관리
				</Button>
			) : null}
			{slug ? (
				<Button
					nativeButton={false}
					render={
						// biome-ignore lint/a11y/useAnchorContent: Button이 자식으로 콘텐츠를 주입한다.
						<a
							href={`https://${slug}.kmaclinic.com/admin`}
							target="_blank"
							rel="noreferrer"
							aria-label="관리페이지"
						/>
					}
					variant="neutral-outline"
					size="xl"
				>
					관리페이지
				</Button>
			) : (
				<Button variant="neutral-outline" size="xl" disabled>
					관리페이지
				</Button>
			)}
			{published && slug ? (
				<Button
					nativeButton={false}
					render={
						// biome-ignore lint/a11y/useAnchorContent: Button이 자식으로 콘텐츠를 주입한다.
						<a
							href={`https://${slug}.kmaclinic.com`}
							target="_blank"
							rel="noreferrer"
							aria-label="페이지보기"
						/>
					}
					variant="neutral-outline"
					size="xl"
				>
					페이지보기
				</Button>
			) : (
				<Button variant="neutral-outline" size="xl" disabled>
					페이지보기
				</Button>
			)}
		</div>
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

// ─────────────────────────────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────────────────────────────

function clampPercent(value: number | undefined): number {
	if (typeof value !== "number" || Number.isNaN(value)) return 0;
	return Math.max(0, Math.min(100, Math.round(value)));
}
