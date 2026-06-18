import { useMemo } from "react";
import { toast } from "sonner";
import { api } from "#/lib/api";

/**
 * Generic POST helper used by the editor's image upload pipeline.
 *
 * `body` may be a plain object (sent as JSON) or a `FormData` (sent as
 * multipart, e.g. file uploads). Returns the parsed JSON response.
 */
export type PostFn = <T = unknown>(url: string, body?: unknown) => Promise<T>;

export interface UseRequestOptions {
	/** When true, network errors are re-thrown without showing a toast. */
	suppressErrorToast?: boolean;
}

export interface UseRequest {
	post: PostFn;
}

export function useRequest(options: UseRequestOptions = {}): UseRequest {
	const { suppressErrorToast = false } = options;

	const post = useMemo<PostFn>(() => {
		const fn = async (url: string, body?: unknown): Promise<unknown> => {
			const path = url.replace(/^\/+/, "");
			try {
				if (body instanceof FormData) {
					return await api.post(path, { body }).json();
				}
				if (body !== undefined) {
					return await api.post(path, { json: body }).json();
				}
				return await api.post(path).json();
			} catch (error) {
				if (!suppressErrorToast) {
					toast.error("요청 처리 중 오류가 발생했습니다.");
				}
				throw error;
			}
		};
		return fn as unknown as PostFn;
	}, [suppressErrorToast]);

	return { post };
}
