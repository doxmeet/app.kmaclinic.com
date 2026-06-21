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
	VITE_OAUTH_REDIRECT_URI: z.string().optional(),
	// 결제 위젯(Toss) — payment.toss_client_key가 응답으로 오므로 보통 불필요(선택 폴백)
	VITE_TOSS_CLIENT_KEY: z.string().optional(),
});

const parsed = schema.safeParse(import.meta.env);

if (!parsed.success) {
	throw new Error(
		`❌ Invalid environment variables:\n${z.prettifyError(parsed.error)}`,
	);
}

export const env = parsed.data;
