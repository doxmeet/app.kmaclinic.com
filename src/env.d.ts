/// <reference types="vite/client" />

interface ImportMetaEnv {
	/** Base URL of the backend REST API (no trailing slash). e.g. https://api.kmaclinic.com */
	readonly VITE_API_URL: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
