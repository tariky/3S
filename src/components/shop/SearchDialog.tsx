"use client";

import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, X, Loader2, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { searchTypesenseProductsServerFn } from "@/queries/typesense";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { ProxyImage } from "@/components/ui/proxy-image";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { trackSearchClickServerFn } from "@/queries/gorse";
import { useCartSession } from "@/hooks/useCartSession";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [query, setQuery] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { sessionId } = useCartSession();

  const debouncedQuery = useDebounce(query, 250);

  const { data, isLoading } = useQuery({
    queryKey: ["quick-search", debouncedQuery],
    queryFn: () =>
      searchTypesenseProductsServerFn({
        data: { query: debouncedQuery, perPage: 6, page: 1 },
      }),
    enabled: debouncedQuery.length >= 2,
  });

  const products = data?.products || [];
  const totalHits = data?.totalHits || 0;
  const hasResults = products.length > 0;
  const showViewAll = totalHits > products.length;

  // Reset on open/close
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  // Reset selection when results change
  React.useEffect(() => {
    setSelectedIndex(0);
  }, [products.length]);

  const goToProduct = (slug: string, productId: string) => {
    // Track search click feedback
    if (sessionId) {
      trackSearchClickServerFn({ data: { itemId: productId, userId: sessionId } });
    }
    onOpenChange(false);
    navigate({ to: "/product/$slug", params: { slug } });
  };

  const goToSearch = () => {
    if (query.length >= 2) {
      onOpenChange(false);
      navigate({ to: "/search", search: { q: query } });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const maxIndex = showViewAll ? products.length : products.length - 1;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, maxIndex));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex < products.length) {
          goToProduct(products[selectedIndex].slug, products[selectedIndex].id);
        } else if (showViewAll) {
          goToSearch();
        }
        break;
      case "Escape":
        onOpenChange(false);
        break;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden [&>button]:hidden">
        <VisuallyHidden>
          <DialogTitle>Pretraga proizvoda</DialogTitle>
        </VisuallyHidden>

        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 border-b">
          <Search className="size-5 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pretraži proizvode..."
            className="border-0 focus-visible:ring-0 h-12 px-0 text-base"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              onClick={() => setQuery("")}
            >
              <X className="size-4" />
            </Button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto">
          {/* Loading */}
          {isLoading && debouncedQuery.length >= 2 && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* No Results */}
          {!isLoading && debouncedQuery.length >= 2 && !hasResults && (
            <div className="py-8 text-center text-muted-foreground">
              <p>Nema rezultata za "{debouncedQuery}"</p>
            </div>
          )}

          {/* Products */}
          {!isLoading && hasResults && (
            <div className="p-2">
              {products.map((product, i) => (
                <button
                  key={product.id}
                  onClick={() => goToProduct(product.slug, product.id)}
                  data-selected={selectedIndex === i}
                  className="w-full flex items-center gap-3 p-2 rounded-lg text-left hover:bg-muted data-[selected=true]:bg-muted transition-colors"
                >
                  <div className="size-12 rounded bg-muted overflow-hidden shrink-0">
                    {product.primaryImage ? (
                      <ProxyImage
                        src={product.primaryImage}
                        alt=""
                        width={48}
                        height={48}
                        resizingType="fill"
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="size-full flex items-center justify-center">
                        <Search className="size-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {parseFloat(product.price).toFixed(2)} KM
                    </p>
                  </div>
                </button>
              ))}

              {/* View All */}
              {showViewAll && (
                <button
                  onClick={goToSearch}
                  data-selected={selectedIndex === products.length}
                  className="w-full flex items-center justify-between p-3 mt-1 rounded-lg text-sm font-medium text-primary hover:bg-muted data-[selected=true]:bg-muted transition-colors"
                >
                  <span>Pogledaj sve rezultate ({totalHits})</span>
                  <ArrowRight className="size-4" />
                </button>
              )}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && query.length < 2 && (
            <div className="py-10 text-center text-muted-foreground">
              <Search className="size-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Unesite najmanje 2 karaktera</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-4 py-2 text-xs text-muted-foreground flex gap-4">
          <span><kbd className="px-1.5 py-0.5 bg-muted rounded">↑↓</kbd> navigacija</span>
          <span><kbd className="px-1.5 py-0.5 bg-muted rounded">Enter</kbd> otvori</span>
          <span><kbd className="px-1.5 py-0.5 bg-muted rounded">Esc</kbd> zatvori</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
