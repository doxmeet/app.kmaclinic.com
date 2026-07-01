/// <reference types="vite/client" />

interface ImportMetaEnv {
	/** Base URL of the backend REST API (no trailing slash). e.g. https://api.kmaclinic.com */
	readonly VITE_API_URL: string;
	/** Doxmeet OAuth authorize endpoint (로그인 시작용, 백엔드에서 추후 전달) */
	readonly VITE_DOXMEET_AUTHORIZE_URL?: string;
	/** Doxmeet OAuth client_id (예: kmaclinic_com) */
	readonly VITE_DOXMEET_CLIENT_ID?: string;
	/** OAuth scope (미설정 시 `read:user`) */
	readonly VITE_DOXMEET_SCOPE?: string;
	/** OAuth redirect URI (미설정 시 `${origin}/oauth/doxmeet/callback`) */
	readonly VITE_OAUTH_REDIRECT_URI?: string;
	/** toss 결제위젯 client key 폴백(보통 API 응답값 사용) */
	readonly VITE_TOSS_CLIENT_KEY?: string;
	/** 홈 "샘플 보기" — 병원 홈페이지 샘플 사이트 URL (미설정 시 ggkma1 샘플) */
	readonly VITE_SAMPLE_HOSPITAL_URL?: string;
	/** 홈 "샘플 보기" — 의사 프로필 샘플 사이트 URL (미설정 시 ggkma1 샘플) */
	readonly VITE_SAMPLE_PROFILE_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
