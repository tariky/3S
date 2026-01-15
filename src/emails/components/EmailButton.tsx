import { Button } from "@react-email/components";
import type { ReactNode } from "react";

interface EmailButtonProps {
	href: string;
	children: ReactNode;
	bgColor?: string;
	textColor?: string;
}

export function EmailButton({
	href,
	children,
	bgColor = "#2563eb",
	textColor = "#ffffff"
}: EmailButtonProps) {
	return (
		<Button
			href={href}
			className="rounded-lg px-6 py-3 text-center text-sm font-semibold no-underline"
			style={{
				display: "inline-block",
				backgroundColor: bgColor,
				color: textColor,
			}}
		>
			{children}
		</Button>
	);
}
