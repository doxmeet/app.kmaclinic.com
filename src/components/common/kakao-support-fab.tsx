import { MessageSquareText } from "lucide-react";
import {
	KAKAO_CHANNEL_LABEL,
	KAKAO_CHANNEL_SHORT_LABEL,
	KAKAO_CHANNEL_URL,
} from "#/lib/support.ts";

/**
 * KakaoSupportFab — 앱 전역 어디서든 보이는 고정 문의 버튼.
 * 좌하단에 띄워 dev 전용 Devtools(우하단)·하단 sticky bar의 우측 액션과 겹치지 않게 한다.
 * 항상 새 탭으로 안전하게 카카오톡 채널을 연다.
 */
export function KakaoSupportFab() {
	return (
		<a
			href={KAKAO_CHANNEL_URL}
			target="_blank"
			rel="noreferrer noopener"
			aria-label={KAKAO_CHANNEL_LABEL}
			className="fixed bottom-4 left-4 z-40 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground shadow-[0_8px_18px_-6px_rgba(42,100,246,0.45)] transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-brand/40"
		>
			<MessageSquareText className="size-4.5" />
			<span>{KAKAO_CHANNEL_SHORT_LABEL} 문의</span>
		</a>
	);
}
