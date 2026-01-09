import { createFileRoute } from "@tanstack/react-router";
import { ShopLayout } from "@/components/shop/ShopLayout";
import { ProductFilters } from "@/components/shop/ProductFilters";
import { ProductCard } from "@/components/shop/ProductCard";
import { useQuery } from "@tanstack/react-query";
import { getShopProductsQueryOptions } from "@/queries/shop-products";
import { getPublicShopSettingsServerFn } from "@/queries/settings";
import { getPublicNavigationServerFn } from "@/queries/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/products")({
	component: ProductsPage,
	loader: async () => {
		const [settings, navigationItems] = await Promise.all([
			getPublicShopSettingsServerFn(),
			getPublicNavigationServerFn(),
		]);
		return { settings, navigationItems };
	},
	validateSearch: (search: Record<string, unknown>) => {
		return {
			tags: search.tags
				? Array.isArray(search.tags)
					? search.tags
					: [search.tags]
				: undefined,
		};
	},
});

function ProductsPage() {
	const { settings, navigationItems } = Route.useLoaderData();
	const { tags } = Route.useSearch();
	const [search, setSearch] = useState("");
	const [categoryId, setCategoryId] = useState("");
	const [minPrice, setMinPrice] = useState("");
	const [maxPrice, setMaxPrice] = useState("");
	const [sizes, setSizes] = useState<string[]>([]);
	const [colors, setColors] = useState<string[]>([]);
	const [page, setPage] = useState(1);

	const { data, isLoading } = useQuery(
		getShopProductsQueryOptions({
			tags: tags as string[] | undefined,
			search: search || undefined,
			categoryId: categoryId || undefined,
			minPrice: minPrice ? parseFloat(minPrice) : undefined,
			maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
			sizes: sizes.length > 0 ? sizes : undefined,
			colors: colors.length > 0 ? colors : undefined,
			page,
			limit: 24,
		})
	);

	const handleResetFilters = () => {
		setSearch("");
		setCategoryId("");
		setMinPrice("");
		setMaxPrice("");
		setSizes([]);
		setColors([]);
		setPage(1);
	};

	return (
		<ShopLayout settings={settings} navigationItems={navigationItems}>
			<div className="container mx-auto px-4 py-8">
				<div className="flex flex-col md:flex-row gap-8">
					{/* Filters Sidebar */}
					<aside className="w-full md:w-64 shrink-0">
						<div className="bg-white p-4 rounded-lg border border-gray-200 sticky top-20">
							<ProductFilters
								search={search}
								onSearchChange={setSearch}
								categoryId={categoryId}
								onCategoryChange={setCategoryId}
								minPrice={minPrice}
								onMinPriceChange={setMinPrice}
								maxPrice={maxPrice}
								onMaxPriceChange={setMaxPrice}
								sizes={sizes}
								onSizesChange={setSizes}
								colors={colors}
								onColorsChange={setColors}
								onReset={handleResetFilters}
								availableSizes={data?.availableSizes || []}
								availableColors={data?.availableColors || []}
							/>
						</div>
					</aside>

					{/* Products Grid */}
					<div className="flex-1">
						<div className="mb-6">
							<h1 className="text-3xl font-bold text-gray-900 mb-2">
								Proizvodi
							</h1>
							{data && (
								<p className="text-gray-600">
									Pronađeno {data.total} proizvoda
								</p>
							)}
						</div>

						{isLoading ? (
							<div className="flex items-center justify-center py-12">
								<Loader2 className="size-8 animate-spin text-primary" />
							</div>
						) : data && data.data.length > 0 ? (
							<>
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
									{data.data.map((product) => (
										<ProductCard
											key={product.id}
											id={product.id}
											name={product.name}
											price={product.price || "0"}
											compareAtPrice={product.compareAtPrice}
											image={product.primaryImage}
											slug={product.slug}
											variants={product.variants}
										/>
									))}
								</div>

								{/* Pagination */}
								{data.total > 24 && (
									<div className="flex items-center justify-center gap-2 mt-8">
										<Button
											variant="outline"
											disabled={page === 1}
											onClick={() => setPage(page - 1)}
										>
											Prethodno
										</Button>
										<span className="text-sm text-gray-600">
											Strana {page}
										</span>
										<Button
											variant="outline"
											disabled={data.data.length < 24}
											onClick={() => setPage(page + 1)}
										>
											Sljedeće
										</Button>
									</div>
								)}
							</>
						) : (
							<div className="text-center py-12">
								<p className="text-gray-600 text-lg">
									Nema proizvoda koji odgovaraju vašim filterima.
								</p>
								<Button
									variant="outline"
									onClick={handleResetFilters}
									className="mt-4"
								>
									Resetuj filtere
								</Button>
							</div>
						)}
					</div>
				</div>
			</div>
		</ShopLayout>
	);
}
