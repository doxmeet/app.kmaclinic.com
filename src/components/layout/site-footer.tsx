import { KakaoSupportLink } from "#/components/common/kakao-support-link.tsx";
import { cn } from "#/lib/utils.ts";
import { BrandLogo } from "./brand-logo.tsx";

// 모듈 로드 시 1회 평가(JSX 안 new Date()는 SSR 하이드레이션 불일치 경고를 유발).
const COPYRIGHT_YEAR = new Date().getFullYear();

/**
 * SiteFooter — 사이트 공통 푸터(홈 페이지 기준 통일).
 * 브랜드 로고 + 한 줄 소개 + 카피라이트. 모든 페이지(홈/앱/인증)에서 동일하게 사용한다.
 */
function SiteFooter({ className }: { className?: string }) {
	return (
		<footer className={cn("border-t border-line bg-surface", className)}>
			<div className="mx-auto flex w-full max-w-[1120px] flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-start md:justify-between">
				<div className="flex flex-col gap-3">
					<BrandLogo label="KMA CLINIC" to="/" />
					<p className="max-w-[320px] text-sm leading-relaxed text-muted-fg">
						의료진을 위한 프로필·병원 홈페이지 자동 생성 서비스.
					</p>
					<address className="text-sm not-italic leading-relaxed text-muted-fg">
						주식회사 닥스밋(Doxmeet)
						<br />
						사업자등록번호 385-88-02455
					</address>
					<KakaoSupportLink
						variant="inline"
						className="text-sm"
						label="문의: 카카오톡 채널"
					/>
				</div>
			</div>
			<div className="border-t border-line">
				<p className="mx-auto w-full max-w-[1120px] px-4 py-4 text-sm text-muted-fg sm:px-6">
					COPYRIGHT {COPYRIGHT_YEAR} ALL RIGHTS RESERVED BY DOXMEET
				</p>
			</div>
		</footer>
	);
}

export { SiteFooter };
