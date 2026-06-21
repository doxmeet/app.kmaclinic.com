import { useId, useState } from "react";
import {
	Field,
	FieldDescription,
	FieldLabel,
	FieldRow,
} from "#/components/form/field.tsx";
import { FieldInput } from "#/components/form/field-input.tsx";
import { OptionButton, OptionGroup } from "#/components/form/option-group.tsx";
import { Button } from "#/components/ui/button.tsx";

const CARRIERS = ["SKT", "KT", "LGU+", "알뜰폰"];

/**
 * PhoneVerifyFields — 통신사 선택 + 휴대폰 번호(인증요청) + 인증번호 입력.
 * 로그인/아이디찾기/비밀번호찾기 공통. 자체 상태로 동작(백엔드 없음).
 */
function PhoneVerifyFields({ showCarrier = true }: { showCarrier?: boolean }) {
	const phoneId = useId();
	const codeId = useId();
	const [carrier, setCarrier] = useState("SKT");
	const [phone, setPhone] = useState("");
	const [code, setCode] = useState("");
	const [sent, setSent] = useState(false);

	return (
		<>
			{showCarrier ? (
				<Field>
					<FieldLabel required>통신사 선택</FieldLabel>
					<OptionGroup
						value={carrier}
						onValueChange={setCarrier}
						className="grid grid-cols-2 sm:grid-cols-4"
					>
						{CARRIERS.map((c) => (
							<OptionButton key={c} value={c}>
								{c}
							</OptionButton>
						))}
					</OptionGroup>
				</Field>
			) : null}

			<Field>
				<FieldLabel required htmlFor={phoneId}>
					휴대폰 번호
				</FieldLabel>
				<FieldRow>
					<FieldInput
						id={phoneId}
						inputMode="numeric"
						value={phone}
						onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
						placeholder="숫자만 입력 (- 제외)"
						className="min-w-0 flex-1"
					/>
					<Button
						type="button"
						variant={sent ? "neutral-outline" : "brand-outline"}
						size="2xl"
						className="w-[120px] shrink-0 px-0 font-medium sm:w-[132px]"
						onClick={() => setSent(true)}
						disabled={sent}
					>
						인증번호 요청
					</Button>
				</FieldRow>
			</Field>

			<Field>
				<FieldLabel required htmlFor={codeId}>
					인증번호
				</FieldLabel>
				<FieldInput
					id={codeId}
					inputMode="numeric"
					maxLength={6}
					value={code}
					onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
					placeholder="인증번호 6자리 입력"
					endAdornment={
						sent ? <span className="font-medium text-danger">03:00</span> : null
					}
				/>
				{sent ? (
					<FieldDescription>
						인증번호가 발송되었습니다. 3분 이내에 입력해 주세요.
					</FieldDescription>
				) : null}
			</Field>
		</>
	);
}

export { PhoneVerifyFields };
