import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PriceInput } from "@/components/ui/price-input";
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
import { GeneratedVariant } from "@/types/products";
import { SortableGeneratedVariant } from "./SortableGeneratedVariant";
import { ChevronDown, ChevronUp } from "lucide-react";

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
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkCompareAtPrice, setBulkCompareAtPrice] = useState("");
  const [bulkCost, setBulkCost] = useState("");
  const [showBulkEdit, setShowBulkEdit] = useState(false);

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

  const applyBulkPrice = () => {
    if (bulkPrice) {
      setGeneratedVariants((prev) =>
        prev.map((v) => ({ ...v, price: bulkPrice }))
      );
    }
  };

  const applyBulkCompareAtPrice = () => {
    if (bulkCompareAtPrice) {
      setGeneratedVariants((prev) =>
        prev.map((v) => ({ ...v, compareAtPrice: bulkCompareAtPrice }))
      );
    }
  };

  const applyBulkCost = () => {
    if (bulkCost) {
      setGeneratedVariants((prev) =>
        prev.map((v) => ({ ...v, cost: bulkCost }))
      );
    }
  };

  const applyAllBulkPrices = () => {
    setGeneratedVariants((prev) =>
      prev.map((v) => ({
        ...v,
        ...(bulkPrice && { price: bulkPrice }),
        ...(bulkCompareAtPrice && { compareAtPrice: bulkCompareAtPrice }),
        ...(bulkCost && { cost: bulkCost }),
      }))
    );
  };

  if (generatedVariants.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs font-medium">
        Generisane kombinacije ({generatedVariants.length})
      </Label>

      {/* Bulk Edit Section */}
      <div className="border rounded-md bg-gray-50">
        <button
          type="button"
          onClick={() => setShowBulkEdit(!showBulkEdit)}
          className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <span>Grupna izmjena cijena</span>
          {showBulkEdit ? (
            <ChevronUp className="size-4" />
          ) : (
            <ChevronDown className="size-4" />
          )}
        </button>

        {showBulkEdit && (
          <div className="px-3 pb-3 space-y-3 border-t">
            <p className="text-xs text-gray-500 pt-2">
              Unesite vrijednosti i primijenite na sve varijante
            </p>

            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-gray-500">Prodajna cijena</Label>
                <div className="flex gap-1">
                  <PriceInput
                    type="text"
                    placeholder="0.00"
                    value={bulkPrice}
                    onChange={(value) => setBulkPrice(value)}
                    className="text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyBulkPrice();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={applyBulkPrice}
                    disabled={!bulkPrice}
                    className="shrink-0"
                  >
                    Primijeni
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <Label className="text-xs text-gray-500">Stara cijena</Label>
                <div className="flex gap-1">
                  <PriceInput
                    type="text"
                    placeholder="0.00"
                    value={bulkCompareAtPrice}
                    onChange={(value) => setBulkCompareAtPrice(value)}
                    className="text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyBulkCompareAtPrice();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={applyBulkCompareAtPrice}
                    disabled={!bulkCompareAtPrice}
                    className="shrink-0"
                  >
                    Primijeni
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <Label className="text-xs text-gray-500">Nabavna cijena</Label>
                <div className="flex gap-1">
                  <PriceInput
                    type="text"
                    placeholder="0.00"
                    value={bulkCost}
                    onChange={(value) => setBulkCost(value)}
                    className="text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyBulkCost();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={applyBulkCost}
                    disabled={!bulkCost}
                    className="shrink-0"
                  >
                    Primijeni
                  </Button>
                </div>
              </div>
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={applyAllBulkPrices}
              disabled={!bulkPrice && !bulkCompareAtPrice && !bulkCost}
              className="w-full"
            >
              Primijeni sve unesene cijene
            </Button>
          </div>
        )}
      </div>

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

