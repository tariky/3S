import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchProductsForOrderServerFn } from "@/queries/products";
import { Loader2 } from "lucide-react";
import { ProxyImage } from "@/components/ui/proxy-image";

interface ProductSearchProps {
  onSelectProduct: (product: {
    productId: string;
    variantId?: string;
    title: string;
    sku?: string;
    price: number;
    variantTitle?: string;
    image?: string;
    inventory?: {
      available: number;
      onHand: number;
      reserved: number;
      committed: number;
    };
  }) => void;
}

export function ProductSearch({ onSelectProduct }: ProductSearchProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Initialize debouncedSearch immediately when dialog opens
  useEffect(() => {
    if (open) {
      setDebouncedSearch("");
    }
  }, [open]);

  // Debounce search input (only when user types)
  useEffect(() => {
    if (!open) return;
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // If search is empty, update immediately (no debounce)
    if (search === "") {
      setDebouncedSearch("");
      return;
    }
    
    // Otherwise, debounce the search
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [search, open]);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products-search-order", debouncedSearch || "", open],
    queryFn: async () => {
      const searchTerm = debouncedSearch.trim() || undefined;
      return await searchProductsForOrderServerFn({
        data: { search: searchTerm, limit: searchTerm ? 20 : 10 },
      });
    },
    enabled: open,
  });

  useEffect(() => {
    if (!open) {
      setSearch("");
      setDebouncedSearch("");
    }
  }, [open]);

  const handleSelectVariant = (product: any, variant: any) => {
    const price = variant?.price
      ? parseFloat(variant.price)
      : parseFloat(product.price);
    
    // Build variant title from variant options
    const variantTitle = variant?.variantOptions
      ?.map((vo: any) => vo.optionValue?.name)
      .filter(Boolean)
      .join(" / ") || undefined;
    
    onSelectProduct({
      productId: product.id,
      variantId: variant?.id,
      title: product.name,
      sku: variant?.sku || product.sku || undefined,
      price,
      variantTitle,
      image: product.primaryImage || undefined,
      inventory: variant?.inventory || undefined,
    });
    setOpen(false);
    setSearch("");
  };

  const getVariantDisplayName = (variant: any, productName: string) => {
    if (variant?.variantOptions && variant.variantOptions.length > 0) {
      const optionNames = variant.variantOptions
        .map((vo: any) => vo.optionValue?.name)
        .filter(Boolean);
      return optionNames.length > 0 ? optionNames.join(" / ") : productName;
    }
    return productName;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Pretraga proizvoda</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Pretraga proizvoda</DialogTitle>
          <DialogDescription>
            Unesi SKU ili naziv proizvoda za pretragu.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 flex-1 min-h-0">
          <Input
            placeholder="Unesi SKU ili naziv proizvoda"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex flex-col gap-2 overflow-y-auto flex-1">
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-6 animate-spin" />
              </div>
            )}
            {!isLoading && products && products.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {search ? "Nema pronađenih proizvoda" : "Nema proizvoda"}
              </div>
            )}
            {!isLoading &&
              products &&
              products.length > 0 && (
                <div className="text-xs text-gray-500 mb-2">
                  {search ? "Rezultati pretrage" : "Posljednji dodani proizvodi"}
                </div>
              )}
            {!isLoading &&
              products &&
              products.map((product: any) => {
                const hasVariants = product.variants && product.variants.length > 0;
                
                // If product has no variants, create a single "variant" representation
                const displayVariants = hasVariants
                  ? product.variants
                  : [
                      {
                        id: undefined,
                        price: product.price,
                        sku: product.sku,
                        inventory: { available: 0 },
                        variantOptions: [],
                      },
                    ];

                return (
                  <div
                    key={product.id}
                    className="border rounded-md overflow-visible"
                  >
                    {/* Product Header */}
                    <div className="flex gap-2 p-2 bg-gray-50 border-b">
                      <ProxyImage
                        src={
                          product.primaryImage ||
                          "https://via.placeholder.com/64"
                        }
                        alt={product.name}
                        width={64}
                        height={64}
                        resizingType="fill"
                        className="w-16 h-16 rounded-md aspect-square object-cover flex-shrink-0"
                      />
                      <div className="flex flex-col gap-1 flex-1 min-w-0">
                        <span className="text-sm font-medium">
                          {product.name}
                        </span>
                        {hasVariants && product.variants.length > 1 && (
                          <span className="text-xs text-gray-500">
                            {product.variants.length} varijanti
                          </span>
                        )}
                        {!hasVariants && (
                          <span className="text-xs text-gray-500">
                            Proizvod bez varijanti
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Variants List */}
                    <div className="flex flex-col">
                      {displayVariants.map((variant: any, index: number) => (
                        <div
                          key={variant.id || `default-${index}`}
                          className={`flex gap-2 p-2 hover:bg-gray-100 cursor-pointer ${
                            index > 0 ? "border-t" : ""
                          }`}
                          onClick={() => handleSelectVariant(product, variant)}
                        >
                          <div className="w-16" /> {/* Spacer for image alignment */}
                          <div className="flex flex-col gap-1 flex-1">
                            <span className="text-sm font-medium">
                              {getVariantDisplayName(variant, product.name)}
                            </span>
                            {variant.sku && (
                              <span className="text-xs text-gray-400">
                                SKU: {variant.sku}
                              </span>
                            )}
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-gray-500">
                                Dostupno: {variant.inventory?.available ?? 0}
                              </span>
                              <span className="text-sm font-medium">
                                {(
                                  variant.price
                                    ? parseFloat(variant.price)
                                    : parseFloat(product.price)
                                ).toFixed(2)}{" "}
                                BAM
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
