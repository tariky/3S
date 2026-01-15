import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { SpacingEditor } from "./SpacingEditor";
import { ColorSchemaEditor } from "./ColorSchemaEditor";
import { TEXT_SIZE_OPTIONS, ALIGNMENT_OPTIONS, HEIGHT_OPTIONS } from "../types";
import type { TextInfoComponent, TextSize, Alignment, HeightSize } from "../types";

interface TextInfoEditorProps {
	component: TextInfoComponent;
	onUpdate: (updates: Partial<TextInfoComponent>) => void;
}

export function TextInfoEditor({ component, onUpdate }: TextInfoEditorProps) {
	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<Label>Naslov</Label>
				<Input
					value={component.heading}
					onChange={(e) => onUpdate({ heading: e.target.value })}
					placeholder="Naslov"
				/>
			</div>

			<div className="space-y-2">
				<Label>Veličina naslova</Label>
				<Select
					value={component.headingSize}
					onValueChange={(value) => onUpdate({ headingSize: value as TextSize })}
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
				<Label>Podnaslov</Label>
				<Textarea
					value={component.subtitle || ""}
					onChange={(e) => onUpdate({ subtitle: e.target.value })}
					placeholder="Podnaslov"
					rows={3}
				/>
			</div>

			<div className="space-y-2">
				<Label>Veličina podnaslova</Label>
				<Select
					value={component.subtitleSize}
					onValueChange={(value) => onUpdate({ subtitleSize: value as TextSize })}
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
				<Label>Poravnanje</Label>
				<Select
					value={component.alignment}
					onValueChange={(value) => onUpdate({ alignment: value as Alignment })}
				>
					<SelectTrigger>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{ALIGNMENT_OPTIONS.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="flex items-center justify-between">
				<Label>Prikaži dugme</Label>
				<Switch
					checked={component.showButton}
					onCheckedChange={(checked) => onUpdate({ showButton: checked })}
				/>
			</div>

			{component.showButton && (
				<>
					<div className="space-y-2">
						<Label>Tekst dugmeta</Label>
						<Input
							value={component.buttonText || ""}
							onChange={(e) => onUpdate({ buttonText: e.target.value })}
							placeholder="Saznaj više"
						/>
					</div>

					<div className="space-y-2">
						<Label>Link dugmeta</Label>
						<Input
							value={component.buttonLink || ""}
							onChange={(e) => onUpdate({ buttonLink: e.target.value })}
							placeholder="https://..."
						/>
					</div>
				</>
			)}

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

			<div className="space-y-4">
				<Label>Visina sekcije</Label>
				<div className="grid grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label className="text-xs text-muted-foreground">Mobilni</Label>
						<Select
							value={component.mobileHeight || "auto"}
							onValueChange={(value) => onUpdate({ mobileHeight: value as HeightSize })}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{HEIGHT_OPTIONS.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label className="text-xs text-muted-foreground">Desktop</Label>
						<Select
							value={component.desktopHeight || "auto"}
							onValueChange={(value) => onUpdate({ desktopHeight: value as HeightSize })}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{HEIGHT_OPTIONS.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
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
