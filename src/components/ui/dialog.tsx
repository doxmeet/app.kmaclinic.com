import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import type * as React from "react";
import { Button } from "#/components/ui/button.tsx";
import { cn } from "#/lib/utils.ts";

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
	return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
	return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
	return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
	return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
	className,
	...props
}: DialogPrimitive.Backdrop.Props) {
	return (
		<DialogPrimitive.Backdrop
			data-slot="dialog-overlay"
			className={cn(
				"fixed inset-0 isolate z-50 bg-black/40 duration-200 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 data-closed:fill-mode-forwards",
				className,
			)}
			{...props}
		/>
	);
}

function DialogContent({
	className,
	children,
	showCloseButton = true,
	...props
}: DialogPrimitive.Popup.Props & {
	showCloseButton?: boolean;
}) {
	return (
		<DialogPortal>
			<DialogOverlay />
			<DialogPrimitive.Popup
				data-slot="dialog-content"
				className={cn(
					// 모바일: 바텀시트(Drawer) — 화면 하단에 붙어 위로 슬라이드, 상단 모서리만 둥글게.
					"fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] w-full flex-col overflow-y-auto rounded-t-[28px] bg-surface text-popover-foreground shadow-[0_-8px_24px_0_rgba(0,0,0,0.12)] duration-200 outline-none",
					// PC(sm 이상): 화면 중앙 정렬 다이얼로그.
					"sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[85dvh] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:shadow-[0_25px_50px_0_rgba(0,0,0,0.25)] sm:ring-1 sm:ring-line-soft",
					// 등장/퇴장: 페이드 공통, 모바일은 슬라이드업, PC는 줌.
					"data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
					"max-sm:data-open:slide-in-from-bottom max-sm:data-closed:slide-out-to-bottom",
					"sm:data-open:zoom-in-95 sm:data-closed:zoom-out-95",
					className,
				)}
				{...props}
			>
				{children}
				{showCloseButton && (
					<DialogPrimitive.Close
						data-slot="dialog-close"
						render={
							<Button
								variant="ghost"
								className="absolute top-5 right-5 text-muted-fg hover:text-ink sm:top-6 sm:right-6"
								size="icon-sm"
							/>
						}
					>
						<XIcon className="size-5" />
						<span className="sr-only">Close</span>
					</DialogPrimitive.Close>
				)}
			</DialogPrimitive.Popup>
		</DialogPortal>
	);
}

/**
 * 헤더 — 제목/설명 영역 + 하단 구분선 (Figma 1:21745). 닫기 버튼과 겹치지 않게 오른쪽 여백을 둔다.
 */
function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="dialog-header"
			className={cn(
				"flex flex-col gap-2 border-b border-line-soft pt-6 pr-12 pb-5 pl-6 sm:pt-8 sm:pr-14 sm:pb-6 sm:pl-8",
				className,
			)}
			{...props}
		/>
	);
}

/**
 * 본문 — 헤더와 푸터 사이 콘텐츠 영역 (Figma 1:21757). 폼/안내문 등이 들어간다.
 */
function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="dialog-body"
			className={cn("flex flex-col gap-4 px-6 py-6 sm:px-8 sm:py-8", className)}
			{...props}
		/>
	);
}

/**
 * 푸터 — 액션 버튼 영역 (Figma 1:21767). 옅은 배경 밴드 + 상단 구분선, 오른쪽 정렬.
 */
function DialogFooter({
	className,
	showCloseButton = false,
	children,
	...props
}: React.ComponentProps<"div"> & {
	showCloseButton?: boolean;
}) {
	return (
		<div
			data-slot="dialog-footer"
			className={cn(
				// 모바일: 버튼 세로 풀폭(주요 버튼이 위), PC: 가로 우측 정렬.
				"flex flex-col-reverse gap-3 border-t border-line-soft bg-muted/40 px-6 py-6 *:w-full sm:flex-row sm:justify-end sm:px-8 sm:py-6 sm:*:w-auto",
				className,
			)}
			{...props}
		>
			{children}
			{showCloseButton && (
				<DialogPrimitive.Close
					render={<Button variant="neutral-outline" size="2xl" />}
				>
					닫기
				</DialogPrimitive.Close>
			)}
		</div>
	);
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
	return (
		<DialogPrimitive.Title
			data-slot="dialog-title"
			className={cn(
				"text-xl leading-snug font-bold text-ink sm:text-2xl",
				className,
			)}
			{...props}
		/>
	);
}

function DialogDescription({
	className,
	...props
}: DialogPrimitive.Description.Props) {
	return (
		<DialogPrimitive.Description
			data-slot="dialog-description"
			className={cn(
				"text-[15px] leading-relaxed text-body-soft *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
				className,
			)}
			{...props}
		/>
	);
}

export {
	Dialog,
	DialogBody,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
	DialogTrigger,
};
