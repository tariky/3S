import { Button } from "@/components/ui/button";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Variant } from "@/types/products";
import { SortableVariant } from "./SortableVariant";
import { nanoid } from "nanoid";
import { Layers, Plus, Package } from "lucide-react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

interface VariantsSectionProps {
	variants: Variant[];
	setVariants: React.Dispatch<React.SetStateAction<Variant[]>>;
	sensors: ReturnType<typeof import("@dnd-kit/core").useSensors>;
	defaultExpanded?: boolean;
}

export function VariantsSection({
	variants,
	setVariants,
	sensors,
	defaultExpanded = false,
}: VariantsSectionProps) {
	const handleVariantDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;

		if (over && active.id !== over.id) {
			setVariants((items) => {
				const oldIndex = items.findIndex((item) => item.id === active.id);
				const newIndex = items.findIndex((item) => item.id === over.id);

				const newItems = arrayMove(items, oldIndex, newIndex);
				// Update positions
				return newItems.map((item, index) => ({
					...item,
					position: index + 1,
				}));
			});
		}
	};

	const content = (
		<div className="space-y-4">
			{variants.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-8 text-center">
					<div className="p-3 bg-gray-100 rounded-full mb-3">
						<Package className="size-6 text-gray-400" />
					</div>
					<p className="text-sm font-medium text-gray-600">
						Nema dodanih varijacija
					</p>
					<p className="text-xs text-gray-500 mt-1">
						Dodajte varijacije kao što su veličina, boja itd.
					</p>
				</div>
			) : (
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragEnd={handleVariantDragEnd}
				>
					<SortableContext
						items={variants.map((v) => v.id)}
						strategy={verticalListSortingStrategy}
					>
						<div className="flex flex-col gap-3">
							{variants.map((variant, index) => (
								<SortableVariant
									key={variant.id}
									variant={variant}
									variants={variants}
									setVariants={setVariants}
									index={index}
								/>
							))}
						</div>
					</SortableContext>
				</DndContext>
			)}
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="w-full sm:w-fit"
				onClick={() =>
					setVariants([
						...variants,
						{
							position: variants.length + 1,
							id: nanoid(),
							name: "",
							options: [],
						},
					])
				}
			>
				<Plus className="size-4 mr-2" />
				Dodaj varijaciju
			</Button>
		</div>
	);

	return (
		<>
			{/* Desktop version */}
			<div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
				<div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Layers className="size-5 text-gray-400" />
						<h2 className="font-semibold text-gray-900">Varijacije</h2>
					</div>
					{variants.length > 0 && (
						<Badge variant="secondary" className="text-xs">
							{variants.length}{" "}
							{variants.length === 1 ? "varijacija" : "varijacije"}
						</Badge>
					)}
				</div>
				<div className="p-6">{content}</div>
			</div>

			{/* Mobile version with accordion */}
			<div className="lg:hidden bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
				<Accordion
					type="single"
					collapsible
					defaultValue={defaultExpanded ? "variants" : undefined}
				>
					<AccordionItem value="variants" className="border-0">
						<AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50">
							<div className="flex items-center gap-2">
								<Layers className="size-5 text-gray-400" />
								<span className="font-semibold text-gray-900">Varijacije</span>
								{variants.length > 0 && (
									<Badge variant="secondary" className="text-xs ml-2">
										{variants.length}
									</Badge>
								)}
							</div>
						</AccordionTrigger>
						<AccordionContent className="px-4 pb-4">{content}</AccordionContent>
					</AccordionItem>
				</Accordion>
			</div>
		</>
	);
}
