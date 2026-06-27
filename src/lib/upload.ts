import JSZip from "jszip";
import { http } from "#/lib/api";

/**
 * 파일 업로드 — 문서 §0 / file-upload-dedup-guide (Ncloud Object Storage, presigned URL).
 * 서버를 거치지 않고 스토리지로 직접 PUT.
 *
 *   ① POST /upload/presign { filename, content_type, subdir, sha256, size }
 *        → { duplicate, upload_url, headers, file_url, ... }
 *   ② duplicate=false 일 때만 PUT <upload_url> (body=파일, headers의 x-amz-acl + Content-Type)
 *        — duplicate=true 면 이미 올라간 파일이라 PUT 생략하고 file_url 그대로 사용.
 *   ③ file_url 을 *_url 필드에 저장
 *
 * 중복제거(dedup, file-upload-dedup-guide): presign에 **파일 내용 SHA-256 + 크기**를 함께 보내면,
 * 같은 사용자가 같은 내용(해시·크기 동일)의 파일을 다시 올릴 때 서버가 재업로드 없이 기존
 * file_url을 즉시 돌려준다(`duplicate:true`). 판정 키 = (업로더, 해시, 크기). 해시는 보안
 * 컨텍스트(HTTPS/localhost)에서만 되는 `crypto.subtle` — 못 쓰면 해시 없이 보내고 매번 새로
 * 업로드한다(에러 아님, dedup만 비활성).
 *
 * 대량(논문 ZIP) 업로드는 paper-zip-bulk-analyze-guide §1: ZIP은 **백엔드가 풀지 않는다**.
 * 브라우저에서 ZIP을 풀어 내부 문서를 개별 파일로 업로드한 뒤, file_url 목록을 분석 API에
 * 넘긴다(`expandFilesToUpload` → `uploadFilesToStorage` → analyzeProfileDocuments).
 */

export type UploadSubdir =
	| "profile"
	| "hospital"
	| "notice"
	| "member"
	| "misc";

type PresignResponse = {
	/** true면 이미 올라간 파일 — PUT 생략, file_url 그대로 사용. */
	duplicate?: boolean;
	/** duplicate=true 면 null. */
	method?: string | null;
	upload_url?: string | null;
	headers?: Record<string, string> | null;
	file_url: string;
	key: string;
	expires_in?: number | null;
	/** duplicate=true 일 때 최초 업로드 시각(ISO). */
	uploaded_at?: string | null;
	content_type?: string | null;
	limits_mb?: { image: number; video: number; file: number };
};

/**
 * File/Blob → SHA-256 hex(64자 소문자). 보안 컨텍스트가 아니어서 `crypto.subtle`이 없으면
 * null(=dedup 없이 업로드). 전체를 메모리로 읽으므로 큰 파일은 수백 ms 걸릴 수 있다(§5).
 */
async function sha256Hex(file: File | Blob): Promise<string | null> {
	if (!globalThis.crypto?.subtle) return null;
	try {
		const digest = await crypto.subtle.digest(
			"SHA-256",
			await file.arrayBuffer(),
		);
		return [...new Uint8Array(digest)]
			.map((b) => b.toString(16).padStart(2, "0"))
			.join("");
	} catch {
		return null; // 해시 실패 시 dedup만 포기하고 정상 업로드.
	}
}

/** presign 발급(+dedup) → 중복이 아니면 스토리지로 직접 PUT → 공개 file_url 반환. */
export async function uploadFileToStorage(
	file: File | Blob,
	subdir: UploadSubdir = "misc",
): Promise<string> {
	const filename = file instanceof File ? file.name : "upload.bin";
	const contentType = file.type || "application/octet-stream";
	const sha256 = await sha256Hex(file);

	const presign = await http.post<PresignResponse>("upload/presign", {
		filename,
		content_type: contentType,
		subdir,
		// 해시를 못 구하면(비보안 컨텍스트) 생략 — 서버는 dedup 없이 새로 업로드한다.
		...(sha256 ? { sha256, size: file.size } : {}),
	});

	// 이미 올라간 파일이면 PUT 없이 기존 URL 사용(서버가 sha256+size로 판정).
	if (presign.duplicate || !presign.upload_url) {
		return presign.file_url;
	}

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

// ── ZIP 클라이언트 해제 + 대량 업로드 (paper-zip-bulk-analyze-guide §1·§3) ──
//
// 분석 API는 `.zip` URL을 받으면 400(ERROR_400_ZIP_MUST_BE_EXPANDED_CLIENT_SIDE)으로
// 거부한다. ZIP은 브라우저에서 풀어 내부 문서를 개별 파일로 업로드해야 한다.

/** 분석 가능한 문서 확장자(이미지·압축 자체는 제외). 서버가 확장자로 파서를 고른다. */
const ANALYZABLE_EXTS = new Set([
	".pdf",
	".doc",
	".docx",
	".hwp",
	".hwpx",
	".ppt",
	".pptx",
	".xls",
	".xlsx",
]);

function extOf(name: string): string {
	const i = name.lastIndexOf(".");
	return i >= 0 ? name.slice(i).toLowerCase() : "";
}

/** 압축 메타·숨김·디렉터리 엔트리 거르기(__MACOSX, .DS_Store, dotfile 등). */
function isJunkEntry(path: string): boolean {
	const base = path.split("/").pop() ?? "";
	return (
		path.includes("__MACOSX/") ||
		base === ".DS_Store" ||
		base === "Thumbs.db" ||
		base.startsWith(".") ||
		base === ""
	);
}

/** ZIP 버퍼를 재귀로 평탄화 → 분석 가능한 File[]만 out에 모은다(중첩 ZIP 포함). */
async function walkZip(buf: ArrayBuffer, out: File[]): Promise<void> {
	const zip = await JSZip.loadAsync(buf);
	const entries = Object.values(zip.files).filter(
		(e) => !e.dir && !isJunkEntry(e.name),
	);
	for (const entry of entries) {
		const base = entry.name.split("/").pop() ?? entry.name; // 한글 파일명 유지
		const ext = extOf(base);
		if (ext === ".zip") {
			await walkZip(await entry.async("arraybuffer"), out); // 중첩 ZIP 재귀
		} else if (ANALYZABLE_EXTS.has(ext)) {
			const blob = await entry.async("blob");
			if (blob.size > 0) out.push(new File([blob], base, { type: blob.type }));
		}
	}
}

/**
 * 선택한 파일들을 **실제 업로드할 문서 목록**으로 전개한다.
 *  - `.zip` → 브라우저에서 풀어 내부 문서를 개별 File로(중첩 ZIP 재귀, 쓰레기 제외).
 *  - 일반 문서 → 분석 가능한 확장자만 그대로 통과.
 *  - 그 외(이미지 등) → 제외.
 */
export async function expandFilesToUpload(inputs: File[]): Promise<File[]> {
	const out: File[] = [];
	for (const input of inputs) {
		if (extOf(input.name) === ".zip") {
			await walkZip(await input.arrayBuffer(), out);
		} else if (ANALYZABLE_EXTS.has(extOf(input.name))) {
			out.push(input);
		}
	}
	return out;
}

/** 파일별 업로드 실패(부분 실패는 치명적이지 않다 — 성공분만 분석에 넘긴다). */
export type UploadFailure = { name: string; error: string };

export type UploadBatchResult = {
	/** 성공한 파일의 공개 file_url 목록. */
	urls: string[];
	/** 실패한 파일과 사유. */
	failed: UploadFailure[];
};

/**
 * 여러 파일을 동시 업로드(기본 동시 6개). 파일별 실패는 건너뛰고 진행률을 보고한다.
 * paper-zip-bulk-analyze-guide §2: 브라우저 커넥션 한계 고려, 부분 실패 허용.
 */
export async function uploadFilesToStorage(
	files: File[],
	subdir: UploadSubdir = "profile",
	options: {
		concurrency?: number;
		onProgress?: (done: number, total: number) => void;
	} = {},
): Promise<UploadBatchResult> {
	const concurrency = options.concurrency ?? 6;
	const total = files.length;
	const urls: string[] = [];
	const failed: UploadFailure[] = [];
	let cursor = 0;
	let done = 0;

	async function worker() {
		while (cursor < files.length) {
			const file = files[cursor++];
			try {
				urls.push(await uploadFileToStorage(file, subdir));
			} catch (e) {
				failed.push({
					name: file.name,
					error: e instanceof Error ? e.message : String(e),
				});
			} finally {
				options.onProgress?.(++done, total);
			}
		}
	}

	await Promise.all(
		Array.from({ length: Math.min(concurrency, total) }, worker),
	);
	return { urls, failed };
}
