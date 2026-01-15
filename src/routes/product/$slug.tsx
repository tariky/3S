import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ShopLayout } from "@/components/shop/ShopLayout";
import { getPublicShopSettingsServerFn } from "@/queries/settings";
import { getPublicNavigationServerFn } from "@/queries/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getShopProductBySlugQueryOptions,
  getShopProductBySlugServerFn,
  type ShopProduct,
} from "@/queries/shop-products";
import { addToCartMutationOptions, CART_QUERY_KEY } from "@/queries/cart";
import { useState, useMemo, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartSession } from "@/hooks/useCartSession";
import { ProductImageCarousel } from "@/components/shop/ProductImageCarousel";
import { ProductInfoAccordion } from "@/components/shop/ProductInfoAccordion";
import { QuantityPicker } from "@/components/shop/QuantityPicker";
import { MobileStickyCart } from "@/components/shop/MobileStickyCart";
import { RecommendationCarousel } from "@/components/shop/RecommendationCarousel";
import { WishlistButton } from "@/components/shop/WishlistButton";
import { AddToCartWithAnimation } from "@/components/shop/AddToCartWithAnimation";
import {
  trackProductViewServerFn,
  getSimilarItemsServerFn,
  getPopularItemsServerFn,
} from "@/queries/gorse";

export const Route = createFileRoute("/product/$slug")({
  component: ProductDetailPage,
  loader: async ({ params }) => {
    const [settings, navigationItems, product] = await Promise.all([
      getPublicShopSettingsServerFn(),
      getPublicNavigationServerFn(),
      getShopProductBySlugServerFn({ data: { slug: params.slug } }).catch(
        () => null
      ),
    ]);

    // Return null product instead of throwing notFound() to avoid SSR bug
    // https://github.com/TanStack/router/issues/5960
    return { settings, navigationItems, product };
  },
  head: ({ loaderData }) => {
    const product = loaderData?.product as ShopProduct | undefined;
    const shopTitle =
      (loaderData?.settings as { shopTitle?: string } | undefined)?.shopTitle ||
      "Shop";

    if (!product) {
      return {
        meta: [{ title: `Proizvod nije pronađen | ${shopTitle}` }],
      };
    }

    const title = `${product.name} | ${shopTitle}`;
    const description =
      product.description?.slice(0, 160) ||
      `Kupite ${product.name} po najboljoj cijeni.`;
    const image = product.media?.[0]?.media?.url;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        // Open Graph
        { property: "og:title", content: product.name },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        ...(image ? [{ property: "og:image", content: image }] : []),
        // Twitter
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: product.name },
        { name: "twitter:description", content: description },
        ...(image ? [{ name: "twitter:image", content: image }] : []),
      ],
    };
  },
  notFoundComponent: () => {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">404</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-3">
            Proizvod nije pronađen
          </h1>
          <p className="text-gray-600 mb-8">
            Proizvod koji tražite ne postoji, premješten je ili je uklonjen.
          </p>
          <Button asChild>
            <Link to="/">
              <Home className="size-4 mr-2" />
              Nazad na početnu
            </Link>
          </Button>
        </div>
      </div>
    );
  },
});

function ProductDetailPage() {
  const { slug } = Route.useParams();
  const {
    settings,
    navigationItems,
    product: initialProduct,
  } = Route.useLoaderData();
  const { sessionId } = useCartSession();
  const queryClient = useQueryClient();

  // Use SSR data as initial data, allow client-side refetches
  const { data: product } = useQuery({
    ...getShopProductBySlugQueryOptions(slug),
    initialData: initialProduct as ShopProduct | null,
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!initialProduct, // Don't fetch if product doesn't exist
  });

  // Handle product not found - render 404 UI instead of throwing
  // This is a workaround for TanStack Start SSR bug #5960
  if (!initialProduct) {
    return (
      <ShopLayout settings={settings} navigationItems={navigationItems}>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">404</span>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 mb-3">
              Proizvod nije pronađen
            </h1>
            <p className="text-gray-600 mb-8">
              Proizvod koji tražite ne postoji, premješten je ili je uklonjen.
            </p>
            <Button asChild>
              <Link to="/">
                <Home className="size-4 mr-2" />
                Nazad na početnu
              </Link>
            </Button>
          </div>
        </div>
      </ShopLayout>
    );
  }

  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >({});
  const [quantity, setQuantity] = useState(1);
  const [showAddedFeedback, setShowAddedFeedback] = useState(false);
  const recommendationsRef = useRef<HTMLDivElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const addToCartMutation = useMutation(
    addToCartMutationOptions(sessionId || undefined)
  );

  // Track product view
  useEffect(() => {
    if (product?.id && sessionId) {
      trackProductViewServerFn({ data: { itemId: product.id, userId: sessionId } });
    }
  }, [product?.id, sessionId]);

  // Fetch similar items
  const { data: similarData, isLoading: similarLoading } = useQuery({
    queryKey: ["similar-items", product?.id],
    queryFn: () =>
      getSimilarItemsServerFn({ data: { itemId: product!.id, count: 8 } }),
    enabled: !!product?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch popular items as fallback
  const { data: popularData, isLoading: popularLoading } = useQuery({
    queryKey: ["popular-items-fallback"],
    queryFn: () => getPopularItemsServerFn({ data: { count: 8 } }),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const similarProducts = similarData?.products || [];
  const popularProducts = popularData?.products || [];

  // Use similar items if available, otherwise fall back to popular (excluding current product)
  const recommendedProducts = useMemo(() => {
    if (similarProducts.length > 0) {
      return similarProducts;
    }
    // Filter out current product from popular items
    return popularProducts.filter((p) => p.id !== product?.id);
  }, [similarProducts, popularProducts, product?.id]);

  const recommendationsLoading = similarLoading || (similarProducts.length === 0 && popularLoading);
  const recommendationTitle = similarProducts.length > 0 ? "Slični proizvodi" : "Popularni proizvodi";

  // Reset feedback after 1.5 seconds
  useEffect(() => {
    if (showAddedFeedback) {
      const timer = setTimeout(() => {
        setShowAddedFeedback(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [showAddedFeedback]);

  // Get images from media
  const images = useMemo(() => {
    return (
      product?.media
        ?.map((item) => ({
          url: item.media?.url || "",
          alt: item.media?.alt || product.name,
        }))
        .filter((img) => !!img.url) || []
    );
  }, [product]);

  // Check if all options are selected
  const allOptionsSelected = useMemo(() => {
    if (!product?.options || product.options.length === 0) {
      return true; // No options to select
    }
    return product.options.every((option) => selectedOptions[option.id]);
  }, [product, selectedOptions]);

  // Determine selected variant based on selected options
  const currentVariant = useMemo(() => {
    if (!product?.variants || product.variants.length === 0) {
      return null;
    }

    // If product has options, require all to be selected
    if (product.options && product.options.length > 0) {
      if (!allOptionsSelected) {
        return null; // Don't auto-select variant if options exist but aren't all selected
      }

      // Find variant that matches all selected options
      return (
        product.variants.find((variant) => {
          return product.options.every((option) => {
            const selectedValueId = selectedOptions[option.id];
            if (!selectedValueId) return false;

            // Check if variant has this option value ID
            return variant.options.some(
              (vOpt) =>
                vOpt.optionName === option.name &&
                vOpt.optionValueId === selectedValueId
            );
          });
        }) || null
      );
    }

    // No options - use default variant or first variant
    const defaultVariant = product.variants.find((v) => v.isDefault);
    return defaultVariant || product.variants[0] || null;
  }, [product, selectedOptions, allOptionsSelected]);

  const displayPrice = currentVariant?.price || product?.price || "0";
  const displayComparePrice =
    currentVariant?.compareAtPrice || product?.compareAtPrice;
  const priceNum = parseFloat(displayPrice);
  const comparePriceNum = displayComparePrice
    ? parseFloat(displayComparePrice)
    : null;
  const hasDiscount = comparePriceNum && comparePriceNum > priceNum;

  // Get available inventory
  // If variant is selected, use its inventory; otherwise check if any variant has stock
  const availableQuantity = currentVariant?.inventory?.available || 0;
  const hasAnyStock = useMemo(() => {
    if (!product?.variants || product.variants.length === 0) return false;
    return product.variants.some((v) => (v.inventory?.available || 0) > 0);
  }, [product]);

  // Product is in stock if: selected variant has stock, OR no variant selected but some variants have stock
  const isInStock = currentVariant ? availableQuantity > 0 : hasAnyStock;

  const handleOptionChange = (optionId: string, valueId: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [optionId]: valueId,
    }));
    // Reset quantity when variant changes
    setQuantity(1);
  };

  const handleAddToCart = async () => {
    if (!product || !currentVariant) return;

    // Validate quantity against stock
    if (quantity > availableQuantity) {
      alert(`Maksimalno ${availableQuantity} kom. na zalihi`);
      return;
    }

    try {
      await addToCartMutation.mutateAsync({
        productId: product.id,
        variantId: currentVariant.id,
        quantity,
      });
      queryClient.invalidateQueries({ queryKey: [CART_QUERY_KEY] });
      setShowAddedFeedback(true);

      // Scroll to recommendations after a delay
      if (recommendationsRef.current && recommendedProducts.length > 0) {
        setTimeout(() => {
          recommendationsRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 800); // Wait for fly animation to complete
      }
    } catch (error: unknown) {
      const err = error as { message?: string };
      if (err?.message) {
        alert(err.message);
      } else {
        console.error("Error adding to cart:", error);
      }
    }
  };


  return (
    <ShopLayout settings={settings} navigationItems={navigationItems}>
      <main className="lg:container lg:mx-auto lg:px-4 py-0 lg:py-10">
        {/* Breadcrumb - Desktop only */}
        <nav className="hidden lg:block mb-8 px-4 lg:px-0" aria-label="Breadcrumb">
          <ol className="flex items-center flex-wrap gap-1 text-sm">
            <li className="flex items-center">
              <Link
                to="/"
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
              >
                <Home className="size-4" />
                <span>Početna</span>
              </Link>
            </li>
            <li className="flex items-center text-muted-foreground/50">
              <ChevronRight className="size-4" />
            </li>
            {product.category && (
              <>
                <li className="flex items-center">
                  <span className="px-2 py-1 text-muted-foreground">
                    {product.category.name}
                  </span>
                </li>
                <li className="flex items-center text-muted-foreground/50">
                  <ChevronRight className="size-4" />
                </li>
              </>
            )}
            <li className="flex items-center">
              <span className="px-2 py-1 text-foreground font-medium truncate max-w-[250px]">
                {product.name}
              </span>
            </li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12">
          {/* Image Carousel */}
          <div ref={imageContainerRef} className="lg:sticky lg:top-24 lg:self-start">
            <ProductImageCarousel images={images} productName={product.name} />
          </div>

          {/* Product Info */}
          <div className="space-y-5 px-4 lg:px-0">
            {/* Category */}
            {product.category && (
              <span className="inline-block text-xs text-muted-foreground uppercase tracking-widest">
                {product.category.name}
              </span>
            )}

            {/* Title */}
            <h1 className="text-xl lg:text-2xl font-medium text-foreground leading-tight">
              {product.name}
            </h1>

            {/* Price */}
            <div className="flex items-center gap-3">
              <span className="text-xl lg:text-2xl font-semibold text-foreground">
                {priceNum.toFixed(2)} KM
              </span>
              {hasDiscount && (
                <>
                  <span className="text-sm text-muted-foreground line-through">
                    {comparePriceNum!.toFixed(2)} KM
                  </span>
                  <span className="text-xs font-medium text-white bg-rose-500 px-2 py-0.5 rounded">
                    -{Math.round(((comparePriceNum! - priceNum) / comparePriceNum!) * 100)}%
                  </span>
                </>
              )}
            </div>

            {/* Variant Options */}
            {product.options && product.options.length > 0 && (
              <div className="space-y-4 pt-2">
                {product.options.map((option) => {
                  const selectedValue = option.values.find(
                    (v) => v.id === selectedOptions[option.id]
                  );
                  return (
                    <div key={option.id}>
                      <div className="flex items-center gap-2 mb-2.5">
                        <span className="text-sm text-muted-foreground">
                          {option.name}
                        </span>
                        {selectedValue && (
                          <span className="text-sm font-medium text-foreground">
                            {selectedValue.name}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {option.values.map((value) => {
                          const isSelected =
                            selectedOptions[option.id] === value.id;
                          return (
                            <button
                              key={value.id}
                              onClick={() =>
                                handleOptionChange(option.id, value.id)
                              }
                              className={cn(
                                "min-w-[3rem] px-4 py-2.5 rounded-lg text-sm font-medium border transition-all",
                                isSelected
                                  ? "border-foreground bg-foreground text-background"
                                  : "border-border bg-background text-foreground hover:border-foreground"
                              )}
                            >
                              {value.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quantity & Add to Cart - Desktop */}
            <div className="hidden lg:flex items-center gap-3 pt-2">
              <QuantityPicker
                value={quantity}
                onChange={setQuantity}
                min={1}
                max={availableQuantity || 1}
                disabled={!allOptionsSelected || !isInStock || addToCartMutation.isPending}
              />
              <AddToCartWithAnimation
                onAddToCart={handleAddToCart}
                isAdding={addToCartMutation.isPending}
                showAddedFeedback={showAddedFeedback}
                disabled={false}
                allOptionsSelected={allOptionsSelected}
                isInStock={isInStock}
                imageRef={imageContainerRef}
                primaryImageUrl={images[0]?.url}
                size="lg"
              />
              <WishlistButton
                productId={product.id}
                size="lg"
                className="h-12 w-12"
              />
            </div>

            {/* Stock Status Indicator */}
            {!isInStock && (
              <p className="text-sm text-muted-foreground">
                Trenutno nije dostupno
              </p>
            )}

            {/* Info Accordion */}
            <div className="pt-4">
              <ProductInfoAccordion
                shippingInfo={settings.productShippingInfo}
                paymentInfo={settings.productPaymentInfo}
                material={product.material}
              />
            </div>

            {/* SKU */}
            {product.sku && (
              <p className="text-xs text-muted-foreground">
                SKU: {product.sku}
              </p>
            )}
          </div>
        </div>

        {/* Description - Full Width Below */}
        {product.description && (
          <div className="mt-12 lg:mt-16 pt-8 border-t border-border px-4 lg:px-0">
            <h2 className="text-lg font-medium text-foreground mb-4">
              Opis proizvoda
            </h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                {product.description}
              </p>
            </div>
          </div>
        )}

        {/* Recommended Products */}
        <div ref={recommendationsRef} className="mt-12 lg:mt-16 pt-8 border-t border-border px-4 lg:px-0">
          <RecommendationCarousel
            title={recommendationTitle}
            products={recommendedProducts}
            loading={recommendationsLoading}
          />
        </div>

        {/* Bottom padding for mobile sticky bar */}
        <div className="h-20 lg:hidden" />
      </main>

      {/* Mobile Sticky Cart Bar */}
      <MobileStickyCart
        price={priceNum}
        compareAtPrice={comparePriceNum}
        quantity={quantity}
        onQuantityChange={setQuantity}
        maxQuantity={availableQuantity}
        onAddToCart={handleAddToCart}
        isAddingToCart={addToCartMutation.isPending}
        disabled={!isInStock}
        showAddedFeedback={showAddedFeedback}
        allOptionsSelected={allOptionsSelected}
        imageRef={imageContainerRef}
        primaryImageUrl={images[0]?.url}
      />
    </ShopLayout>
  );
}
