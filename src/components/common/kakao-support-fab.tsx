import { KakaoTalkIcon } from "#/components/common/kakao-icon.tsx";
import {
	KAKAO_CHANNEL_LABEL,
	KAKAO_CHANNEL_SHORT_LABEL,
	KAKAO_CHANNEL_URL,
} from "#/lib/support.ts";

/**
 * KakaoSupportFab — 앱 전역 어디서든 보이는 고정 문의 버튼(우하단).
 * StickyActionBar(data-sticky-action-bar)가 있는 화면에서는 바의 우측 액션을 가리지 않도록
 * 바 높이만큼 위로 올라간다. 자체 문의 CTA가 있는 화면(온보딩 등)은
 * data-hide-support-fab 속성으로 FAB을 숨긴다. 항상 새 탭으로 안전하게 카카오톡 채널을 연다.
 */
export function KakaoSupportFab() {
	return (
		<a
			href={KAKAO_CHANNEL_URL}
			target="_blank"
			rel="noreferrer noopener"
			aria-label={KAKAO_CHANNEL_LABEL}
			className="fixed right-4 bottom-4 z-40 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand px-4 py-2.5 text-base font-semibold text-brand-foreground shadow-[0_8px_18px_-6px_rgba(42,100,246,0.45)] transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand/40 [body:has([data-sticky-action-bar])_&]:bottom-20 [body:has([data-hide-support-fab])_&]:hidden"
		>
			<KakaoTalkIcon className="size-4.5" />
			<span>{KAKAO_CHANNEL_SHORT_LABEL} 문의</span>
		</a>
	);
}
