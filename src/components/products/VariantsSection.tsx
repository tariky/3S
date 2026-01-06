import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Variant } from "@/types/products";
import { SortableVariant } from "./SortableVariant";
import { nanoid } from "nanoid";

interface VariantsSectionProps {
  variants: Variant[];
  setVariants: React.Dispatch<React.SetStateAction<Variant[]>>;
  sensors: ReturnType<typeof import("@dnd-kit/core").useSensors>;
}

export function VariantsSection({
  variants,
  setVariants,
  sensors,
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

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs font-medium">Variacije</Label>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleVariantDragEnd}
      >
        <SortableContext
          items={variants.map((v) => v.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
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
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
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
        Dodaj varijaciju
      </Button>
    </div>
  );
}
