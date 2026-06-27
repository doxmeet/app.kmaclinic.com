import { MessageSquareText } from "lucide-react";
import type * as React from "react";
import { Button } from "#/components/ui/button.tsx";
import { KAKAO_CHANNEL_LABEL, KAKAO_CHANNEL_URL } from "#/lib/support.ts";
import { cn } from "#/lib/utils.ts";

type KakaoSupportLinkProps = {
	/** "button" = 강조 버튼(브랜드 아웃라인), "inline" = 본문 텍스트 링크. */
	variant?: "button" | "inline";
	/** 버튼 크기(variant="button"일 때만). Button size 토큰. */
	size?: React.ComponentProps<typeof Button>["size"];
	/** 라벨 덮어쓰기(기본: "카카오톡으로 문의하기"). 일관성을 위해 가급적 기본값 유지. */
	label?: string;
	className?: string;
};

/**
 * KakaoSupportLink — 모든 문의를 닥스밋 카카오톡 채널로 유도하는 단일 CTA.
 * 항상 새 탭으로 안전하게 연다(target=_blank, rel=noreferrer noopener).
 */
export function KakaoSupportLink({
	variant = "button",
	size = "xl",
	label = KAKAO_CHANNEL_LABEL,
	className,
}: KakaoSupportLinkProps) {
	if (variant === "inline") {
		return (
			<a
				href={KAKAO_CHANNEL_URL}
				target="_blank"
				rel="noreferrer noopener"
				className={cn(
					"inline-flex items-center gap-1.5 font-medium text-brand underline-offset-4 transition-colors hover:underline",
					className,
				)}
			>
				<MessageSquareText className="size-4" />
				{label}
			</a>
		);
	}

	return (
		<Button
			nativeButton={false}
			render={
				// biome-ignore lint/a11y/useAnchorContent: Button이 자식으로 콘텐츠를 주입한다.
				<a
					href={KAKAO_CHANNEL_URL}
					target="_blank"
					rel="noreferrer noopener"
					aria-label={label}
				/>
			}
			variant="brand-outline"
			size={size}
			className={className}
		>
			<MessageSquareText className="size-4" />
			{label}
		</Button>
	);
}
