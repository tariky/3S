import { LayoutGrid, Type, MoveHorizontal, Timer } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { HomepageComponent } from "./types";

interface ComponentTypeSelectorProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSelect: (type: HomepageComponent["type"]) => void;
}

const COMPONENT_OPTIONS: {
	type: HomepageComponent["type"];
	label: string;
	description: string;
	icon: React.ReactNode;
}[] = [
	{
		type: "products_carousel",
		label: "Karusel proizvoda",
		description: "Prikaz proizvoda iz kolekcije u horizontalnom karuzelu",
		icon: <LayoutGrid className="h-6 w-6" />,
	},
	{
		type: "text_info",
		label: "Tekst blok",
		description: "Naslov, podnaslov i opcijski CTA dugme",
		icon: <Type className="h-6 w-6" />,
	},
	{
		type: "marquee",
		label: "Pokretni tekst",
		description: "Horizontalno pomicanje teksta za promocije",
		icon: <MoveHorizontal className="h-6 w-6" />,
	},
	{
		type: "countdown",
		label: "Odbrojavanje",
		description: "Timer za akcije i posebne ponude",
		icon: <Timer className="h-6 w-6" />,
	},
];

export function ComponentTypeSelector({
	open,
	onOpenChange,
	onSelect,
}: ComponentTypeSelectorProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Dodaj komponentu</DialogTitle>
					<DialogDescription>
						Izaberite tip komponente koju želite dodati na početnu stranicu.
					</DialogDescription>
				</DialogHeader>

				<div className="grid grid-cols-2 gap-3 mt-4">
					{COMPONENT_OPTIONS.map((option) => (
						<button
							key={option.type}
							onClick={() => onSelect(option.type)}
							className={cn(
								"flex flex-col items-start gap-2 p-4 rounded-lg border text-left transition-colors",
								"hover:bg-muted hover:border-primary"
							)}
						>
							<div className="p-2 rounded-md bg-muted text-muted-foreground">
								{option.icon}
							</div>
							<div>
								<p className="font-medium text-sm">{option.label}</p>
								<p className="text-xs text-muted-foreground mt-0.5">
									{option.description}
								</p>
							</div>
						</button>
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
}
