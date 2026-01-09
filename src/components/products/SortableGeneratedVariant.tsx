import { GripVertical, X, Pencil } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PriceInput } from "@/components/ui/price-input";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { GeneratedVariant } from "@/types/products";

interface SortableGeneratedVariantProps {
  gv: GeneratedVariant;
  index: number;
  setGeneratedVariants: React.Dispatch<
    React.SetStateAction<GeneratedVariant[]>
  >;
}

export function SortableGeneratedVariant({
  gv,
  index,
  setGeneratedVariants,
}: SortableGeneratedVariantProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: gv.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex flex-col gap-3 p-3">
      <div className="flex items-center gap-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        >
          <GripVertical className="size-4" />
        </div>
        <span className="text-gray-400 text-xs w-6">{index + 1}.</span>
        {gv.combination.map((item) => (
          <span
            key={item.optionId}
            className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs"
          >
            {item.variantName}: {item.optionName}
          </span>
        ))}
        <div className="flex items-center gap-2 ml-auto">
          <Link
            to="/admin/products/variants/$variantId"
            params={{ variantId: gv.id }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="inline-flex items-center justify-center size-6 h-6 w-6 rounded-md hover:bg-accent hover:text-accent-foreground"
            title={`Edit variant ${gv.id}`}
          >
            <Pencil className="size-4" />
          </Link>
          <X
            className="size-4 cursor-pointer text-destructive"
            onClick={() =>
              setGeneratedVariants((prev) => prev.filter((v) => v.id !== gv.id))
            }
          />
        </div>
      </div>
      <div className="grid grid-cols-5 gap-2">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-gray-500">SKU</Label>
          <Input
            type="text"
            placeholder="SKU"
            value={gv.sku}
            onChange={(e) =>
              setGeneratedVariants((prev) =>
                prev.map((v) =>
                  v.id === gv.id ? { ...v, sku: e.target.value } : v
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
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-gray-500">Količina</Label>
          <Input
            type="text"
            placeholder="0"
            value={gv.quantity}
            onChange={(e) =>
              setGeneratedVariants((prev) =>
                prev.map((v) =>
                  v.id === gv.id ? { ...v, quantity: e.target.value } : v
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
          {gv.reserved !== undefined && gv.reserved > 0 && (
            <span className="text-xs text-gray-400">
              Rezervisano: {gv.reserved}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-gray-500">Cijena</Label>
          <PriceInput
            type="text"
            placeholder="0.00"
            value={gv.price}
            onChange={(value) =>
              setGeneratedVariants((prev) =>
                prev.map((v) => (v.id === gv.id ? { ...v, price: value } : v))
              )
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-gray-500">Stara cijena</Label>
          <PriceInput
            type="text"
            placeholder="0.00"
            value={gv.compareAtPrice || ""}
            onChange={(value) =>
              setGeneratedVariants((prev) =>
                prev.map((v) => (v.id === gv.id ? { ...v, compareAtPrice: value } : v))
              )
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-gray-500">Nabavna</Label>
          <PriceInput
            type="text"
            placeholder="0.00"
            value={gv.cost}
            onChange={(value) =>
              setGeneratedVariants((prev) =>
                prev.map((v) => (v.id === gv.id ? { ...v, cost: value } : v))
              )
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

