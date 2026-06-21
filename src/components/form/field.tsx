import type * as React from "react";
import { cn } from "#/lib/utils.ts";

/**
 * Field — 디자인 공통 폼 필드 레이아웃.
 * 라벨(필수 표시 *) + 컨트롤 + 설명/에러 텍스트를 세로로 쌓는다.
 * Figma "병의원" 폼 기준: 라벨↔컨트롤 간격 16px, 컨트롤↔설명 12px.
 */
function Field({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="field"
			className={cn("flex w-full flex-col gap-4", className)}
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
			className={cn("text-sm text-body", className)}
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
			className={cn("text-sm text-danger-strong", className)}
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
