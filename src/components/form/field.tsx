import type * as React from "react";
import { cn } from "#/lib/utils.ts";

/**
 * Field — 디자인 공통 폼 필드 레이아웃.
 * 라벨(필수 표시 *) + 컨트롤 + 설명/에러 텍스트를 세로로 쌓는다.
 * 간격 위계(의사프로필 Figma 1:18531, 전 페이지 공통): 라벨↔컨트롤(8px)
 * < 필드↔필드(24px~, FieldGroup) < 섹션 제목↔본문 — 라벨은 컨트롤에 붙여
 * 한 덩어리로 읽히게 한다.
 */
function Field({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="field"
			className={cn("flex w-full min-w-0 flex-col gap-2", className)}
			{...props}
		/>
	);
}

/** 여러 Field를 세로로 묶는 그룹 (기본 간격 32px) */
function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="field-group"
			className={cn("flex w-full flex-col gap-8", className)}
			{...props}
		/>
	);
}

/** 가로 정렬이 필요한 컨트롤 묶음 (예: 생년월일 - 성별, 휴대폰번호 + 인증요청) */
function FieldRow({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="field-row"
			className={cn("flex w-full items-center gap-3", className)}
			{...props}
		/>
	);
}

function FieldLabel({
	className,
	required,
	children,
	...props
}: React.ComponentProps<"label"> & { required?: boolean }) {
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: htmlFor는 호출부에서 주입
		<label
			data-slot="field-label"
			className={cn(
				"flex items-center gap-1 text-base font-normal text-ink",
				className,
			)}
			{...props}
		>
			{required ? (
				<span aria-hidden className="text-danger">
					*
				</span>
			) : null}
			{children}
		</label>
	);
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
	return (
		<p
			data-slot="field-description"
			className={cn("text-base text-body", className)}
			{...props}
		/>
	);
}

function FieldError({
	className,
	children,
	...props
}: React.ComponentProps<"p">) {
	if (!children) return null;
	return (
		<p
			data-slot="field-error"
			role="alert"
			className={cn("text-base text-danger-strong", className)}
			{...props}
		>
			{children}
		</p>
	);
}

export {
	Field,
	FieldGroup,
	FieldRow,
	FieldLabel,
	FieldDescription,
	FieldError,
};
