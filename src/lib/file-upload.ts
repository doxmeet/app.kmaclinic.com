import type { PostFn } from "#/hooks/use-request.ts";
import { type UploadSubdir, uploadFileToStorage } from "#/lib/upload.ts";

/**
 * Tiptap 에디터 이미지 업로드 — 문서 §0 presigned URL 방식으로 구현.
 *
 * 에디터는 기존 "업로드 세션" 인터페이스(createUploadSession/uploadFile)를 그대로
 * 호출하므로, 시그니처는 유지하되 내부는 presign 직접 PUT으로 동작합니다.
 * (세션 개념이 없으므로 scopeType을 subdir로 변환해 전달)
 */

export interface UploadedAttachment {
	public_url: string;
}

const SUBDIRS: UploadSubdir[] = [
	"profile",
	"hospital",
	"notice",
	"member",
	"misc",
];

function toSubdir(scopeType: string): UploadSubdir {
	const s = scopeType.toLowerCase();
	const hit = SUBDIRS.find((d) => s.includes(d));
	if (hit) return hit;
	if (s.includes("board") || s.includes("post")) return "notice";
	return "misc";
}

/** presign 방식에는 세션이 없으므로 subdir 문자열을 "세션 id"처럼 반환. */
export async function createUploadSession(
	_post: PostFn,
	scopeType: string,
	_scopeKey: string,
): Promise<string> {
	return toSubdir(scopeType);
}

export async function uploadFile(
	file: File,
	sessionId: string,
	_post: PostFn,
): Promise<UploadedAttachment> {
	const subdir = (SUBDIRS as string[]).includes(sessionId)
		? (sessionId as UploadSubdir)
		: "misc";
	const fileUrl = await uploadFileToStorage(file, subdir);
	return { public_url: fileUrl };
}
