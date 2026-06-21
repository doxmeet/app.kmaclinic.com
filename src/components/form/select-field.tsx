import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "#/components/form/field.tsx";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select.tsx";
import { cn } from "#/lib/utils.ts";

/**
 * 선택 필드 — 모두 shadcn `Select`(@base-ui) 기반.
 * Figma "선택 필드"(1:14188) 기준: 트리거 56px / 본문 17px,
 * placeholder muted, 에러 시 빨간 테두리, 비활성 흐림. 드롭다운 팝업은 shadcn Select 공통 스타일.
 */
export type SelectFieldOption = { value: string; label: string };

function normalize(option: string | SelectFieldOption): SelectFieldOption {
	return typeof option === "string" ? { value: option, label: option } : option;
}

/** 라벨 없이 쓰는 기본 셀렉트 (기존 Field 안에서 조합용). */
function FieldSelect({
	value,
	onValueChange,
	placeholder = "선택해 주세요",
	options,
	disabled,
	invalid,
	className,
}: {
	value?: string;
	onValueChange?: (value: string) => void;
	placeholder?: string;
	options: readonly (string | SelectFieldOption)[];
	disabled?: boolean;
	invalid?: boolean;
	className?: string;
}) {
	// base-ui Select.Value 는 items 매핑이 있어야 value 가 아닌 label 을 표시한다.
	const items = options.map(normalize);
	return (
		<Select
			items={items}
			value={value}
			onValueChange={(v) => onValueChange?.(v ?? "")}
			disabled={disabled}
		>
			<SelectTrigger
				size="lg"
				aria-invalid={invalid || undefined}
				className={cn(
					"w-full border-line bg-surface text-ink data-placeholder:text-muted-fg",
					className,
				)}
			>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent>
				{items.map((o) => (
					<SelectItem key={o.value} value={o.value}>
						{o.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

/** 라벨/필수 표시/설명/에러를 포함한 셀렉트 필드. */
function SelectField({
	label,
	required,
	options,
	value,
	onChange,
	placeholder,
	description,
	error,
	disabled,
	className,
}: {
	label?: string;
	required?: boolean;
	options: readonly (string | SelectFieldOption)[];
	value?: string;
	onChange?: (value: string) => void;
	placeholder?: string;
	description?: string;
	error?: string;
	disabled?: boolean;
	className?: string;
}) {
	return (
		<Field className={className}>
			{label ? <FieldLabel required={required}>{label}</FieldLabel> : null}
			<FieldSelect
				value={value}
				onValueChange={onChange}
				options={options}
				placeholder={placeholder}
				disabled={disabled}
				invalid={!!error}
			/>
			{error ? (
				<FieldError>{error}</FieldError>
			) : description ? (
				<FieldDescription>{description}</FieldDescription>
			) : null}
		</Field>
	);
}

export { FieldSelect, SelectField };
