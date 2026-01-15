import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { getCollectionsQueryOptions } from "@/queries/collections";
import { SpacingEditor } from "./SpacingEditor";
import { ColorSchemaEditor } from "./ColorSchemaEditor";
import { TEXT_SIZE_OPTIONS } from "../types";
import type { ProductsCarouselComponent, TextSize } from "../types";

interface ProductsCarouselEditorProps {
	component: ProductsCarouselComponent;
	onUpdate: (updates: Partial<ProductsCarouselComponent>) => void;
}

export function ProductsCarouselEditor({ component, onUpdate }: ProductsCarouselEditorProps) {
	const [open, setOpen] = useState(false);
	const { data: collections = [] } = useQuery(getCollectionsQueryOptions());

	const selectedCollection = collections.find((c) => c.id === component.collectionId);

	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<Label>Kolekcija</Label>
				<Popover open={open} onOpenChange={setOpen}>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							role="combobox"
							aria-expanded={open}
							className="w-full justify-between font-normal"
						>
							{selectedCollection
								? `${selectedCollection.name} (${selectedCollection.productCount})`
								: "Izaberite kolekciju..."}
							<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
						<Command>
							<CommandInput placeholder="Pretraži kolekcije..." />
							<CommandList>
								<CommandEmpty>Nema pronađenih kolekcija.</CommandEmpty>
								<CommandGroup>
									{collections.map((collection) => (
										<CommandItem
											key={collection.id}
											value={collection.name}
											onSelect={() => {
												onUpdate({ collectionId: collection.id });
												setOpen(false);
											}}
										>
											<Check
												className={cn(
													"mr-2 h-4 w-4",
													component.collectionId === collection.id
														? "opacity-100"
														: "opacity-0"
												)}
											/>
											{collection.name}
											<span className="ml-auto text-muted-foreground text-xs">
												{collection.productCount} proizvoda
											</span>
										</CommandItem>
									))}
								</CommandGroup>
							</CommandList>
						</Command>
					</PopoverContent>
				</Popover>
			</div>

			<div className="space-y-2">
				<Label>Broj proizvoda ({component.limit})</Label>
				<Slider
					value={[component.limit]}
					onValueChange={([value]) => onUpdate({ limit: value })}
					min={4}
					max={20}
					step={1}
				/>
			</div>

			<div className="space-y-2">
				<Label>Naslov</Label>
				<Input
					value={component.title}
					onChange={(e) => onUpdate({ title: e.target.value })}
					placeholder="Naslov sekcije"
				/>
			</div>

			<div className="space-y-2">
				<Label>Veličina naslova</Label>
				<Select
					value={component.titleSize}
					onValueChange={(value) => onUpdate({ titleSize: value as TextSize })}
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
				<Label>Podnaslov (opciono)</Label>
				<Input
					value={component.subtitle || ""}
					onChange={(e) => onUpdate({ subtitle: e.target.value })}
					placeholder="Podnaslov sekcije"
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

			<div className="flex items-center justify-between">
				<Label>Prikaži dugme</Label>
				<Switch
					checked={component.showButton}
					onCheckedChange={(checked) => onUpdate({ showButton: checked })}
				/>
			</div>

			{component.showButton && (
				<div className="space-y-2">
					<Label>Tekst dugmeta</Label>
					<Input
						value={component.buttonText || ""}
						onChange={(e) => onUpdate({ buttonText: e.target.value })}
						placeholder="Pogledaj sve"
					/>
				</div>
			)}

			<div className="space-y-2">
				<Label>Boje</Label>
				<ColorSchemaEditor
					bgColor={component.bgColor}
					textColor={component.textColor}
					darkBgColor={component.darkBgColor || "#0f172a"}
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
