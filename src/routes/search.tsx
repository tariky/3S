import { createFileRoute, Link } from "@tanstack/react-router";
import { ShopLayout } from "@/components/shop/ShopLayout";
import { ProductCard } from "@/components/shop/ProductCard";
import { useQuery } from "@tanstack/react-query";
import { getPublicShopSettingsServerFn } from "@/queries/settings";
import { getPublicNavigationServerFn } from "@/queries/navigation";
import { searchTypesenseProductsServerFn } from "@/queries/typesense";
import { trackSearchClickServerFn } from "@/queries/gorse";
import { useCartSession } from "@/hooks/useCartSession";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Loader2, Search, X, SlidersHorizontal } from "lucide-react";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";

export const Route = createFileRoute("/search")({
	component: SearchPage,
	loader: async () => {
		const [settings, navigationItems] = await Promise.all([
			getPublicShopSettingsServerFn(),
			getPublicNavigationServerFn(),
		]);
		return { settings, navigationItems };
	},
	validateSearch: (search: Record<string, unknown>) => ({
		q: typeof search.q === "string" ? search.q : "",
	}),
	head: () => ({
		meta: [{ title: "Pretraga" }],
	}),
});

type SortOption = "relevance" | "price_asc" | "price_desc" | "newest" | "oldest";

function SearchPage() {
	const { settings, navigationItems } = Route.useLoaderData();
	const { q: initialQuery } = Route.useSearch();
	const navigate = Route.useNavigate();
	const { sessionId } = useCartSession();

	// Track search click
	const handleProductClick = (productId: string) => {
		if (sessionId) {
			trackSearchClickServerFn({ data: { itemId: productId, userId: sessionId } });
		}
	};

	// Search state
	const [searchInput, setSearchInput] = useState(initialQuery);
	const [query, setQuery] = useState(initialQuery);
	const [page, setPage] = useState(1);

	// Filters
	const [sortBy, setSortBy] = useState<SortOption>("relevance");
	const [inStock, setInStock] = useState(false);
	const [minPrice, setMinPrice] = useState("");
	const [maxPrice, setMaxPrice] = useState("");
	const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
	const [filtersOpen, setFiltersOpen] = useState(false);

	// Sync URL query
	useEffect(() => {
		if (initialQuery !== query) {
			setQuery(initialQuery);
			setSearchInput(initialQuery);
			setPage(1);
		}
	}, [initialQuery]);

	// Search query
	const { data, isLoading } = useQuery({
		queryKey: ["search-page", query, page, sortBy, inStock, minPrice, maxPrice, selectedOptions],
		queryFn: () =>
			searchTypesenseProductsServerFn({
				data: {
					query: query || "*",
					page,
					perPage: 24,
					sortBy,
					inStock: inStock || undefined,
					minPrice: minPrice ? parseFloat(minPrice) : undefined,
					maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
					optionValues: selectedOptions.length > 0 ? selectedOptions : undefined,
				},
			}),
	});

	const products = data?.products || [];
	const totalHits = data?.totalHits || 0;
	const totalPages = data?.totalPages || 0;
	const facets = data?.facets || {};

	// Handlers
	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault();
		setQuery(searchInput);
		setPage(1);
		navigate({ search: { q: searchInput } });
	};

	const clearFilters = () => {
		setInStock(false);
		setMinPrice("");
		setMaxPrice("");
		setSelectedOptions([]);
		setPage(1);
	};

	const toggleOption = (value: string) => {
		setSelectedOptions((prev) =>
			prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
		);
		setPage(1);
	};

	const hasFilters = inStock || minPrice || maxPrice || selectedOptions.length > 0;

	// Filter panel content
	const FilterPanel = () => (
		<div className="space-y-6">
			{/* In Stock */}
			<label className="flex items-center gap-2 cursor-pointer">
				<Checkbox
					checked={inStock}
					onCheckedChange={(v) => { setInStock(v === true); setPage(1); }}
				/>
				<span className="text-sm">Samo na zalihi</span>
			</label>

			{/* Price Range */}
			<div className="space-y-2">
				<Label className="text-sm font-medium">Cijena (KM)</Label>
				<div className="flex gap-2">
					<Input
						type="number"
						placeholder="Od"
						value={minPrice}
						onChange={(e) => { setMinPrice(e.target.value); setPage(1); }}
					/>
					<Input
						type="number"
						placeholder="Do"
						value={maxPrice}
						onChange={(e) => { setMaxPrice(e.target.value); setPage(1); }}
					/>
				</div>
			</div>

			{/* Option Values */}
			{facets.optionValues && facets.optionValues.length > 0 && (
				<div className="space-y-2">
					<Label className="text-sm font-medium">Opcije</Label>
					<div className="space-y-1.5 max-h-48 overflow-y-auto">
						{facets.optionValues.map((opt) => (
							<label key={opt.value} className="flex items-center gap-2 cursor-pointer">
								<Checkbox
									checked={selectedOptions.includes(opt.value)}
									onCheckedChange={() => toggleOption(opt.value)}
								/>
								<span className="text-sm">{opt.value}</span>
								<span className="text-xs text-muted-foreground">({opt.count})</span>
							</label>
						))}
					</div>
				</div>
			)}

			{/* Clear */}
			{hasFilters && (
				<Button variant="outline" size="sm" className="w-full" onClick={clearFilters}>
					<X className="size-4 mr-1" /> Ukloni filtere
				</Button>
			)}
		</div>
	);

	return (
		<ShopLayout settings={settings} navigationItems={navigationItems}>
			<div className="container mx-auto px-4 py-8">
				{/* Search Bar */}
				<form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
					<div className="relative">
						<Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
						<Input
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
							placeholder="Pretraži proizvode..."
							className="pl-12 pr-24 h-14 text-lg rounded-full"
						/>
						<Button
							type="submit"
							className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full"
						>
							Traži
						</Button>
					</div>
					{query && !isLoading && (
						<p className="text-center text-muted-foreground mt-3">
							{totalHits} rezultata za "<strong>{query}</strong>"
						</p>
					)}
				</form>

				<div className="flex gap-8">
					{/* Desktop Filters */}
					<aside className="hidden lg:block w-64 shrink-0">
						<div className="sticky top-20 bg-background border rounded-lg p-4">
							<h3 className="font-semibold mb-4">Filteri</h3>
							<FilterPanel />
						</div>
					</aside>

					{/* Main Content */}
					<div className="flex-1">
						{/* Toolbar */}
						<div className="flex items-center justify-between mb-6 gap-4">
							{/* Mobile Filters */}
							<Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
								<SheetTrigger asChild>
									<Button variant="outline" className="lg:hidden">
										<SlidersHorizontal className="size-4 mr-2" />
										Filteri
										{hasFilters && <span className="ml-1 size-2 rounded-full bg-primary" />}
									</Button>
								</SheetTrigger>
								<SheetContent side="left" className="w-80">
									<SheetHeader>
										<SheetTitle>Filteri</SheetTitle>
									</SheetHeader>
									<div className="mt-6">
										<FilterPanel />
									</div>
								</SheetContent>
							</Sheet>

							{/* Sort */}
							<div className="flex items-center gap-2 ml-auto">
								<span className="text-sm text-muted-foreground hidden sm:inline">Sortiraj:</span>
								<Select value={sortBy} onValueChange={(v: SortOption) => { setSortBy(v); setPage(1); }}>
									<SelectTrigger className="w-40">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="relevance">Relevantnost</SelectItem>
										<SelectItem value="newest">Najnovije</SelectItem>
										<SelectItem value="price_asc">Cijena ↑</SelectItem>
										<SelectItem value="price_desc">Cijena ↓</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						{/* Active Filters */}
						{selectedOptions.length > 0 && (
							<div className="flex flex-wrap gap-2 mb-4">
								{selectedOptions.map((opt) => (
									<span
										key={opt}
										className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-full text-sm"
									>
										{opt}
										<button onClick={() => toggleOption(opt)} className="hover:text-destructive">
											<X className="size-3" />
										</button>
									</span>
								))}
							</div>
						)}

						{/* Results */}
						{isLoading ? (
							<div className="flex justify-center py-12">
								<Loader2 className="size-8 animate-spin text-muted-foreground" />
							</div>
						) : products.length > 0 ? (
							<>
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
									{products.map((product) => (
										<div key={product.id} onClick={() => handleProductClick(product.id)}>
											<ProductCard
												id={product.id}
												name={product.name}
												price={product.price}
												compareAtPrice={product.compareAtPrice}
												image={product.primaryImage}
												slug={product.slug}
												variants={product.variants}
											/>
										</div>
									))}
								</div>

								{/* Pagination */}
								{totalPages > 1 && (
									<div className="flex justify-center gap-2 mt-8">
										<Button
											variant="outline"
											disabled={page === 1}
											onClick={() => setPage(page - 1)}
										>
											Prethodno
										</Button>
										<span className="flex items-center px-4 text-sm text-muted-foreground">
											{page} / {totalPages}
										</span>
										<Button
											variant="outline"
											disabled={page >= totalPages}
											onClick={() => setPage(page + 1)}
										>
											Sljedeće
										</Button>
									</div>
								)}
							</>
						) : (
							<div className="text-center py-12">
								<Search className="size-12 mx-auto text-muted-foreground/30 mb-4" />
								<p className="text-muted-foreground">
									{query ? `Nema rezultata za "${query}"` : "Unesite pojam za pretragu"}
								</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</ShopLayout>
	);
}
