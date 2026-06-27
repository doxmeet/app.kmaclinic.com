import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// 컴포넌트 단위 테스트 전용 설정.
// 프로덕션 vite.config.ts의 TanStack Start/nitro 플러그인은 SSR/서버 전제라
// jsdom 단위 테스트와 충돌하므로, 여기서는 react 플러그인 + jsdom만 사용한다.
export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: [
			// package.json "imports"의 "#/*": "./src/*" 를 vitest에서 재현.
			{ find: /^#\/(.*)$/, replacement: `${resolve(__dirname, "src")}/$1` },
		],
	},
	test: {
		environment: "jsdom",
		globals: true,
		css: false,
		setupFiles: ["src/test/setup.ts"],
		include: ["src/**/*.test.{ts,tsx}"],
		// src/lib/env.ts 런타임 검증 통과용(실제 호출은 모킹되어 발생하지 않음).
		env: {
			VITE_API_URL: "https://api-test.kmaclinic.com",
			VITE_PREVIEW_ORIGIN: "https://preview.kmaclinic.com",
		},
	},
});
