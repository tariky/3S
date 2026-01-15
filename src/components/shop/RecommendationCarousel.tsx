"use client";

import * as React from "react";
import { ProductCard } from "./ProductCard";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { trackRecommendationClickServerFn } from "@/queries/gorse";
import { useCartSession } from "@/hooks/useCartSession";

interface ProductVariant {
  id: string;
  price?: string | null;
  compareAtPrice?: string | null;
  options: { optionName: string; optionValue: string }[];
  inventory?: {
    available: number;
  } | null;
}

interface RecommendedProduct {
  id: string;
  name: string;
  slug: string;
  price: string;
  compareAtPrice?: string | null;
  primaryImage?: string | null;
  variants: ProductVariant[];
}

interface RecommendationCarouselProps {
  title: string;
  products: RecommendedProduct[];
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function RecommendationCarousel({
  title,
  products,
  loading = false,
  emptyMessage = "Nema preporuka",
  className,
}: RecommendationCarouselProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);
  const { sessionId } = useCartSession();

  // Check scroll position
  const updateScrollButtons = React.useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;

    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 1
    );
  }, []);

  React.useEffect(() => {
    updateScrollButtons();
    const container = scrollRef.current;
    if (container) {
      container.addEventListener("scroll", updateScrollButtons);
      window.addEventListener("resize", updateScrollButtons);
      return () => {
        container.removeEventListener("scroll", updateScrollButtons);
        window.removeEventListener("resize", updateScrollButtons);
      };
    }
  }, [updateScrollButtons, products]);

  const scroll = (direction: "left" | "right") => {
    const container = scrollRef.current;
    if (!container) return;

    const scrollAmount = container.clientWidth * 0.8;
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  // Track recommendation click
  const handleProductClick = (productId: string) => {
    if (sessionId) {
      trackRecommendationClickServerFn({
        data: { itemId: productId, userId: sessionId },
      });
    }
  };

  // Don't render if loading or no products
  if (loading) {
    return (
      <div className={cn("py-8", className)}>
        <h2 className="text-xl font-semibold text-foreground mb-6">{title}</h2>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return null; // Don't show empty section
  }

  return (
    <div className={cn("py-8", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>

        {/* Desktop scroll buttons */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => scroll("left")}
            disabled={!canScrollLeft}
            className={cn(
              "p-2 rounded-full border border-border transition-colors",
              canScrollLeft
                ? "hover:bg-muted text-foreground"
                : "text-muted-foreground/50 cursor-not-allowed"
            )}
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            onClick={() => scroll("right")}
            disabled={!canScrollRight}
            className={cn(
              "p-2 rounded-full border border-border transition-colors",
              canScrollRight
                ? "hover:bg-muted text-foreground"
                : "text-muted-foreground/50 cursor-not-allowed"
            )}
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      {/* Products grid with horizontal scroll */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x snap-mandatory"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="flex-shrink-0 w-[160px] sm:w-[200px] md:w-[220px] lg:w-[240px] snap-start"
            onClick={() => handleProductClick(product.id)}
          >
            <ProductCard
              id={product.id}
              name={product.name}
              slug={product.slug}
              price={product.price}
              compareAtPrice={product.compareAtPrice}
              image={product.primaryImage}
              variants={product.variants}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
