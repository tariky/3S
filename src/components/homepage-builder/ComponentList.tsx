import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	type DragEndEvent,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { ComponentListItem } from "./ComponentListItem";
import type { HomepageComponent } from "./types";

interface ComponentListProps {
	components: HomepageComponent[];
	selectedId: string | null;
	onSelect: (id: string | null) => void;
	onDelete: (id: string) => void;
	onReorder: (components: HomepageComponent[]) => void;
	onAddClick: () => void;
}

export function ComponentList({
	components,
	selectedId,
	onSelect,
	onDelete,
	onReorder,
	onAddClick,
}: ComponentListProps) {
	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	);

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;

		if (over && active.id !== over.id) {
			const oldIndex = components.findIndex((c) => c.id === active.id);
			const newIndex = components.findIndex((c) => c.id === over.id);
			const reordered = arrayMove(components, oldIndex, newIndex);
			onReorder(reordered);
		}
	};

	return (
		<div className="flex flex-col h-auto max-h-[50%]">
			<div className="p-4 border-b">
				<Button onClick={onAddClick} className="w-full" variant="outline">
					<Plus className="h-4 w-4 mr-2" />
					Dodaj komponentu
				</Button>
			</div>

			<div className="flex-1 overflow-auto p-2">
				{components.length === 0 ? (
					<div className="text-center py-8 text-muted-foreground text-sm">
						Nema komponenti. Kliknite &quot;Dodaj komponentu&quot; za početak.
					</div>
				) : (
					<DndContext
						sensors={sensors}
						collisionDetection={closestCenter}
						onDragEnd={handleDragEnd}
					>
						<SortableContext
							items={components.map((c) => c.id)}
							strategy={verticalListSortingStrategy}
						>
							<div className="space-y-2">
								{components.map((component) => (
									<ComponentListItem
										key={component.id}
										component={component}
										isSelected={selectedId === component.id}
										onSelect={() => onSelect(component.id)}
										onDelete={() => onDelete(component.id)}
									/>
								))}
							</div>
						</SortableContext>
					</DndContext>
				)}
			</div>
		</div>
	);
}
