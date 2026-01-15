import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { SpacingEditor } from "./SpacingEditor";
import { ColorSchemaEditor } from "./ColorSchemaEditor";
import {
	TEXT_SIZE_OPTIONS,
	MARQUEE_PADDING_OPTIONS,
	MARQUEE_SPEED_OPTIONS,
} from "../types";
import type { MarqueeComponent, TextSize, MarqueePadding, MarqueeSpeed } from "../types";

interface MarqueeEditorProps {
	component: MarqueeComponent;
	onUpdate: (updates: Partial<MarqueeComponent>) => void;
}

export function MarqueeEditor({ component, onUpdate }: MarqueeEditorProps) {
	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<Label>Tekst</Label>
				<Input
					value={component.text}
					onChange={(e) => onUpdate({ text: e.target.value })}
					placeholder="Tekst koji se pomiče"
				/>
			</div>

			<div className="space-y-2">
				<Label>Veličina teksta</Label>
				<Select
					value={component.textSize}
					onValueChange={(value) => onUpdate({ textSize: value as TextSize })}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{TEXT_SIZE_OPTIONS.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="space-y-2">
				<Label>Padding</Label>
				<Select
					value={component.padding}
					onValueChange={(value) => onUpdate({ padding: value as MarqueePadding })}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{MARQUEE_PADDING_OPTIONS.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="space-y-2">
				<Label>Brzina</Label>
				<Select
					value={component.speed}
					onValueChange={(value) => onUpdate({ speed: value as MarqueeSpeed })}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{MARQUEE_SPEED_OPTIONS.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="space-y-2">
				<Label>Boje</Label>
				<ColorSchemaEditor
					bgColor={component.bgColor}
					textColor={component.textColor}
					darkBgColor={component.darkBgColor || "#1e293b"}
					darkTextColor={component.darkTextColor || "#f8fafc"}
					onUpdate={onUpdate}
				/>
			</div>

			<SpacingEditor
				marginTop={component.marginTop}
				marginBottom={component.marginBottom}
				paddingTop={component.paddingTop}
				paddingBottom={component.paddingBottom}
				onUpdate={onUpdate}
			/>
		</div>
	);
}
