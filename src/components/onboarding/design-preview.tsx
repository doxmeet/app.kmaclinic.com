import { Loader2, Monitor, Smartphone } from "lucide-react";
import { useState } from "react";
import type { PreviewPayload } from "#/lib/preview.ts";
import { cn } from "#/lib/utils.ts";
import { LivePreview } from "./live-preview.tsx";

/**
 * 디자인 시안 미리보기·선택 — 전체화면 공용 셸 (Figma PC_미리보기 1:18885 / 모바일 1:12260).
 *
 * 상단 고정 바(항상 보임)의 색상 스와치로 시안(template_key)을 실시간 전환·선택하고,
 * 아래 영역은 미리보기 iframe이 채운다. 데스크톱/모바일 폭 토글 포함.
 *
 * 병원(결제 전)·프로필(공개 전) 양쪽에서 재사용한다:
 *  - 병원: `payload`만 주면 내부 `LivePreview`가 렌더(기본 스와치 t1~t5).
 *  - 프로필 등: `swatches` + `preview`(임의 iframe 노드)를 주입.
 */

type Swatch = { key: string; color: string; label: string };

/** 기본(병원) 시안 스와치 — key별 색: t1 블루 · t2 그린 · t3 퍼플 · t4 슬레이트 · t5 레드. */
const HOSPITAL_SWATCHES: Swatch[] = [
	{ key: "t1", color: "#2a64f6", label: "블루 · 신뢰감 있는 기본형" },
	{ key: "t2", color: "#74ef44", label: "그린 · 친근한 동네 병원" },
	{ key: "t3", color: "#8b5cf6", label: "퍼플 · 모던 클리닉" },
	{ key: "t4", color: "#334155", label: "슬레이트 · 종합병원형" },
	{ key: "t5", color: "#ef4444", label: "레드 · 캠페인 강조형" },
];

type Device = "desktop" | "mobile";

export function DesignPreviewScreen({
	payload,
	preview,
	swatches = HOSPITAL_SWATCHES,
	templateKey,
	onTemplateChange,
	onBack,
	onConfirm,
	confirming = false,
	confirmLabel = "이 디자인으로 결제하기",
	backLabel = "수정하기",
	showGuides = false,
}: {
	/** 병원 미리보기 편의 — 주면 내부 LivePreview로 렌더(preview 미지정 시). */
	payload?: PreviewPayload;
	/** 임의 미리보기 iframe 노드(프로필 등). 주면 payload 대신 이걸 렌더. */
	preview?: React.ReactNode;
	/** 시안 스와치 목록(미지정 시 병원 t1~t5). */
	swatches?: Swatch[];
	templateKey: string;
	onTemplateChange: (key: string) => void;
	/** 미지정 시 뒤로가기(수정하기) 버튼을 렌더하지 않는다 — 병원 플로우는 시안 선택 후 계속만 가능. */
	onBack?: () => void;
	onConfirm: () => void;
	confirming?: boolean;
	confirmLabel?: string;
	backLabel?: string;
	/** 병원 미리보기 전용 안내 말풍선(글귀 수정·빈 화면·로그인 안내) 표시 여부. */
	showGuides?: boolean;
}) {
	const [device, setDevice] = useState<Device>("desktop");
	const current = (templateKey || swatches[0]?.key || "").toLowerCase();

	// 배경(body) 스크롤 잠금은 인라인 스타일이 아니라 styles.css의
	// `body:has([data-design-preview])` 규칙으로 건다. 인라인으로 걸면 위에 뜨는
	// Dialog(Base UI)가 그 값("hidden")을 원래 스타일로 캡처했다가, 이 화면과 Dialog가
	// 동시에 언마운트될 때(commit 성공 → 결제 화면 전환) 마지막에 "hidden"을 복원해
	// 다음 화면의 스크롤이 영구히 잠긴다.
	return (
		<div
			data-design-preview
			className="fixed inset-0 z-50 flex flex-col bg-[#0b0f14]"
		>
			{/* 상단 고정 바 — 항상 보임(Figma 1:19102) */}
			<header className="shrink-0 border-b border-white/10 bg-[#111827]">
				<div className="mx-auto flex w-full max-w-[1920px] flex-col gap-3 px-4 py-3 sm:px-6 lg:h-16 lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:py-0">
					{/* 좌: 미리보기 모드 라벨 */}
					<div className="flex min-w-0 items-center gap-3">
						<span className="shrink-0 rounded-md bg-[#f3f4f6] px-3 py-1 text-[15px] tracking-[-0.5px] text-[#4b5563]">
							미리보기 모드
						</span>
					</div>

					{/* 중앙: 안내 문구 + 시안 스와치 + (데스크톱) 기기 토글 */}
					<div className="flex items-center justify-between gap-4 lg:justify-center">
						<p className="hidden text-[15px] whitespace-nowrap text-[#d1d5db] xl:block">
							디자인은 언제든 수정하여 선택이 가능해요.
						</p>
						{/* 시안 색상 스와치 — 각 버튼에 aria-label로 라벨 제공 */}
						<div className="flex items-center gap-2">
							{swatches.map((t) => {
								const selected = current === t.key;
								return (
									<button
										key={t.key}
										type="button"
										aria-pressed={selected}
										aria-label={t.label}
										title={t.label}
										onClick={() => onTemplateChange(t.key)}
										style={{ backgroundColor: t.color }}
										className={cn(
											"size-9 shrink-0 rounded-full transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-white",
											selected
												? "ring-2 ring-white ring-offset-2 ring-offset-[#111827]"
												: "ring-1 ring-white/25",
										)}
									/>
								);
							})}
						</div>

						{/* 기기 토글 — 데스크톱에서만(미리보기 폭 전환) + 모바일 열람 강조 문구 */}
						<div className="hidden items-center gap-3 lg:flex">
							<div className="flex items-center gap-1 rounded-lg bg-white/5 p-1">
								<DeviceButton
									active={device === "desktop"}
									onClick={() => setDevice("desktop")}
									label="데스크톱 미리보기"
								>
									<Monitor className="size-4" />
								</DeviceButton>
								<DeviceButton
									active={device === "mobile"}
									onClick={() => setDevice("mobile")}
									label="모바일 미리보기"
								>
									<Smartphone className="size-4" />
								</DeviceButton>
							</div>
							<p className="hidden text-[15px] whitespace-nowrap text-[#d1d5db] xl:block">
								환자들은 핸드폰으로 더 많이봐요
							</p>
						</div>
					</div>

					{/* 우: 액션 — 모바일은 한 줄을 반반 나눠 채우고, lg+는 우측 정렬 */}
					<div className="flex items-center justify-end gap-2 max-lg:w-full sm:gap-3">
						{onBack ? (
							<button
								type="button"
								onClick={onBack}
								disabled={confirming}
								className="shrink-0 rounded-md border border-[#4b5563] px-4 py-2 text-[15px] font-medium whitespace-nowrap text-white transition-colors hover:bg-white/5 disabled:opacity-50 sm:px-5"
							>
								{backLabel}
							</button>
						) : null}
						<button
							type="button"
							onClick={onConfirm}
							disabled={confirming}
							className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-[#2a64f6] px-4 py-2 text-[15px] font-semibold whitespace-nowrap text-white shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.1),0px_4px_6px_-4px_rgba(0,0,0,0.1)] transition-colors hover:bg-[#1e50d8] disabled:opacity-60 lg:flex-none sm:px-5"
						>
							{confirming ? <Loader2 className="size-4 animate-spin" /> : null}
							{confirmLabel}
						</button>
					</div>
				</div>
			</header>

			{/* 미리보기 영역 */}
			<div className="flex flex-1 items-stretch justify-center overflow-hidden p-0 sm:p-4">
				<div
					className={cn(
						"relative h-full overflow-hidden bg-white transition-[width] duration-300",
						device === "mobile"
							? "w-full max-w-[420px] rounded-none border-white/10 sm:rounded-[2rem] sm:border-8"
							: "w-full sm:rounded-xl",
					)}
				>
					{preview ?? (payload ? <LivePreview payload={payload} /> : null)}

					{/* 스크롤을 따라오는 중앙 플로팅 안내 — 상단 중앙(시안 헤더와 겹쳐도 무방, 사용자 확정).
					    콘텐츠에 앵커되는 나머지 안내 2개(제목·로그인)는 미리보기 앱
					    (wildcard.kmaclinic.com PreviewGuides)이 iframe 안에서 렌더한다. */}
					{showGuides ? (
						<GuideBubble className="top-8 left-1/2 w-max max-w-[calc(100%-2rem)] -translate-x-1/2 rounded-2xl">
							<p>너무 비어보여도 걱정 마세요.</p>
							<p className="font-normal text-[#4b5563]">
								제작 후 관리자 페이지에서 하나하나 추가하세요.
							</p>
						</GuideBubble>
					) : null}
				</div>
			</div>
		</div>
	);
}

/**
 * 미리보기 위 안내 말풍선 — 콘솔 디자인 톤(흰 카드·보더·그림자 + 블루 핑 도트).
 * 안내일 뿐이라 클릭을 막지 않도록 pointer-events-none.
 */
function GuideBubble({
	className,
	children,
}: {
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<div
			className={cn(
				"pointer-events-none absolute z-10 flex items-start gap-2.5 rounded-full border border-[#e5e7eb] bg-white/95 px-4 py-2.5 shadow-[0px_10px_15px_-3px_rgba(17,24,39,0.12),0px_4px_6px_-4px_rgba(17,24,39,0.08)] backdrop-blur-sm",
				className,
			)}
		>
			{/* 핑 도트 — 여러 줄이어도 첫 줄 세로 중앙에 맞춘다(15px 텍스트 줄높이 기준). */}
			<span className="relative mt-1.75 flex size-2 shrink-0" aria-hidden>
				<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2a64f6] opacity-60" />
				<span className="relative inline-flex size-2 rounded-full bg-[#2a64f6]" />
			</span>
			<div className="min-w-0 text-[15px] font-medium tracking-[-0.5px] text-[#111827]">
				{children}
			</div>
		</div>
	);
}

function DeviceButton({
	active,
	onClick,
	label,
	children,
}: {
	active: boolean;
	onClick: () => void;
	label: string;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={label}
			aria-pressed={active}
			title={label}
			className={cn(
				"flex size-8 items-center justify-center rounded-md transition-colors",
				active ? "bg-white text-[#111827]" : "text-[#9aa3ad] hover:text-white",
			)}
		>
			{children}
		</button>
	);
}
