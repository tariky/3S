import { cn } from "@/lib/utils";
import { getSpacingStyle } from "@/components/homepage-builder/types";
import { useTheme } from "@/components/theme-provider";
import type { MarqueeComponent, TextSize, MarqueePadding, MarqueeSpeed } from "@/components/homepage-builder/types";

interface MarqueeSectionProps {
	component: MarqueeComponent;
	previewTheme?: "light" | "dark";
}

const TEXT_SIZE_CLASSES: Record<TextSize, string> = {
	sm: "text-sm",
	md: "text-base",
	lg: "text-lg",
	xl: "text-xl",
	"2xl": "text-2xl",
	"3xl": "text-3xl",
};

const PADDING_CLASSES: Record<MarqueePadding, string> = {
	sm: "py-2",
	md: "py-4",
	lg: "py-6",
};

const SPEED_DURATIONS: Record<MarqueeSpeed, string> = {
	slow: "40s",
	normal: "20s",
	fast: "10s",
};

export function MarqueeSection({ component, previewTheme }: MarqueeSectionProps) {
	const animationDuration = SPEED_DURATIONS[component.speed];
	const spacingStyle = getSpacingStyle(component);
	const { resolvedTheme } = useTheme();

	// Use previewTheme if provided (for builder preview), otherwise use resolvedTheme
	const activeTheme = previewTheme ?? resolvedTheme;

	// Use dark mode colors when in dark mode
	const bgColor = activeTheme === "dark" ? (component.darkBgColor || component.bgColor) : component.bgColor;
	const textColor = activeTheme === "dark" ? (component.darkTextColor || component.textColor) : component.textColor;

	// Create enough repetitions to ensure seamless loop
	const repetitions = 8;

	return (
		<section
			style={{
				marginTop: spacingStyle.marginTop,
				marginBottom: spacingStyle.marginBottom,
			}}
		>
			<div
				className={cn("overflow-hidden whitespace-nowrap", PADDING_CLASSES[component.padding])}
				style={{
					backgroundColor: bgColor,
					color: textColor,
					paddingTop: spacingStyle.paddingTop,
					paddingBottom: spacingStyle.paddingBottom,
				}}
			>
				<div
					className="inline-flex marquee-track"
					style={{
						animationDuration,
					}}
				>
					{/* First set */}
					{[...Array(repetitions)].map((_, i) => (
						<span
							key={`a-${i}`}
							className={cn("shrink-0 px-8 font-medium", TEXT_SIZE_CLASSES[component.textSize])}
						>
							{component.text}
						</span>
					))}
					{/* Duplicate set for seamless loop */}
					{[...Array(repetitions)].map((_, i) => (
						<span
							key={`b-${i}`}
							className={cn("shrink-0 px-8 font-medium", TEXT_SIZE_CLASSES[component.textSize])}
						>
							{component.text}
						</span>
					))}
				</div>
			</div>

			<style>{`
				@keyframes marquee-scroll {
					0% {
						transform: translateX(0);
					}
					100% {
						transform: translateX(-50%);
					}
				}
				.marquee-track {
					animation: marquee-scroll linear infinite;
					will-change: transform;
				}
			`}</style>
		</section>
	);
}
