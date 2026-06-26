import { useEffect, useEffectEvent, useRef } from "react";
import {
	isProfileReadyMessage,
	PROFILE_PREVIEW_ORIGIN,
	PROFILE_PREVIEW_SOURCE,
	PROFILE_PREVIEW_SRC,
	PROFILE_PREVIEW_VERSION,
	type ProfilePreviewBundle,
} from "#/lib/profile-preview.ts";
import { cn } from "#/lib/utils.ts";

/**
 * 의사 프로필 실시간 미리보기 iframe (editor-preview-integration.md §5).
 *
 * 미리보기 앱(`PROFILE_PREVIEW_SRC`)을 iframe으로 띄우고, `preview:ready` 핸드셰이크가 끝난
 * **다음부터** 편집 변경마다 디바운스로 **전체 스냅샷**(`payload`)을 postMessage로 보낸다.
 * - `profile:update` 전송 targetOrigin은 항상 정확한 `PROFILE_PREVIEW_ORIGIN`("*" 금지, §4).
 * - `preview:ready` 수신 시 `event.origin === PROFILE_PREVIEW_ORIGIN` 을 검증한 뒤에만 신뢰한다.
 */
export function ProfileLivePreview({
	payload,
	className,
	title = "프로필 미리보기",
}: {
	payload: ProfilePreviewBundle;
	className?: string;
	title?: string;
}) {
	const iframeRef = useRef<HTMLIFrameElement>(null);
	const readyRef = useRef(false);
	const payloadRef = useRef(payload);
	payloadRef.current = payload;

	// iframe으로 현재 payload 전체 스냅샷 전송. Effect Event라 deps에 안 들어간다.
	const post = useEffectEvent((next: ProfilePreviewBundle) => {
		iframeRef.current?.contentWindow?.postMessage(
			{
				source: PROFILE_PREVIEW_SOURCE,
				type: "profile:update",
				version: PROFILE_PREVIEW_VERSION,
				payload: next,
			},
			PROFILE_PREVIEW_ORIGIN,
		);
	});

	// ready 핸드셰이크 — 수신 후부터 전송 시작(ready 전 전송은 유실될 수 있음).
	useEffect(() => {
		function onMessage(e: MessageEvent) {
			if (e.origin !== PROFILE_PREVIEW_ORIGIN) return; // origin 검증
			if (!isProfileReadyMessage(e.data)) return;
			readyRef.current = true;
			post(payloadRef.current); // 준비되면 현재 값 즉시 1회 전송
		}
		window.addEventListener("message", onMessage);
		return () => window.removeEventListener("message", onMessage);
	}, []);

	// 입력이 바뀔 때마다(ready 이후) 디바운스 전송.
	useEffect(() => {
		if (!readyRef.current) return;
		const id = setTimeout(() => post(payload), 150);
		return () => clearTimeout(id);
	}, [payload]);

	return (
		<iframe
			ref={iframeRef}
			src={PROFILE_PREVIEW_SRC}
			title={title}
			// 1st-party 미리보기 앱이지만 iframe 권한은 명시 제한(병원 LivePreview와 동일 근거).
			sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
			className={cn("h-full w-full border-0 bg-white", className)}
		/>
	);
}
