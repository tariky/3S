import {
	Body,
	Container,
	Head,
	Html,
	Preview,
	Tailwind,
} from "@react-email/components";
import type { ReactNode } from "react";

interface EmailLayoutProps {
	preview: string;
	children: ReactNode;
}

export function EmailLayout({ preview, children }: EmailLayoutProps) {
	return (
		<Html>
			<Head />
			<Preview>{preview}</Preview>
			<Tailwind>
				<Body className="bg-white font-sans">
					<Container className="mx-auto my-8 max-w-[600px] bg-white">
						{children}
					</Container>
				</Body>
			</Tailwind>
		</Html>
	);
}
