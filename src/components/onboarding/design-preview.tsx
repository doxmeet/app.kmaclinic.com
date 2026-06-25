import { Loader2, Monitor, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import type { PreviewPayload } from "#/lib/preview.ts";
import { cn } from "#/lib/utils.ts";
import { LivePreview } from "./live-preview.tsx";

/**
 * 디자인 시안 미리보기·선택 (Figma PC_미리보기 1:18885 / 모바일 1:12260).
 *
 * **결제 전** 전체화면으로 띄워, 입력한 병원 정보로 실시간 렌더되는 홈페이지를 보면서
 * 상단 고정 바의 색상 스와치로 시안(template_key)을 실시간 전환·선택한다.
 * 상단 바는 항상 보이고(sticky), 아래 영역은 미리보기 iframe이 채운다.
 */

/** 시안 스와치 — Figma 상단 바 색상(1:19108)과 동일 순서/색. */
const TEMPLATE_SWATCHES: {
	key: string;
	color: string;
	label: string;
}[] = [
	{ key: "t1", color: "#2a64f6", label: "블루 · 신뢰감 있는 기본형" },
	{ key: "t2", color: "#8b5cf6", label: "퍼플 · 모던 클리닉" },
	{ key: "t3", color: "#334155", label: "슬레이트 · 종합병원형" },
	{ key: "t4", color: "#ef4444", label: "레드 · 캠페인 강조형" },
	{ key: "t5", color: "#74ef44", label: "그린 · 친근한 동네 병원" },
];

type Device = "desktop" | "mobile";

export function DesignPreviewScreen({
	payload,
	templateKey,
	onTemplateChange,
	onBack,
	onConfirm,
	confirming = false,
	confirmLabel = "이 디자인으로 결제하기",
}: {
	payload: PreviewPayload;
	templateKey: string;
	onTemplateChange: (key: string) => void;
	onBack: () => void;
	onConfirm: () => void;
	confirming?: boolean;
	confirmLabel?: string;
}) {
	const [device, setDevice] = useState<Device>("desktop");
	const current = (templateKey || "t1").toLowerCase();

	// 전체화면 동안 배경(body) 스크롤 잠금.
	useEffect(() => {
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = prev;
		};
	}, []);

	return (
		<div className="fixed inset-0 z-50 flex flex-col bg-[#0b0f14]">
			{/* 상단 고정 바 — 항상 보임(Figma 1:19102) */}
			<header className="shrink-0 border-b border-white/10 bg-[#111827]">
				<div className="mx-auto flex w-full max-w-[1920px] flex-col gap-3 px-4 py-3 sm:px-6 lg:h-16 lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:py-0">
					{/* 좌: 미리보기 모드 라벨 + 설명 */}
					<div className="flex min-w-0 items-center gap-3">
						<span className="shrink-0 rounded-md bg-[#f3f4f6] px-3 py-1 text-[15px] tracking-[-0.5px] text-[#4b5563]">
							미리보기 모드
						</span>
						<p className="hidden truncate text-[15px] text-[#d1d5db] xl:block">
							현재 화면은 환자들에게 노출될 실제 페이지의 프리뷰 상태입니다.
						</p>
					</div>

					{/* 중앙: 시안 스와치 + (데스크톱) 기기 토글 */}
					<div className="flex items-center justify-between gap-4 lg:justify-center">
						{/* 시안 색상 스와치 — 각 버튼에 aria-label로 라벨 제공 */}
						<div className="flex items-center gap-2">
							{TEMPLATE_SWATCHES.map((t) => {
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

						{/* 기기 토글 — 데스크톱에서만(미리보기 폭 전환) */}
						<div className="hidden items-center gap-1 rounded-lg bg-white/5 p-1 lg:flex">
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
					</div>

					{/* 우: 액션 — 모바일은 한 줄을 반반 나눠 채우고, lg+는 우측 정렬 */}
					<div className="flex items-center justify-end gap-2 max-lg:w-full sm:gap-3">
						<button
							type="button"
							onClick={onBack}
							disabled={confirming}
							className="shrink-0 rounded-md border border-[#4b5563] px-4 py-2 text-[15px] font-medium whitespace-nowrap text-white transition-colors hover:bg-white/5 disabled:opacity-50 sm:px-5"
						>
							수정 계속하기
						</button>
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
						"h-full overflow-hidden bg-white transition-[width] duration-300",
						device === "mobile"
							? "w-full max-w-[420px] rounded-none border-white/10 sm:rounded-[2rem] sm:border-8"
							: "w-full sm:rounded-xl",
					)}
				>
					<LivePreview payload={payload} />
				</div>
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
