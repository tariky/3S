import { createFileRoute, notFound } from "@tanstack/react-router";
import { ShopLayout } from "@/components/shop/ShopLayout";
import { ProductCard } from "@/components/shop/ProductCard";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
	getPublicCollectionBySlugServerFn,
	getPublicCollectionProductsServerFn,
	PUBLIC_COLLECTION_QUERY_KEY,
} from "@/queries/collections";
import { getPublicShopSettingsServerFn } from "@/queries/settings";
import { getPublicNavigationServerFn } from "@/queries/navigation";
import { useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/collection/$slug")({
	component: CollectionPage,
	loader: async ({ params }) => {
		const [settings, navigationItems, collection] = await Promise.all([
			getPublicShopSettingsServerFn(),
			getPublicNavigationServerFn(),
			getPublicCollectionBySlugServerFn({ data: { slug: params.slug } }),
		]);

		if (!collection) {
			throw notFound();
		}

		// Fetch initial products
		const initialProducts = await getPublicCollectionProductsServerFn({
			data: { collectionId: collection.id, limit: 24 },
		});

		return { settings, navigationItems, collection, initialProducts };
	},
	validateSearch: (search: Record<string, unknown>) => {
		return {
			cursor: typeof search.cursor === "string" ? search.cursor : undefined,
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
});

function CollectionPage() {
	const { settings, navigationItems, collection, initialProducts } =
		Route.useLoaderData();
	const { cursor } = Route.useSearch();
	const navigate = Route.useNavigate();
	const loadMoreRef = useRef<HTMLDivElement>(null);

	const {
		data,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading,
	} = useInfiniteQuery({
		queryKey: [PUBLIC_COLLECTION_QUERY_KEY, collection.slug, "products"],
		queryFn: async ({ pageParam }) => {
			return await getPublicCollectionProductsServerFn({
				data: {
					collectionId: collection.id,
					cursor: pageParam || undefined,
					limit: 24,
				},
			});
		},
		initialPageParam: cursor || null,
		getNextPageParam: (lastPage) => lastPage.nextCursor,
		initialData: cursor
			? undefined
			: {
					pages: [initialProducts],
					pageParams: [null],
				},
	});

	// Update URL with cursor for scroll restoration
	const updateCursor = useCallback(
		(newCursor: string | null) => {
			navigate({
				search: (prev) => ({
					...prev,
					cursor: newCursor || undefined,
				}),
				replace: true,
			});
		},
		[navigate]
	);

	// Intersection observer for infinite scroll
	useEffect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
					fetchNextPage().then((result) => {
						// Update cursor in URL after fetching
						const lastPage = result.data?.pages[result.data.pages.length - 1];
						if (lastPage?.nextCursor) {
							updateCursor(lastPage.nextCursor);
						}
					});
				}
			},
			{ threshold: 0.1, rootMargin: "100px" }
		);

		if (loadMoreRef.current) {
			observer.observe(loadMoreRef.current);
		}

		return () => observer.disconnect();
	}, [hasNextPage, isFetchingNextPage, fetchNextPage, updateCursor]);

	// Flatten all products from pages
	const allProducts = data?.pages.flatMap((page) => page.products) || [];

	return (
		<ShopLayout settings={settings} navigationItems={navigationItems}>
			<div className="container mx-auto px-4 py-8">
				{/* Collection Header */}
				<div className="mb-8">
					{collection.image && (
						<div className="relative h-48 md:h-64 mb-6 rounded-lg overflow-hidden">
							<img
								src={collection.image}
								alt={collection.name}
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
						<h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
							{collection.name}
						</h1>
					)}
					{collection.description && (
						<p className="text-gray-600 max-w-3xl">
							{collection.description}
						</p>
					)}
				</div>

				{/* Products Grid */}
				{isLoading ? (
					<div className="flex items-center justify-center py-12">
						<Loader2 className="size-8 animate-spin text-primary" />
					</div>
				) : allProducts.length > 0 ? (
					<>
						<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
								<div className="flex items-center gap-2 text-gray-600">
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
							) : allProducts.length > 24 ? (
								<p className="text-gray-500 text-sm">
									Prikazano svih {allProducts.length} proizvoda
								</p>
							) : null}
						</div>
					</>
				) : (
					<div className="text-center py-12">
						<p className="text-gray-600 text-lg">
							Nema proizvoda u ovoj kolekciji.
						</p>
					</div>
				)}
			</div>
		</ShopLayout>
	);
}
