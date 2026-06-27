import { createFileRoute } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { useState } from "react";
import { AuthAside, AuthColumns } from "#/components/common/auth-aside.tsx";
import { AuthShell } from "#/components/common/auth-shell.tsx";
import { Field, FieldLabel } from "#/components/form/field.tsx";
import { FieldInput } from "#/components/form/field-input.tsx";
import { PhoneVerifyFields } from "#/components/form/phone-verify-fields.tsx";
import { Button } from "#/components/ui/button.tsx";

export const Route = createFileRoute("/find-password")({
	component: FindPasswordPage,
});

const PW_GUIDELINES = [
	"개인정보 보호를 위해 비밀번호 5회 이상 오류 시, 비밀번호 재설정이 필요합니다.",
	"비밀번호는 주기적(6개월)으로 변경해 주세요.",
	"본인인증은 원장님 본인 명의의 휴대폰 번호로만 진행 가능합니다.",
	"인증번호는 발송 후 3분 이내에 입력하셔야 합니다. 시간 초과 시 재요청 해주세요.",
	"새 비밀번호는 영문, 숫자, 특수문자를 조합하여 8자 이상으로 설정해 주세요.",
];

function FindPasswordPage() {
	const [pw, setPw] = useState("");
	const [pw2, setPw2] = useState("");

	return (
		<AuthShell title="비밀번호 찾기">
			<AuthColumns
				form={
					<>
						<div className="flex flex-col gap-4">
							<h2 className="text-xl font-medium text-ink">
								비밀번호 찾기 및 새 비밀번호 설정
							</h2>
							<p className="text-base text-body">
								가입하신 아이디와 휴대폰 본인인증 후 새 비밀번호를 설정해
								주세요.
							</p>
						</div>

						<div className="flex flex-col gap-8">
							<Field>
								<FieldLabel required htmlFor="fp-id">
									아이디
								</FieldLabel>
								<FieldInput
									id="fp-id"
									type="email"
									placeholder="아이디(이메일)를 입력하세요"
								/>
							</Field>

							<PhoneVerifyFields />

							<Field>
								<FieldLabel required htmlFor="fp-pw">
									새로운 비밀번호 입력
								</FieldLabel>
								<div className="flex flex-col gap-2">
									<FieldInput
										id="fp-pw"
										type="password"
										value={pw}
										onChange={(e) => setPw(e.target.value)}
										placeholder="새로운 비밀번호 입력 (영문, 숫자, 특수문자 조합 8자 이상)"
									/>
									<FieldInput
										type="password"
										value={pw2}
										onChange={(e) => setPw2(e.target.value)}
										aria-invalid={
											pw2.length > 0 && pw !== pw2 ? true : undefined
										}
										placeholder="새로운 비밀번호 다시 입력 (확인)"
									/>
								</div>
							</Field>

							<Button variant="brand" size="cta" className="w-full">
								<Lock className="size-4" />
								비밀번호 변경 및 로그인하기
							</Button>
						</div>
					</>
				}
				aside={
					<AuthAside
						guidelines={PW_GUIDELINES}
						links={[
							{ label: "로그인 하기", to: "/login" },
							{ label: "아이디 찾기", to: "/find-id" },
							{ label: "회원가입" },
						]}
					/>
				}
			/>
		</AuthShell>
	);
}
