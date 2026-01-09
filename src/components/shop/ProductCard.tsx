"use client";

import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ShoppingCart, Plus, Minus, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addToCartMutationOptions, CART_QUERY_KEY } from "@/queries/cart";
import { useCartSession } from "@/hooks/useCartSession";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { toast } from "sonner";

interface ProductVariant {
  id: string;
  price?: string | null;
  compareAtPrice?: string | null;
  options: { optionName: string; optionValue: string }[];
  inventory?: {
    available: number;
  } | null;
}

interface ProductCardProps {
  id: string;
  name: string;
  price: string;
  compareAtPrice?: string | null;
  image?: string | null;
  slug: string;
  variants?: ProductVariant[];
}

export function ProductCard({
  id,
  name,
  price,
  compareAtPrice,
  image,
  slug,
  variants,
}: ProductCardProps) {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [selectedVariantId, setSelectedVariantId] = React.useState<string | null>(null);
  const [quantity, setQuantity] = React.useState(1);
  const { sessionId } = useCartSession();
  const queryClient = useQueryClient();

  const addToCartMutation = useMutation({
    ...addToCartMutationOptions(sessionId || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CART_QUERY_KEY] });
      toast.success("Dodano u korpu");
      setDrawerOpen(false);
      setQuantity(1);
      setSelectedVariantId(null);
    },
    onError: () => {
      toast.error("Greška pri dodavanju u korpu");
    },
  });

  const priceNum = parseFloat(price || "0");
  const comparePriceNum = compareAtPrice ? parseFloat(compareAtPrice) : null;
  const hasDiscount = comparePriceNum && comparePriceNum > priceNum;

  // Get in-stock variants
  const inStockVariants = React.useMemo(() => {
    if (!variants || variants.length === 0) return [];
    return variants.filter((v) => (v.inventory?.available ?? 0) > 0);
  }, [variants]);

  // Check if product has any available variants
  const isInStock = inStockVariants.length > 0 || (!variants || variants.length === 0);

  // Get selected variant details
  const selectedVariant = React.useMemo(() => {
    if (!selectedVariantId || !variants) return null;
    return variants.find((v) => v.id === selectedVariantId);
  }, [selectedVariantId, variants]);

  // Get max quantity for selected variant
  const maxQuantity = selectedVariant?.inventory?.available ?? 10;

  // Handle add to cart button click
  const handleAddToCartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isInStock) return;

    // If only one in-stock variant, add directly
    if (inStockVariants.length === 1) {
      addToCartMutation.mutate({
        variantId: inStockVariants[0].id,
        quantity: 1,
      });
      return;
    }

    // If multiple variants, open drawer to select
    if (inStockVariants.length > 1) {
      setSelectedVariantId(inStockVariants[0].id);
      setDrawerOpen(true);
      return;
    }

    // No variants case - this shouldn't happen but handle gracefully
    toast.error("Nema dostupnih varijanti");
  };

  // Handle add to cart from drawer
  const handleAddToCartFromDrawer = () => {
    if (!selectedVariantId) {
      toast.error("Odaberite varijantu");
      return;
    }

    addToCartMutation.mutate({
      variantId: selectedVariantId,
      quantity,
    });
  };

  // Format variant options for display
  const formatVariantOptions = (variant: ProductVariant) => {
    return variant.options.map((o) => o.optionValue).join(" / ");
  };

  return (
    <>
      <div className="group relative bg-white rounded-lg overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow">
        <Link to={`/product/${slug}`} className="block">
          {/* Product Image */}
          <div className="relative aspect-square bg-gray-100 overflow-hidden">
            {image ? (
              <img
                src={image}
                alt={name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <span>Nema slike</span>
              </div>
            )}

            {/* Discount Badge */}
            {hasDiscount && (
              <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded">
                -
                {Math.round(
                  ((comparePriceNum! - priceNum) / comparePriceNum!) * 100
                )}
                %
              </div>
            )}

            {/* Stock Status Badge */}
            {!isInStock && (
              <div className="absolute top-2 right-2 bg-gray-900/70 text-white text-xs font-semibold px-2 py-1 rounded">
                Nema na zalihi
              </div>
            )}

            {/* Add to Cart Button */}
            {isInStock && (
              <button
                onClick={handleAddToCartClick}
                disabled={addToCartMutation.isPending}
                className={cn(
                  "absolute bottom-3 right-3 size-10 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-all duration-200",
                  "hover:bg-primary/90 hover:scale-110 active:scale-95",
                  addToCartMutation.isPending && "opacity-50 cursor-not-allowed"
                )}
              >
                {addToCartMutation.isPending ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <ShoppingCart className="size-5" />
                )}
              </button>
            )}
          </div>

          {/* Product Info */}
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
              {name}
            </h3>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg font-bold text-gray-900">
                {priceNum.toFixed(2)} KM
              </span>
              {hasDiscount && (
                <span className="text-sm text-gray-500 line-through">
                  {comparePriceNum!.toFixed(2)} KM
                </span>
              )}
            </div>
            {/* Stock Status */}
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  "size-2 rounded-full",
                  isInStock ? "bg-green-500" : "bg-gray-400"
                )}
              />
              <span
                className={cn(
                  "text-xs",
                  isInStock ? "text-gray-600" : "text-gray-400"
                )}
              >
                {isInStock ? "Na zalihi" : "Nema na zalihi"}
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* Variant Selection Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>{name}</DrawerTitle>
          </DrawerHeader>

          <div className="px-4 pb-4">
            {/* Product Image and Price */}
            <div className="flex gap-4 mb-4">
              {image && (
                <img
                  src={image}
                  alt={name}
                  className="size-20 object-cover rounded-lg"
                />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold">
                    {selectedVariant?.price
                      ? parseFloat(selectedVariant.price).toFixed(2)
                      : priceNum.toFixed(2)}{" "}
                    KM
                  </span>
                  {(selectedVariant?.compareAtPrice || hasDiscount) && (
                    <span className="text-sm text-gray-500 line-through">
                      {selectedVariant?.compareAtPrice
                        ? parseFloat(selectedVariant.compareAtPrice).toFixed(2)
                        : comparePriceNum?.toFixed(2)}{" "}
                      KM
                    </span>
                  )}
                </div>
                {selectedVariant && (
                  <p className="text-sm text-gray-500 mt-1">
                    {selectedVariant.inventory?.available ?? 0} na zalihi
                  </p>
                )}
              </div>
            </div>

            {/* Variant Options */}
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Odaberi varijantu
              </p>
              <div className="flex flex-wrap gap-2">
                {inStockVariants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => {
                      setSelectedVariantId(variant.id);
                      setQuantity(1);
                    }}
                    className={cn(
                      "px-3 py-2 rounded-lg border text-sm font-medium transition-colors",
                      selectedVariantId === variant.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    )}
                  >
                    {formatVariantOptions(variant)}
                    {selectedVariantId === variant.id && (
                      <Check className="inline-block ml-1.5 size-4" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity Selector */}
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Količina</p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  className="size-10 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Minus className="size-4" />
                </button>
                <span className="text-lg font-semibold w-8 text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                  disabled={quantity >= maxQuantity}
                  className="size-10 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
          </div>

          <DrawerFooter>
            <Button
              onClick={handleAddToCartFromDrawer}
              disabled={!selectedVariantId || addToCartMutation.isPending}
              className="w-full h-12"
            >
              {addToCartMutation.isPending ? (
                <>
                  <Loader2 className="size-5 mr-2 animate-spin" />
                  Dodavanje...
                </>
              ) : (
                <>
                  <ShoppingCart className="size-5 mr-2" />
                  Dodaj u korpu
                </>
              )}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" className="w-full">
                Otkaži
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
