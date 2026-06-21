import { http } from "#/lib/api";

/**
 * 파일 업로드 — 문서 §0 (Ncloud Object Storage, presigned URL 2단계).
 * 서버를 거치지 않고 스토리지로 직접 PUT.
 *
 *   ① POST /upload/presign { filename, content_type, subdir } → { upload_url, headers, file_url }
 *   ② PUT <upload_url> (body=파일, headers의 x-amz-acl + Content-Type)
 *   ③ file_url 을 *_url 필드에 저장
 */

export type UploadSubdir =
	| "profile"
	| "hospital"
	| "notice"
	| "member"
	| "misc";

type PresignResponse = {
	method: string;
	upload_url: string;
	headers?: Record<string, string>;
	file_url: string;
	key: string;
	expires_in: number;
	limits_mb?: { image: number; video: number; file: number };
};

/** presign 발급 + 스토리지로 직접 PUT → 공개 file_url 반환. */
export async function uploadFileToStorage(
	file: File | Blob,
	subdir: UploadSubdir = "misc",
): Promise<string> {
	const filename = file instanceof File ? file.name : "upload.bin";
	const contentType = file.type || "application/octet-stream";

	const presign = await http.post<PresignResponse>("upload/presign", {
		filename,
		content_type: contentType,
		subdir,
	});

	const putHeaders: Record<string, string> = {
		"Content-Type": contentType,
		...(presign.headers ?? {}),
	};

	const res = await fetch(presign.upload_url, {
		method: presign.method || "PUT",
		body: file,
		headers: putHeaders,
	});
	if (!res.ok) {
		throw new Error(`스토리지 업로드 실패 (${res.status})`);
	}
	return presign.file_url;
}
