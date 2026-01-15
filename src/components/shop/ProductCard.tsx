"use client";

import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ShoppingCart, Plus, Minus, Loader2, X } from "lucide-react";
import { WishlistButton } from "@/components/shop/WishlistButton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ProxyImage } from "@/components/ui/proxy-image";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addToCartMutationOptions, CART_QUERY_KEY } from "@/queries/cart";
import { useCartSession } from "@/hooks/useCartSession";
import {
  Drawer,
  DrawerContent,
} from "@/components/ui/drawer";
import { toast } from "sonner";
import { useFlyToCartSafe } from "./FlyToCartProvider";

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
  /** When true, text colors inherit from parent (useful for custom color schemes) */
  inheritColors?: boolean;
}

export function ProductCard({
  id,
  name,
  price,
  compareAtPrice,
  image,
  slug,
  variants,
  inheritColors = false,
}: ProductCardProps) {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [isFlipped, setIsFlipped] = React.useState(false);
  const [selectedOptions, setSelectedOptions] = React.useState<Record<string, string>>({});
  const [quantity, setQuantity] = React.useState(1);
  const { sessionId } = useCartSession();
  const queryClient = useQueryClient();
  const imageRef = React.useRef<HTMLDivElement>(null);
  const flyToCart = useFlyToCartSafe();

  const handleFlyAnimation = React.useCallback(() => {
    if (flyToCart?.triggerFly && imageRef.current && image) {
      flyToCart.triggerFly(image, imageRef.current);
    }
  }, [flyToCart, image]);

  const addToCartMutation = useMutation({
    ...addToCartMutationOptions(sessionId || undefined),
    onSuccess: () => {
      handleFlyAnimation();
      queryClient.invalidateQueries({ queryKey: [CART_QUERY_KEY] });
      setDrawerOpen(false);
      setIsFlipped(false);
      setQuantity(1);
      setSelectedOptions({});
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

  // Extract unique option groups from in-stock variants
  const optionGroups = React.useMemo(() => {
    if (inStockVariants.length === 0) return [];

    const groups: Record<string, Set<string>> = {};

    inStockVariants.forEach((variant) => {
      variant.options.forEach((opt) => {
        if (!groups[opt.optionName]) {
          groups[opt.optionName] = new Set();
        }
        groups[opt.optionName].add(opt.optionValue);
      });
    });

    return Object.entries(groups).map(([name, values]) => ({
      name,
      values: Array.from(values),
    }));
  }, [inStockVariants]);

  // Find matching variant based on selected options
  const selectedVariant = React.useMemo(() => {
    if (optionGroups.length === 0) return null;
    if (Object.keys(selectedOptions).length !== optionGroups.length) return null;

    return inStockVariants.find((variant) => {
      return variant.options.every(
        (opt) => selectedOptions[opt.optionName] === opt.optionValue
      );
    });
  }, [selectedOptions, inStockVariants, optionGroups.length]);

  // Get available values for each option based on current selections
  const getAvailableValues = React.useCallback((optionName: string) => {
    const otherSelections = { ...selectedOptions };
    delete otherSelections[optionName];

    const availableValues = new Set<string>();

    inStockVariants.forEach((variant) => {
      const matchesOtherSelections = Object.entries(otherSelections).every(
        ([name, value]) => {
          const variantOpt = variant.options.find((o) => o.optionName === name);
          return variantOpt?.optionValue === value;
        }
      );

      if (matchesOtherSelections) {
        const opt = variant.options.find((o) => o.optionName === optionName);
        if (opt) availableValues.add(opt.optionValue);
      }
    });

    return availableValues;
  }, [selectedOptions, inStockVariants]);

  // Get max quantity for selected variant
  const maxQuantity = selectedVariant?.inventory?.available ?? 10;

  // Check if we're on mobile
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  // Initialize selected options with first available values
  const initializeOptions = React.useCallback(() => {
    if (optionGroups.length === 0) return;

    const initial: Record<string, string> = {};
    optionGroups.forEach((group) => {
      if (group.values.length > 0) {
        initial[group.name] = group.values[0];
      }
    });
    setSelectedOptions(initial);
  }, [optionGroups]);

  // Handle add to cart button click
  const handleAddToCartClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isInStock) return;

    // If only one in-stock variant, add directly
    if (inStockVariants.length === 1) {
      addToCartMutation.mutate({
        productId: id,
        variantId: inStockVariants[0].id,
        quantity: 1,
      });
      return;
    }

    // If multiple variants
    if (inStockVariants.length > 1) {
      initializeOptions();
      // On mobile, open drawer; on desktop, flip the card
      if (isMobile) {
        setDrawerOpen(true);
      } else {
        setIsFlipped(true);
      }
      return;
    }

    toast.error("Nema dostupnih varijanti");
  };

  // Handle option selection
  const handleOptionSelect = (optionName: string, value: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [optionName]: value,
    }));
    setQuantity(1);
  };

  // Handle add to cart from flipped card or drawer
  const handleAddToCart = () => {
    if (!selectedVariant) {
      toast.error("Odaberite sve opcije");
      return;
    }

    addToCartMutation.mutate({
      productId: id,
      variantId: selectedVariant.id,
      quantity,
    });
  };

  // Handle close flipped card
  const handleCloseFlipped = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFlipped(false);
    setQuantity(1);
    setSelectedOptions({});
  };

  return (
    <>
      {/* Card Container with 3D perspective */}
      <div
        className="group relative"
        style={{ perspective: "1000px" }}
      >
        {/* Flip Container */}
        <div
          className={cn(
            "relative w-full transition-transform duration-500",
            isFlipped && "md:[transform:rotateY(180deg)]"
          )}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Front Side */}
          <div
            className={cn(
              "w-full",
              isFlipped && "md:invisible"
            )}
            style={{ backfaceVisibility: "hidden" }}
          >
            <Link to={`/product/${slug}`} className="block">
              {/* Product Image - 4:5 aspect ratio */}
              <div ref={imageRef} className="relative aspect-[4/5] rounded-2xl bg-muted overflow-hidden mb-3">
                {image ? (
                  <ProxyImage
                    src={image}
                    alt={name}
                    width={400}
                    height={500}
                    resizingType="fill"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <ShoppingCart className="size-12" />
                  </div>
                )}

                {/* Discount Badge */}
                {hasDiscount && (
                  <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-[10px] font-medium px-2 py-1 rounded-full">
                    -{Math.round(((comparePriceNum! - priceNum) / comparePriceNum!) * 100)}%
                  </div>
                )}

                {/* Wishlist Button */}
                <WishlistButton
                  productId={id}
                  className="absolute top-3 right-3 z-10"
                  size="sm"
                />

                {/* Out of Stock Overlay */}
                {!isInStock && (
                  <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center">
                    <span className="text-xs font-medium text-muted-foreground bg-background/90 px-3 py-1.5 rounded-full">
                      Rasprodano
                    </span>
                  </div>
                )}

                {/* Add to Cart Button */}
                {isInStock && (
                  <button
                    onClick={handleAddToCartClick}
                    disabled={addToCartMutation.isPending}
                    className={cn(
                      "absolute bottom-3 right-3 size-10 rounded-full bg-background text-foreground shadow-md",
                      "flex items-center justify-center",
                      "transition-all duration-200",
                      "hover:bg-muted hover:scale-105 active:scale-95",
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
              <div className="px-1">
                <h3
                  className={cn(
                    "text-sm line-clamp-2 mb-1.5 leading-snug",
                    inheritColors ? "opacity-80" : "text-foreground/80"
                  )}
                  style={inheritColors ? { color: "inherit" } : undefined}
                >
                  {name}
                </h3>
                <div className="flex items-baseline gap-2">
                  <span
                    className="text-sm font-semibold"
                    style={inheritColors ? { color: "inherit" } : undefined}
                  >
                    {priceNum.toFixed(2)} KM
                  </span>
                  {hasDiscount && (
                    <span
                      className={cn(
                        "text-xs line-through",
                        inheritColors ? "opacity-60" : "text-muted-foreground"
                      )}
                      style={inheritColors ? { color: "inherit" } : undefined}
                    >
                      {comparePriceNum!.toFixed(2)} KM
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </div>

          {/* Back Side (Desktop Only) */}
          <div
            className={cn(
              "hidden md:flex absolute inset-0 w-full h-full flex-col bg-card rounded-2xl p-4 shadow-xl border border-border",
              !isFlipped && "md:invisible"
            )}
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            {/* Close Button */}
            <button
              onClick={handleCloseFlipped}
              className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted transition-colors z-10"
            >
              <X className="size-4 text-muted-foreground" />
            </button>

            {/* Product Info Header */}
            <div className="flex gap-3 mb-4">
              {image && (
                <ProxyImage
                  src={image}
                  alt={name}
                  width={56}
                  height={56}
                  resizingType="fill"
                  className="size-14 object-cover rounded-xl flex-shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <h4 className="text-sm text-foreground/80 line-clamp-2 mb-1">
                  {name}
                </h4>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {selectedVariant?.price
                      ? parseFloat(selectedVariant.price).toFixed(2)
                      : priceNum.toFixed(2)} KM
                  </span>
                  {(selectedVariant?.compareAtPrice || hasDiscount) && (
                    <span className="text-xs text-muted-foreground line-through">
                      {selectedVariant?.compareAtPrice
                        ? parseFloat(selectedVariant.compareAtPrice).toFixed(2)
                        : comparePriceNum?.toFixed(2)} KM
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Option Groups Selection */}
            <div className="flex-1 overflow-y-auto space-y-3">
              {optionGroups.map((group) => {
                const availableValues = getAvailableValues(group.name);
                return (
                  <div key={group.name}>
                    <p className="text-xs text-muted-foreground mb-2">{group.name}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.values.map((value) => {
                        const isAvailable = availableValues.has(value);
                        const isSelected = selectedOptions[group.name] === value;
                        return (
                          <button
                            key={value}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (isAvailable) {
                                handleOptionSelect(group.name, value);
                              }
                            }}
                            disabled={!isAvailable}
                            className={cn(
                              "px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all",
                              isSelected
                                ? "bg-primary text-primary-foreground"
                                : isAvailable
                                  ? "bg-muted text-muted-foreground hover:bg-accent"
                                  : "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
                            )}
                          >
                            {value}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Quantity Selector */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Količina</p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setQuantity(Math.max(1, quantity - 1));
                    }}
                    disabled={quantity <= 1}
                    className="size-8 rounded-lg bg-muted flex items-center justify-center hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus className="size-3" />
                  </button>
                  <span className="text-sm font-medium w-8 text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setQuantity(Math.min(maxQuantity, quantity + 1));
                    }}
                    disabled={quantity >= maxQuantity}
                    className="size-8 rounded-lg bg-muted flex items-center justify-center hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="size-3" />
                  </button>
                </div>
              </div>
            </div>

            {/* Add to Cart Button */}
            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleAddToCart();
              }}
              disabled={!selectedVariant || addToCartMutation.isPending}
              className="w-full h-10 text-sm rounded-xl"
            >
              {addToCartMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Dodaj u korpu"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Variant Selection Drawer (Mobile Only) */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="max-h-[85vh]">
          <div className="px-4 pb-6 pt-4">
            {/* Product Image and Info */}
            <div className="flex gap-4 mb-6">
              {image && (
                <ProxyImage
                  src={image}
                  alt={name}
                  width={100}
                  height={100}
                  resizingType="fill"
                  className="size-24 object-cover rounded-2xl flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-medium text-foreground line-clamp-2 mb-2">
                  {name}
                </h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-semibold text-foreground">
                    {selectedVariant?.price
                      ? parseFloat(selectedVariant.price).toFixed(2)
                      : priceNum.toFixed(2)} KM
                  </span>
                  {(selectedVariant?.compareAtPrice || hasDiscount) && (
                    <span className="text-sm text-muted-foreground line-through">
                      {selectedVariant?.compareAtPrice
                        ? parseFloat(selectedVariant.compareAtPrice).toFixed(2)
                        : comparePriceNum?.toFixed(2)} KM
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Option Groups */}
            {optionGroups.map((group) => {
              const availableValues = getAvailableValues(group.name);
              return (
                <div key={group.name} className="mb-6">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
                    {group.name}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.values.map((value) => {
                      const isAvailable = availableValues.has(value);
                      const isSelected = selectedOptions[group.name] === value;
                      return (
                        <button
                          key={value}
                          onClick={() => {
                            if (isAvailable) {
                              handleOptionSelect(group.name, value);
                            }
                          }}
                          disabled={!isAvailable}
                          className={cn(
                            "px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                            isSelected
                              ? "bg-primary text-primary-foreground"
                              : isAvailable
                                ? "bg-muted text-foreground/80 hover:bg-accent"
                                : "bg-muted/50 text-muted-foreground/50 cursor-not-allowed"
                          )}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Quantity Selector */}
            <div className="mb-6">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
                Količina
              </p>
              <div className="flex items-center gap-4">
                <div className="flex items-center bg-muted rounded-xl">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="size-11 flex items-center justify-center hover:bg-accent rounded-l-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="text-base font-medium w-12 text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                    disabled={quantity >= maxQuantity}
                    className="size-11 flex items-center justify-center hover:bg-accent rounded-r-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
                {selectedVariant && (
                  <span className="text-sm text-muted-foreground">
                    {selectedVariant.inventory?.available ?? 0} dostupno
                  </span>
                )}
              </div>
            </div>

            {/* Add to Cart Button */}
            <Button
              onClick={handleAddToCart}
              disabled={!selectedVariant || addToCartMutation.isPending}
              className="w-full h-12 rounded-xl text-base"
            >
              {addToCartMutation.isPending ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                "Dodaj u korpu"
              )}
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
