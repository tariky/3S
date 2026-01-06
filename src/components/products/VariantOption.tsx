import { Dispatch, SetStateAction, useState } from "react";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Variant } from "@/types/products";
import { nanoid } from "nanoid";
import { X } from "lucide-react";

export const VariantOption = ({
  variant,
  variants,
  setVariants,
}: {
  variant: Variant;
  variants: Variant[];
  setVariants: Dispatch<SetStateAction<Variant[]>>;
}) => {
  const [optionInput, setOptionInput] = useState<string>("");
  
  const handleAddOption = () => {
    if (!optionInput.trim()) {
      return;
    }
    
    setVariants((prevVariants) =>
      prevVariants.map((v) =>
        v.id === variant.id
          ? {
              ...v,
              options: [
                ...v.options,
                {
                  position: v.options.length + 1,
                  id: nanoid(),
                  name: optionInput.trim(),
                },
              ],
            }
          : v
      )
    );
    setOptionInput("");
  };
  
  return (
    <>
      <Label className="text-xs font-medium">Opcije</Label>
      <Input
        type="text"
        placeholder="Opcije"
        className="text-sm"
        value={optionInput}
        onChange={(e) => setOptionInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            handleAddOption();
          }
        }}
      />
      <div className="flex gap-2 items-center">
        {variant.options.map((o, k) => {
          return (
            <div
              key={k}
              className="text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-600 flex gap-2"
            >
              <span>
                {o.position}. {o.name}
              </span>
              <X
                className="size-4 cursor-pointer text-destructive"
                onClick={() => {
                  const newVariants = variants.map((v) => {
                    if (v.id === variant.id) {
                      const newOptions = v.options.filter(
                        (op) => op.id !== o.id
                      );
                      return {
                        ...v,
                        options: newOptions,
                      };
                    } else {
                      return v;
                    }
                  });
                  setVariants(newVariants);
                }}
              />
            </div>
          );
        })}
      </div>
    </>
  );
};
