import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { SPACING_OPTIONS } from "../types";
import type { SpacingSize } from "../types";

interface SpacingEditorProps {
	marginTop: SpacingSize;
	marginBottom: SpacingSize;
	paddingTop: SpacingSize;
	paddingBottom: SpacingSize;
	onUpdate: (updates: {
		marginTop?: SpacingSize;
		marginBottom?: SpacingSize;
		paddingTop?: SpacingSize;
		paddingBottom?: SpacingSize;
	}) => void;
}

export function SpacingEditor({
	marginTop,
	marginBottom,
	paddingTop,
	paddingBottom,
	onUpdate,
}: SpacingEditorProps) {
	return (
		<Collapsible className="border rounded-lg">
			<CollapsibleTrigger className="flex items-center justify-between w-full p-3 text-sm font-medium hover:bg-muted/50">
				<span>Razmak (Margin & Padding)</span>
				<ChevronDown className="h-4 w-4" />
			</CollapsibleTrigger>
			<CollapsibleContent className="p-3 pt-0 space-y-4">
				<div className="grid grid-cols-2 gap-3">
					<div className="space-y-2">
						<Label className="text-xs">Margin gore</Label>
						<Select
							value={marginTop}
							onValueChange={(value) => onUpdate({ marginTop: value as SpacingSize })}
						>
							<SelectTrigger className="h-9">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{SPACING_OPTIONS.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label className="text-xs">Margin dolje</Label>
						<Select
							value={marginBottom}
							onValueChange={(value) => onUpdate({ marginBottom: value as SpacingSize })}
						>
							<SelectTrigger className="h-9">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{SPACING_OPTIONS.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label className="text-xs">Padding gore</Label>
						<Select
							value={paddingTop}
							onValueChange={(value) => onUpdate({ paddingTop: value as SpacingSize })}
						>
							<SelectTrigger className="h-9">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{SPACING_OPTIONS.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label className="text-xs">Padding dolje</Label>
						<Select
							value={paddingBottom}
							onValueChange={(value) => onUpdate({ paddingBottom: value as SpacingSize })}
						>
							<SelectTrigger className="h-9">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{SPACING_OPTIONS.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}
