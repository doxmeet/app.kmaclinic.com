import { useEffect, useState } from "react";

/**
 * 입력값이 `delay`(ms) 동안 더 바뀌지 않으면 그 값을 반영하는 디바운스 훅.
 *
 * 자동완성 검색처럼 매 키 입력마다 네트워크 요청을 보내지 않도록 쓴다.
 * 입력 자체는 즉시 화면에 반영하되(제어 컴포넌트), 쿼리 키워드만 지연시켜
 * 타이핑이 멈춘 뒤 한 번만 요청이 나가게 한다.
 *
 * @example
 * const keyword = text.trim();
 * const debounced = useDebouncedValue(keyword, 300);
 * useQuery({ queryKey: ["ref", debounced], enabled: debounced.length >= 1, ... });
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
	const [debounced, setDebounced] = useState(value);

	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(timer);
	}, [value, delay]);

	return debounced;
}
