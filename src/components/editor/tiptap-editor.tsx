/** biome-ignore-all lint/a11y/noStaticElementInteractions: 에디터 surface의 파일 드롭 핸들링을 위해 필요함 */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: 에디터 surface 클릭은 내부 contenteditable로 위임되며 키보드 사용자는 contenteditable에 직접 포커스/타이핑 가능 */
import { mergeAttributes, Node as TiptapNode } from "@tiptap/core";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import {
	Table,
	TableCell,
	TableHeader,
	TableRow,
} from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import { Color, FontSize, TextStyle } from "@tiptap/extension-text-style";
import Underline from "@tiptap/extension-underline";
import Youtube from "@tiptap/extension-youtube";
import type { Node as PmNode } from "@tiptap/pm/model";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";
import { EditorContent, Extension, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import "./tiptap.css";

declare module "@tiptap/core" {
	interface Commands<ReturnType> {
		indent: {
			indent: () => ReturnType;
			outdent: () => ReturnType;
		};
		blockLineHeight: {
			setLineHeight: (lineHeight: string) => ReturnType;
			unsetLineHeight: () => ReturnType;
		};
		verticalAlign: {
			setVerticalAlign: (verticalAlign: string) => ReturnType;
			unsetVerticalAlign: () => ReturnType;
		};
	}
}

import {
	AlignCenter,
	AlignCenterHorizontal,
	AlignEndHorizontal,
	AlignJustify,
	AlignLeft,
	AlignRight,
	AlignStartHorizontal,
	Bold,
	Code,
	Highlighter,
	ImageIcon,
	IndentDecrease,
	IndentIncrease,
	Italic,
	Link as LinkIcon,
	List,
	ListOrdered,
	Minus,
	Palette,
	Pencil,
	Plus,
	Redo2,
	Strikethrough,
	Subscript as SubscriptIcon,
	Superscript as SuperscriptIcon,
	TableIcon,
	Trash2,
	Type,
	Underline as UnderlineIcon,
	Undo2,
	Video,
} from "lucide-react";
import {
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { Checkbox } from "#/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "#/components/ui/dialog";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { useRequest } from "#/hooks/use-request";
import { createUploadSession, uploadFile } from "#/lib/file-upload";
import {
	clearTiptapDraft,
	formatDraftRelativeTime,
	getCurrentDraftKey,
	isEmptyTiptapContent,
	loadTiptapDraft,
	saveTiptapDraft,
	sweepExpiredTiptapDrafts,
	type TiptapDraftRecord,
} from "#/lib/tiptap-draft";
import { cn } from "#/lib/utils";

// ─── Custom Extensions ──────────────────────────────────────────────

const Indent = Extension.create({
	name: "indent",
	addGlobalAttributes() {
		return [
			{
				types: ["paragraph", "heading"],
				attributes: {
					marginLeft: {
						default: null,
						parseHTML: (el) => (el as HTMLElement).style.marginLeft || null,
						renderHTML: (attrs) =>
							attrs.marginLeft
								? { style: `margin-left: ${attrs.marginLeft}` }
								: {},
					},
				},
			},
		];
	},
	addCommands() {
		return {
			indent:
				() =>
				({
					tr,
					state,
					dispatch,
				}: {
					tr: Transaction;
					state: EditorState;
					dispatch: ((tr: Transaction) => void) | undefined;
				}) => {
					const { from, to } = state.selection;
					state.doc.nodesBetween(from, to, (node: PmNode, pos: number) => {
						if (
							node.type.name === "paragraph" ||
							node.type.name === "heading"
						) {
							const current = node.attrs.marginLeft || "0em";
							const val = Number.parseFloat(current.replace("em", "")) || 0;
							if (val < 10) {
								if (dispatch) {
									tr.setNodeMarkup(pos, undefined, {
										...node.attrs,
										marginLeft: `${val + 2}em`,
									});
								}
							}
						}
					});
					return true;
				},
			outdent:
				() =>
				({
					tr,
					state,
					dispatch,
				}: {
					tr: Transaction;
					state: EditorState;
					dispatch: ((tr: Transaction) => void) | undefined;
				}) => {
					const { from, to } = state.selection;
					state.doc.nodesBetween(from, to, (node: PmNode, pos: number) => {
						if (
							node.type.name === "paragraph" ||
							node.type.name === "heading"
						) {
							const current = node.attrs.marginLeft || "0em";
							const val = Number.parseFloat(current.replace("em", "")) || 0;
							if (val > 0) {
								const next = Math.max(0, val - 2);
								if (dispatch) {
									tr.setNodeMarkup(pos, undefined, {
										...node.attrs,
										marginLeft: next ? `${next}em` : null,
									});
								}
							}
						}
					});
					return true;
				},
		};
	},
});

// 블록(paragraph/heading) 레벨에 line-height를 적용하는 커스텀 extension.
// 기본 @tiptap/extension-text-style의 LineHeight는 textStyle 마크(=inline span)에
// 적용하기 때문에 line-height가 시각적으로 반영되지 않는다 (line-height는 line box
// 속성이라 block 노드에 적용되어야 효과가 보임).
const BlockLineHeight = Extension.create({
	name: "blockLineHeight",
	addOptions() {
		return { types: ["paragraph", "heading"] as string[] };
	},
	addGlobalAttributes() {
		return [
			{
				types: this.options.types,
				attributes: {
					lineHeight: {
						default: null,
						parseHTML: (el) => (el as HTMLElement).style.lineHeight || null,
						renderHTML: (attrs) =>
							attrs.lineHeight
								? { style: `line-height: ${attrs.lineHeight}` }
								: {},
					},
				},
			},
		];
	},
	addCommands() {
		return {
			setLineHeight:
				(lineHeight: string) =>
				({ commands }) => {
					const types = this.options.types as string[];
					return types
						.map((type) => commands.updateAttributes(type, { lineHeight }))
						.some(Boolean);
				},
			unsetLineHeight:
				() =>
				({ commands }) => {
					const types = this.options.types as string[];
					return types
						.map((type) => commands.resetAttributes(type, "lineHeight"))
						.some(Boolean);
				},
		};
	},
});

// 수직 정렬(top/middle/bottom) attribute 를 tableCell/tableHeader/image 에 추가한다.
// 수평 정렬(TextAlign) 과 달리 대상 노드는 커서의 (a) 선택 범위 내부 (b) 형제 (c) 조상
// 어디에라도 위치할 수 있어 표준 updateAttributes (nodesBetween 기반) 만으로는 다 잡히지 않아
// 직접 (b)/(c) 탐색을 수행한다.
function applyVerticalAlignToTargets(
	tr: Transaction,
	state: EditorState,
	dispatch: ((tr: Transaction) => void) | undefined,
	types: string[],
	verticalAlign: string | null,
): boolean {
	let didUpdate = false;
	const setAttr = (pos: number, node: PmNode) => {
		const current = (node.attrs.verticalAlign ?? null) as string | null;
		if (current === verticalAlign) return;
		if (dispatch) {
			tr.setNodeMarkup(pos, undefined, { ...node.attrs, verticalAlign });
		}
		didUpdate = true;
	};

	// (a) 선택 범위 내 매칭 노드 — 드래그 / CellSelection / 이미지 NodeSelection
	state.selection.ranges.forEach((range) => {
		state.doc.nodesBetween(range.$from.pos, range.$to.pos, (node, pos) => {
			if (types.includes(node.type.name)) setAttr(pos, node);
		});
	});
	if (didUpdate) return didUpdate;

	const $from = state.selection.$from;

	// (b) 커서가 속한 블록의 자식(형제) 중 매칭 노드 — 같은 문단의 인라인 이미지 등
	const parent = $from.parent;
	if (parent.isBlock) {
		const parentStart = $from.start();
		parent.forEach((child, offset) => {
			if (types.includes(child.type.name)) {
				setAttr(parentStart + offset, child);
			}
		});
	}
	if (didUpdate) return didUpdate;

	// (c) 커서의 조상 체인에서 가장 가까운 매칭 노드 — 표 셀 등
	for (let depth = $from.depth; depth > 0; depth--) {
		const node = $from.node(depth);
		if (types.includes(node.type.name)) {
			setAttr($from.before(depth), node);
			break;
		}
	}
	return didUpdate;
}

const VerticalAlign = Extension.create({
	name: "verticalAlign",
	addOptions() {
		return {
			types: ["tableCell", "tableHeader", "image"] as string[],
			alignments: ["top", "middle", "bottom"] as string[],
			defaultAlignment: null as string | null,
		};
	},
	addGlobalAttributes() {
		return [
			{
				types: this.options.types,
				attributes: {
					verticalAlign: {
						default: this.options.defaultAlignment,
						parseHTML: (el) => {
							const va = (el as HTMLElement).style.verticalAlign;
							const allowed = this.options.alignments as string[];
							return allowed.includes(va) ? va : this.options.defaultAlignment;
						},
						renderHTML: (attrs) =>
							attrs.verticalAlign
								? { style: `vertical-align: ${attrs.verticalAlign}` }
								: {},
					},
				},
			},
		];
	},
	addCommands() {
		return {
			setVerticalAlign:
				(verticalAlign: string) =>
				({
					tr,
					state,
					dispatch,
				}: {
					tr: Transaction;
					state: EditorState;
					dispatch: ((tr: Transaction) => void) | undefined;
				}) => {
					const allowed = this.options.alignments as string[];
					if (!allowed.includes(verticalAlign)) return false;
					const types = this.options.types as string[];
					return applyVerticalAlignToTargets(
						tr,
						state,
						dispatch,
						types,
						verticalAlign,
					);
				},
			unsetVerticalAlign:
				() =>
				({
					tr,
					state,
					dispatch,
				}: {
					tr: Transaction;
					state: EditorState;
					dispatch: ((tr: Transaction) => void) | undefined;
				}) => {
					const types = this.options.types as string[];
					return applyVerticalAlignToTargets(tr, state, dispatch, types, null);
				},
		};
	},
});

// 표준 @tiptap/extension-image 를 확장해 width/height(px) 와 sizeStyle(%) 속성을
// 추가한다. 이 속성들은 renderHTML 로 직접 출력되어 저장/표시 시 크기가 유지된다.
// (참고 프로젝트의 드래그 리사이즈 NodeView 는 커스텀 Image 패키지에 의존하므로
//  제거했고, 대신 이미지 플로팅 툴바의 "편집" 다이얼로그로 px/% 크기를 조절한다.)
const ResizableImage = Image.extend({
	addAttributes() {
		return {
			...this.parent?.(),
			width: {
				default: null,
				parseHTML: (el) => {
					const w = (el as HTMLElement).getAttribute("width");
					if (!w) return null;
					const n = Number.parseInt(w, 10);
					return Number.isNaN(n) ? w : n;
				},
				renderHTML: (attrs) =>
					attrs.width != null ? { width: attrs.width } : {},
			},
			height: {
				default: null,
				parseHTML: (el) => {
					const h = (el as HTMLElement).getAttribute("height");
					if (!h) return null;
					const n = Number.parseInt(h, 10);
					return Number.isNaN(n) ? h : n;
				},
				renderHTML: (attrs) =>
					attrs.height != null ? { height: attrs.height } : {},
			},
			sizeStyle: {
				default: null,
				parseHTML: (el) => {
					const style = (el as HTMLElement).getAttribute("style") || "";
					const matches = style.match(/(?:width|height)\s*:\s*[^;]+/gi);
					return matches && matches.length > 0 ? matches.join("; ") : null;
				},
				renderHTML: (attrs) =>
					attrs.sizeStyle ? { style: attrs.sizeStyle } : {},
			},
		};
	},
});

const Iframe = TiptapNode.create({
	name: "iframe",
	group: "block",
	atom: true,
	draggable: true,
	addAttributes() {
		return {
			src: {
				default: null,
				parseHTML: (el) => el.getAttribute("src"),
				renderHTML: (attrs) => (attrs.src ? { src: attrs.src } : {}),
			},
			width: {
				default: null,
				parseHTML: (el) => el.getAttribute("width"),
				renderHTML: (attrs) => (attrs.width ? { width: attrs.width } : {}),
			},
			height: {
				default: null,
				parseHTML: (el) => el.getAttribute("height"),
				renderHTML: (attrs) => (attrs.height ? { height: attrs.height } : {}),
			},
			frameborder: {
				default: null,
				parseHTML: (el) => el.getAttribute("frameborder"),
				renderHTML: (attrs) =>
					attrs.frameborder !== null && attrs.frameborder !== undefined
						? { frameborder: attrs.frameborder }
						: {},
			},
			allowfullscreen: {
				default: null,
				parseHTML: (el) => (el.hasAttribute("allowfullscreen") ? "" : null),
				renderHTML: (attrs) =>
					attrs.allowfullscreen !== null && attrs.allowfullscreen !== undefined
						? { allowfullscreen: "" }
						: {},
			},
			allow: {
				default: null,
				parseHTML: (el) => el.getAttribute("allow"),
				renderHTML: (attrs) => (attrs.allow ? { allow: attrs.allow } : {}),
			},
			referrerpolicy: {
				default: null,
				parseHTML: (el) => el.getAttribute("referrerpolicy"),
				renderHTML: (attrs) =>
					attrs.referrerpolicy ? { referrerpolicy: attrs.referrerpolicy } : {},
			},
			loading: {
				default: null,
				parseHTML: (el) => el.getAttribute("loading"),
				renderHTML: (attrs) =>
					attrs.loading ? { loading: attrs.loading } : {},
			},
			style: {
				default: null,
				parseHTML: (el) => el.getAttribute("style"),
				renderHTML: (attrs) => (attrs.style ? { style: attrs.style } : {}),
			},
			class: {
				default: null,
				parseHTML: (el) => el.getAttribute("class"),
				renderHTML: (attrs) => (attrs.class ? { class: attrs.class } : {}),
			},
			title: {
				default: null,
				parseHTML: (el) => el.getAttribute("title"),
				renderHTML: (attrs) => (attrs.title ? { title: attrs.title } : {}),
			},
			name: {
				default: null,
				parseHTML: (el) => el.getAttribute("name"),
				renderHTML: (attrs) => (attrs.name ? { name: attrs.name } : {}),
			},
			scrolling: {
				default: null,
				parseHTML: (el) => el.getAttribute("scrolling"),
				renderHTML: (attrs) =>
					attrs.scrolling ? { scrolling: attrs.scrolling } : {},
			},
		};
	},
	parseHTML() {
		return [{ tag: "iframe" }];
	},
	renderHTML({ HTMLAttributes }) {
		return ["iframe", mergeAttributes(HTMLAttributes)];
	},
});

// ─── Types ──────────────────────────────────────────────────────────

interface ImageUploadScope {
	scopeType: string;
	scopeKey: string;
}

interface TiptapEditorProps {
	value: string;
	setValue: (value: string) => void;
	height?: number;
	placeholder?: string;
	setEditor?: (editor: Editor | null) => void;
	readonly?: boolean;
	disabled?: boolean;
	buttons?: string[];
	toolbar?: boolean;
	className?: string;
	editorClassName?: string;
	imageUploadScope?: ImageUploadScope;
	draftKey?: string;
	draftDisabled?: boolean;
}

// ─── Constants ──────────────────────────────────────────────────────

const LARGE_CONTENT_THRESHOLD = 200_000;
const EDITOR_HEIGHT_STORAGE_KEY = "tiptap-editor-height";
const EDITOR_HEIGHT_MIN = 240;
const EDITOR_HEIGHT_MAX = 2000;
const EDITOR_HEIGHT_MOBILE = 380;
const EDITOR_MOBILE_MEDIA_QUERY = "(max-width: 1023px)";

function loadStoredEditorHeight(fallback: number): number {
	if (typeof window === "undefined") return fallback;
	try {
		const raw = window.localStorage.getItem(EDITOR_HEIGHT_STORAGE_KEY);
		if (!raw) return fallback;
		const parsed = Number.parseInt(raw, 10);
		if (Number.isNaN(parsed)) return fallback;
		if (parsed < EDITOR_HEIGHT_MIN || parsed > EDITOR_HEIGHT_MAX) {
			return fallback;
		}
		return parsed;
	} catch {
		return fallback;
	}
}

const FONT_SIZES = [
	"12px",
	"14px",
	"16px",
	"18px",
	"20px",
	"24px",
	"28px",
	"32px",
	"36px",
];
const LINE_HEIGHTS = ["1", "1.15", "1.5", "2", "2.5", "3"];
const TEXT_COLORS = [
	"#000000",
	"#434343",
	"#666666",
	"#999999",
	"#b7b7b7",
	"#e06666",
	"#f6b26b",
	"#ffd966",
	"#93c47d",
	"#76a5af",
	"#6fa8dc",
	"#8e7cc3",
	"#c27ba0",
	"#ff0000",
	"#ff9900",
	"#ffff00",
	"#00ff00",
	"#00ffff",
	"#0000ff",
	"#9900ff",
	"#ff00ff",
];

// ─── Toolbar Components ─────────────────────────────────────────────

function ToolbarButton({
	onClick,
	active,
	disabled,
	title,
	className: extraClass,
	children,
}: {
	onClick: () => void;
	active?: boolean;
	disabled?: boolean;
	title?: string;
	className?: string;
	children: React.ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			title={title}
			className={cn(
				"inline-flex items-center justify-center rounded-sm p-1.5 text-sm transition-colors",
				"hover:bg-muted disabled:pointer-events-none disabled:opacity-50",
				active && "bg-accent text-accent-foreground",
				extraClass,
			)}
		>
			{children}
		</button>
	);
}

function ToolbarSeparator() {
	return <div className="mx-0.5 h-6 w-px bg-border" />;
}

function DropdownWrapper({
	trigger,
	open,
	onOpenChange,
	children,
}: {
	trigger: React.ReactNode;
	open: boolean;
	onOpenChange: (o: boolean) => void;
	children: React.ReactNode;
}) {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const handler = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				onOpenChange(false);
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [open, onOpenChange]);

	return (
		<div ref={ref} className="relative">
			{trigger}
			{open && (
				<div className="absolute top-full right-0 z-50 mt-1 w-max rounded-md border bg-popover p-2 shadow-md md:right-auto md:left-0">
					{children}
				</div>
			)}
		</div>
	);
}

function FontSizeDropdown({ editor }: { editor: Editor }) {
	const [open, setOpen] = useState(false);
	return (
		<DropdownWrapper
			open={open}
			onOpenChange={setOpen}
			trigger={
				<ToolbarButton onClick={() => setOpen(!open)} title="글꼴 크기">
					<Type className="size-4" />
				</ToolbarButton>
			}
		>
			<div className="grid grid-cols-3 gap-1">
				{FONT_SIZES.map((size) => (
					<button
						type="button"
						key={size}
						onClick={() => {
							editor.commands.setFontSize(size);
							setOpen(false);
						}}
						className={cn(
							"rounded px-2 py-1 text-xs hover:bg-accent",
							editor.getAttributes("textStyle").fontSize === size &&
								"bg-accent font-bold",
						)}
					>
						{size}
					</button>
				))}
				<button
					type="button"
					onClick={() => {
						editor.commands.unsetFontSize();
						setOpen(false);
					}}
					className="col-span-3 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
				>
					기본값
				</button>
			</div>
		</DropdownWrapper>
	);
}

function LineHeightDropdown({ editor }: { editor: Editor }) {
	const [open, setOpen] = useState(false);
	return (
		<DropdownWrapper
			open={open}
			onOpenChange={setOpen}
			trigger={
				<ToolbarButton
					onClick={() => setOpen(!open)}
					title="줄 간격"
					className=""
				>
					<AlignJustify className="size-4" />
				</ToolbarButton>
			}
		>
			<div className="flex flex-col gap-1">
				{LINE_HEIGHTS.map((h) => (
					<button
						type="button"
						key={h}
						onClick={() => {
							editor.commands.setLineHeight(h);
							setOpen(false);
						}}
						className="rounded px-3 py-1 text-xs hover:bg-accent"
					>
						{h}
					</button>
				))}
				<button
					type="button"
					onClick={() => {
						editor.commands.unsetLineHeight();
						setOpen(false);
					}}
					className="rounded px-3 py-1 text-xs text-muted-foreground hover:bg-accent"
				>
					기본값
				</button>
			</div>
		</DropdownWrapper>
	);
}

function ColorPickerDropdown({
	editor,
	type,
}: {
	editor: Editor;
	type: "color" | "highlight";
}) {
	const [open, setOpen] = useState(false);
	const isColor = type === "color";
	return (
		<DropdownWrapper
			open={open}
			onOpenChange={setOpen}
			trigger={
				<ToolbarButton
					onClick={() => setOpen(!open)}
					title={isColor ? "글자 색" : "형광펜"}
				>
					{isColor ? (
						<Palette className="size-4" />
					) : (
						<Highlighter className="size-4" />
					)}
				</ToolbarButton>
			}
		>
			<div className="grid grid-cols-7 gap-1">
				{TEXT_COLORS.map((color) => (
					<button
						type="button"
						key={color}
						onClick={() => {
							if (isColor) {
								editor.chain().focus().setColor(color).run();
							} else {
								editor.chain().focus().toggleHighlight({ color }).run();
							}
							setOpen(false);
						}}
						className="size-5 rounded border border-border"
						style={{ backgroundColor: color }}
						title={color}
					/>
				))}
			</div>
			<button
				type="button"
				onClick={() => {
					if (isColor) {
						editor.chain().focus().unsetColor().run();
					} else {
						editor.chain().focus().unsetHighlight().run();
					}
					setOpen(false);
				}}
				className="mt-1 w-full rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
			>
				제거
			</button>
		</DropdownWrapper>
	);
}

function LinkButton({ editor }: { editor: Editor }) {
	const setLink = useCallback(() => {
		const prev = editor.getAttributes("link").href || "";
		const url = window.prompt("URL을 입력하세요", prev);
		if (url === null) return;
		if (url === "") {
			editor.chain().focus().extendMarkRange("link").unsetLink().run();
			return;
		}
		const { from, to } = editor.state.selection;
		if (from === to) {
			// 선택된 텍스트가 없으면 URL을 텍스트로 삽입
			editor.chain().focus().insertContent(`<a href="${url}">${url}</a>`).run();
		} else {
			const chain = editor.chain().focus();
			if (editor.isActive("link")) {
				chain.extendMarkRange("link");
			}
			chain.setLink({ href: url }).run();
		}
	}, [editor]);

	return (
		<ToolbarButton
			onClick={setLink}
			active={editor.isActive("link")}
			title="링크"
		>
			<LinkIcon className="size-4" />
		</ToolbarButton>
	);
}

function VideoButton({ editor }: { editor: Editor }) {
	const insertVideo = useCallback(() => {
		const url = window.prompt("YouTube URL을 입력하세요");
		if (!url) return;
		editor.commands.setYoutubeVideo({ src: url });
	}, [editor]);

	return (
		<ToolbarButton onClick={insertVideo} title="영상 삽입">
			<Video className="size-4" />
		</ToolbarButton>
	);
}

function TableMenu({ editor }: { editor: Editor }) {
	const [open, setOpen] = useState(false);
	return (
		<DropdownWrapper
			open={open}
			onOpenChange={setOpen}
			trigger={
				<ToolbarButton onClick={() => setOpen(!open)} title="표" className="">
					<TableIcon className="size-4" />
				</ToolbarButton>
			}
		>
			<div className="flex flex-col gap-1 text-xs">
				<button
					type="button"
					onClick={() => {
						editor
							.chain()
							.focus()
							.insertTable({
								rows: 3,
								cols: 3,
								withHeaderRow: true,
							})
							.run();
						setOpen(false);
					}}
					className="flex items-center gap-2 rounded px-2 py-1 hover:bg-accent"
				>
					<Plus className="size-3" /> 표 삽입 (3×3)
				</button>
				{editor.isActive("table") && (
					<>
						<button
							type="button"
							onClick={() => {
								editor.chain().focus().addRowAfter().run();
								setOpen(false);
							}}
							className="flex items-center gap-2 rounded px-2 py-1 hover:bg-accent"
						>
							<Plus className="size-3" /> 행 추가
						</button>
						<button
							type="button"
							onClick={() => {
								editor.chain().focus().addColumnAfter().run();
								setOpen(false);
							}}
							className="flex items-center gap-2 rounded px-2 py-1 hover:bg-accent"
						>
							<Plus className="size-3" /> 열 추가
						</button>
						<button
							type="button"
							onClick={() => {
								editor.chain().focus().deleteRow().run();
								setOpen(false);
							}}
							className="flex items-center gap-2 rounded px-2 py-1 hover:bg-accent"
						>
							<Minus className="size-3" /> 행 삭제
						</button>
						<button
							type="button"
							onClick={() => {
								editor.chain().focus().deleteColumn().run();
								setOpen(false);
							}}
							className="flex items-center gap-2 rounded px-2 py-1 hover:bg-accent"
						>
							<Minus className="size-3" /> 열 삭제
						</button>
						<button
							type="button"
							onClick={() => {
								editor.chain().focus().deleteTable().run();
								setOpen(false);
							}}
							className="flex items-center gap-2 rounded px-2 py-1 text-destructive hover:bg-accent"
						>
							<Trash2 className="size-3" /> 표 삭제
						</button>
					</>
				)}
			</div>
		</DropdownWrapper>
	);
}

function EditorToolbar({
	editor,
	onImageUpload,
	onToggleSource,
	showSource,
}: {
	editor: Editor;
	onImageUpload: () => void;
	onToggleSource: () => void;
	showSource: boolean;
}) {
	return (
		<div className="flex flex-wrap items-center gap-0.5 border-b p-1">
			{/* Text formatting */}
			<ToolbarButton
				onClick={() => editor.chain().focus().toggleBold().run()}
				active={editor.isActive("bold")}
				title="굵게"
			>
				<Bold className="size-4" />
			</ToolbarButton>
			<ToolbarButton
				onClick={() => editor.chain().focus().toggleItalic().run()}
				active={editor.isActive("italic")}
				title="기울임"
			>
				<Italic className="size-4" />
			</ToolbarButton>
			<ToolbarButton
				onClick={() => editor.chain().focus().toggleUnderline().run()}
				active={editor.isActive("underline")}
				title="밑줄"
			>
				<UnderlineIcon className="size-4" />
			</ToolbarButton>
			<ToolbarButton
				onClick={() => editor.chain().focus().toggleStrike().run()}
				active={editor.isActive("strike")}
				title="취소선"
			>
				<Strikethrough className="size-4" />
			</ToolbarButton>

			<ToolbarSeparator />

			{/* Font size, line height, colors */}
			<FontSizeDropdown editor={editor} />
			<LineHeightDropdown editor={editor} />
			<ColorPickerDropdown editor={editor} type="color" />
			<ColorPickerDropdown editor={editor} type="highlight" />

			<ToolbarSeparator />

			{/* Superscript / Subscript */}
			<ToolbarButton
				onClick={() => editor.chain().focus().toggleSuperscript().run()}
				active={editor.isActive("superscript")}
				title="위 첨자"
			>
				<SuperscriptIcon className="size-4" />
			</ToolbarButton>
			<ToolbarButton
				onClick={() => editor.chain().focus().toggleSubscript().run()}
				active={editor.isActive("subscript")}
				title="아래 첨자"
			>
				<SubscriptIcon className="size-4" />
			</ToolbarButton>

			<ToolbarSeparator />

			{/* Alignment */}
			<ToolbarButton
				onClick={() => editor.chain().focus().setTextAlign("left").run()}
				active={editor.isActive({ textAlign: "left" })}
				title="왼쪽 정렬"
			>
				<AlignLeft className="size-4" />
			</ToolbarButton>
			<ToolbarButton
				onClick={() => editor.chain().focus().setTextAlign("center").run()}
				active={editor.isActive({ textAlign: "center" })}
				title="가운데 정렬"
			>
				<AlignCenter className="size-4" />
			</ToolbarButton>
			<ToolbarButton
				onClick={() => editor.chain().focus().setTextAlign("right").run()}
				active={editor.isActive({ textAlign: "right" })}
				title="오른쪽 정렬"
			>
				<AlignRight className="size-4" />
			</ToolbarButton>

			<ToolbarSeparator />

			{/* Vertical alignment (table cell / inline image) */}
			<ToolbarButton
				onClick={() => editor.chain().focus().setVerticalAlign("top").run()}
				active={
					editor.isActive("tableCell", { verticalAlign: "top" }) ||
					editor.isActive("tableHeader", { verticalAlign: "top" }) ||
					editor.isActive("image", { verticalAlign: "top" })
				}
				title="위쪽 정렬"
			>
				<AlignStartHorizontal className="size-4" />
			</ToolbarButton>
			<ToolbarButton
				onClick={() => editor.chain().focus().setVerticalAlign("middle").run()}
				active={
					editor.isActive("tableCell", { verticalAlign: "middle" }) ||
					editor.isActive("tableHeader", { verticalAlign: "middle" }) ||
					editor.isActive("image", { verticalAlign: "middle" })
				}
				title="가운데 정렬 (수직)"
			>
				<AlignCenterHorizontal className="size-4" />
			</ToolbarButton>
			<ToolbarButton
				onClick={() => editor.chain().focus().setVerticalAlign("bottom").run()}
				active={
					editor.isActive("tableCell", { verticalAlign: "bottom" }) ||
					editor.isActive("tableHeader", { verticalAlign: "bottom" }) ||
					editor.isActive("image", { verticalAlign: "bottom" })
				}
				title="아래쪽 정렬"
			>
				<AlignEndHorizontal className="size-4" />
			</ToolbarButton>

			<ToolbarSeparator />

			{/* Lists & indent */}
			<ToolbarButton
				onClick={() => editor.chain().focus().toggleBulletList().run()}
				active={editor.isActive("bulletList")}
				title="글머리 기호"
			>
				<List className="size-4" />
			</ToolbarButton>
			<ToolbarButton
				onClick={() => editor.chain().focus().toggleOrderedList().run()}
				active={editor.isActive("orderedList")}
				title="번호 매기기"
			>
				<ListOrdered className="size-4" />
			</ToolbarButton>
			<ToolbarButton onClick={() => editor.commands.outdent()} title="내어쓰기">
				<IndentDecrease className="size-4" />
			</ToolbarButton>
			<ToolbarButton onClick={() => editor.commands.indent()} title="들여쓰기">
				<IndentIncrease className="size-4" />
			</ToolbarButton>

			<ToolbarSeparator />

			{/* Media & insert */}
			<ToolbarButton onClick={onImageUpload} title="이미지 업로드">
				<ImageIcon className="size-4" />
			</ToolbarButton>
			<LinkButton editor={editor} />
			<VideoButton editor={editor} />
			<TableMenu editor={editor} />

			<ToolbarSeparator />

			{/* Source */}
			<ToolbarButton
				onClick={onToggleSource}
				active={showSource}
				title="HTML 소스"
			>
				<Code className="size-4" />
			</ToolbarButton>

			<ToolbarSeparator />

			{/* History */}
			<ToolbarButton
				onClick={() => editor.chain().focus().undo().run()}
				disabled={!editor.can().undo()}
				title="실행 취소"
			>
				<Undo2 className="size-4" />
			</ToolbarButton>
			<ToolbarButton
				onClick={() => editor.chain().focus().redo().run()}
				disabled={!editor.can().redo()}
				title="다시 실행"
			>
				<Redo2 className="size-4" />
			</ToolbarButton>
		</div>
	);
}

// ─── Main Component ─────────────────────────────────────────────────

export default function TiptapEditor({
	value,
	setValue,
	height = 480,
	placeholder: placeholderText = "",
	setEditor: setEditorProp,
	readonly = false,
	disabled = false,
	toolbar = true,
	className,
	editorClassName,
	imageUploadScope,
	draftKey,
	draftDisabled = false,
}: TiptapEditorProps) {
	const { post } = useRequest({ suppressErrorToast: true });
	const fileInputRef = useRef<HTMLInputElement>(null);
	const editorRootRef = useRef<HTMLDivElement>(null);
	const editorSurfaceRef = useRef<HTMLDivElement>(null);
	const uploadSessionIdRef = useRef<string | null>(null);
	const lastScopeRef = useRef<string | null>(null);
	const isEditorFocusedRef = useRef(false);
	const lastEmittedValueRef = useRef(value);
	const pendingExternalValueRef = useRef<string | null>(null);
	const pendingIdleRef = useRef<number | null>(null);
	const setValueRef = useRef(setValue);
	setValueRef.current = setValue;
	const editorInstanceRef = useRef<Editor | null>(null);
	const uploadAndInsertImagesRef = useRef<
		(ed: Editor, files: File[]) => Promise<void>
	>(async () => {});
	const replaceBase64ImagesRef = useRef<(ed: Editor) => Promise<void>>(
		async () => {},
	);
	const handleWordPasteRef = useRef<
		(ed: Editor, html: string, items: DataTransferItemList | null) => void
	>(() => {});

	const widthInputId = useId();
	const heightInputId = useId();
	const lockAspectId = useId();

	const [isMobileViewport, setIsMobileViewport] = useState(() => {
		if (typeof window === "undefined") return false;
		if (typeof window.matchMedia !== "function") return false;
		return window.matchMedia(EDITOR_MOBILE_MEDIA_QUERY).matches;
	});

	useEffect(() => {
		if (typeof window === "undefined") return;
		if (typeof window.matchMedia !== "function") return;
		const mql = window.matchMedia(EDITOR_MOBILE_MEDIA_QUERY);
		const handler = (event: MediaQueryListEvent) => {
			setIsMobileViewport(event.matches);
		};
		mql.addEventListener("change", handler);
		return () => mql.removeEventListener("change", handler);
	}, []);

	const initialEditorHeight = useMemo(
		() =>
			isMobileViewport ? EDITOR_HEIGHT_MOBILE : loadStoredEditorHeight(height),
		[height, isMobileViewport],
	);

	const [showSource, setShowSource] = useState(false);
	const [sourceHtml, setSourceHtml] = useState("");
	const [imageToolbar, setImageToolbar] = useState<{
		top: number;
		left: number;
		pos: number;
	} | null>(null);
	const [editDialog, setEditDialog] = useState<{
		pos: number;
		width: string;
		height: string;
		unit: "px" | "%";
		lockAspect: boolean;
		aspectRatio: number | null;
		// 단위 전환 시 복원할 각 단위별 기본값
		pxWidth: string;
		pxHeight: string;
		pctWidth: string;
		pctHeight: string;
	} | null>(null);

	// ── Draft autosave ───────────────────────────────────────────
	const effectiveDraftKey = useMemo(() => {
		if (draftDisabled || readonly || disabled) return null;
		if (draftKey !== undefined) return draftKey || null;
		return getCurrentDraftKey();
	}, [draftKey, draftDisabled, readonly, disabled]);
	const effectiveDraftKeyRef = useRef<string | null>(effectiveDraftKey);
	effectiveDraftKeyRef.current = effectiveDraftKey;
	const draftSaveTimerRef = useRef<number | null>(null);
	const draftSavePendingHtmlRef = useRef<string | null>(null);
	const [draft, setDraft] = useState<TiptapDraftRecord | null>(null);
	const [draftBannerDismissed, setDraftBannerDismissed] = useState(false);

	// ── Value management ─────────────────────────────────────────

	const emitValueToParent = useCallback((nextValue: string) => {
		lastEmittedValueRef.current = nextValue;
		setValueRef.current(nextValue);
	}, []);

	const scheduleValueUpdate = useCallback(
		(nextValue: string, useIdle: boolean) => {
			if (pendingIdleRef.current !== null) {
				cancelIdleCallback(pendingIdleRef.current);
				pendingIdleRef.current = null;
			}
			if (!useIdle) {
				emitValueToParent(nextValue);
				return;
			}
			if (typeof requestIdleCallback === "function") {
				pendingIdleRef.current = requestIdleCallback(
					() => {
						pendingIdleRef.current = null;
						emitValueToParent(nextValue);
					},
					{ timeout: 1500 },
				);
			} else {
				pendingIdleRef.current = window.setTimeout(() => {
					pendingIdleRef.current = null;
					emitValueToParent(nextValue);
				}, 0) as unknown as number;
			}
		},
		[emitValueToParent],
	);

	useEffect(() => {
		return () => {
			if (pendingIdleRef.current !== null) {
				if (typeof cancelIdleCallback === "function") {
					cancelIdleCallback(pendingIdleRef.current);
				} else {
					clearTimeout(pendingIdleRef.current);
				}
			}
		};
	}, []);

	const scheduleDraftSave = useCallback((html: string) => {
		const key = effectiveDraftKeyRef.current;
		if (!key) return;
		if (isEmptyTiptapContent(html)) return;
		draftSavePendingHtmlRef.current = html;
		if (draftSaveTimerRef.current !== null) {
			window.clearTimeout(draftSaveTimerRef.current);
		}
		draftSaveTimerRef.current = window.setTimeout(() => {
			draftSaveTimerRef.current = null;
			const pending = draftSavePendingHtmlRef.current;
			draftSavePendingHtmlRef.current = null;
			if (pending === null) return;
			void saveTiptapDraft(key, pending);
		}, 1000);
	}, []);

	useEffect(() => {
		return () => {
			if (draftSaveTimerRef.current !== null) {
				window.clearTimeout(draftSaveTimerRef.current);
				draftSaveTimerRef.current = null;
			}
			const key = effectiveDraftKeyRef.current;
			const pending = draftSavePendingHtmlRef.current;
			draftSavePendingHtmlRef.current = null;
			if (key && pending !== null && !isEmptyTiptapContent(pending)) {
				void saveTiptapDraft(key, pending);
			}
		};
	}, []);

	useEffect(() => {
		if (!effectiveDraftKey) {
			setDraft(null);
			setDraftBannerDismissed(false);
			return;
		}
		let cancelled = false;
		setDraftBannerDismissed(false);
		void loadTiptapDraft(effectiveDraftKey).then((rec) => {
			if (!cancelled) setDraft(rec);
		});
		if (typeof requestIdleCallback === "function") {
			requestIdleCallback(
				() => {
					void sweepExpiredTiptapDrafts();
				},
				{ timeout: 2000 },
			);
		} else {
			setTimeout(() => {
				void sweepExpiredTiptapDrafts();
			}, 0);
		}
		return () => {
			cancelled = true;
		};
	}, [effectiveDraftKey]);

	const handleRestoreDraft = useCallback(() => {
		const ed = editorInstanceRef.current;
		if (!ed || !draft) return;
		ed.commands.setContent(draft.content, { emitUpdate: false });
		lastEmittedValueRef.current = draft.content;
		pendingExternalValueRef.current = null;
		setValueRef.current(draft.content);
		setDraftBannerDismissed(true);
	}, [draft]);

	const handleDiscardDraft = useCallback(() => {
		const key = effectiveDraftKeyRef.current;
		setDraftBannerDismissed(true);
		setDraft(null);
		if (key) void clearTiptapDraft(key);
	}, []);

	const showDraftBanner =
		!!draft &&
		!draftBannerDismissed &&
		!readonly &&
		!disabled &&
		draft.content !== value;

	// ── Image upload ─────────────────────────────────────────────

	const ensureUploadSessionId = useCallback(async () => {
		const scopeType = imageUploadScope?.scopeType;
		const scopeKey = imageUploadScope?.scopeKey;
		if (!scopeType || !scopeKey) {
			throw new Error("이미지 업로드 scope 정보가 없습니다.");
		}
		const scopeIdentity = `${scopeType}:${scopeKey}`;
		if (uploadSessionIdRef.current && lastScopeRef.current === scopeIdentity) {
			return uploadSessionIdRef.current;
		}
		const sessionId = await createUploadSession(post, scopeType, scopeKey);
		uploadSessionIdRef.current = sessionId;
		lastScopeRef.current = scopeIdentity;
		return sessionId;
	}, [post, imageUploadScope]);

	const uploadAndInsertImages = useCallback(
		async (editorInstance: Editor, files: File[]) => {
			const imageFiles = files.filter((f) => f.type.startsWith("image/"));
			if (imageFiles.length === 0) return;

			let sessionId: string;
			try {
				sessionId = await ensureUploadSessionId();
			} catch {
				toast.error("이미지 업로드를 위한 세션 생성에 실패했습니다.");
				return;
			}

			const results = await Promise.allSettled(
				imageFiles.map((file) => uploadFile(file, sessionId, post)),
			);

			const content: { type: string; attrs: { src: string } }[] = [];
			let failCount = 0;
			for (const result of results) {
				if (result.status === "fulfilled") {
					content.push({
						type: "image",
						attrs: { src: result.value.public_url },
					});
				} else {
					failCount++;
				}
			}

			if (failCount > 0) {
				toast.error(`${failCount}개 이미지 업로드에 실패했습니다.`);
			}

			if (content.length > 0) {
				editorInstance.chain().focus().insertContent(content).run();
			}
		},
		[ensureUploadSessionId, post],
	);
	uploadAndInsertImagesRef.current = uploadAndInsertImages;

	const replaceBase64Images = useCallback(
		async (editorInstance: Editor) => {
			const dataUris: string[] = [];
			editorInstance.state.doc.descendants((node) => {
				if (node.type.name === "image" && node.attrs.src?.startsWith("data:")) {
					if (!dataUris.includes(node.attrs.src)) {
						dataUris.push(node.attrs.src);
					}
				}
			});
			if (dataUris.length === 0) return;

			let sessionId: string;
			try {
				sessionId = await ensureUploadSessionId();
			} catch {
				toast.error("이미지 업로드를 위한 세션 생성에 실패했습니다.");
				return;
			}

			const urlMap = new Map<string, string>();
			for (const dataUri of dataUris) {
				try {
					const res = await fetch(dataUri);
					const blob = await res.blob();
					const ext = blob.type.split("/")[1]?.replace("+xml", "") || "png";
					const file = new File([blob], `pasted-image.${ext}`, {
						type: blob.type,
					});
					const attachment = await uploadFile(file, sessionId, post);
					urlMap.set(dataUri, attachment.public_url);
				} catch {
					toast.error("붙여넣기된 이미지 업로드에 실패했습니다.");
				}
			}
			if (urlMap.size === 0) return;

			const { tr } = editorInstance.state;
			editorInstance.state.doc.descendants((node, pos) => {
				if (node.type.name === "image") {
					const url = urlMap.get(node.attrs.src);
					if (url) {
						tr.setNodeMarkup(pos, undefined, {
							...node.attrs,
							src: url,
						});
					}
				}
			});
			if (tr.docChanged) {
				editorInstance.view.dispatch(tr);
				emitValueToParent(editorInstance.getHTML());
			}
		},
		[ensureUploadSessionId, post, emitValueToParent],
	);
	replaceBase64ImagesRef.current = replaceBase64Images;

	const handleWordPaste = useCallback(
		async (
			editorInstance: Editor,
			html: string,
			items: DataTransferItemList | null,
		) => {
			// 1. 클립보드 items에서 이미지 blob 추출
			const imageBlobs: File[] = [];
			if (items) {
				for (let i = 0; i < items.length; i++) {
					if (items[i].type.startsWith("image/")) {
						const blob = items[i].getAsFile();
						if (blob) imageBlobs.push(blob);
					}
				}
			}

			// 2. 이미지 업로드
			const uploadedUrls: string[] = [];
			if (imageBlobs.length > 0) {
				let sessionId: string;
				try {
					sessionId = await ensureUploadSessionId();
				} catch {
					toast.error("이미지 업로드를 위한 세션 생성에 실패했습니다.");
					// 이미지 없이 텍스트만 삽입
					const cleaned = html.replace(
						/<img[^>]*src\s*=\s*["']file:\/\/\/[^"']*["'][^>]*>/gi,
						"",
					);
					editorInstance.commands.insertContent(cleaned);
					emitValueToParent(editorInstance.getHTML());
					return;
				}

				for (const blob of imageBlobs) {
					try {
						const attachment = await uploadFile(blob, sessionId, post);
						uploadedUrls.push(attachment.public_url);
					} catch {
						toast.error(`이미지 업로드 실패: ${blob.name}`);
						uploadedUrls.push("");
					}
				}
			}

			// 3. HTML에서 file:/// 참조를 업로드된 URL로 교체
			let urlIndex = 0;
			const processedHtml = html.replace(
				/<img([^>]*)\ssrc\s*=\s*["']file:\/\/\/[^"']*["']([^>]*)>/gi,
				(_match, before, after) => {
					const url = uploadedUrls[urlIndex++];
					if (url) {
						return `<img${before} src="${url}"${after}>`;
					}
					return ""; // 업로드 실패 시 이미지 제거
				},
			);

			editorInstance.commands.insertContent(processedHtml);
			emitValueToParent(editorInstance.getHTML());
		},
		[ensureUploadSessionId, post, emitValueToParent],
	);
	handleWordPasteRef.current = handleWordPaste;

	const openImagePicker = useCallback(() => {
		if (!imageUploadScope?.scopeType || !imageUploadScope?.scopeKey) {
			toast.error("이미지 업로드 설정이 되어 있지 않습니다.");
			return;
		}
		fileInputRef.current?.click();
	}, [imageUploadScope]);

	// ── Editor setup ─────────────────────────────────────────────

	const extensions = useMemo(
		() => [
			StarterKit.configure({
				heading: { levels: [1, 2, 3, 4] },
				// Link/Underline은 아래에서 직접 설정하므로 StarterKit 기본 포함분 비활성화 (중복 방지)
				link: false,
				underline: false,
			}),
			Underline,
			TextAlign.configure({
				types: ["heading", "paragraph", "image"],
			}),
			VerticalAlign,
			TextStyle,
			FontSize,
			Color,
			Highlight.configure({ multicolor: true }),
			ResizableImage.configure({
				inline: true,
				allowBase64: true,
				HTMLAttributes: {
					class: "tiptap-resizable-image",
				},
			}),
			Link.configure({
				openOnClick: false,
				HTMLAttributes: {
					rel: "noopener noreferrer",
					target: "_blank",
				},
			}),
			Table.configure({ resizable: false }),
			TableRow,
			TableCell,
			TableHeader,
			Youtube.configure({ width: 640, height: 480 }),
			Superscript,
			Subscript,
			Placeholder.configure({
				placeholder: placeholderText,
			}),
			BlockLineHeight,
			Indent,
			Iframe,
		],
		[placeholderText],
	);

	const editor = useEditor({
		// TanStack Start는 SSR이므로 초기 렌더를 클라이언트로 미뤄 hydration 불일치를 방지
		immediatelyRender: false,
		extensions,
		content: value,
		editable: !readonly && !disabled,
		editorProps: {
			attributes: {
				class: cn("tiptap-content-area", editorClassName),
			},
			handleDrop: (_view, event, _slice, moved) => {
				if (moved) return false;
				const files = event.dataTransfer?.files;
				if (!files || files.length === 0) return false;
				const imageFiles = Array.from(files).filter((f) =>
					f.type.startsWith("image/"),
				);
				if (imageFiles.length === 0) return false;
				event.preventDefault();
				event.stopPropagation();
				const ed = editorInstanceRef.current;
				if (ed) {
					void uploadAndInsertImagesRef.current(ed, imageFiles);
				}
				return true;
			},
			handlePaste: (_view, event) => {
				// Case 1: Direct image files (screenshot paste)
				const files = event.clipboardData?.files;
				if (files && files.length > 0) {
					const imageFiles = Array.from(files).filter((f) =>
						f.type.startsWith("image/"),
					);
					if (imageFiles.length > 0) {
						event.preventDefault();
						const ed = editorInstanceRef.current;
						if (ed) {
							void uploadAndInsertImagesRef.current(ed, imageFiles);
						}
						return true;
					}
				}
				const html = event.clipboardData?.getData("text/html");
				if (html) {
					// Case 2: file:/// 이미지 (Word 붙여넣기)
					if (/src\s*=\s*["']file:\/\/\//i.test(html)) {
						event.preventDefault();
						const ed = editorInstanceRef.current;
						if (ed) {
							void handleWordPasteRef.current(
								ed,
								html,
								event.clipboardData?.items ?? null,
							);
						}
						return true;
					}
					// Case 3: base64 이미지 (웹 붙여넣기)
					if (/src\s*=\s*["']data:image\//i.test(html)) {
						setTimeout(() => {
							const ed = editorInstanceRef.current;
							if (ed) {
								void replaceBase64ImagesRef.current(ed);
							}
						}, 100);
					}
				}
				return false;
			},
		},
		onUpdate: ({ editor: ed }) => {
			const html = ed.getHTML();
			const shouldDefer = html.length > LARGE_CONTENT_THRESHOLD;
			scheduleValueUpdate(html, shouldDefer);
			scheduleDraftSave(html);
		},
		onFocus: () => {
			isEditorFocusedRef.current = true;
		},
		onBlur: ({ editor: ed }) => {
			isEditorFocusedRef.current = false;
			// Force immediate sync on blur
			emitValueToParent(ed.getHTML());
			// Apply pending external value
			const pending = pendingExternalValueRef.current;
			if (pending !== null) {
				pendingExternalValueRef.current = null;
				ed.commands.setContent(pending, { emitUpdate: false });
				lastEmittedValueRef.current = pending;
			}
		},
	});

	// Keep ref in sync for editorProps handlers (handleDrop/handlePaste)
	editorInstanceRef.current = editor ?? null;

	// Expose editor instance
	useEffect(() => {
		setEditorProp?.(editor ?? null);
		return () => setEditorProp?.(null);
	}, [editor, setEditorProp]);

	// External value sync
	useEffect(() => {
		if (!editor) return;
		if (value === lastEmittedValueRef.current) return;
		if (isEditorFocusedRef.current) {
			pendingExternalValueRef.current = value;
			return;
		}
		editor.commands.setContent(value, { emitUpdate: false });
		lastEmittedValueRef.current = value;
	}, [value, editor]);

	// Editable state sync
	useEffect(() => {
		if (!editor) return;
		editor.setEditable(!readonly && !disabled);
	}, [editor, readonly, disabled]);

	// Persist user-resized editor height to localStorage (desktop only)
	useEffect(() => {
		if (
			!editor ||
			showSource ||
			isMobileViewport ||
			typeof ResizeObserver === "undefined"
		) {
			return;
		}
		const el = editorSurfaceRef.current;
		if (!el) return;
		let saveTimer: number | null = null;
		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (!entry) return;
			const next = Math.round(entry.contentRect.height);
			if (
				Number.isNaN(next) ||
				next < EDITOR_HEIGHT_MIN ||
				next > EDITOR_HEIGHT_MAX
			) {
				return;
			}
			if (saveTimer !== null) window.clearTimeout(saveTimer);
			saveTimer = window.setTimeout(() => {
				saveTimer = null;
				try {
					window.localStorage.setItem(EDITOR_HEIGHT_STORAGE_KEY, String(next));
				} catch {}
			}, 300);
		});
		observer.observe(el);
		return () => {
			observer.disconnect();
			if (saveTimer !== null) window.clearTimeout(saveTimer);
		};
	}, [editor, showSource, isMobileViewport]);

	// ── Image floating toolbar ───────────────────────────────────
	useEffect(() => {
		if (!editor) return;
		const update = () => {
			if (!editor.isEditable) {
				setImageToolbar(null);
				return;
			}
			const { selection } = editor.state;
			const node =
				"node" in selection
					? (selection as unknown as { node: PmNode }).node
					: null;
			if (node?.type.name !== "image") {
				setImageToolbar(null);
				return;
			}
			const pos = selection.from;
			const dom = editor.view.nodeDOM(pos) as HTMLElement | null;
			const surface = editorSurfaceRef.current;
			if (!dom || !surface) {
				setImageToolbar(null);
				return;
			}
			const img = (dom.querySelector("img") ?? dom) as HTMLElement;
			const imgRect = img.getBoundingClientRect();
			const surfaceRect = surface.getBoundingClientRect();
			setImageToolbar({
				top: imgRect.top - surfaceRect.top + surface.scrollTop + 12,
				left:
					imgRect.left -
					surfaceRect.left +
					surface.scrollLeft +
					imgRect.width / 2,
				pos,
			});
		};
		editor.on("selectionUpdate", update);
		editor.on("transaction", update);
		return () => {
			editor.off("selectionUpdate", update);
			editor.off("transaction", update);
		};
	}, [editor]);

	// 소스뷰 토글 시 툴바 닫기
	useEffect(() => {
		if (showSource) setImageToolbar(null);
	}, [showSource]);

	const deleteSelectedImage = useCallback(() => {
		if (!editor) return;
		editor.chain().focus().deleteSelection().run();
		setImageToolbar(null);
	}, [editor]);

	const openImageEditDialog = useCallback(() => {
		if (!editor || !imageToolbar) return;
		const node = editor.state.doc.nodeAt(imageToolbar.pos);
		if (!node || node.type.name !== "image") return;
		const { width, height, sizeStyle } = node.attrs as {
			width: number | string | null;
			height: number | string | null;
			sizeStyle: string | null;
		};
		const dom = editor.view.nodeDOM(imageToolbar.pos) as HTMLElement | null;
		const imgEl = dom?.querySelector("img") as HTMLImageElement | null;

		// 현재 렌더링된 px 크기 — px 단위의 기본값으로 사용
		let pxWidth = "";
		let pxHeight = "";
		if (width != null) {
			pxWidth = String(width);
		} else if (imgEl && imgEl.offsetWidth > 0) {
			pxWidth = String(Math.round(imgEl.offsetWidth));
		}
		if (height != null) {
			pxHeight = String(height);
		} else if (imgEl && imgEl.offsetHeight > 0) {
			pxHeight = String(Math.round(imgEl.offsetHeight));
		}

		// 이미 sizeStyle(%) 로 저장돼 있으면 해당 값, 아니면 기본 100
		let pctWidth = "100";
		let pctHeight = "100";
		let unit: "px" | "%" = "px";
		if (sizeStyle) {
			const mw = /width\s*:\s*([\d.]+)\s*%/i.exec(sizeStyle);
			const mh = /height\s*:\s*([\d.]+)\s*%/i.exec(sizeStyle);
			if (mw || mh) {
				unit = "%";
				if (mw) pctWidth = mw[1];
				if (mh) pctHeight = mh[1];
			}
		}

		const aspectRatio =
			imgEl && imgEl.naturalWidth > 0 && imgEl.naturalHeight > 0
				? imgEl.naturalWidth / imgEl.naturalHeight
				: null;
		setEditDialog({
			pos: imageToolbar.pos,
			width: unit === "px" ? pxWidth : pctWidth,
			height: unit === "px" ? pxHeight : pctHeight,
			unit,
			lockAspect: true,
			aspectRatio,
			pxWidth,
			pxHeight,
			pctWidth,
			pctHeight,
		});
	}, [editor, imageToolbar]);

	const handleDialogDimChange = useCallback(
		(field: "width" | "height", value: string) => {
			setEditDialog((s) => {
				if (!s) return s;
				const next = { ...s, [field]: value };
				if (s.lockAspect && value) {
					const n = Number(value);
					if (Number.isFinite(n) && n > 0) {
						if (s.unit === "px" && s.aspectRatio) {
							if (field === "width") {
								next.height = String(Math.round(n / s.aspectRatio));
							} else {
								next.width = String(Math.round(n * s.aspectRatio));
							}
						} else if (s.unit === "%") {
							// % 모드에서는 동일한 값으로 맞춤
							if (field === "width") {
								next.height = value;
							} else {
								next.width = value;
							}
						}
					}
				}
				// 현재 단위의 캐시에도 써넣어서 단위 전환 후 다시 돌아올 때 유지되도록 한다.
				if (s.unit === "px") {
					next.pxWidth = next.width;
					next.pxHeight = next.height;
				} else {
					next.pctWidth = next.width;
					next.pctHeight = next.height;
				}
				return next;
			});
		},
		[],
	);

	const applyImageSize = useCallback(() => {
		if (!editor || !editDialog) return;
		const { pos, width, height, unit } = editDialog;
		const w = width.trim();
		const h = height.trim();
		const attrs: Record<string, unknown> = {};
		if (unit === "px") {
			const wNum = w ? Number(w) : null;
			const hNum = h ? Number(h) : null;
			attrs.width =
				wNum != null && Number.isFinite(wNum) && wNum > 0 ? wNum : null;
			attrs.height =
				hNum != null && Number.isFinite(hNum) && hNum > 0 ? hNum : null;
			attrs.sizeStyle = null;
		} else {
			const hasWidth = w && Number.isFinite(Number(w)) && Number(w) > 0;
			const hasHeight = h && Number.isFinite(Number(h)) && Number(h) > 0;
			const parts: string[] = [];
			if (hasWidth) parts.push(`width: ${w}%`);
			if (hasHeight) parts.push(`height: ${h}%`);
			// 가로만 입력한 경우 세로는 비율 유지를 위해 auto로 명시
			if (hasWidth && !hasHeight) parts.push("height: auto");
			attrs.width = null;
			attrs.height = null;
			attrs.sizeStyle = parts.length > 0 ? parts.join("; ") : null;
		}
		editor
			.chain()
			.focus()
			.setNodeSelection(pos)
			.updateAttributes("image", attrs)
			.run();
		setEditDialog(null);
	}, [editor, editDialog]);

	// ── Source view toggle ────────────────────────────────────────

	const handleToggleSource = useCallback(() => {
		if (!editor) return;
		if (showSource) {
			// Apply source changes back to editor
			editor.commands.setContent(sourceHtml, { emitUpdate: false });
			emitValueToParent(sourceHtml);
			setShowSource(false);
		} else {
			setSourceHtml(editor.getHTML());
			setShowSource(true);
		}
	}, [editor, showSource, sourceHtml, emitValueToParent]);

	// ── File input handler ────────────────────────────────────────

	const handleFileInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const files = e.target.files;
			if (!files || !editor) return;
			const fileArray = Array.from(files);
			e.target.value = "";
			void uploadAndInsertImages(editor, fileArray);
		},
		[editor, uploadAndInsertImages],
	);

	// ── Render ───────────────────────────────────────────────────

	if (!editor) return null;

	return (
		<div ref={editorRootRef} className={cn("rounded-sm border", className)}>
			{showDraftBanner && draft && (
				<div className="flex flex-wrap bg-primary/5 items-center justify-between gap-2 border-b px-3 py-2">
					<span className="text-sm">
						{formatDraftRelativeTime(draft.updatedAt)} 임시저장된 내용이
						있습니다.
					</span>
					<div className="flex gap-1">
						<Button
							type="button"
							size="sm"
							variant="default"
							onClick={handleRestoreDraft}
						>
							복원
						</Button>
						<Button
							type="button"
							size="sm"
							variant="destructive"
							onClick={handleDiscardDraft}
						>
							삭제
						</Button>
					</div>
				</div>
			)}
			{toolbar && (
				<EditorToolbar
					editor={editor}
					onImageUpload={openImagePicker}
					onToggleSource={handleToggleSource}
					showSource={showSource}
				/>
			)}
			{showSource ? (
				<textarea
					value={sourceHtml}
					onChange={(e) => setSourceHtml(e.target.value)}
					className="w-full resize-y overflow-auto bg-muted/30 p-3 font-mono text-sm outline-none"
					style={{ height: initialEditorHeight, minHeight: EDITOR_HEIGHT_MIN }}
				/>
			) : (
				<div
					ref={editorSurfaceRef}
					className="tiptap-content relative overflow-auto resize-y cursor-text"
					style={{ height: initialEditorHeight, minHeight: EDITOR_HEIGHT_MIN }}
					onClick={(e) => {
						if (!editor.isEditable) return;
						const target = e.target as HTMLElement | null;
						if (!target) return;
						if (target.closest(".ProseMirror")) return;
						editor.commands.focus("end");
					}}
					onDragOver={(e) => {
						if (!editor.isEditable) return;
						if (!e.dataTransfer.types.includes("Files")) return;
						e.preventDefault();
					}}
					onDrop={(e) => {
						if (!editor.isEditable) return;
						const files = e.dataTransfer.files;
						if (!files || files.length === 0) return;
						const imageFiles = Array.from(files).filter((f) =>
							f.type.startsWith("image/"),
						);
						if (imageFiles.length === 0) return;
						e.preventDefault();
						void uploadAndInsertImagesRef.current(editor, imageFiles);
					}}
				>
					<EditorContent editor={editor} />
					{imageToolbar && (
						<div
							className="pointer-events-auto absolute z-20 flex -translate-x-1/2 gap-0.5 rounded-md border bg-popover p-1 shadow-md"
							style={{
								top: Math.max(imageToolbar.top, 4),
								left: imageToolbar.left,
							}}
						>
							<button
								type="button"
								onMouseDown={(e) => e.preventDefault()}
								onClick={openImageEditDialog}
								title="이미지 편집"
								className="inline-flex size-7 items-center justify-center rounded-sm text-sm transition-colors hover:bg-muted"
							>
								<Pencil className="size-4" />
							</button>
							<button
								type="button"
								onMouseDown={(e) => e.preventDefault()}
								onClick={deleteSelectedImage}
								title="이미지 삭제"
								className="inline-flex size-7 items-center justify-center rounded-sm text-sm text-destructive transition-colors hover:bg-muted"
							>
								<Trash2 className="size-4" />
							</button>
						</div>
					)}
				</div>
			)}
			<input
				ref={fileInputRef}
				type="file"
				accept="image/*"
				multiple
				className="hidden"
				onChange={handleFileInputChange}
			/>
			<Dialog
				open={editDialog !== null}
				onOpenChange={(o) => {
					if (!o) setEditDialog(null);
				}}
			>
				<DialogContent className="sm:max-w-sm">
					<DialogHeader>
						<DialogTitle>이미지 크기 조절</DialogTitle>
					</DialogHeader>
					{editDialog && (
						<div className="flex flex-col gap-4">
							<div className="flex gap-2">
								<Button
									type="button"
									size="sm"
									variant={editDialog.unit === "px" ? "default" : "outline"}
									onClick={() =>
										setEditDialog((s) => {
											if (!s || s.unit === "px") return s;
											return {
												...s,
												unit: "px",
												width: s.pxWidth,
												height: s.pxHeight,
											};
										})
									}
								>
									px
								</Button>
								<Button
									type="button"
									size="sm"
									variant={editDialog.unit === "%" ? "default" : "outline"}
									onClick={() =>
										setEditDialog((s) => {
											if (!s || s.unit === "%") return s;
											return {
												...s,
												unit: "%",
												width: s.pctWidth,
												height: s.pctHeight,
											};
										})
									}
								>
									%
								</Button>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div className="flex flex-col gap-1.5">
									<Label htmlFor={widthInputId}>가로</Label>
									<div className="flex items-center gap-1">
										<Input
											id={widthInputId}
											type="number"
											min={1}
											value={editDialog.width}
											onChange={(e) =>
												handleDialogDimChange("width", e.target.value)
											}
										/>
										<span className="text-muted-foreground text-sm">
											{editDialog.unit}
										</span>
									</div>
								</div>
								<div className="flex flex-col gap-1.5">
									<Label htmlFor={heightInputId}>세로</Label>
									<div className="flex items-center gap-1">
										<Input
											id={heightInputId}
											type="number"
											min={1}
											value={editDialog.height}
											onChange={(e) =>
												handleDialogDimChange("height", e.target.value)
											}
										/>
										<span className="text-muted-foreground text-sm">
											{editDialog.unit}
										</span>
									</div>
								</div>
							</div>
							<div className="flex items-center gap-2">
								<Checkbox
									id={lockAspectId}
									checked={editDialog.lockAspect}
									disabled={!editDialog.aspectRatio}
									onCheckedChange={(v) =>
										setEditDialog((s) =>
											s ? { ...s, lockAspect: v === true } : s,
										)
									}
								/>
								<Label htmlFor={lockAspectId} className="text-sm font-normal">
									비율 유지
									{!editDialog.aspectRatio && (
										<span className="text-muted-foreground ml-1 text-xs">
											(원본 크기를 읽을 수 없음)
										</span>
									)}
								</Label>
							</div>
							{editDialog.unit === "%" && (
								<p className="text-muted-foreground text-xs">
									가로·세로 중 한쪽만 입력하면 나머지는 자동(auto)으로
									처리됩니다.
								</p>
							)}
						</div>
					)}
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setEditDialog(null)}
						>
							취소
						</Button>
						<Button type="button" onClick={applyImageSize}>
							적용
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
