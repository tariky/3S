import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";

interface PageContentProps {
	content: string;
}

// Same extensions as the editor (without Placeholder which is editor-only)
const extensions = [
	StarterKit.configure({
		heading: {
			levels: [1, 2, 3],
		},
	}),
	Underline,
	Link.configure({
		openOnClick: true,
		HTMLAttributes: {
			class: "text-primary underline",
		},
	}),
	Image.configure({
		HTMLAttributes: {
			class: "rounded-lg max-w-full h-auto",
		},
	}),
];

function isHtmlContent(content: string): boolean {
	const htmlTagPattern =
		/<(p|div|h[1-6]|ul|ol|li|blockquote|pre|br|hr|strong|em|a|span|img)\b/i;
	return htmlTagPattern.test(content);
}

function convertPlainTextToHtml(text: string): string {
	const escaped = text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");

	const paragraphs = escaped.split(/\n\s*\n/);

	return paragraphs
		.map((p) => {
			const withBreaks = p.trim().replace(/\n/g, "<br>");
			return `<p>${withBreaks}</p>`;
		})
		.join("");
}

export function PageContent({ content }: PageContentProps) {
	if (!content) {
		return null;
	}

	let htmlContent: string;

	// Try to parse as JSON (TipTap format)
	try {
		const parsed = JSON.parse(content);
		if (parsed && typeof parsed === "object" && parsed.type === "doc") {
			// It's TipTap JSON - generate HTML from it
			htmlContent = generateHTML(parsed, extensions);
		} else {
			// JSON but not TipTap format - treat as plain text
			htmlContent = convertPlainTextToHtml(content);
		}
	} catch {
		// Not JSON - check if it's HTML or plain text
		if (isHtmlContent(content)) {
			htmlContent = content;
		} else {
			htmlContent = convertPlainTextToHtml(content);
		}
	}

	return (
		<div
			className="prose prose-lg max-w-none"
			dangerouslySetInnerHTML={{ __html: htmlContent }}
		/>
	);
}
