import { useId, useState } from "react";
import { Field, FieldLabel, FieldRow } from "#/components/form/field.tsx";
import { FieldInput } from "#/components/form/field-input.tsx";

/**
 * NameRrnFields — 성명 + 생년월일/성별(주민번호 앞 6자리 + 성별 구분).
 * 로그인/아이디찾기 공통.
 */
function NameRrnFields() {
	const nameId = useId();
	const rrnId = useId();
	const [name, setName] = useState("");
	const [rrn, setRrn] = useState("");
	const [genderDigit, setGenderDigit] = useState("");

	return (
		<>
			<Field>
				<FieldLabel required htmlFor={nameId}>
					성명
				</FieldLabel>
				<FieldInput
					id={nameId}
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="이름을 입력하세요"
				/>
			</Field>

			<Field>
				<FieldLabel required htmlFor={rrnId}>
					생년월일 및 성별
				</FieldLabel>
				<FieldRow>
					<FieldInput
						id={rrnId}
						inputMode="numeric"
						maxLength={6}
						value={rrn}
						onChange={(e) => setRrn(e.target.value.replace(/\D/g, ""))}
						placeholder="주민등록번호 앞 6자리"
						className="min-w-0 flex-1"
					/>
					<span className="text-xl text-ink">-</span>
					<div className="flex h-14 w-[150px] shrink-0 items-center gap-2 rounded-lg border border-line bg-surface px-4 sm:w-[172px]">
						<input
							aria-label="성별 구분 숫자"
							inputMode="numeric"
							maxLength={1}
							value={genderDigit}
							onChange={(e) =>
								setGenderDigit(e.target.value.replace(/\D/g, ""))
							}
							className="w-4 bg-transparent text-[17px] text-ink outline-none"
						/>
						<span className="tracking-[0.2em] text-ink">●●●●●●</span>
					</div>
				</FieldRow>
			</Field>
		</>
	);
}

export { NameRrnFields };
