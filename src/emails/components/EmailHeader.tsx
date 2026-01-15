import { Img, Section, Text } from "@react-email/components";

interface EmailHeaderProps {
	shopName: string;
	shopLogo?: string;
}

// Properly encode URL while preserving the protocol and domain
function encodeImageUrl(url: string): string {
	if (!url) return url;
	try {
		const urlObj = new URL(url);
		// Encode the pathname to handle special characters like +
		urlObj.pathname = urlObj.pathname
			.split("/")
			.map((segment) => encodeURIComponent(decodeURIComponent(segment)))
			.join("/");
		return urlObj.toString();
	} catch {
		return url;
	}
}

export function EmailHeader({ shopName, shopLogo }: EmailHeaderProps) {
	const encodedLogo = shopLogo ? encodeImageUrl(shopLogo) : undefined;

	return (
		<Section className="bg-gradient-to-r from-slate-800 to-slate-700 px-8 py-6 text-center">
			{encodedLogo ? (
				<Img
					src={encodedLogo}
					alt={shopName}
					width="120"
					height="40"
					className="mx-auto mb-2"
					style={{ maxHeight: "40px", objectFit: "contain" }}
				/>
			) : (
				<Text className="m-0 text-xl font-bold text-white">{shopName}</Text>
			)}
		</Section>
	);
}
