import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { ShopLayout } from "@/components/shop/ShopLayout";
import { ProductCard } from "@/components/shop/ProductCard";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import {
	getPublicCollectionBySlugServerFn,
	getPublicCollectionProductsServerFn,
	getCollectionFilterMetaServerFn,
	PUBLIC_COLLECTION_QUERY_KEY,
} from "@/queries/collections";
import { getPublicShopSettingsServerFn } from "@/queries/settings";
import { getPublicNavigationServerFn } from "@/queries/navigation";
import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Home } from "lucide-react";
import { ProxyImage } from "@/components/ui/proxy-image";
import { CollectionFilters, type ActiveFilters } from "@/components/collection/CollectionFilters";
import { CollectionFilterSheet } from "@/components/collection/CollectionFilterSheet";
import { CollectionSortSelect, type SortOption } from "@/components/collection/CollectionSortSelect";

// Helper functions for URL encoding/decoding option filters
function encodeOptionFilters(filters: Record<string, string[]>): string | undefined {
	const entries = Object.entries(filters).filter(([, values]) => values.length > 0);
	if (entries.length === 0) return undefined;
	return entries.map(([name, values]) => `${name}:${values.join(",")}`).join("|");
}

function decodeOptionFilters(str: string | undefined): Record<string, string[]> {
	if (!str) return {};
	const result: Record<string, string[]> = {};
	str.split("|").forEach((part) => {
		const [name, values] = part.split(":");
		if (name && values) {
			result[name] = values.split(",");
		}
	});
	return result;
}

// Map collection sortOrder to client-side SortOption
function mapCollectionSortToClientSort(collectionSort: string): SortOption {
	switch (collectionSort) {
		case "price-asc":
			return "price-asc";
		case "price-desc":
			return "price-desc";
		case "alphabetical-asc":
			return "name-asc";
		case "alphabetical-desc":
			return "name-desc";
		case "created-desc":
			return "newest";
		case "manual":
		case "best-selling":
		case "created-asc":
		default:
			return "default";
	}
}

export const Route = createFileRoute("/collection/$slug")({
	component: CollectionPage,
	loader: async ({ params }) => {
		const [settings, navigationItems, collection] = await Promise.all([
			getPublicShopSettingsServerFn(),
			getPublicNavigationServerFn(),
			getPublicCollectionBySlugServerFn({ data: { slug: params.slug } }).catch(
				() => null
			),
		]);

		// Don't throw notFound() - handle in component to avoid SSR bug #5960
		if (!collection) {
			return { settings, navigationItems, collection: null, initialProducts: null, filterMeta: null };
		}

		// Fetch initial products and filter meta in parallel
		const [initialProducts, filterMeta] = await Promise.all([
			getPublicCollectionProductsServerFn({
				data: { collectionId: collection.id, limit: 24 },
			}),
			getCollectionFilterMetaServerFn({
				data: { collectionId: collection.id },
			}),
		]);

		return { settings, navigationItems, collection, initialProducts, filterMeta };
	},
	validateSearch: (search: Record<string, unknown>) => {
		const parsePrice = (value: unknown): number | undefined => {
			if (typeof value === "number") return value;
			if (typeof value === "string") {
				const parsed = parseFloat(value);
				return isNaN(parsed) ? undefined : parsed;
			}
			return undefined;
		};

		return {
			cursor: typeof search.cursor === "string" ? search.cursor : undefined,
			sort: typeof search.sort === "string" ? (search.sort as SortOption) : undefined,
			minPrice: parsePrice(search.minPrice),
			maxPrice: parsePrice(search.maxPrice),
			category: typeof search.category === "string" ? search.category : undefined,
			options: typeof search.options === "string" ? search.options : undefined,
		};
	},
	head: ({ loaderData }) => {
		const collection = loaderData?.collection;
		const seoTitle = collection?.seoTitle || collection?.name;
		const seoDescription = collection?.seoDescription || collection?.description;

		return {
			meta: [
				...(seoTitle ? [{ title: seoTitle }] : []),
				...(seoDescription
					? [{ name: "description", content: seoDescription }]
					: []),
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
						Kolekcija nije pronađena
					</h1>
					<p className="text-gray-600 mb-8">
						Kolekcija koju tražite ne postoji, premještena je ili je uklonjena.
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

function CollectionPage() {
	const { settings, navigationItems, collection, initialProducts, filterMeta } =
		Route.useLoaderData();
	const searchParams = Route.useSearch();
	const navigate = Route.useNavigate();
	const loadMoreRef = useRef<HTMLDivElement>(null);
	const [isRestoringScroll, setIsRestoringScroll] = useState(false);

	// Get default sort from collection settings
	const defaultSort = useMemo(() =>
		collection ? mapCollectionSortToClientSort(collection.sortOrder) : "default",
		[collection]
	);

	// Parse active filters from URL
	const activeFilters: ActiveFilters = useMemo(() => ({
		sort: searchParams.sort || defaultSort,
		minPrice: searchParams.minPrice,
		maxPrice: searchParams.maxPrice,
		categoryId: searchParams.category,
		optionFilters: decodeOptionFilters(searchParams.options),
	}), [searchParams, defaultSort]);

	// Check if any filters are active (excluding sort)
	const hasActiveFilters = useMemo(() => {
		return (
			activeFilters.minPrice !== undefined ||
			activeFilters.maxPrice !== undefined ||
			activeFilters.categoryId !== undefined ||
			Object.values(activeFilters.optionFilters).some((v) => v.length > 0)
		);
	}, [activeFilters]);

	// Build option filters array for API
	const optionFiltersArray = useMemo(() => {
		return Object.entries(activeFilters.optionFilters)
			.filter(([, values]) => values.length > 0)
			.map(([optionName, values]) => ({ optionName, values }));
	}, [activeFilters.optionFilters]);

	// Infinite query for products
	const {
		data,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
		isFetching,
	} = useInfiniteQuery({
		queryKey: [
			PUBLIC_COLLECTION_QUERY_KEY,
			collection?.slug ?? "not-found",
			"products",
			activeFilters.sort,
			activeFilters.minPrice,
			activeFilters.maxPrice,
			activeFilters.categoryId,
			optionFiltersArray,
		],
		queryFn: async ({ pageParam }) => {
			if (!collection) {
				return { products: [], nextCursor: null };
			}
			return await getPublicCollectionProductsServerFn({
				data: {
					collectionId: collection.id,
					cursor: pageParam || undefined,
					limit: 24,
					sortBy: activeFilters.sort !== "default" ? activeFilters.sort : undefined,
					minPrice: activeFilters.minPrice,
					maxPrice: activeFilters.maxPrice,
					categoryId: activeFilters.categoryId,
					optionFilters: optionFiltersArray.length > 0 ? optionFiltersArray : undefined,
				},
			});
		},
		initialPageParam: searchParams.cursor || null,
		getNextPageParam: (lastPage) => lastPage.nextCursor,
		// Only use initial data if no filters are active and collection exists
		initialData: (collection && !hasActiveFilters && !searchParams.cursor && initialProducts)
			? {
					pages: [initialProducts],
					pageParams: [null],
				}
			: undefined,
		enabled: !!collection,
	});

	// Update URL with new search params
	const updateSearchParams = useCallback(
		(updates: Partial<typeof searchParams>) => {
			navigate({
				search: (prev) => ({
					...prev,
					...updates,
					// Reset cursor when filters change
					cursor: updates.cursor !== undefined ? updates.cursor : undefined,
				}),
				replace: true,
			});
		},
		[navigate]
	);

	// Handle filter changes
	const handleFilterChange = useCallback(
		(filters: Partial<ActiveFilters>) => {
			const newSearch: Partial<typeof searchParams> = {
				cursor: undefined, // Reset pagination
			};

			if (filters.sort !== undefined) {
				newSearch.sort = filters.sort === "default" ? undefined : filters.sort;
			}
			if ("minPrice" in filters) {
				newSearch.minPrice = filters.minPrice;
			}
			if ("maxPrice" in filters) {
				newSearch.maxPrice = filters.maxPrice;
			}
			if (filters.categoryId !== undefined) {
				newSearch.category = filters.categoryId;
			}
			if (filters.optionFilters !== undefined) {
				const mergedOptions = { ...activeFilters.optionFilters, ...filters.optionFilters };
				newSearch.options = encodeOptionFilters(mergedOptions);
			}

			navigate({
				search: (prev) => ({
					...prev,
					...newSearch,
				}),
				replace: true,
			});
		},
		[navigate, activeFilters.optionFilters]
	);

	// Clear all filters
	const handleClearFilters = useCallback(() => {
		navigate({
			search: {},
			replace: true,
		});
	}, [navigate]);

	// Scroll restoration - save position before navigating to product
	useEffect(() => {
		if (!collection) return;

		const handleClick = (e: MouseEvent) => {
			const target = e.target as HTMLElement;
			const link = target.closest('a[href*="/product/"]');
			if (link) {
				sessionStorage.setItem(
					`scroll-${collection.slug}`,
					JSON.stringify({
						y: window.scrollY,
						search: window.location.search,
					})
				);
			}
		};

		document.addEventListener("click", handleClick);
		return () => document.removeEventListener("click", handleClick);
	}, [collection]);

	// Restore scroll position on mount (only when coming back from product page)
	useEffect(() => {
		if (!collection) return;

		const saved = sessionStorage.getItem(`scroll-${collection.slug}`);
		if (saved) {
			try {
				const { y, search } = JSON.parse(saved);
				// Only restore if search params match AND we have a valid scroll position
				if (search === window.location.search && y > 0) {
					setIsRestoringScroll(true);
					// Wait for content to load
					const timeout = setTimeout(() => {
						window.scrollTo({ top: y, behavior: "instant" });
						setIsRestoringScroll(false);
						sessionStorage.removeItem(`scroll-${collection.slug}`);
					}, 100);
					return () => clearTimeout(timeout);
				}
			} catch (e) {
				// Ignore parse errors
			}
			sessionStorage.removeItem(`scroll-${collection.slug}`);
		}
	}, [collection]);

	// Intersection observer for infinite scroll
	useEffect(() => {
		if (!collection || isRestoringScroll) return;

		let observer: IntersectionObserver | null = null;

		// Delay observer setup to prevent triggering on initial render
		const setupTimeout = setTimeout(() => {
			observer = new IntersectionObserver(
				(entries) => {
					if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
						fetchNextPage().then((result) => {
							const lastPage = result.data?.pages[result.data.pages.length - 1];
							if (lastPage?.nextCursor) {
								updateSearchParams({ cursor: lastPage.nextCursor });
							}
						});
					}
				},
				{ threshold: 0.1, rootMargin: "100px" }
			);

			if (loadMoreRef.current) {
				observer.observe(loadMoreRef.current);
			}
		}, 500);

		return () => {
			clearTimeout(setupTimeout);
			observer?.disconnect();
		};
	}, [collection, hasNextPage, isFetchingNextPage, fetchNextPage, updateSearchParams, isRestoringScroll]);

	// Flatten all products from pages
	const allProducts = data?.pages.flatMap((page) => page.products) || [];
	const totalCount = filterMeta?.totalProducts ?? 0;

	// Handle collection not found - render 404 UI instead of throwing
	// This is a workaround for TanStack Start SSR bug #5960
	// IMPORTANT: All hooks must be called before this return
	if (!collection) {
		return (
			<ShopLayout settings={settings} navigationItems={navigationItems}>
				<div className="min-h-[60vh] flex items-center justify-center">
					<div className="text-center max-w-md mx-auto px-4">
						<div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
							<span className="text-4xl">404</span>
						</div>
						<h1 className="text-2xl font-semibold text-gray-900 mb-3">
							Kolekcija nije pronađena
						</h1>
						<p className="text-gray-600 mb-8">
							Kolekcija koju tražite ne postoji, premještena je ili je uklonjena.
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

	return (
		<ShopLayout settings={settings} navigationItems={navigationItems}>
			<div className="bg-background min-h-screen">
			<div className="container mx-auto px-4 py-8">
				{/* Collection Header */}
				<div className="mb-8">
					{collection.image && (
						<div className="relative h-48 md:h-64 mb-6 rounded-lg overflow-hidden">
							<ProxyImage
								src={collection.image}
								alt={collection.name}
								width={1200}
								height={300}
								resizingType="fill"
								className="w-full h-full object-cover"
							/>
							<div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
							<div className="absolute bottom-0 left-0 right-0 p-6">
								<h1 className="text-3xl md:text-4xl font-bold text-white">
									{collection.name}
								</h1>
							</div>
						</div>
					)}
					{!collection.image && (
						<h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
							{collection.name}
						</h1>
					)}
					{collection.description && (
						<p className="text-muted-foreground max-w-3xl">
							{collection.description}
						</p>
					)}
				</div>

				{/* Filters Bar */}
				<div className="flex items-center justify-between mb-6 gap-4">
					<div className="flex items-center gap-2">
						{/* Mobile Filter Button */}
						<div className="lg:hidden">
							<CollectionFilterSheet
								filterMeta={filterMeta}
								activeFilters={activeFilters}
								onFilterChange={handleFilterChange}
								onClearFilters={handleClearFilters}
								defaultSort={defaultSort}
							/>
						</div>
						{/* Product Count */}
						<span className="text-sm text-muted-foreground">
							{isFetching && !isFetchingNextPage ? (
								<Loader2 className="h-4 w-4 animate-spin inline mr-1" />
							) : null}
							{hasActiveFilters
								? `${allProducts.length} od ${totalCount} proizvoda`
								: `${totalCount} proizvoda`}
						</span>
					</div>
					{/* Desktop Sort */}
					<div className="hidden sm:block">
						<CollectionSortSelect
							value={activeFilters.sort}
							onChange={(sort) => handleFilterChange({ sort })}
						/>
					</div>
				</div>

				{/* Main Content */}
				<div className="flex gap-8">
					{/* Desktop Filters Sidebar */}
					<aside className="hidden lg:block w-64 shrink-0">
						<div className="sticky top-4">
							<CollectionFilters
								filterMeta={filterMeta}
								activeFilters={activeFilters}
								onFilterChange={handleFilterChange}
								onClearFilters={handleClearFilters}
								showSort={false}
							/>
						</div>
					</aside>

					{/* Products Grid */}
					<div className="flex-1">
						{isLoading ? (
							<div className="flex items-center justify-center py-12">
								<Loader2 className="size-8 animate-spin text-primary" />
							</div>
						) : allProducts.length > 0 ? (
							<>
								<div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 md:gap-6">
									{allProducts.map((product) => (
										<ProductCard
											key={product.id}
											id={product.id}
											name={product.name}
											price={product.price}
											compareAtPrice={product.compareAtPrice}
											image={product.primaryImage}
											slug={product.slug}
											variants={product.variants}
										/>
									))}
								</div>

								{/* Load More Trigger */}
								<div ref={loadMoreRef} className="mt-8 flex justify-center">
									{isFetchingNextPage ? (
										<div className="flex items-center gap-2 text-muted-foreground">
											<Loader2 className="size-5 animate-spin" />
											<span>Učitavanje...</span>
										</div>
									) : hasNextPage ? (
										<Button
											variant="outline"
											onClick={() => fetchNextPage()}
										>
											Učitaj više
										</Button>
									) : (
										<p className="text-muted-foreground/60 text-sm">
											Nema više rezultata
										</p>
									)}
								</div>
							</>
						) : (
							<div className="text-center py-12">
								<p className="text-muted-foreground text-lg mb-4">
									{hasActiveFilters
										? "Nema proizvoda koji odgovaraju odabranim filterima."
										: "Nema proizvoda u ovoj kolekciji."}
								</p>
								{hasActiveFilters && (
									<Button variant="outline" onClick={handleClearFilters}>
										Očisti filtere
									</Button>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
			</div>
		</ShopLayout>
	);
}
