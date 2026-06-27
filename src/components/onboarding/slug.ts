/**
 * 클라이언트 1차 검증: 영문 소문자·숫자·하이픈, 3~30자,
 * 앞뒤 하이픈 금지, 연속 하이픈(`--`) 금지, 전부 숫자 금지.
 * (예약어/중복/불변 최종 판정은 백엔드가 함.)
 */
export function isSlugValid(value: string): boolean {
	const slug = value.trim();
	if (slug.length < 3 || slug.length > 30) return false;
	if (!/^[a-z0-9-]+$/.test(slug)) return false; // 허용 문자
	if (slug.startsWith("-") || slug.endsWith("-")) return false; // 앞뒤 하이픈
	if (slug.includes("--")) return false; // 연속 하이픈
	if (/^\d+$/.test(slug)) return false; // 전부 숫자
	return true;
}
