/**
 * Toss Payments 결제위젯(v2 standard) 공통 로더 — 문서 §9.
 * 빌링(자동결제) authKey 발급용 `requestBillingAuth`만 사용한다.
 *
 * clientKey/customerKey는 호출부가 넘긴다(하드코딩 금지 — 문서 §9.2):
 *  - clientKey: commit/payment 응답의 `toss_client_key`(없으면 env 폴백 `VITE_TOSS_CLIENT_KEY`).
 *  - customerKey: `kclinic-u<user_no>` 규약(commit payment의 `customer_key`와 동일).
 */

/** Toss SDK v2 standard 의 최소 인터페이스(좁은 타입). */
type TossPaymentsInstance = {
	payment: (options: { customerKey: string }) => {
		requestBillingAuth: (options: {
			method: "CARD";
			successUrl: string;
			failUrl: string;
		}) => Promise<void>;
	};
};
type TossPaymentsFactory = (clientKey: string) => TossPaymentsInstance;

declare global {
	interface Window {
		TossPayments?: TossPaymentsFactory;
	}
}

const TOSS_SDK_URL = "https://js.tosspayments.com/v2/standard";

/** Toss SDK 동적 로드(CDN script). 새 의존성 추가 없이 window.TossPayments 사용. */
export function loadTossSdk(): Promise<TossPaymentsFactory> {
	return new Promise((resolve, reject) => {
		if (window.TossPayments) {
			resolve(window.TossPayments);
			return;
		}
		const existing = document.querySelector<HTMLScriptElement>(
			`script[src="${TOSS_SDK_URL}"]`,
		);
		if (existing) {
			existing.addEventListener("load", () => {
				window.TossPayments
					? resolve(window.TossPayments)
					: reject(new Error("Toss SDK 로드 실패"));
			});
			existing.addEventListener("error", () =>
				reject(new Error("Toss SDK 로드 실패")),
			);
			return;
		}
		const script = document.createElement("script");
		script.src = TOSS_SDK_URL;
		script.async = true;
		script.onload = () =>
			window.TossPayments
				? resolve(window.TossPayments)
				: reject(new Error("Toss SDK 로드 실패"));
		script.onerror = () => reject(new Error("Toss SDK 로드 실패"));
		document.head.appendChild(script);
	});
}

/**
 * 카드(빌링) 인증 위젯 호출 — 성공 시 successUrl 로 리다이렉트되며 authKey가 쿼리로 붙는다.
 * 성공 분기는 보통 실행되지 않는다(리다이렉트). 실패/취소 시 failUrl 로 돌아온다.
 */
export async function startCardBillingAuth(opts: {
	clientKey: string;
	customerKey: string;
	successUrl: string;
	failUrl: string;
}): Promise<void> {
	const factory = await loadTossSdk();
	const toss = factory(opts.clientKey);
	await toss.payment({ customerKey: opts.customerKey }).requestBillingAuth({
		method: "CARD",
		successUrl: opts.successUrl,
		failUrl: opts.failUrl,
	});
}

/** customerKey 규약(문서 §9.2): `kclinic-u<user_no>`. */
export function customerKeyForUser(userNo: number): string {
	return `kclinic-u${userNo}`;
}
