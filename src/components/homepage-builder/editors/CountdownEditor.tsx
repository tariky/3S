import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { SpacingEditor } from "./SpacingEditor";
import { ColorSchemaEditor } from "./ColorSchemaEditor";
import { COUNTDOWN_SIZE_OPTIONS } from "../types";
import type { CountdownComponent, CountdownSize } from "../types";

interface CountdownEditorProps {
	component: CountdownComponent;
	onUpdate: (updates: Partial<CountdownComponent>) => void;
}

export function CountdownEditor({ component, onUpdate }: CountdownEditorProps) {
	const formatDateForInput = (isoString: string) => {
		const date = new Date(isoString);
		return date.toISOString().slice(0, 16);
	};

	const handleDateChange = (value: string) => {
		const date = new Date(value);
		onUpdate({ endDate: date.toISOString() });
	};

	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<Label>Datum i vrijeme završetka</Label>
				<Input
					type="datetime-local"
					value={formatDateForInput(component.endDate)}
					onChange={(e) => handleDateChange(e.target.value)}
				/>
			</div>

			<div className="space-y-2">
				<Label>Naslov (opciono)</Label>
				<Input
					value={component.title || ""}
					onChange={(e) => onUpdate({ title: e.target.value })}
					placeholder="Akcija završava za"
				/>
			</div>

			<div className="space-y-2">
				<Label>Podnaslov (opciono)</Label>
				<Input
					value={component.subtitle || ""}
					onChange={(e) => onUpdate({ subtitle: e.target.value })}
					placeholder="Ne propustite priliku!"
				/>
			</div>

			<div className="space-y-2">
				<Label>Veličina</Label>
				<Select
					value={component.size}
					onValueChange={(value) => onUpdate({ size: value as CountdownSize })}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{COUNTDOWN_SIZE_OPTIONS.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="space-y-4">
				<Label>Prikaži jedinice</Label>
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<Label className="font-normal">Dani</Label>
						<Switch
							checked={component.showDays}
							onCheckedChange={(checked) => onUpdate({ showDays: checked })}
						/>
					</div>
					<div className="flex items-center justify-between">
						<Label className="font-normal">Sati</Label>
						<Switch
							checked={component.showHours}
							onCheckedChange={(checked) => onUpdate({ showHours: checked })}
						/>
					</div>
					<div className="flex items-center justify-between">
						<Label className="font-normal">Minute</Label>
						<Switch
							checked={component.showMinutes}
							onCheckedChange={(checked) => onUpdate({ showMinutes: checked })}
						/>
					</div>
					<div className="flex items-center justify-between">
						<Label className="font-normal">Sekunde</Label>
						<Switch
							checked={component.showSeconds}
							onCheckedChange={(checked) => onUpdate({ showSeconds: checked })}
						/>
					</div>
				</div>
			</div>

			<div className="space-y-2">
				<Label>Boje</Label>
				<ColorSchemaEditor
					bgColor={component.bgColor}
					textColor={component.textColor}
					darkBgColor={component.darkBgColor || "#dc2626"}
					darkTextColor={component.darkTextColor || "#ffffff"}
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
