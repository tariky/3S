import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getSpacingStyle, HEIGHT_VALUES } from "@/components/homepage-builder/types";
import { useTheme } from "@/components/theme-provider";
import type { TextInfoComponent, TextSize, Alignment } from "@/components/homepage-builder/types";

interface TextInfoSectionProps {
	component: TextInfoComponent;
	previewTheme?: "light" | "dark";
}

const TEXT_SIZE_CLASSES: Record<TextSize, string> = {
	sm: "text-sm",
	md: "text-base",
	lg: "text-lg",
	xl: "text-xl",
	"2xl": "text-2xl md:text-3xl",
	"3xl": "text-3xl md:text-4xl",
};

const ALIGNMENT_CLASSES: Record<Alignment, string> = {
	left: "text-left items-start",
	center: "text-center items-center",
	right: "text-right items-end",
};

export function TextInfoSection({ component, previewTheme }: TextInfoSectionProps) {
	const isExternalLink = component.buttonLink?.startsWith("http");
	const spacingStyle = getSpacingStyle(component);
	const { resolvedTheme } = useTheme();

	// Use previewTheme if provided (for builder preview), otherwise use resolvedTheme
	const activeTheme = previewTheme ?? resolvedTheme;

	// Use dark mode colors when in dark mode
	const bgColor = activeTheme === "dark" ? (component.darkBgColor || component.bgColor) : component.bgColor;
	const textColor = activeTheme === "dark" ? (component.darkTextColor || component.textColor) : component.textColor;

	// Get height values
	const mobileHeight = HEIGHT_VALUES[component.mobileHeight || "auto"];
	const desktopHeight = HEIGHT_VALUES[component.desktopHeight || "auto"];

	const sectionId = `text-info-${component.id}`;

	return (
		<>
			<style>
				{`
					#${sectionId} {
						min-height: ${mobileHeight};
					}
					@media (min-width: 768px) {
						#${sectionId} {
							min-height: ${desktopHeight};
						}
					}
				`}
			</style>
			<section
				id={sectionId}
				className="flex items-center"
				style={{
					backgroundColor: bgColor,
					color: textColor,
					...spacingStyle,
				}}
			>
				<div className="container mx-auto px-4 w-full">
					<div className={cn("flex flex-col max-w-3xl", ALIGNMENT_CLASSES[component.alignment], component.alignment === "center" && "mx-auto")}>
						{component.heading && (
							<h2 className={cn("font-bold", TEXT_SIZE_CLASSES[component.headingSize])}>
								{component.heading}
							</h2>
						)}

						{component.subtitle && (
							<p
								className={cn(
									"mt-4 opacity-80 max-w-2xl",
									TEXT_SIZE_CLASSES[component.subtitleSize]
								)}
							>
								{component.subtitle}
							</p>
						)}

						{component.showButton && component.buttonText && component.buttonLink && (
							<div className="mt-8">
								{isExternalLink ? (
									<a
										href={component.buttonLink}
										target="_blank"
										rel="noopener noreferrer"
									>
										<Button
											size="lg"
											className="font-semibold"
											style={{
												backgroundColor: textColor,
												color: bgColor,
											}}
										>
											{component.buttonText}
										</Button>
									</a>
								) : (
									<Link to={component.buttonLink}>
										<Button
											size="lg"
											className="font-semibold"
											style={{
												backgroundColor: textColor,
												color: bgColor,
											}}
										>
											{component.buttonText}
										</Button>
									</Link>
								)}
							</div>
						)}
					</div>
				</div>
			</section>
		</>
	);
}
