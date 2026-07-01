import { Menu } from "@base-ui/react/menu";
import { Link } from "@tanstack/react-router";
import {
	Building2,
	ChevronDown,
	IdCard,
	Loader2,
	LogIn,
	XIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "#/components/ui/button.tsx";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "#/components/ui/dialog.tsx";
import { useSession } from "#/lib/auth/use-session.ts";
import { env } from "#/lib/env.ts";

/**
 * 홈 "샘플 보기" — 완성 결과물(병원 홈페이지 / 의사 프로필)을 앱 내부 전체화면 Dialog(iframe)로 보여준다.
 * 새 창 대신 Dialog를 쓰는 이유: 모바일에서 새 창 → 뒤로가기 흐름이 어색하기 때문(단일 화면 내 열고 닫기).
 * Dialog 상단에는 로그인/작성하기 CTA를 고정해 샘플을 보다 바로 전환하도록 유도한다.
 */

type SampleKind = "hospital" | "profile";

/** 샘플 사이트 설정. URL은 env로 override 가능(미설정 시 ggkma1 샘플 테넌트로 폴백). */
const SAMPLE_SITES: Record<
	SampleKind,
	{ url: string; title: string; createLabel: string }
> = {
	hospital: {
		url: env.VITE_SAMPLE_HOSPITAL_URL ?? "https://ggkma1.kmaclinic.com/",
		title: "병원 홈페이지 샘플",
		createLabel: "내 홈페이지 작성하기",
	},
	profile: {
		url: env.VITE_SAMPLE_PROFILE_URL ?? "https://ggkma1.kmadoc.com/",
		title: "의사 프로필 샘플",
		createLabel: "내 프로필 작성하기",
	},
};

const MENU_ITEM_CLASS =
	"flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-[15px] text-ink outline-none transition-colors select-none data-[highlighted]:bg-muted";

/**
 * SampleViewMenu — 히어로의 "샘플 보기" 드롭다운 + 샘플 Dialog.
 * 트리거는 기존 "샘플 보기" 버튼과 동일 외형(neutral-outline · cta), 선택 시 해당 샘플 Dialog를 연다.
 */
function SampleViewMenu() {
	const [kind, setKind] = useState<SampleKind | null>(null);

	return (
		<>
			<Menu.Root>
				<Menu.Trigger
					render={
						<Button
							variant="neutral-outline"
							size="cta"
							className="w-full sm:w-auto"
						/>
					}
				>
					샘플 보기
					<ChevronDown className="size-5" />
				</Menu.Trigger>
				<Menu.Portal>
					<Menu.Positioner sideOffset={8} align="start" className="z-50">
						<Menu.Popup className="min-w-[240px] origin-top rounded-xl border border-line bg-surface p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.12)] outline-none">
							<Menu.Item
								className={MENU_ITEM_CLASS}
								onClick={() => setKind("hospital")}
							>
								<Building2 className="size-4.5 text-muted-fg" />
								병원 홈페이지 샘플
							</Menu.Item>
							<Menu.Item
								className={MENU_ITEM_CLASS}
								onClick={() => setKind("profile")}
							>
								<IdCard className="size-4.5 text-muted-fg" />
								의사 프로필 샘플
							</Menu.Item>
						</Menu.Popup>
					</Menu.Positioner>
				</Menu.Portal>
			</Menu.Root>

			<SamplePreviewDialog kind={kind} onClose={() => setKind(null)} />
		</>
	);
}

/**
 * SamplePreviewDialog — 전체화면 iframe Dialog.
 * `kind`가 null이 되면 닫힘. 닫히는 애니메이션 동안 콘텐츠가 유지되도록 마지막 kind를 기억한다.
 */
function SamplePreviewDialog({
	kind,
	onClose,
}: {
	kind: SampleKind | null;
	onClose: () => void;
}) {
	const { isAuthenticated } = useSession();
	// 닫힘 애니메이션 중에도 site가 유효하도록 마지막으로 연 kind를 유지.
	const [lastKind, setLastKind] = useState<SampleKind>("hospital");
	const [loaded, setLoaded] = useState(false);

	useEffect(() => {
		if (kind) {
			setLastKind(kind);
			setLoaded(false);
		}
	}, [kind]);

	const site = SAMPLE_SITES[lastKind];

	return (
		<Dialog
			open={kind !== null}
			onOpenChange={(open) => {
				if (!open) onClose();
			}}
		>
			<DialogContent fullScreen showCloseButton={false}>
				{/* 상단 고정 바 — 앱 헤더(AppHeader)와 동일한 높이(h-16)·여백·버튼 크기. 제목 + CTA + 닫기. */}
				<div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-4 sm:px-6">
					<DialogTitle className="truncate text-base font-bold text-ink sm:text-lg">
						{site.title}
					</DialogTitle>
					<DialogDescription className="sr-only">
						{site.title} 미리보기
					</DialogDescription>
					<div className="flex shrink-0 items-center gap-2">
						{/* 로그인 상태에 따라 하나만: 비로그인 → 로그인, 로그인 → 작성하기 */}
						{isAuthenticated ? (
							<Button
								nativeButton={false}
								render={<Link to="/onboarding" />}
								variant="brand"
								size="sm"
							>
								{site.createLabel}
							</Button>
						) : (
							<Button
								nativeButton={false}
								render={<Link to="/login" />}
								variant="brand"
								size="sm"
							>
								<LogIn className="size-4" />
								로그인
							</Button>
						)}
						<DialogClose
							render={
								<Button variant="ghost" size="icon-sm" aria-label="닫기" />
							}
						>
							<XIcon className="size-5" />
						</DialogClose>
					</div>
				</div>

				{/* 본문 — 샘플 사이트 iframe (로딩 중 스피너 오버레이). 사이트 자체 스크롤바 사용. */}
				<div className="relative flex-1">
					{!loaded && (
						<div className="absolute inset-0 z-10 flex items-center justify-center bg-surface">
							<Loader2 className="size-6 animate-spin text-muted-fg" />
						</div>
					)}
					<iframe
						key={lastKind}
						src={site.url}
						title={site.title}
						onLoad={() => setLoaded(true)}
						className="h-full w-full border-0"
					/>
				</div>
			</DialogContent>
		</Dialog>
	);
}

export { SampleViewMenu };
