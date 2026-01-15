import { Sun, Moon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { COLOR_PRESETS } from "../types";

interface ColorPickerProps {
	value: string;
	onChange: (value: string) => void;
	label: string;
}

function ColorPicker({ value, onChange, label }: ColorPickerProps) {
	return (
		<div className="space-y-1.5">
			<Label className="text-xs text-muted-foreground">{label}</Label>
			<Popover>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						className="w-full justify-start gap-2 h-9"
					>
						<div
							className="w-5 h-5 rounded border"
							style={{ backgroundColor: value }}
						/>
						<span className="text-xs font-mono truncate">{value}</span>
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-64 p-3" align="start">
					<div className="space-y-3">
						<div className="grid grid-cols-6 gap-1.5">
							{COLOR_PRESETS.map((color) => (
								<button
									key={color.value}
									onClick={() => onChange(color.value)}
									className={`w-7 h-7 rounded-md border-2 transition-all ${
										value === color.value
											? "border-primary ring-2 ring-primary ring-offset-1"
											: "border-transparent hover:border-muted-foreground/50"
									}`}
									style={{ backgroundColor: color.value }}
									title={color.label}
								/>
							))}
						</div>
						<Input
							value={value}
							onChange={(e) => onChange(e.target.value)}
							placeholder="#ffffff"
							className="h-8 text-xs"
						/>
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}

interface ColorSchemaEditorProps {
	bgColor: string;
	textColor: string;
	darkBgColor: string;
	darkTextColor: string;
	onUpdate: (updates: {
		bgColor?: string;
		textColor?: string;
		darkBgColor?: string;
		darkTextColor?: string;
	}) => void;
}

export function ColorSchemaEditor({
	bgColor,
	textColor,
	darkBgColor,
	darkTextColor,
	onUpdate,
}: ColorSchemaEditorProps) {
	return (
		<div className="space-y-4">
			{/* Light Mode Colors */}
			<div className="space-y-3">
				<div className="flex items-center gap-2 text-sm font-medium">
					<Sun className="h-4 w-4" />
					Light Mode
				</div>
				<div className="grid grid-cols-2 gap-3">
					<ColorPicker
						value={bgColor}
						onChange={(value) => onUpdate({ bgColor: value })}
						label="Pozadina"
					/>
					<ColorPicker
						value={textColor}
						onChange={(value) => onUpdate({ textColor: value })}
						label="Tekst"
					/>
				</div>
			</div>

			{/* Dark Mode Colors */}
			<div className="space-y-3">
				<div className="flex items-center gap-2 text-sm font-medium">
					<Moon className="h-4 w-4" />
					Dark Mode
				</div>
				<div className="grid grid-cols-2 gap-3">
					<ColorPicker
						value={darkBgColor}
						onChange={(value) => onUpdate({ darkBgColor: value })}
						label="Pozadina"
					/>
					<ColorPicker
						value={darkTextColor}
						onChange={(value) => onUpdate({ darkTextColor: value })}
						label="Tekst"
					/>
				</div>
			</div>
		</div>
	);
}
