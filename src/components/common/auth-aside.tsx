import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import {
	GuidelineItem,
	GuidelineList,
} from "#/components/common/guideline-list.tsx";
import { InfoCallout } from "#/components/common/info-callout.tsx";
import { Button } from "#/components/ui/button.tsx";

export type AuthAsideLink = { label: string; to?: string };

const DEFAULT_GUIDELINES = [
	"개인정보 보호를 위해 비밀번호 5회 이상 오류 시, 비밀번호 재설정이 필요합니다.",
	"비밀번호는 주기적(6개월)으로 변경해 주세요.",
	"본인인증은 원장님 본인 명의의 휴대폰 번호로만 진행 가능합니다.",
	"인증번호는 발송 후 3분 이내에 입력하셔야 합니다. 시간 초과 시 재요청 해주세요.",
];

/**
 * AuthAside — 인증 화면(로그인/아이디찾기/비밀번호찾기) 공통 우측 컬럼.
 * 유의사항 목록 + 아이디 로그인 안내 박스 + 하단 링크.
 */
function AuthAside({
	guidelines = DEFAULT_GUIDELINES,
	links,
}: {
	guidelines?: string[];
	links: AuthAsideLink[];
}) {
	return (
		<div className="flex flex-col gap-6 lg:py-12">
			<GuidelineList>
				{guidelines.map((g) => (
					<GuidelineItem key={g}>{g}</GuidelineItem>
				))}
			</GuidelineList>

			<InfoCallout>
				<div className="flex flex-col gap-4">
					<button
						type="button"
						className="flex items-center gap-2 text-base text-brand"
					>
						<ArrowLeft className="size-4" />
						일반 로그인으로 돌아가기
					</button>
					<p className="text-base text-body">
						아이디/비밀번호 로그인을 원하시면 아래 버튼을 클릭하세요.
					</p>
					<Button
						variant="brand-outline"
						size="2xl"
						className="w-full font-semibold"
					>
						아이디 로그인
					</Button>
				</div>
			</InfoCallout>

			<nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-2 text-[17px] text-ink">
				{links.map((link, i) => (
					<span key={link.label} className="flex items-center gap-4">
						{i > 0 ? <span className="text-line-strong">|</span> : null}
						{link.to ? (
							<Link to={link.to} className="hover:text-brand">
								{link.label}
							</Link>
						) : (
							<button type="button" className="hover:text-brand">
								{link.label}
							</button>
						)}
					</span>
				))}
			</nav>
		</div>
	);
}

/** 인증 화면 좌/우 2단 레이아웃 (가운데 디바이더) */
function AuthColumns({
	form,
	aside,
}: {
	form: React.ReactNode;
	aside: React.ReactNode;
}) {
	return (
		<div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,565px)_1px_minmax(0,536px)] lg:gap-10">
			<div className="flex min-w-0 flex-col gap-9">{form}</div>
			<div className="hidden bg-line-strong lg:block" />
			<div className="min-w-0">{aside}</div>
		</div>
	);
}

export { AuthAside, AuthColumns };
