/**
 * Local (per-browser) draft autosave for the Tiptap editor.
 *
 * Drafts are stored in localStorage keyed by route path so an accidental
 * navigation / refresh doesn't lose unsaved work. They expire after a TTL and
 * are swept lazily. This is intentionally client-only and independent from the
 * backend — the backend stores *published* content; this is just a safety net.
 */

export interface TiptapDraftRecord {
	content: string;
	updatedAt: number;
}

const DRAFT_PREFIX = "tiptap-draft:";
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7일
const isBrowser = typeof window !== "undefined";

function storageKey(key: string): string {
	return `${DRAFT_PREFIX}${key}`;
}

/** Derive a stable draft key from the current location. */
export function getCurrentDraftKey(): string | null {
	if (!isBrowser) return null;
	return window.location.pathname || null;
}

/** True when the HTML has no meaningful content (ignoring empty paragraphs). */
export function isEmptyTiptapContent(html: string): boolean {
	if (!html) return true;
	// 미디어가 있으면 비어있지 않음
	if (/<(img|iframe|table|hr|video)[\s>]/i.test(html)) return false;
	const text = html
		.replace(/<[^>]*>/g, "")
		.replace(/&nbsp;/gi, "")
		.replace(/\s+/g, "");
	return text.length === 0;
}

export async function loadTiptapDraft(
	key: string,
): Promise<TiptapDraftRecord | null> {
	if (!isBrowser) return null;
	try {
		const raw = window.localStorage.getItem(storageKey(key));
		if (!raw) return null;
		const parsed = JSON.parse(raw) as Partial<TiptapDraftRecord>;
		if (
			typeof parsed.content !== "string" ||
			typeof parsed.updatedAt !== "number"
		) {
			return null;
		}
		if (Date.now() - parsed.updatedAt > DRAFT_TTL_MS) {
			window.localStorage.removeItem(storageKey(key));
			return null;
		}
		return { content: parsed.content, updatedAt: parsed.updatedAt };
	} catch {
		return null;
	}
}

export async function saveTiptapDraft(
	key: string,
	content: string,
): Promise<void> {
	if (!isBrowser) return;
	try {
		const record: TiptapDraftRecord = { content, updatedAt: Date.now() };
		window.localStorage.setItem(storageKey(key), JSON.stringify(record));
	} catch {
		// 용량 초과 등은 조용히 무시
	}
}

export async function clearTiptapDraft(key: string): Promise<void> {
	if (!isBrowser) return;
	try {
		window.localStorage.removeItem(storageKey(key));
	} catch {
		// noop
	}
}

export async function sweepExpiredTiptapDrafts(): Promise<void> {
	if (!isBrowser) return;
	try {
		const now = Date.now();
		const toRemove: string[] = [];
		for (let i = 0; i < window.localStorage.length; i++) {
			const k = window.localStorage.key(i);
			if (!k || !k.startsWith(DRAFT_PREFIX)) continue;
			try {
				const raw = window.localStorage.getItem(k);
				if (!raw) {
					toRemove.push(k);
					continue;
				}
				const parsed = JSON.parse(raw) as Partial<TiptapDraftRecord>;
				if (
					typeof parsed.updatedAt !== "number" ||
					now - parsed.updatedAt > DRAFT_TTL_MS
				) {
					toRemove.push(k);
				}
			} catch {
				toRemove.push(k);
			}
		}
		for (const k of toRemove) {
			window.localStorage.removeItem(k);
		}
	} catch {
		// noop
	}
}

/** Korean relative time label, e.g. "3분 전". */
export function formatDraftRelativeTime(timestamp: number): string {
	const diff = Date.now() - timestamp;
	const sec = Math.floor(diff / 1000);
	if (sec < 60) return "방금 전";
	const min = Math.floor(sec / 60);
	if (min < 60) return `${min}분 전`;
	const hour = Math.floor(min / 60);
	if (hour < 24) return `${hour}시간 전`;
	const day = Math.floor(hour / 24);
	if (day < 30) return `${day}일 전`;
	const d = new Date(timestamp);
	const mm = String(d.getMonth() + 1).padStart(2, "0");
	const dd = String(d.getDate()).padStart(2, "0");
	return `${d.getFullYear()}.${mm}.${dd}`;
}
