import {
	AlertTriangle,
	CheckCircle2,
	Download,
	FileText,
	Plus,
	RotateCcw,
	UploadCloud,
	X,
} from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "#/lib/utils.ts";

/**
 * FileDropzone + UploadedFileList — 증빙 파일 업로드/다운로드 위젯.
 * Figma "업로드/다운로드"(1:13295) 기준. 드래그&드롭은 시각 UI만, 실제 업로드 no-op.
 *
 * - FileDropzone: 점선 박스 + 아이콘 + "파일 선택" 버튼 + 끌어다 놓기 안내
 * - UploadedFile: 단일 첨부 카드(아이콘/이름/용량/시간 + 삭제·다운로드)
 * - UploadedFileList: 복수 파일 그리드(검증 배지, 합계, 추가 업로드 버튼)
 * - 업로드 진행 / 실패 상태 카드도 제공
 */

export type UploadedFileItem = {
	id: string;
	name: string;
	size: string;
	uploadedAt?: string;
	verified?: boolean;
};

const KIND_STYLES: Record<string, string> = {
	zip: "text-amber-500",
	pdf: "text-danger-strong",
	jpg: "text-brand",
	jpeg: "text-brand",
	png: "text-brand",
	default: "text-brand",
};

function fileKind(name: string) {
	const ext = name.split(".").pop()?.toLowerCase() ?? "";
	return KIND_STYLES[ext] ?? KIND_STYLES.default;
}

/** 초기 상태 — 점선 드롭존 */
function FileDropzone({
	title = "증빙 파일 추가하기",
	hint = "지원 형식: ZIP, PDF, JPG, PNG / 최대 용량: 파일당 20MB 미만.",
	onSelect,
	className,
}: {
	title?: string;
	hint?: string;
	/** 파일 선택 (no-op 가능) */
	onSelect?: (files: FileList | null) => void;
	className?: string;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const [dragging, setDragging] = useState(false);

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: 드래그&드롭 영역. 클릭/키보드 진입은 내부 "파일 선택" 버튼이 담당.
		<div
			onDragOver={(e) => {
				e.preventDefault();
				setDragging(true);
			}}
			onDragLeave={() => setDragging(false)}
			onDrop={(e) => {
				e.preventDefault();
				setDragging(false);
				onSelect?.(e.dataTransfer.files);
			}}
			className={cn(
				"flex flex-col items-start justify-between gap-4 rounded-lg border-2 border-dashed border-line-soft bg-surface px-6 py-6 transition-colors sm:h-[110px] sm:flex-row sm:items-center sm:px-10 sm:py-0",
				dragging && "border-brand bg-brand-50",
				className,
			)}
		>
			<div className="flex items-center gap-6">
				<span className="flex size-13 shrink-0 items-center justify-center rounded-full bg-app-bg text-body-soft">
					<UploadCloud className="size-6" />
				</span>
				<div className="flex flex-col">
					<span className="text-[19px] font-bold text-ink">{title}</span>
					<span className="text-base text-body">{hint}</span>
				</div>
			</div>
			<div className="flex items-center gap-6">
				<span className="hidden text-[15px] text-muted-fg lg:inline">
					또는 파일을 여기에 끌어다 놓으세요
				</span>
				<button
					type="button"
					onClick={() => inputRef.current?.click()}
					className="flex h-14 items-center justify-center rounded-lg bg-brand px-8 text-[17px] font-semibold text-brand-foreground transition-colors hover:bg-brand-700"
				>
					파일 선택
				</button>
				<input
					ref={inputRef}
					type="file"
					multiple
					className="hidden"
					onChange={(e) => onSelect?.(e.target.files)}
				/>
			</div>
		</div>
	);
}

/** 업로드 진행 중 카드 */
function FileUploadProgress({
	title = "파일을 안전하게 업로드하는 중입니다...",
	percent,
	loaded,
	total,
	onCancel,
	className,
}: {
	title?: string;
	percent: number;
	loaded?: string;
	total?: string;
	onCancel?: () => void;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"relative flex h-[110px] items-center justify-between overflow-hidden rounded-lg border border-line-soft bg-surface px-10",
				className,
			)}
		>
			<div className="flex items-center gap-6">
				<span className="flex size-13 shrink-0 items-center justify-center rounded-full bg-brand-50">
					<span className="size-7 animate-spin rounded-full border-[3px] border-brand/25 border-t-brand" />
				</span>
				<div className="flex flex-col gap-1">
					<span className="text-[19px] font-bold text-ink">{title}</span>
					<span className="text-base text-brand">
						{percent}% 완료{loaded && total ? ` (${loaded} / ${total})` : ""}
					</span>
				</div>
			</div>
			<button
				type="button"
				onClick={onCancel}
				className="flex h-10 items-center gap-2 rounded-lg bg-app-bg px-4 text-[15px] text-body transition-colors hover:bg-line-soft"
			>
				<X className="size-3.5" />
				취소
			</button>
			<div className="absolute inset-x-0 bottom-0 h-1 bg-line-soft">
				<div
					className="h-full bg-brand transition-[width]"
					style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
				/>
			</div>
		</div>
	);
}

/** 단일 첨부 강조 카드 (다운로드 버튼 포함) */
function UploadedFile({
	file,
	onRemove,
	onDownload,
	className,
}: {
	file: UploadedFileItem;
	onRemove?: (id: string) => void;
	onDownload?: (id: string) => void;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex h-[110px] items-center justify-between rounded-lg border-2 border-brand/20 bg-brand-50 px-10",
				className,
			)}
		>
			<div className="flex items-center gap-6">
				<span className="flex size-13 shrink-0 items-center justify-center rounded-full border border-brand/10 bg-surface shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
					<FileText className={cn("size-6", fileKind(file.name))} />
				</span>
				<div className="flex flex-col gap-1">
					<span className="text-[19px] font-bold text-ink">{file.name}</span>
					<span className="text-base text-body">
						파일 용량: {file.size}
						{file.uploadedAt ? ` • 업로드 시간: ${file.uploadedAt}` : ""}
					</span>
				</div>
			</div>
			<div className="flex items-center gap-2">
				{onDownload ? (
					<button
						type="button"
						onClick={() => onDownload(file.id)}
						aria-label="다운로드"
						className="flex size-10 items-center justify-center rounded-full bg-surface text-body transition-colors hover:bg-app-bg"
					>
						<Download className="size-4" />
					</button>
				) : null}
				{onRemove ? (
					<button
						type="button"
						onClick={() => onRemove(file.id)}
						aria-label="삭제"
						className="flex size-10 items-center justify-center rounded-full bg-app-bg text-body transition-colors hover:bg-line-soft"
					>
						<X className="size-4" />
					</button>
				) : null}
			</div>
		</div>
	);
}

/** 복수 파일 행(그리드 항목) */
function FileRow({
	file,
	onRemove,
	onDownload,
}: {
	file: UploadedFileItem;
	onRemove?: (id: string) => void;
	onDownload?: (id: string) => void;
}) {
	return (
		<div className="flex items-center justify-between rounded-lg border border-line-soft bg-surface px-6 py-6 shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
			<div className="flex items-center gap-4">
				<FileText className={cn("size-5 shrink-0", fileKind(file.name))} />
				<div className="flex flex-col gap-1">
					<span className="text-[19px] font-bold text-ink-soft">
						{file.name}
					</span>
					<span className="text-base text-muted-fg">{file.size}</span>
				</div>
			</div>
			<div className="flex items-center gap-6">
				{file.verified ? (
					<span className="flex items-center gap-1 text-base text-success">
						검증완료
						<CheckCircle2 className="size-3.5" />
					</span>
				) : null}
				{onDownload ? (
					<button
						type="button"
						onClick={() => onDownload(file.id)}
						aria-label="다운로드"
						className="flex size-10 items-center justify-center rounded-full bg-app-bg text-body transition-colors hover:bg-line-soft"
					>
						<Download className="size-4" />
					</button>
				) : null}
				{onRemove ? (
					<button
						type="button"
						onClick={() => onRemove(file.id)}
						aria-label="삭제"
						className="flex size-10 items-center justify-center rounded-full bg-app-bg text-body transition-colors hover:bg-line-soft"
					>
						<X className="size-4" />
					</button>
				) : null}
			</div>
		</div>
	);
}

/** 복수 파일 목록 + 합계 + 추가 업로드 버튼 */
function UploadedFileList({
	files,
	totalLabel,
	onRemove,
	onDownload,
	onAddMore,
	addLabel = "증빙 서류 추가 업로드",
	className,
}: {
	files: UploadedFileItem[];
	/** 예: "총 3개의 파일 (42.1 MB)" — 미지정 시 개수만 표시 */
	totalLabel?: string;
	onRemove?: (id: string) => void;
	onDownload?: (id: string) => void;
	onAddMore?: () => void;
	addLabel?: string;
	className?: string;
}) {
	return (
		<div className={cn("flex flex-col gap-4", className)}>
			<p className="text-[17px] text-ink">
				{totalLabel ?? (
					<>
						총 <span className="font-bold">{files.length}</span>개의 파일
					</>
				)}
			</p>
			<div className="flex flex-col gap-3">
				{files.map((f) => (
					<FileRow
						key={f.id}
						file={f}
						onRemove={onRemove}
						onDownload={onDownload}
					/>
				))}
				{onAddMore ? (
					<button
						type="button"
						onClick={onAddMore}
						className="flex h-14 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line-soft text-base text-body transition-colors hover:border-brand hover:text-brand"
					>
						<Plus className="size-3.5" />
						{addLabel}
					</button>
				) : null}
			</div>
		</div>
	);
}

/** 업로드 실패 카드 */
function FileUploadError({
	title = "파일 업로드 실패",
	message = "지원하지 않는 파일 형식입니다. 의사 증빙자료는 ZIP, PDF, JPG, PNG 파일만 가능합니다.",
	onRetry,
	onDismiss,
	className,
}: {
	title?: string;
	message?: string;
	onRetry?: () => void;
	onDismiss?: () => void;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex flex-col items-start justify-between gap-4 rounded-lg border border-danger-strong bg-danger-bg px-6 py-6 sm:h-[110px] sm:flex-row sm:items-center sm:px-10 sm:py-0",
				className,
			)}
		>
			<div className="flex items-center gap-6">
				<span className="flex size-13 shrink-0 items-center justify-center rounded-full bg-surface text-danger-strong shadow-[0_1px_1px_rgba(0,0,0,0.05)]">
					<AlertTriangle className="size-6" />
				</span>
				<div className="flex flex-col gap-1">
					<span className="text-[19px] font-bold text-ink">{title}</span>
					<span className="text-base text-danger-strong">{message}</span>
				</div>
			</div>
			<div className="flex items-center gap-4">
				{onRetry ? (
					<button
						type="button"
						onClick={onRetry}
						className="flex h-12 items-center justify-center gap-2 rounded-lg bg-danger-strong px-6 text-[15px] text-white transition-colors hover:opacity-90"
					>
						<RotateCcw className="size-3.5" />
						다시 시도
					</button>
				) : null}
				{onDismiss ? (
					<button
						type="button"
						onClick={onDismiss}
						aria-label="닫기"
						className="flex size-10 items-center justify-center rounded-full border border-line-soft bg-surface text-body transition-colors hover:bg-app-bg"
					>
						<X className="size-4" />
					</button>
				) : null}
			</div>
		</div>
	);
}

export {
	FileDropzone,
	FileUploadProgress,
	UploadedFile,
	UploadedFileList,
	FileUploadError,
};
