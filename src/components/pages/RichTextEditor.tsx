"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, List, ListOrdered, Heading1, Heading2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
	content: string;
	onChange: (html: string) => void;
	placeholder?: string;
	className?: string;
}

export function RichTextEditor({
	content,
	onChange,
	placeholder = "Start writing...",
	className,
}: RichTextEditorProps) {
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
		],
		content,
		onUpdate: ({ editor }) => {
			onChange(editor.getHTML());
		},
		editorProps: {
			attributes: {
				class: "focus:outline-none min-h-[300px] p-4",
			},
		},
	});

	if (!editor) {
		return null;
	}

	return (
		<div className={cn("border rounded-md", className)}>
			<div className="flex items-center gap-1 p-2 border-b bg-gray-50">
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className={cn(
						"size-8",
						editor.isActive("bold") && "bg-gray-200"
					)}
					onClick={() => editor.chain().focus().toggleBold().run()}
					disabled={!editor.can().chain().focus().toggleBold().run()}
				>
					<Bold className="size-4" />
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className={cn(
						"size-8",
						editor.isActive("italic") && "bg-gray-200"
					)}
					onClick={() => editor.chain().focus().toggleItalic().run()}
					disabled={!editor.can().chain().focus().toggleItalic().run()}
				>
					<Italic className="size-4" />
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className={cn(
						"size-8",
						editor.isActive("heading", { level: 1 }) && "bg-gray-200"
					)}
					onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
				>
					<Heading1 className="size-4" />
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className={cn(
						"size-8",
						editor.isActive("heading", { level: 2 }) && "bg-gray-200"
					)}
					onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
				>
					<Heading2 className="size-4" />
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className={cn(
						"size-8",
						editor.isActive("bulletList") && "bg-gray-200"
					)}
					onClick={() => editor.chain().focus().toggleBulletList().run()}
				>
					<List className="size-4" />
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					className={cn(
						"size-8",
						editor.isActive("orderedList") && "bg-gray-200"
					)}
					onClick={() => editor.chain().focus().toggleOrderedList().run()}
				>
					<ListOrdered className="size-4" />
				</Button>
			</div>
			<EditorContent editor={editor} />
		</div>
	);
}

