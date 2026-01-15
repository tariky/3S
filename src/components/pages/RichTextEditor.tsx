"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import { useCallback, useEffect, useState } from "react";
import {
	Bold,
	Italic,
	Underline as UnderlineIcon,
	List,
	ListOrdered,
	Heading1,
	Heading2,
	Heading3,
	Link as LinkIcon,
	Image as ImageIcon,
	Quote,
	Code,
	Undo,
	Redo,
	Minus,
	Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface RichTextEditorProps {
	content: string; // JSON string
	onChange: (json: string) => void;
	placeholder?: string;
	className?: string;
}

// Helper to parse content - handles JSON, HTML, and plain text
function parseContent(content: string): any {
	if (!content) return "";

	// Try to parse as JSON first
	try {
		const parsed = JSON.parse(content);
		// Check if it's a valid TipTap JSON structure
		if (parsed && typeof parsed === "object" && parsed.type === "doc") {
			return parsed;
		}
	} catch {
		// Not JSON, continue
	}

	// If it's HTML or plain text, return as string (TipTap will handle it)
	return content;
}

export function RichTextEditor({
	content,
	onChange,
	placeholder = "Počnite pisati...",
	className,
}: RichTextEditorProps) {
	const [linkUrl, setLinkUrl] = useState("");
	const [linkOpen, setLinkOpen] = useState(false);
	const [imageUrl, setImageUrl] = useState("");
	const [imageOpen, setImageOpen] = useState(false);

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				heading: {
					levels: [1, 2, 3],
				},
			}),
			Placeholder.configure({
				placeholder,
			}),
			Underline,
			Link.configure({
				openOnClick: false,
				HTMLAttributes: {
					class: "text-primary underline",
				},
			}),
			Image.configure({
				HTMLAttributes: {
					class: "rounded-lg max-w-full h-auto",
				},
			}),
		],
		content: parseContent(content),
		onUpdate: ({ editor }) => {
			onChange(JSON.stringify(editor.getJSON()));
		},
		editorProps: {
			attributes: {
				class:
					"prose prose-sm sm:prose-base max-w-none focus:outline-none min-h-[400px] p-4 prose-headings:font-semibold prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-primary prose-blockquote:border-l-primary prose-blockquote:text-gray-600 prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-gray-900 prose-img:rounded-lg",
			},
		},
	});

	// Sync content when it changes externally
	useEffect(() => {
		if (editor) {
			const currentJson = JSON.stringify(editor.getJSON());
			if (content !== currentJson) {
				editor.commands.setContent(parseContent(content));
			}
		}
	}, [content, editor]);

	const setLink = useCallback(() => {
		if (!editor) return;

		if (linkUrl === "") {
			editor.chain().focus().extendMarkRange("link").unsetLink().run();
		} else {
			editor
				.chain()
				.focus()
				.extendMarkRange("link")
				.setLink({ href: linkUrl })
				.run();
		}
		setLinkUrl("");
		setLinkOpen(false);
	}, [editor, linkUrl]);

	const addImage = useCallback(() => {
		if (!editor || !imageUrl) return;

		editor.chain().focus().setImage({ src: imageUrl }).run();
		setImageUrl("");
		setImageOpen(false);
	}, [editor, imageUrl]);

	if (!editor) {
		return (
			<div className="border rounded-lg h-[450px] animate-pulse bg-gray-50" />
		);
	}

	const ToolbarButton = ({
		onClick,
		isActive,
		disabled,
		tooltip,
		children,
	}: {
		onClick: () => void;
		isActive?: boolean;
		disabled?: boolean;
		tooltip: string;
		children: React.ReactNode;
	}) => (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className={cn(
						"size-8 hover:bg-gray-200",
						isActive && "bg-gray-200 text-primary"
					)}
					onClick={onClick}
					disabled={disabled}
				>
					{children}
				</Button>
			</TooltipTrigger>
			<TooltipContent side="bottom" className="text-xs">
				{tooltip}
			</TooltipContent>
		</Tooltip>
	);

	return (
		<TooltipProvider delayDuration={300}>
			<div className={cn("border rounded-lg overflow-hidden bg-white", className)}>
				{/* Toolbar */}
				<div className="flex flex-wrap items-center gap-0.5 p-2 border-b bg-gray-50/80">
					{/* Undo/Redo */}
					<ToolbarButton
						onClick={() => editor.chain().focus().undo().run()}
						disabled={!editor.can().chain().focus().undo().run()}
						tooltip="Poništi"
					>
						<Undo className="size-4" />
					</ToolbarButton>
					<ToolbarButton
						onClick={() => editor.chain().focus().redo().run()}
						disabled={!editor.can().chain().focus().redo().run()}
						tooltip="Ponovi"
					>
						<Redo className="size-4" />
					</ToolbarButton>

					<Separator orientation="vertical" className="h-6 mx-1" />

					{/* Text formatting */}
					<ToolbarButton
						onClick={() => editor.chain().focus().toggleBold().run()}
						isActive={editor.isActive("bold")}
						disabled={!editor.can().chain().focus().toggleBold().run()}
						tooltip="Podebljano (Ctrl+B)"
					>
						<Bold className="size-4" />
					</ToolbarButton>
					<ToolbarButton
						onClick={() => editor.chain().focus().toggleItalic().run()}
						isActive={editor.isActive("italic")}
						disabled={!editor.can().chain().focus().toggleItalic().run()}
						tooltip="Kurziv (Ctrl+I)"
					>
						<Italic className="size-4" />
					</ToolbarButton>
					<ToolbarButton
						onClick={() => editor.chain().focus().toggleUnderline().run()}
						isActive={editor.isActive("underline")}
						tooltip="Podcrtano (Ctrl+U)"
					>
						<UnderlineIcon className="size-4" />
					</ToolbarButton>
					<ToolbarButton
						onClick={() => editor.chain().focus().toggleCode().run()}
						isActive={editor.isActive("code")}
						tooltip="Kod"
					>
						<Code className="size-4" />
					</ToolbarButton>

					<Separator orientation="vertical" className="h-6 mx-1" />

					{/* Headings */}
					<ToolbarButton
						onClick={() =>
							editor.chain().focus().toggleHeading({ level: 1 }).run()
						}
						isActive={editor.isActive("heading", { level: 1 })}
						tooltip="Naslov 1"
					>
						<Heading1 className="size-4" />
					</ToolbarButton>
					<ToolbarButton
						onClick={() =>
							editor.chain().focus().toggleHeading({ level: 2 }).run()
						}
						isActive={editor.isActive("heading", { level: 2 })}
						tooltip="Naslov 2"
					>
						<Heading2 className="size-4" />
					</ToolbarButton>
					<ToolbarButton
						onClick={() =>
							editor.chain().focus().toggleHeading({ level: 3 }).run()
						}
						isActive={editor.isActive("heading", { level: 3 })}
						tooltip="Naslov 3"
					>
						<Heading3 className="size-4" />
					</ToolbarButton>

					<Separator orientation="vertical" className="h-6 mx-1" />

					{/* Lists */}
					<ToolbarButton
						onClick={() => editor.chain().focus().toggleBulletList().run()}
						isActive={editor.isActive("bulletList")}
						tooltip="Lista s oznakama"
					>
						<List className="size-4" />
					</ToolbarButton>
					<ToolbarButton
						onClick={() => editor.chain().focus().toggleOrderedList().run()}
						isActive={editor.isActive("orderedList")}
						tooltip="Numerirana lista"
					>
						<ListOrdered className="size-4" />
					</ToolbarButton>
					<ToolbarButton
						onClick={() => editor.chain().focus().toggleBlockquote().run()}
						isActive={editor.isActive("blockquote")}
						tooltip="Citat"
					>
						<Quote className="size-4" />
					</ToolbarButton>
					<ToolbarButton
						onClick={() => editor.chain().focus().setHorizontalRule().run()}
						tooltip="Horizontalna linija"
					>
						<Minus className="size-4" />
					</ToolbarButton>

					<Separator orientation="vertical" className="h-6 mx-1" />

					{/* Link */}
					<Popover open={linkOpen} onOpenChange={setLinkOpen}>
						<PopoverTrigger asChild>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className={cn(
									"size-8 hover:bg-gray-200",
									editor.isActive("link") && "bg-gray-200 text-primary"
								)}
								onClick={() => {
									const previousUrl = editor.getAttributes("link").href;
									setLinkUrl(previousUrl || "");
								}}
							>
								<LinkIcon className="size-4" />
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-80" align="start">
							<div className="flex flex-col gap-3">
								<div className="flex flex-col gap-2">
									<Label htmlFor="link-url">URL adresa</Label>
									<Input
										id="link-url"
										type="url"
										placeholder="https://example.com"
										value={linkUrl}
										onChange={(e) => setLinkUrl(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												setLink();
											}
										}}
									/>
								</div>
								<div className="flex items-center gap-2">
									<Button size="sm" onClick={setLink}>
										{editor.isActive("link") ? "Ažuriraj" : "Dodaj"} link
									</Button>
									{editor.isActive("link") && (
										<Button
											size="sm"
											variant="outline"
											onClick={() => {
												editor.chain().focus().unsetLink().run();
												setLinkOpen(false);
											}}
										>
											<Unlink className="size-4 mr-1" />
											Ukloni
										</Button>
									)}
								</div>
							</div>
						</PopoverContent>
					</Popover>

					{/* Image */}
					<Popover open={imageOpen} onOpenChange={setImageOpen}>
						<PopoverTrigger asChild>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="size-8 hover:bg-gray-200"
							>
								<ImageIcon className="size-4" />
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-80" align="start">
							<div className="flex flex-col gap-3">
								<div className="flex flex-col gap-2">
									<Label htmlFor="image-url">URL slike</Label>
									<Input
										id="image-url"
										type="url"
										placeholder="https://example.com/image.jpg"
										value={imageUrl}
										onChange={(e) => setImageUrl(e.target.value)}
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												e.preventDefault();
												addImage();
											}
										}}
									/>
								</div>
								<Button size="sm" onClick={addImage} disabled={!imageUrl}>
									<ImageIcon className="size-4 mr-1" />
									Dodaj sliku
								</Button>
							</div>
						</PopoverContent>
					</Popover>
				</div>

				{/* Editor Content */}
				<EditorContent editor={editor} />
			</div>
		</TooltipProvider>
	);
}
