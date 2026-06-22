import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
	ArrowRight,
	ExternalLink,
	Loader2,
	MessageSquareText,
	PenLine,
	Plus,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { InfoCallout } from "#/components/common/info-callout.tsx";
import { SectionCard } from "#/components/common/section-card.tsx";
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import type {
	Overview,
	OverviewDraft,
	OverviewHospital,
	PaymentIntent,
} from "#/lib/api/onboarding.ts";
import { deleteHospital, resetSession } from "#/lib/api/onboarding.ts";
import { toastApiError } from "#/lib/api-error-message.ts";

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
	/** 대화형으로 새로 시작 → conversation 모드. */
	onStartConversation: () => void;
	/** draft "이어서 작성" → conversation 모드. */
	onContinueDraft: () => void;
	/** 병원 카드 "결제하기" → payment 모드. */
	onPay: (payment: PaymentIntent) => void;
	/** 병원 카드 "게시하기" → publish 모드. */
	onPublish: (hospital: OverviewHospital) => void;
	/** 액션(삭제 등) 후 overview 새로고침. */
	onRefetch: () => void;
}) {
	const navigate = useNavigate();
	const [menuOpen, setMenuOpen] = useState(false);

	const draft = overview.draft ?? null;
	const hospitals = overview.hospitals ?? [];
	// 진행 중인 작성(draft)은 한 번에 하나 → 이미 있으면 새로 시작 불가.
	// 이어서 쓰는 동작은 아래 draft 카드의 "이어서 작성"이 담당한다.
	const canStartNewDraft = overview.can_start_new_draft !== false;
	const hasDraft = draft != null;

	// ── draft 폐기(reset) ──────────────────────────────────────────
	const resetMutation = useMutation({
		mutationFn: resetSession,
		onSuccess: () => onRefetch(),
		onError: (err) => toastApiError(err),
	});

	function handleNewButtonClick() {
		if (!canStartNewDraft) return;
		setMenuOpen((v) => !v);
	}

	function handleDeleteDraft() {
		const ok = window.confirm(
			"진행 중이던 대화 내용을 삭제할까요?\n작성하던 초안은 복구할 수 없습니다.",
		);
		if (!ok) return;
		resetMutation.mutate();
	}

	const isEmpty = !hasDraft && hospitals.length === 0;

	return (
		<div className="flex flex-col gap-6">
			{/* 헤더 */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex flex-col gap-1">
					<h1 className="text-2xl font-bold text-ink">내 병원·프로필</h1>
					<p className="text-sm text-body-soft">
						만든 병원 홈페이지와 진행 중인 작업을 한곳에서 관리하세요.
					</p>
				</div>
				<div className="flex flex-col items-stretch gap-1.5 sm:items-end">
					<div className="relative w-full sm:w-auto">
						<Button
							variant="brand"
							size="2xl"
							onClick={handleNewButtonClick}
							disabled={!canStartNewDraft}
							aria-expanded={menuOpen}
							aria-haspopup="menu"
							className="w-full sm:w-auto"
						>
							<Plus className="size-5" />
							새로 작성
						</Button>

						{/* 대화형 / 직접입력 선택 메뉴 */}
						{menuOpen ? (
							<>
								{/* 바깥 클릭으로 닫기 */}
								<button
									type="button"
									aria-hidden
									tabIndex={-1}
									className="fixed inset-0 z-10 cursor-default"
									onClick={() => setMenuOpen(false)}
								/>
								<div className="absolute right-0 z-20 mt-2 w-full overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.25)] sm:w-64">
									<button
										type="button"
										onClick={() => {
											setMenuOpen(false);
											onStartConversation();
										}}
										className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-brand-50"
									>
										<MessageSquareText className="mt-0.5 size-5 shrink-0 text-brand" />
										<span className="flex flex-col">
											<span className="text-sm font-semibold text-ink">
												대화형으로 만들기
											</span>
											<span className="text-xs text-body-soft">
												질문에 답하며 차근차근 입력
											</span>
										</span>
									</button>
									<button
										type="button"
										onClick={() => {
											setMenuOpen(false);
											navigate({ to: "/onboarding/direct" });
										}}
										className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-brand-50"
									>
										<PenLine className="mt-0.5 size-5 shrink-0 text-brand" />
										<span className="flex flex-col">
											<span className="text-sm font-semibold text-ink">
												직접 입력하기
											</span>
											<span className="text-xs text-body-soft">
												한 폼에 전체 정보를 한 번에 입력
											</span>
										</span>
									</button>
								</div>
							</>
						) : null}
					</div>
					{!canStartNewDraft ? (
						<p className="text-xs text-body-soft sm:text-right">
							진행 중인 작성을 먼저 완료하거나 삭제해 주세요.
						</p>
					) : null}
				</div>
			</div>

			{/* 빈 상태 */}
			{isEmpty ? (
				<SectionCard className="flex flex-col items-center gap-5 py-12 text-center">
					<div className="flex size-14 items-center justify-center rounded-full bg-brand-50">
						<Plus className="size-7 text-brand" />
					</div>
					<div className="flex flex-col gap-1.5">
						<p className="text-lg font-semibold text-ink">
							아직 만든 항목이 없어요
						</p>
						<p className="text-sm text-body-soft">
							대화형 또는 직접 입력으로 병원 홈페이지·의사 프로필을 만들어
							보세요.
						</p>
					</div>
					<div className="flex flex-col gap-2 sm:flex-row">
						<Button variant="brand" size="2xl" onClick={onStartConversation}>
							<MessageSquareText className="size-5" />
							대화형으로 만들기
						</Button>
						<Button
							variant="neutral-outline"
							size="2xl"
							onClick={() => navigate({ to: "/onboarding/direct" })}
						>
							<PenLine className="size-5" />
							직접 입력하기
						</Button>
					</div>
				</SectionCard>
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
		</div>
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

	return (
		<SectionCard className="flex flex-col gap-4">
			<div className="flex items-start justify-between gap-3">
				<div className="flex flex-col gap-1">
					<div className="flex items-center gap-2">
						<Badge variant="warning">작성 중</Badge>
						{draft.is_clinic_owner != null ? (
							<Badge variant="soft">
								{draft.is_clinic_owner ? "병원 홈페이지까지" : "프로필만"}
							</Badge>
						) : null}
					</div>
					<p className="text-lg font-bold text-ink">{title}</p>
				</div>
				<span className="shrink-0 text-sm font-medium text-body-soft">
					{progress}% 완료
				</span>
			</div>

			<div className="h-2 w-full overflow-hidden rounded-full bg-line-soft">
				<div
					className="h-full rounded-full bg-brand transition-all duration-500"
					style={{ width: `${progress}%` }}
				/>
			</div>

			{nextQuestion ? (
				<div className="rounded-xl border border-line bg-app-bg px-4 py-3">
					<p className="text-xs font-medium text-body-soft">다음 질문</p>
					<p className="mt-1 text-sm text-body">{nextQuestion}</p>
				</div>
			) : null}

			<div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
				<Button
					variant="neutral-outline"
					size="xl"
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
		</SectionCard>
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
	const status = hospital.status;
	const title = hospital.name?.trim() ? hospital.name : "이름 미정 병원";

	const deleteMutation = useMutation({
		mutationFn: (no: number) => deleteHospital(no),
		onSuccess: () => onRefetch(),
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

	return (
		<SectionCard className="flex flex-col gap-4">
			<div className="flex items-start justify-between gap-3">
				<div className="flex flex-col gap-1.5">
					<HospitalStatusBadge status={status} />
					<p className="text-lg font-bold text-ink">{title}</p>
					{hospital.region?.trim() ? (
						<p className="text-sm text-body-soft">{hospital.region}</p>
					) : null}
				</div>
			</div>

			{/* 메타 정보 */}
			<HospitalMeta hospital={hospital} />

			{/* 상태별 액션 */}
			{status === "pending_payment" ? (
				<div className="flex flex-col gap-3">
					<InfoCallout tone="warning">
						<p className="text-sm">
							아직 결제 전이에요. 정기 결제 카드를 등록하면 병원 홈페이지를
							공개할 수 있습니다.
						</p>
					</InfoCallout>
					<div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
						<Button
							variant="neutral-outline"
							size="xl"
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

			{status === "ready_to_publish" ? (
				<div className="flex flex-col gap-3">
					<InfoCallout tone="info">
						<p className="text-sm">
							결제가 완료됐어요. 공개 주소를 정하고 게시하면 병원 홈페이지가
							공개됩니다.
						</p>
					</InfoCallout>
					<div className="flex justify-end">
						<Button
							variant="brand"
							size="xl"
							onClick={() => onPublish(hospital)}
						>
							게시하기
							<ArrowRight className="size-4" />
						</Button>
					</div>
				</div>
			) : null}

			{status === "published" ? (
				<div className="flex flex-col gap-3">
					<InfoCallout tone="success">
						<p className="text-sm">
							병원 홈페이지가 공개 중입니다. 콘텐츠 등 일상 관리는 별도 관리자
							페이지에서 진행해 주세요.
						</p>
					</InfoCallout>
					{hospital.slug?.trim() ? (
						<div className="flex justify-end">
							<Button
								nativeButton={false}
								render={
									// biome-ignore lint/a11y/useAnchorContent: Button이 자식으로 콘텐츠를 주입한다.
									<a
										href={`https://${hospital.slug}.kmaclinic.com`}
										target="_blank"
										rel="noreferrer"
									/>
								}
								variant="brand-outline"
								size="xl"
							>
								<ExternalLink className="size-4" />
								공개 페이지 보기
							</Button>
						</div>
					) : null}
				</div>
			) : null}
		</SectionCard>
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
				게시 대기
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

function HospitalMeta({ hospital }: { hospital: OverviewHospital }) {
	const rows: Array<{ label: string; value: string }> = [];

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

	if (rows.length === 0) return null;

	return (
		<dl className="flex flex-col gap-2 rounded-xl border border-line bg-app-bg px-4 py-3">
			{rows.map((row) => (
				<div
					key={row.label}
					className="flex items-center justify-between gap-3 text-sm"
				>
					<dt className="text-body-soft">{row.label}</dt>
					<dd className="font-medium text-ink">{row.value}</dd>
				</div>
			))}
		</dl>
	);
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

function formatDate(value: string | null | undefined): string | null {
	if (!value) return null;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	return new Intl.DateTimeFormat("ko-KR", {
		year: "numeric",
		month: "long",
		day: "numeric",
	}).format(date);
}
