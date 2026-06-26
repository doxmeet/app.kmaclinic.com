import { useEffect, useEffectEvent, useRef } from "react";
import {
	isReadyMessage,
	PREVIEW_ORIGIN,
	PREVIEW_SOURCE,
	PREVIEW_SRC,
	PREVIEW_VERSION,
	type PreviewPayload,
} from "#/lib/preview.ts";
import { cn } from "#/lib/utils.ts";

/**
 * 병원 홈페이지 실시간 미리보기 iframe (preview-integration.md §5).
 *
 * 미리보기 앱(`PREVIEW_SRC`)을 iframe으로 띄우고, `ready` 핸드셰이크가 끝난 **다음부터**
 * 입력 변경마다 디바운스로 **전체 스냅샷**(`payload`)을 postMessage로 보낸다.
 * - `data` 전송 targetOrigin은 항상 정확한 `PREVIEW_ORIGIN`("*" 금지, §3.3).
 * - `ready` 수신 시 `event.origin === PREVIEW_ORIGIN` 을 검증한 뒤에만 신뢰한다.
 */
export function LivePreview({
	payload,
	className,
	title = "병원 홈페이지 미리보기",
}: {
	payload: PreviewPayload;
	className?: string;
	title?: string;
}) {
	const iframeRef = useRef<HTMLIFrameElement>(null);
	const readyRef = useRef(false);
	// 최신 payload를 ref로 들고 있어, ready 수신 시점에 즉시 현재 값을 보낼 수 있게 한다.
	const payloadRef = useRef(payload);
	payloadRef.current = payload;

	// iframe으로 현재 payload 전체 스냅샷 전송. Effect Event라 deps에 안 들어가
	// (콜백이 매 렌더 바뀌어도 effect가 재구독/재실행되지 않음).
	const post = useEffectEvent((next: PreviewPayload) => {
		iframeRef.current?.contentWindow?.postMessage(
			{
				source: PREVIEW_SOURCE,
				type: "data",
				version: PREVIEW_VERSION,
				payload: next,
			},
			PREVIEW_ORIGIN,
		);
	});

	// ready 핸드셰이크 — 수신 후부터 전송 시작(ready 전 전송은 유실될 수 있음).
	useEffect(() => {
		function onMessage(e: MessageEvent) {
			if (e.origin !== PREVIEW_ORIGIN) return; // origin 검증
			if (!isReadyMessage(e.data)) return;
			readyRef.current = true;
			post(payloadRef.current); // 준비되면 현재 값 즉시 1회 전송
		}
		window.addEventListener("message", onMessage);
		return () => window.removeEventListener("message", onMessage);
	}, []);

	// 입력이 바뀔 때마다(ready 이후) 디바운스 전송.
	useEffect(() => {
		if (!readyRef.current) return;
		const id = setTimeout(() => post(payload), 200);
		return () => clearTimeout(id);
	}, [payload]);

	return (
		<iframe
			ref={iframeRef}
			src={PREVIEW_SRC}
			title={title}
			// 1st-party 미리보기 앱이지만 iframe 권한은 명시 제한:
			// 앱 구동(스크립트)·자기 origin(에셋/스토리지/SPA 라우팅)·새창 링크·폼만 허용.
			// 교차출처 미리보기 + postMessage origin 핸드셰이크에 allow-same-origin 필수 — 빼면
			// frame origin이 null이 되어 미리보기가 깨진다. 의도된 구현이라 오탐 억제.
			// react-doctor-disable-next-line iframe-missing-sandbox
			sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
			className={cn("h-full w-full border-0 bg-white", className)}
		/>
	);
}
