"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

// Tailwind color options for backgrounds
export const BG_COLORS = [
	{ value: "bg-red-500", label: "Red", hex: "#ef4444" },
	{ value: "bg-orange-500", label: "Orange", hex: "#f97316" },
	{ value: "bg-amber-500", label: "Amber", hex: "#f59e0b" },
	{ value: "bg-yellow-500", label: "Yellow", hex: "#eab308" },
	{ value: "bg-lime-500", label: "Lime", hex: "#84cc16" },
	{ value: "bg-green-500", label: "Green", hex: "#22c55e" },
	{ value: "bg-emerald-500", label: "Emerald", hex: "#10b981" },
	{ value: "bg-teal-500", label: "Teal", hex: "#14b8a6" },
	{ value: "bg-cyan-500", label: "Cyan", hex: "#06b6d4" },
	{ value: "bg-sky-500", label: "Sky", hex: "#0ea5e9" },
	{ value: "bg-blue-500", label: "Blue", hex: "#3b82f6" },
	{ value: "bg-indigo-500", label: "Indigo", hex: "#6366f1" },
	{ value: "bg-violet-500", label: "Violet", hex: "#8b5cf6" },
	{ value: "bg-purple-500", label: "Purple", hex: "#a855f7" },
	{ value: "bg-fuchsia-500", label: "Fuchsia", hex: "#d946ef" },
	{ value: "bg-pink-500", label: "Pink", hex: "#ec4899" },
	{ value: "bg-rose-500", label: "Rose", hex: "#f43f5e" },
	{ value: "bg-slate-500", label: "Slate", hex: "#64748b" },
	{ value: "bg-gray-500", label: "Gray", hex: "#6b7280" },
	{ value: "bg-zinc-700", label: "Dark", hex: "#3f3f46" },
];

// Tailwind color options for text
export const TEXT_COLORS = [
	{ value: "text-white", label: "White", hex: "#ffffff" },
	{ value: "text-black", label: "Black", hex: "#000000" },
	{ value: "text-gray-100", label: "Light Gray", hex: "#f3f4f6" },
	{ value: "text-gray-900", label: "Dark Gray", hex: "#111827" },
];

interface ColorPickerProps {
	value: string;
	onChange: (value: string) => void;
	colors?: Array<{ value: string; label: string; hex: string }>;
	label?: string;
	className?: string;
}

export function ColorPicker({
	value,
	onChange,
	colors = BG_COLORS,
	label = "Odaberi boju",
	className,
}: ColorPickerProps) {
	const [open, setOpen] = React.useState(false);
	const selectedColor = colors.find((c) => c.value === value);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					className={cn("w-full justify-start gap-2", className)}
				>
					<div
						className="w-5 h-5 rounded border border-gray-300"
						style={{ backgroundColor: selectedColor?.hex || "#3b82f6" }}
					/>
					<span className="truncate">
						{selectedColor?.label || label}
					</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-64 p-3" align="start">
				<div className="grid grid-cols-5 gap-2">
					{colors.map((color) => (
						<button
							key={color.value}
							type="button"
							className={cn(
								"w-8 h-8 rounded-md border-2 transition-all flex items-center justify-center",
								value === color.value
									? "border-gray-900 scale-110"
									: "border-transparent hover:scale-105"
							)}
							style={{ backgroundColor: color.hex }}
							onClick={() => {
								onChange(color.value);
								setOpen(false);
							}}
							title={color.label}
						>
							{value === color.value && (
								<Check
									className={cn(
										"w-4 h-4",
										color.hex === "#ffffff" || color.hex === "#f3f4f6"
											? "text-gray-900"
											: "text-white"
									)}
								/>
							)}
						</button>
					))}
				</div>
			</PopoverContent>
		</Popover>
	);
}
