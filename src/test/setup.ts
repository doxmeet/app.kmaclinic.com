// jsdom 폴리필 — base-ui(ScrollArea 등)가 기대하는 브라우저 API 보강.
class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
class IntersectionObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
	takeRecords() {
		return [];
	}
}

// @ts-expect-error - 테스트 환경 전역 보강
globalThis.ResizeObserver ??= ResizeObserverStub;
// @ts-expect-error - 테스트 환경 전역 보강
globalThis.IntersectionObserver ??= IntersectionObserverStub;

if (!Element.prototype.scrollIntoView) {
	Element.prototype.scrollIntoView = () => {};
}
// base-ui ScrollArea가 타이머에서 viewport.getAnimations()를 호출 — jsdom에 없음.
if (!Element.prototype.getAnimations) {
	Element.prototype.getAnimations = () => [];
}
if (!window.matchMedia) {
	window.matchMedia = (query: string) =>
		({
			matches: false,
			media: query,
			onchange: null,
			addEventListener: () => {},
			removeEventListener: () => {},
			addListener: () => {},
			removeListener: () => {},
			dispatchEvent: () => false,
		}) as unknown as MediaQueryList;
}
