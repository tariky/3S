import { GripVertical, Trash2, LayoutGrid, Type, MoveHorizontal, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import type { HomepageComponent } from "./types";
import { COMPONENT_TYPE_LABELS } from "./types";

interface ComponentListItemProps {
	component: HomepageComponent;
	isSelected: boolean;
	onSelect: () => void;
	onDelete: () => void;
}

const COMPONENT_ICONS: Record<HomepageComponent["type"], React.ReactNode> = {
	products_carousel: <LayoutGrid className="h-4 w-4" />,
	text_info: <Type className="h-4 w-4" />,
	marquee: <MoveHorizontal className="h-4 w-4" />,
	countdown: <Timer className="h-4 w-4" />,
};

export function ComponentListItem({
	component,
	isSelected,
	onSelect,
	onDelete,
}: ComponentListItemProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: component.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	const getComponentPreview = () => {
		switch (component.type) {
			case "products_carousel":
				return component.title || "Karusel proizvoda";
			case "text_info":
				return component.heading || "Tekst blok";
			case "marquee":
				return component.text?.slice(0, 30) + (component.text?.length > 30 ? "..." : "") || "Pokretni tekst";
			case "countdown":
				return component.title || "Odbrojavanje";
			default:
				return "";
		}
	};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={cn(
				"flex items-center gap-2 p-2 rounded-md border bg-background cursor-pointer transition-colors",
				isSelected && "ring-2 ring-primary border-primary",
				!isSelected && "hover:bg-muted/50"
			)}
			onClick={onSelect}
		>
			<div
				{...attributes}
				{...listeners}
				className="cursor-grab active:cursor-grabbing p-1 text-muted-foreground hover:text-foreground"
				onClick={(e) => e.stopPropagation()}
			>
				<GripVertical className="h-4 w-4" />
			</div>

			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2">
					<span className="text-muted-foreground">
						{COMPONENT_ICONS[component.type]}
					</span>
					<span className="text-sm font-medium truncate">
						{COMPONENT_TYPE_LABELS[component.type]}
					</span>
				</div>
				<p className="text-xs text-muted-foreground truncate mt-0.5">
					{getComponentPreview()}
				</p>
			</div>

			<Button
				variant="ghost"
				size="icon"
				className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
				onClick={(e) => {
					e.stopPropagation();
					onDelete();
				}}
			>
				<Trash2 className="h-4 w-4" />
			</Button>
		</div>
	);
}
