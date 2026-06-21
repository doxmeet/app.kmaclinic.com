/// <reference types="vite/client" />

interface ImportMetaEnv {
	/** Base URL of the backend REST API (no trailing slash). e.g. https://api.kmaclinic.com */
	readonly VITE_API_URL: string;
	/** Doxmeet OAuth authorize endpoint (로그인 시작용, 백엔드에서 추후 전달) */
	readonly VITE_DOXMEET_AUTHORIZE_URL?: string;
	/** Doxmeet OAuth client_id */
	readonly VITE_DOXMEET_CLIENT_ID?: string;
	/** OAuth redirect URI (미설정 시 `${origin}/oauth/callback`) */
	readonly VITE_OAUTH_REDIRECT_URI?: string;
	/** Toss 결제위젯 client key 폴백(보통 API 응답값 사용) */
	readonly VITE_TOSS_CLIENT_KEY?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
