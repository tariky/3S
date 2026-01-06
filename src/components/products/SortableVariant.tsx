import { GripVertical, X } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { VariantOption } from "./VariantOption";
import { Variant } from "@/types/products";

interface SortableVariantProps {
  variant: Variant;
  variants: Variant[];
  setVariants: React.Dispatch<React.SetStateAction<Variant[]>>;
  index: number;
}

export function SortableVariant({
  variant,
  variants,
  setVariants,
  index,
}: SortableVariantProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: variant.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleRemove = () => {
    setVariants((prev) => {
      const filtered = prev.filter((v) => v.id !== variant.id);
      // Update positions after removal
      return filtered.map((v, idx) => ({
        ...v,
        position: idx + 1,
      }));
    });
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex flex-col gap-2 p-2 shadow-sm rounded-md border"
    >
      <div className="flex items-center gap-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        >
          <GripVertical className="size-4" />
        </div>
        <Label className="text-xs font-medium flex-1">
          Naziv varijacije [{variant.position}]
        </Label>
        <Button
          variant="ghost"
          size="icon"
          className="size-6 h-6 w-6 text-destructive hover:text-destructive"
          onClick={handleRemove}
          type="button"
        >
          <X className="size-4" />
        </Button>
      </div>
      <Input
        type="text"
        className="text-sm"
        placeholder="Naziv varijacije"
        value={variant.name}
        onChange={(e) =>
          setVariants(
            variants.map((v) =>
              v.id === variant.id ? { ...v, name: e.target.value } : v
            )
          )
        }
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      />
      <div className="flex flex-col gap-2">
        <VariantOption
          variant={variant}
          variants={variants}
          setVariants={setVariants}
        />
      </div>
    </div>
  );
}
