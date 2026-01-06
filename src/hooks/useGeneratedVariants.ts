import { useEffect, useState, useRef } from "react";
import { nanoid } from "nanoid";
import { Variant, GeneratedVariant } from "@/types/products";
import { cartesianProduct } from "@/lib/utils";

interface UseGeneratedVariantsOptions {
  productPrice?: string;
  productCost?: string;
}

export function useGeneratedVariants(
  variants: Variant[],
  options?: UseGeneratedVariantsOptions
) {
  const [generatedVariants, setGeneratedVariants] = useState<
    GeneratedVariant[]
  >([]);
  const previousCombinationKeyRef = useRef<string>("");
  const { productPrice = "", productCost = "" } = options || {};

  // Generate all possible variant combinations using cartesian product
  useEffect(() => {
    const validVariants = variants.filter(
      (v) => v.name && v.options.length > 0
    );
    
    if (validVariants.length === 0) {
      setGeneratedVariants([]);
      previousCombinationKeyRef.current = "";
      return;
    }

    const optionArrays = validVariants.map((v) =>
      v.options.map((o: { id: string; name: string }) => ({
        variantName: v.name,
        optionName: o.name,
        optionId: o.id,
      }))
    );

    const combinations = cartesianProduct(optionArrays);

    // Create a key for the entire variant structure to detect changes
    const currentCombinationKey = validVariants
      .map((v) => `${v.id}:${v.options.map((o: { id: string }) => o.id).join(",")}`)
      .join("|");

    // Only regenerate if the variant structure actually changed
    if (currentCombinationKey === previousCombinationKeyRef.current) {
      return;
    }

    previousCombinationKeyRef.current = currentCombinationKey;

    // Create a key for each combination based on option IDs
    const getCombinationKey = (combo: (typeof combinations)[0]) =>
      combo.map((c: { optionId: string }) => c.optionId).join("-");

    // Map existing data to preserve user input
    setGeneratedVariants((prevGeneratedVariants) => {
      const existingByKey = new Map(
        prevGeneratedVariants.map((gv) => [getCombinationKey(gv.combination), gv])
      );

      const newGeneratedVariants = combinations.map((combination) => {
        const key = getCombinationKey(combination);
        const existing = existingByKey.get(key);

        if (existing) {
          // Update combination data but preserve user inputs
          return {
            ...existing,
            combination,
          };
        }

        // Use product prices as default values for new variants
        return {
          id: nanoid(),
          combination,
          sku: "",
          quantity: "",
          price: productPrice || "",
          cost: productCost || "",
        };
      });

      return newGeneratedVariants;
    });
  }, [variants, productPrice, productCost]);

  return [generatedVariants, setGeneratedVariants] as const;
}
