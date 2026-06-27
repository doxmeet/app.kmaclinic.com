import { z } from "zod";

/**
 * 런타임 검증 환경변수. `VITE_` 접두만 클라이언트에 노출.
 *   - pnpm dev (mode localhost) -> .env.localhost  (api-local)
 *   - pnpm build:dev / start:dev -> .env.dev        (api-dev)
 *   - pnpm build / start         -> .env.production (api)
 *
 * Doxmeet OAuth 시작에 필요한 값은 백엔드에서 추후 전달 → 지금은 선택(미설정 시 로그인 시작 stub).
 */
const schema = z.object({
	VITE_API_URL: z.url(),
	// Doxmeet OAuth (로그인 시작용, 선택)
	VITE_DOXMEET_AUTHORIZE_URL: z.string().optional(),
	VITE_DOXMEET_CLIENT_ID: z.string().optional(),
	VITE_DOXMEET_SCOPE: z.string().optional(),
	VITE_OAUTH_REDIRECT_URI: z.string().optional(),
	// GGKMA(경기도의사회) OAuth (로그인 시작용, 선택) — ggkma-oauth-frontend-guide §2.
	// authorize URL = GGKMA 웹 프론트 화면(예: https://www.ggkma.org/oauth/authorize) 전체 URL.
	// ⚠ api.ggkma.org/oauth/authorize/session 아님(그건 GGKMA 내부용). token/userinfo·client_secret 은 백엔드 전용.
	// scope 기본 "profile license workplace".
	VITE_GGKMA_AUTHORIZE_URL: z.string().optional(),
	VITE_GGKMA_CLIENT_ID: z.string().optional(),
	VITE_GGKMA_SCOPE: z.string().optional(),
	VITE_GGKMA_REDIRECT_URI: z.string().optional(),
	// 결제 위젯(toss) — payment.toss_client_key가 응답으로 오므로 보통 불필요(선택 폴백)
	VITE_TOSS_CLIENT_KEY: z.string().optional(),
	// 병원 홈페이지 실시간 미리보기 앱(preview.kmaclinic.com)의 origin.
	// iframe src = origin 루트(`/preview` 경로 없음) + postMessage targetOrigin(preview-integration.md §2).
	// 미리보기 앱은 dev가 없어 모든 환경이 prod(preview.kmaclinic.com)를 쓴다. 미설정 시 폴백.
	VITE_PREVIEW_ORIGIN: z.url().optional(),
	// 의사 프로필 실시간 미리보기 앱(preview.kmadoc.com)의 origin.
	// iframe src = origin 루트(`/preview` 경로 없음) + postMessage targetOrigin(editor-preview-integration.md §4).
	// 미리보기 앱은 dev가 없어 모든 환경이 prod(preview.kmadoc.com)를 쓴다. 미설정 시 폴백.
	VITE_PROFILE_PREVIEW_ORIGIN: z.url().optional(),
});

const parsed = schema.safeParse(import.meta.env);

if (!parsed.success) {
	throw new Error(
		`❌ Invalid environment variables:\n${z.prettifyError(parsed.error)}`,
	);
}

export const env = parsed.data;
