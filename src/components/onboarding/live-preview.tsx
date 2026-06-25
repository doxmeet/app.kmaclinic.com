import { useCallback, useEffect, useRef } from "react";
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

	// iframe으로 현재 payload 전체 스냅샷 전송. iframeRef/상수만 참조 → 안정 콜백.
	const post = useCallback((next: PreviewPayload) => {
		iframeRef.current?.contentWindow?.postMessage(
			{
				source: PREVIEW_SOURCE,
				type: "data",
				version: PREVIEW_VERSION,
				payload: next,
			},
			PREVIEW_ORIGIN,
		);
	}, []);

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
	}, [post]);

	// 입력이 바뀔 때마다(ready 이후) 디바운스 전송.
	useEffect(() => {
		if (!readyRef.current) return;
		const id = setTimeout(() => post(payload), 200);
		return () => clearTimeout(id);
	}, [payload, post]);

	return (
		<iframe
			ref={iframeRef}
			src={PREVIEW_SRC}
			title={title}
			className={cn("h-full w-full border-0 bg-white", className)}
		/>
	);
}
