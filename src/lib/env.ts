import { z } from "zod";

/**
 * Runtime-validated environment variables.
 *
 * Only `VITE_`-prefixed vars are exposed to the client by Vite. The actual value
 * comes from the `.env.[mode]` file selected by the run mode:
 *   - `pnpm dev`                     -> mode "local"      -> .env.local      (api-local)
 *   - `pnpm build:dev` / `start:dev` -> mode "dev"        -> .env.dev        (api-dev)
 *   - `pnpm build` / `start`         -> mode "production" -> .env.production (api)
 *
 * Override locally without committing via `.env.local` / `.env.development.local`.
 */
const schema = z.object({
	VITE_API_URL: z.url(),
});

const parsed = schema.safeParse(import.meta.env);

if (!parsed.success) {
	throw new Error(
		`❌ Invalid environment variables:\n${z.prettifyError(parsed.error)}`,
	);
}

export const env = parsed.data;
