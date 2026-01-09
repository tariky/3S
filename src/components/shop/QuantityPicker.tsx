"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuantityPickerProps {
	value: number;
	onChange: (value: number) => void;
	min?: number;
	max?: number;
	disabled?: boolean;
	size?: "sm" | "md";
}

export function QuantityPicker({
	value,
	onChange,
	min = 1,
	max = 99,
	disabled = false,
	size = "md",
}: QuantityPickerProps) {
	const canDecrement = value > min && !disabled;
	const canIncrement = value < max && !disabled;

	const handleDecrement = () => {
		if (canDecrement) {
			onChange(value - 1);
		}
	};

	const handleIncrement = () => {
		if (canIncrement) {
			onChange(value + 1);
		}
	};

	const sizeClasses = {
		sm: {
			wrapper: "h-8",
			button: "w-8 h-8",
			icon: "size-3.5",
			text: "text-sm w-8",
		},
		md: {
			wrapper: "h-10",
			button: "w-10 h-10",
			icon: "size-4",
			text: "text-base w-10",
		},
	};

	const styles = sizeClasses[size];

	return (
		<div
			className={cn(
				"inline-flex items-center border border-gray-200 rounded-md overflow-hidden",
				styles.wrapper,
				disabled && "opacity-50"
			)}
			role="group"
			aria-label="Quantity selector"
		>
			<button
				type="button"
				onClick={handleDecrement}
				disabled={!canDecrement}
				className={cn(
					"flex items-center justify-center transition-colors",
					styles.button,
					canDecrement
						? "hover:bg-gray-100 active:bg-gray-200 text-gray-700"
						: "text-gray-300 cursor-not-allowed"
				)}
				aria-label="Decrease quantity"
			>
				<Minus className={styles.icon} />
			</button>

			<span
				className={cn(
					"flex items-center justify-center font-medium text-gray-900 select-none",
					styles.text
				)}
				aria-live="polite"
				aria-atomic="true"
			>
				{value}
			</span>

			<button
				type="button"
				onClick={handleIncrement}
				disabled={!canIncrement}
				className={cn(
					"flex items-center justify-center transition-colors",
					styles.button,
					canIncrement
						? "hover:bg-gray-100 active:bg-gray-200 text-gray-700"
						: "text-gray-300 cursor-not-allowed"
				)}
				aria-label="Increase quantity"
			>
				<Plus className={styles.icon} />
			</button>
		</div>
	);
}
