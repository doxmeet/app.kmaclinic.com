import { createFileRoute } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { AuthAside, AuthColumns } from "#/components/common/auth-aside.tsx";
import { AuthShell } from "#/components/common/auth-shell.tsx";
import { NameRrnFields } from "#/components/form/name-rrn-fields.tsx";
import { PhoneVerifyFields } from "#/components/form/phone-verify-fields.tsx";
import { Button } from "#/components/ui/button.tsx";

export const Route = createFileRoute("/find-id")({ component: FindIdPage });

function FindIdPage() {
	return (
		<AuthShell title="아이디 찾기">
			<AuthColumns
				form={
					<>
						<div className="flex flex-col gap-4">
							<h2 className="text-xl font-medium text-ink">
								휴대폰 번호로 아이디 찾기
							</h2>
							<p className="text-base text-body">
								안전한 의료 정보 관리를 위해 원장님 명의의 휴대폰 번호로
								아이디를 찾아드립니다.
							</p>
						</div>

						<div className="flex flex-col gap-8">
							<NameRrnFields />
							<PhoneVerifyFields />

							<Button variant="brand" size="cta" className="w-full">
								<Lock className="size-4" />
								아이디 찾기
							</Button>
						</div>
					</>
				}
				aside={
					<AuthAside
						links={[
							{ label: "로그인 하기", to: "/login" },
							{ label: "비밀번호 찾기", to: "/find-password" },
							{ label: "회원가입" },
						]}
					/>
				}
			/>
		</AuthShell>
	);
}
