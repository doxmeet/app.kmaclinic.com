import type { PostFn } from "#/hooks/use-request";

/**
 * Image upload pipeline for the Tiptap editor.
 *
 * The flow mirrors the reference project: a short-lived "upload session" is
 * created for a given scope (e.g. a draft post), then files are streamed into
 * that session. Adjust the endpoint paths / response shapes to match the
 * actual Node.js REST backend.
 *
 *   POST uploads/sessions                  { scopeType, scopeKey } -> { id }
 *   POST uploads/sessions/:id/files        (multipart "file")      -> { public_url }
 */

export interface UploadedAttachment {
	public_url: string;
}

export async function createUploadSession(
	post: PostFn,
	scopeType: string,
	scopeKey: string,
): Promise<string> {
	const session = await post<{ id: string }>("uploads/sessions", {
		scopeType,
		scopeKey,
	});
	return session.id;
}

export async function uploadFile(
	file: File,
	sessionId: string,
	post: PostFn,
): Promise<UploadedAttachment> {
	const formData = new FormData();
	formData.append("file", file);
	return post<UploadedAttachment>(
		`uploads/sessions/${sessionId}/files`,
		formData,
	);
}
