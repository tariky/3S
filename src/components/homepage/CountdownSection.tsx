import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { getSpacingStyle } from "@/components/homepage-builder/types";
import { useTheme } from "@/components/theme-provider";
import type { CountdownComponent, CountdownSize } from "@/components/homepage-builder/types";

interface CountdownSectionProps {
	component: CountdownComponent;
	previewTheme?: "light" | "dark";
}

interface TimeLeft {
	days: number;
	hours: number;
	minutes: number;
	seconds: number;
}

function calculateTimeLeft(endDate: string): TimeLeft {
	const difference = new Date(endDate).getTime() - new Date().getTime();

	if (difference <= 0) {
		return { days: 0, hours: 0, minutes: 0, seconds: 0 };
	}

	return {
		days: Math.floor(difference / (1000 * 60 * 60 * 24)),
		hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
		minutes: Math.floor((difference / (1000 * 60)) % 60),
		seconds: Math.floor((difference / 1000) % 60),
	};
}

const SIZE_CLASSES: Record<CountdownSize, { container: string; number: string; label: string }> = {
	sm: {
		container: "py-3 px-4",
		number: "text-xl font-bold",
		label: "text-xs uppercase tracking-wide opacity-70",
	},
	md: {
		container: "py-6 px-6",
		number: "text-3xl md:text-4xl font-bold",
		label: "text-sm uppercase tracking-wide opacity-70",
	},
	lg: {
		container: "py-10 px-8",
		number: "text-4xl md:text-6xl font-bold",
		label: "text-base uppercase tracking-wide opacity-70",
	},
};

export function CountdownSection({ component, previewTheme }: CountdownSectionProps) {
	const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft(component.endDate));
	const { resolvedTheme } = useTheme();

	// Use previewTheme if provided (for builder preview), otherwise use resolvedTheme
	const activeTheme = previewTheme ?? resolvedTheme;

	// Use dark mode colors when in dark mode
	const bgColor = activeTheme === "dark" ? (component.darkBgColor || component.bgColor) : component.bgColor;
	const textColor = activeTheme === "dark" ? (component.darkTextColor || component.textColor) : component.textColor;

	useEffect(() => {
		const timer = setInterval(() => {
			setTimeLeft(calculateTimeLeft(component.endDate));
		}, 1000);

		return () => clearInterval(timer);
	}, [component.endDate]);

	const sizeClasses = SIZE_CLASSES[component.size];
	const spacingStyle = getSpacingStyle(component);

	const units = [
		{ key: "days", value: timeLeft.days, label: "Dana", show: component.showDays },
		{ key: "hours", value: timeLeft.hours, label: "Sati", show: component.showHours },
		{ key: "minutes", value: timeLeft.minutes, label: "Minuta", show: component.showMinutes },
		{ key: "seconds", value: timeLeft.seconds, label: "Sekundi", show: component.showSeconds },
	].filter((unit) => unit.show);

	const isExpired = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;

	return (
		<section
			className={cn(sizeClasses.container)}
			style={{
				backgroundColor: bgColor,
				color: textColor,
				...spacingStyle,
			}}
		>
			<div className="container mx-auto px-4">
				<div className="flex flex-col items-center text-center">
					{component.title && (
						<h2
							className={cn(
								"font-semibold mb-2",
								component.size === "sm" && "text-sm",
								component.size === "md" && "text-lg",
								component.size === "lg" && "text-xl md:text-2xl"
							)}
						>
							{component.title}
						</h2>
					)}

					{component.subtitle && (
						<p
							className={cn(
								"opacity-80 mb-4",
								component.size === "sm" && "text-xs",
								component.size === "md" && "text-sm",
								component.size === "lg" && "text-base"
							)}
						>
							{component.subtitle}
						</p>
					)}

					{isExpired ? (
						<p className={cn(sizeClasses.number, "opacity-80")}>Vrijeme je isteklo!</p>
					) : (
						<div
							className={cn(
								"flex gap-4 md:gap-6",
								component.size === "sm" && "gap-3",
								component.size === "lg" && "gap-6 md:gap-10"
							)}
						>
							{units.map((unit, index) => (
								<div key={unit.key} className="flex items-center">
									<div className="flex flex-col items-center">
										<span className={sizeClasses.number}>
											{String(unit.value).padStart(2, "0")}
										</span>
										<span className={sizeClasses.label}>{unit.label}</span>
									</div>
									{index < units.length - 1 && (
										<span
											className={cn(
												"ml-4 md:ml-6 opacity-50",
												component.size === "sm" && "text-xl ml-3",
												component.size === "md" && "text-3xl md:text-4xl",
												component.size === "lg" && "text-4xl md:text-6xl ml-6 md:ml-10"
											)}
										>
											:
										</span>
									)}
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</section>
	);
}
