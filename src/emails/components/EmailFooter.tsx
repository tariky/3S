import { Hr, Link, Section, Text } from "@react-email/components";

interface EmailFooterProps {
	shopName: string;
}

export function EmailFooter({ shopName }: EmailFooterProps) {
	const currentYear = new Date().getFullYear();

	return (
		<Section className="bg-slate-50 px-8 py-6">
			<Hr className="border-slate-200" />
			<Text className="m-0 mt-4 text-center text-sm text-slate-600">
				Ukoliko Vam je potrebna pomoć pišite nam na{" "}
				<Link
					href="mailto:office@lunatik.ba"
					className="text-blue-600 underline"
				>
					office@lunatik.ba
				</Link>
			</Text>
			<Text className="m-0 mt-4 text-center text-sm text-slate-500">
				© {currentYear} {shopName}. Sva prava pridržana.
			</Text>
			<Text className="m-0 mt-2 text-center text-xs text-slate-400">
				Ovaj email je poslan automatski. Molimo ne odgovarajte na ovu poruku.
			</Text>
		</Section>
	);
}
