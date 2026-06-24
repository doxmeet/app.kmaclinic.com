/**
 * SEO 메타 태그 생성 헬퍼.
 *
 * `__root.tsx` 의 기본값으로 사용하고, 페이지별로 더 구체적인 제목/설명이 필요하면
 * 각 라우트의 `head()` 에서 `seo({ title, description })` 를 호출해 덮어쓰면 된다.
 *
 *   export const Route = createFileRoute("/foo")({
 *     head: () => ({ meta: seo({ title: "특정 페이지 | K CLINIC" }) }),
 *   });
 */

/** 사이트 정식(canonical) 도메인. 소셜 미리보기/검색엔진이 참조하는 절대 URL 기준값. */
export const SITE_URL = "https://app.kmaclinic.com";

/** 사이트 제목(브랜드명). */
export const SITE_NAME = "K CLINIC";

/** 기본 메타 설명. 검색 결과/소셜 미리보기에 노출된다. */
export const DEFAULT_DESCRIPTION =
	"의료진을 위한 프로필·병원 홈페이지 자동 생성 서비스. AI와 대화하듯 답하면 의사 공개 프로필과 병원 홈페이지가 자동으로 완성됩니다. 면허 인증부터 안전한 정기결제, 즉시 공개까지 한 흐름으로.";

/** 기본 키워드. */
export const DEFAULT_KEYWORDS =
	"K CLINIC, 케이클리닉, 의사 프로필, 병원 홈페이지, 의료진, 병의원, 의사 소개, 병원 제작, 진료과, 의사 면허 인증, 닥스밋, doxmeet";

/** 기본 OG 이미지(절대 URL). */
export const OG_IMAGE = `${SITE_URL}/og-image.png`;

type SeoArgs = {
	/** 페이지 제목. 미지정 시 사이트명(K CLINIC)을 사용한다. */
	title?: string;
	/** 메타 설명. 미지정 시 기본 설명을 사용한다. */
	description?: string;
	/** 키워드. */
	keywords?: string;
	/** OG/트위터 카드 이미지(절대 URL). */
	image?: string;
	/** 페이지 URL("/path" 또는 절대 URL). 지정 시 og:url 을 추가한다. */
	url?: string;
};

/** "/path" 를 사이트 절대 URL 로 변환. 이미 절대 URL 이면 그대로 반환. */
function toAbsoluteUrl(url: string): string {
	if (url.startsWith("http")) return url;
	return `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

/**
 * TanStack `head().meta` 에 그대로 넣을 수 있는 메타 태그 배열을 만든다.
 * 제목, 설명, 키워드, Open Graph, 트위터 카드를 한 번에 구성한다.
 */
export function seo({
	title,
	description = DEFAULT_DESCRIPTION,
	keywords = DEFAULT_KEYWORDS,
	image = OG_IMAGE,
	url,
}: SeoArgs = {}) {
	const pageTitle = title ?? SITE_NAME;

	return [
		{ title: pageTitle },
		{ name: "description", content: description },
		{ name: "keywords", content: keywords },
		{ name: "author", content: SITE_NAME },

		// Open Graph (페이스북/카카오톡/슬랙 등 링크 미리보기)
		{ property: "og:type", content: "website" },
		{ property: "og:site_name", content: SITE_NAME },
		{ property: "og:title", content: pageTitle },
		{ property: "og:description", content: description },
		{ property: "og:image", content: image },
		{ property: "og:image:width", content: "1200" },
		{ property: "og:image:height", content: "630" },
		{ property: "og:locale", content: "ko_KR" },
		...(url ? [{ property: "og:url", content: toAbsoluteUrl(url) }] : []),

		// Twitter 카드
		{ name: "twitter:card", content: "summary_large_image" },
		{ name: "twitter:title", content: pageTitle },
		{ name: "twitter:description", content: description },
		{ name: "twitter:image", content: image },
	];
}
