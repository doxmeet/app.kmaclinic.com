/**
 * KakaoTalkIcon — 카카오톡 말풍선 심벌(단색, currentColor).
 * 카카오톡 채널 문의 CTA의 장식 아이콘으로 쓴다. (Simple Icons "KakaoTalk" 경로)
 */
export function KakaoTalkIcon({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 24 24"
			aria-hidden="true"
			fill="currentColor"
			className={className}
		>
			<path d="M12 0C5.373 0 0 4.242 0 9.475c0 3.392 2.267 6.365 5.668 8.04-.187.632-1.203 4.159-1.243 4.437 0 0-.024.206.11.285.133.078.29.018.29.018.383-.053 4.437-2.902 5.138-3.398.665.094 1.349.143 2.037.143 6.627 0 12-4.242 12-9.475C24 4.242 18.627 0 12 0z" />
		</svg>
	);
}
