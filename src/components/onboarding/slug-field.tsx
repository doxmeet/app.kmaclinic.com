import { useId } from "react";
import { FieldInput } from "#/components/form/field-input.tsx";

/**
 * 공개 주소(slug) 입력 한 칸 — 무료 프로필 완료 화면 / 병원 게시 단계에서 재사용.
 * - 도메인 suffix(`.kmadoc.com` / `.kmaclinic.com`)는 FieldInput endAdornment로 표시.
 * - 형식 검증은 isSlugValid(기본만, 최종 판정은 백엔드)로 상위에서 invalid 제어.
 */

/**
 * 클라이언트 1차 검증: 영문 소문자·숫자·하이픈, 3~30자,
 * 앞뒤 하이픈 금지, 연속 하이픈(`--`) 금지, 전부 숫자 금지.
 * (예약어/중복/불변 최종 판정은 백엔드가 함.)
 */
export function isSlugValid(value: string): boolean {
	const slug = value.trim();
	if (slug.length < 3 || slug.length > 30) return false;
	if (!/^[a-z0-9-]+$/.test(slug)) return false; // 허용 문자
	if (slug.startsWith("-") || slug.endsWith("-")) return false; // 앞뒤 하이픈
	if (slug.includes("--")) return false; // 연속 하이픈
	if (/^\d+$/.test(slug)) return false; // 전부 숫자
	return true;
}

export function SlugField({
	label,
	domain,
	value,
	onChange,
	placeholder,
	disabled,
	invalid,
	description,
}: {
	label: string;
	/** 도메인 suffix (예: `.kmadoc.com`, `.kmaclinic.com`). */
	domain: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	disabled?: boolean;
	/** true면 빨간 테두리 + 인라인 안내. */
	invalid?: boolean;
	/** 입력칸 하단 안내 문구(기본 안내 대체). */
	description?: React.ReactNode;
}) {
	const inputId = useId();
	return (
		<div className="flex flex-col gap-2">
			<label htmlFor={inputId} className="text-sm font-medium text-ink">
				{label}
			</label>
			<FieldInput
				id={inputId}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				placeholder={placeholder}
				disabled={disabled}
				autoComplete="off"
				autoCapitalize="off"
				spellCheck={false}
				aria-invalid={invalid || undefined}
				endAdornment={<span className="text-muted-fg">{domain}</span>}
			/>
			{invalid ? (
				<p className="text-xs text-danger-strong">
					영문 소문자·숫자·하이픈(-) 3~30자로 정해 주세요. 앞뒤·연속 하이픈과
					숫자로만 된 주소는 사용할 수 없어요.
				</p>
			) : (
				<p className="text-xs text-body-soft">
					{description ? <>{description} </> : null}
					공개 주소:{" "}
					<span className="font-medium text-ink">{`${value.trim() || "***"}${domain}`}</span>
				</p>
			)}
		</div>
	);
}
