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
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingCart, ChevronRight, Home, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartSession } from "@/hooks/useCartSession";
import { ProductImageCarousel } from "@/components/shop/ProductImageCarousel";
import { ProductInfoAccordion } from "@/components/shop/ProductInfoAccordion";
import { QuantityPicker } from "@/components/shop/QuantityPicker";
import { MobileStickyCart } from "@/components/shop/MobileStickyCart";

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

    if (!product) {
      throw notFound();
    }

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
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <h1 className="text-2xl font-medium text-gray-900 mb-4">
            Proizvod nije pronađen
          </h1>
          <p className="text-gray-600 mb-6">
            Proizvod koji tražite ne postoji ili je uklonjen.
          </p>
          <Button asChild variant="outline">
            <Link to="/products" search={{ tags: undefined }}>
              Nazad na proizvode
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
    initialData: initialProduct as ShopProduct,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const [selectedOptions, setSelectedOptions] = useState<
    Record<string, string>
  >({});
  const [quantity, setQuantity] = useState(1);
  const [showAddedFeedback, setShowAddedFeedback] = useState(false);
  const addToCartMutation = useMutation(
    addToCartMutationOptions(sessionId || undefined)
  );

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

  // Determine selected variant based on selected options
  const currentVariant = useMemo(() => {
    if (!product?.variants || product.variants.length === 0) {
      return null;
    }

    // If no options selected and there's a default variant, use it
    if (Object.keys(selectedOptions).length === 0) {
      const defaultVariant = product.variants.find((v) => v.isDefault);
      if (defaultVariant) {
        return defaultVariant;
      }
      // If no default, use first variant
      return product.variants[0] || null;
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
  }, [product, selectedOptions]);

  const displayPrice = currentVariant?.price || product?.price || "0";
  const displayComparePrice =
    currentVariant?.compareAtPrice || product?.compareAtPrice;
  const priceNum = parseFloat(displayPrice);
  const comparePriceNum = displayComparePrice
    ? parseFloat(displayComparePrice)
    : null;
  const hasDiscount = comparePriceNum && comparePriceNum > priceNum;

  // Get available inventory
  const availableQuantity = currentVariant?.inventory?.available || 0;
  const isInStock = availableQuantity > 0;

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
    } catch (error: unknown) {
      const err = error as { message?: string };
      if (err?.message) {
        alert(err.message);
      } else {
        console.error("Error adding to cart:", error);
      }
    }
  };

  // Product should always be available from SSR
  if (!product) {
    return null;
  }

  return (
    <ShopLayout settings={settings} navigationItems={navigationItems}>
      <main className="container mx-auto px-4 py-6 lg:py-10">
        {/* Breadcrumb */}
        <nav className="mb-6 lg:mb-8" aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5 text-sm">
            <li>
              <Link
                to="/"
                className="text-gray-500 hover:text-gray-900 transition-colors"
              >
                <Home className="size-4" />
              </Link>
            </li>
            <ChevronRight className="size-4 text-gray-400" />
            {product.category && (
              <>
                <li>
                  <Link
                    to="/products/$categorySlug"
                    params={{ categorySlug: product.category.slug }}
                    search={{ tags: undefined }}
                    className="text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    {product.category.name}
                  </Link>
                </li>
                <ChevronRight className="size-4 text-gray-400" />
              </>
            )}
            <li>
              <span className="text-gray-900 font-medium truncate max-w-[200px] inline-block">
                {product.name}
              </span>
            </li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Image Carousel */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <ProductImageCarousel images={images} productName={product.name} />
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Category */}
            {product.category && (
              <Link
                to="/products/$categorySlug"
                params={{ categorySlug: product.category.slug }}
                search={{ tags: undefined }}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors uppercase tracking-wide"
              >
                {product.category.name}
              </Link>
            )}

            {/* Title */}
            <h1 className="text-2xl lg:text-3xl font-medium text-gray-900">
              {product.name}
            </h1>

            {/* Price - Desktop */}
            <div className="hidden lg:flex items-baseline gap-3">
              <span className="text-2xl font-semibold text-gray-900">
                {priceNum.toFixed(2)} KM
              </span>
              {hasDiscount && (
                <>
                  <span className="text-lg text-gray-400 line-through">
                    {comparePriceNum!.toFixed(2)} KM
                  </span>
                  <span className="text-sm font-medium text-rose-600">
                    -
                    {Math.round(
                      ((comparePriceNum! - priceNum) / comparePriceNum!) * 100
                    )}
                    %
                  </span>
                </>
              )}
            </div>

            {/* Price - Mobile (shown since sticky bar takes over) */}
            <div className="lg:hidden flex items-baseline gap-3">
              <span className="text-xl font-semibold text-gray-900">
                {priceNum.toFixed(2)} KM
              </span>
              {hasDiscount && (
                <>
                  <span className="text-base text-gray-400 line-through">
                    {comparePriceNum!.toFixed(2)} KM
                  </span>
                  <span className="text-sm font-medium text-rose-600">
                    -
                    {Math.round(
                      ((comparePriceNum! - priceNum) / comparePriceNum!) * 100
                    )}
                    %
                  </span>
                </>
              )}
            </div>

            {/* Variant Options */}
            {product.options && product.options.length > 0 && (
              <div className="space-y-5">
                {product.options.map((option) => (
                  <div key={option.id}>
                    <label className="block text-sm font-medium text-gray-900 mb-3">
                      {option.name}
                    </label>
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
                              "px-4 py-2.5 rounded-md border text-sm font-medium transition-all",
                              isSelected
                                ? "border-gray-900 bg-gray-900 text-white"
                                : "border-gray-200 bg-white text-gray-900 hover:border-gray-400"
                            )}
                          >
                            {value.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quantity & Add to Cart - Desktop */}
            <div className="hidden lg:block space-y-4">
              {/* Quantity Picker */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-900">
                  Količina
                </span>
                <QuantityPicker
                  value={quantity}
                  onChange={setQuantity}
                  min={1}
                  max={availableQuantity || 1}
                  disabled={!isInStock || addToCartMutation.isPending}
                />
                {!isInStock && (
                  <span className="text-sm text-red-500">Rasprodano</span>
                )}
              </div>

              {/* Add to Cart Button */}
              <Button
                size="lg"
                className={cn(
                  "w-full h-12 text-base font-medium transition-all duration-300",
                  showAddedFeedback && "bg-emerald-500 hover:bg-emerald-500"
                )}
                disabled={
                  !isInStock || addToCartMutation.isPending || showAddedFeedback
                }
                onClick={handleAddToCart}
              >
                {addToCartMutation.isPending ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : showAddedFeedback ? (
                  <span className="flex items-center gap-2 animate-success-pop">
                    <Check className="size-5" />
                    Dodano u korpu
                  </span>
                ) : (
                  <>
                    <ShoppingCart className="size-5 mr-2" />
                    {isInStock ? "Dodaj u korpu" : "Nema na zalihi"}
                  </>
                )}
              </Button>
            </div>

            {/* Stock Status Indicator */}
            {!isInStock && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <div className="size-2 bg-gray-400 rounded-full" />
                <span>Trenutno nije dostupno</span>
              </div>
            )}

            {/* Info Accordion */}
            <ProductInfoAccordion
              shippingInfo={settings.productShippingInfo}
              paymentInfo={settings.productPaymentInfo}
              material={product.material}
            />

            {/* SKU */}
            {product.sku && (
              <div className="text-sm text-gray-400 pt-2">
                SKU: {product.sku}
              </div>
            )}
          </div>
        </div>

        {/* Description - Full Width Below */}
        {product.description && (
          <div className="mt-12 lg:mt-16 pt-8 border-t border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Opis proizvoda
            </h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-600 whitespace-pre-line leading-relaxed">
                {product.description}
              </p>
            </div>
          </div>
        )}

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
      />
    </ShopLayout>
  );
}
