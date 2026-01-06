import { Label } from "@/components/ui/label";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { GeneratedVariant } from "@/routes/admin/products/types";
import { SortableGeneratedVariant } from "./SortableGeneratedVariant";

interface GeneratedVariantsSectionProps {
  generatedVariants: GeneratedVariant[];
  setGeneratedVariants: React.Dispatch<
    React.SetStateAction<GeneratedVariant[]>
  >;
  sensors: ReturnType<typeof import("@dnd-kit/core").useSensors>;
}

export function GeneratedVariantsSection({
  generatedVariants,
  setGeneratedVariants,
  sensors,
}: GeneratedVariantsSectionProps) {
  const handleGeneratedVariantDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setGeneratedVariants((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  if (generatedVariants.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs font-medium">
        Generisane kombinacije ({generatedVariants.length})
      </Label>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleGeneratedVariantDragEnd}
      >
        <SortableContext
          items={generatedVariants.map((gv) => gv.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="border rounded-md divide-y">
            {generatedVariants.map((gv, index) => (
              <SortableGeneratedVariant
                key={gv.id}
                gv={gv}
                index={index}
                setGeneratedVariants={setGeneratedVariants}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

