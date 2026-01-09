import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import { getPublicShopSettingsQueryOptions } from "@/queries/settings";

// Get icon component by name
function getIconComponent(name: string): React.ComponentType<{ className?: string }> | null {
	const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
	return icons[name] || null;
}

export function AlertBanner() {
	const { data: settings } = useQuery(getPublicShopSettingsQueryOptions());

	// Don't render if not enabled or no text
	if (!settings?.alertEnabled || !settings?.alertText) {
		return null;
	}

	const IconComponent = getIconComponent(settings.alertIcon);

	const content = (
		<div
			className={cn(
				"flex items-center justify-center gap-2 py-2 px-4 text-sm font-medium",
				settings.alertBgColor,
				settings.alertTextColor
			)}
		>
			{IconComponent && <IconComponent className="w-4 h-4 flex-shrink-0" />}
			<span>{settings.alertText}</span>
		</div>
	);

	// If there's a link, wrap in Link component
	if (settings.alertLink) {
		// Check if it's an external link
		const isExternal = settings.alertLink.startsWith("http");

		if (isExternal) {
			return (
				<a
					href={settings.alertLink}
					target="_blank"
					rel="noopener noreferrer"
					className="block hover:opacity-90 transition-opacity"
				>
					{content}
				</a>
			);
		}

		// Internal link
		return (
			<Link
				to={settings.alertLink as "/"}
				className="block hover:opacity-90 transition-opacity"
			>
				{content}
			</Link>
		);
	}

	// No link, just render the banner
	return content;
}
