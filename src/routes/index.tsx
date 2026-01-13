import { createFileRoute } from "@tanstack/react-router";
import { ShopLayout } from "@/components/shop/ShopLayout";
import { ShoppingBag, Truck, Shield, Heart, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { getPublicShopSettingsServerFn } from "@/queries/settings";
import { getPublicNavigationServerFn } from "@/queries/navigation";
import { useQuery } from "@tanstack/react-query";
import { useCartSession } from "@/hooks/useCartSession";
import { RecommendationCarousel } from "@/components/shop/RecommendationCarousel";
import { ProductCard } from "@/components/shop/ProductCard";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import {
	getPopularItemsServerFn,
	getRecommendationsServerFn,
	getLatestItemsServerFn,
} from "@/queries/gorse";

export const Route = createFileRoute("/")({
	component: HomePage,
	loader: async () => {
		const [settings, navigationItems] = await Promise.all([
			getPublicShopSettingsServerFn(),
			getPublicNavigationServerFn(),
		]);
		return { settings, navigationItems };
	},
	head: ({ loaderData }) => {
		const seoTitle = loaderData?.settings?.seoHomeTitle;
		const seoDescription = loaderData?.settings?.seoHomeDescription;
		const shopTitle = loaderData?.settings?.shopTitle || "Shop";

		return {
			meta: [
				...(seoTitle ? [{ title: seoTitle }] : [{ title: shopTitle }]),
				...(seoDescription
					? [{ name: "description", content: seoDescription }]
					: []),
			],
		};
	},
});

function HomePage() {
	const { settings, navigationItems } = Route.useLoaderData();
	const shopTitle = settings?.shopTitle || "Shop";
	const { sessionId } = useCartSession();
	const [showAllProducts, setShowAllProducts] = useState(false);

	// Fetch popular products (for carousel)
	const { data: popularData, isLoading: popularLoading } = useQuery({
		queryKey: ["popular-items"],
		queryFn: () => getPopularItemsServerFn({ data: { count: 8 } }),
		staleTime: 1000 * 60 * 5, // 5 minutes
	});

	// Fetch personalized recommendations (larger set for feed)
	const { data: recommendedData, isLoading: recommendedLoading } = useQuery({
		queryKey: ["recommendations-feed", sessionId],
		queryFn: () =>
			getRecommendationsServerFn({ data: { userId: sessionId!, count: 50 } }),
		enabled: !!sessionId,
		staleTime: 1000 * 60 * 5, // 5 minutes
	});

	// Fetch latest products (fallback/supplement for feed)
	const { data: latestData, isLoading: latestLoading } = useQuery({
		queryKey: ["latest-items"],
		queryFn: () => getLatestItemsServerFn({ data: { count: 50 } }),
		staleTime: 1000 * 60 * 5, // 5 minutes
	});

	const popularProducts = popularData?.products || [];
	const recommendedProducts = recommendedData?.products || [];
	const latestProducts = latestData?.products || [];

	// Combine products for feed: personalized first, then popular, then latest (avoiding duplicates)
	const feedProducts = useMemo(() => {
		const seenIds = new Set<string>();
		const combined: typeof recommendedProducts = [];

		// Add personalized recommendations first (if available)
		for (const product of recommendedProducts) {
			if (!seenIds.has(product.id)) {
				seenIds.add(product.id);
				combined.push(product);
			}
		}

		// Add popular products
		for (const product of popularProducts) {
			if (!seenIds.has(product.id)) {
				seenIds.add(product.id);
				combined.push(product);
			}
		}

		// Fill with latest products
		for (const product of latestProducts) {
			if (!seenIds.has(product.id)) {
				seenIds.add(product.id);
				combined.push(product);
			}
		}

		return combined;
	}, [recommendedProducts, popularProducts, latestProducts]);

	// Show 12 products initially, all when expanded
	const displayedFeedProducts = showAllProducts
		? feedProducts
		: feedProducts.slice(0, 12);
	const hasMoreProducts = feedProducts.length > 12;
	const feedLoading = (sessionId && recommendedLoading) || popularLoading || latestLoading;

	const features = [
		{
			icon: <Truck className="w-8 h-8 text-primary" />,
			title: "Brza dostava",
			description: "Besplatna dostava za narudžbe preko 50 KM",
		},
		{
			icon: <Shield className="w-8 h-8 text-primary" />,
			title: "Sigurna kupovina",
			description: "Zaštićena plaćanja i povrat novca",
		},
		{
			icon: <Heart className="w-8 h-8 text-primary" />,
			title: "Kvalitet proizvoda",
			description: "Samo najbolji proizvodi za naše kupce",
		},
	];

	return (
		<ShopLayout settings={settings} navigationItems={navigationItems}>
			{/* Hero Section */}
			<section className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent py-20 px-4">
				<div className="container mx-auto text-center">
					<h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
						Dobrodošli u {shopTitle}
					</h1>
					<p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-2xl mx-auto">
						Pronađite najbolje proizvode po najboljim cijenama
					</p>
					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						<Link
							to="/products"
							className="inline-flex items-center justify-center px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors"
						>
							<ShoppingBag className="w-5 h-5 mr-2" />
							Pregledaj proizvode
						</Link>
						<Link
							to="/shop/about"
							className="inline-flex items-center justify-center px-8 py-3 bg-white text-gray-900 border-2 border-gray-300 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
						>
							Saznaj više
						</Link>
					</div>
				</div>
			</section>

			{/* Popular Products Carousel */}
			{(popularProducts.length > 0 || popularLoading) && (
				<section className="py-8 px-4">
					<div className="container mx-auto">
						<RecommendationCarousel
							title="Popularno"
							products={popularProducts}
							loading={popularLoading}
						/>
					</div>
				</section>
			)}

			{/* Product Feed - Main Grid */}
			<section className="py-12 px-4 bg-gray-50">
				<div className="container mx-auto">
					<div className="flex items-center justify-between mb-8">
						<div>
							<h2 className="text-2xl md:text-3xl font-bold text-gray-900">
								{sessionId && recommendedProducts.length > 0
									? "Preporučeno za vas"
									: "Otkrijte proizvode"}
							</h2>
							<p className="text-gray-600 mt-1">
								{sessionId && recommendedProducts.length > 0
									? "Proizvodi odabrani na osnovu vaših preferencija"
									: "Najnoviji i najpopularniji proizvodi"}
							</p>
						</div>
						<Link
							to="/products"
							className="text-primary hover:underline font-medium hidden sm:block"
						>
							Pogledaj sve
						</Link>
					</div>

					{feedLoading ? (
						<div className="flex justify-center py-12">
							<Loader2 className="size-8 animate-spin text-muted-foreground" />
						</div>
					) : displayedFeedProducts.length > 0 ? (
						<>
							<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
								{displayedFeedProducts.map((product) => (
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

							{/* Load More / Show Less */}
							{hasMoreProducts && (
								<div className="flex justify-center mt-8">
									<Button
										variant="outline"
										size="lg"
										onClick={() => setShowAllProducts(!showAllProducts)}
									>
										{showAllProducts
											? "Prikaži manje"
											: `Prikaži još (${feedProducts.length - 12})`}
									</Button>
								</div>
							)}

							{/* View All Link - Mobile */}
							<div className="flex justify-center mt-6 sm:hidden">
								<Link
									to="/products"
									className="text-primary hover:underline font-medium"
								>
									Pogledaj sve proizvode
								</Link>
							</div>
						</>
					) : (
						<div className="text-center py-12 text-gray-500">
							<p>Nema proizvoda za prikaz</p>
							<Link
								to="/products"
								className="text-primary hover:underline mt-2 inline-block"
							>
								Pregledaj sve proizvode
							</Link>
						</div>
					)}
				</div>
			</section>

			{/* Features Section */}
			<section className="py-16 px-4">
				<div className="container mx-auto">
					<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						{features.map((feature, index) => (
							<div
								key={index}
								className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 text-center hover:shadow-md transition-shadow"
							>
								<div className="flex justify-center mb-4">{feature.icon}</div>
								<h3 className="text-xl font-semibold text-gray-900 mb-2">
									{feature.title}
								</h3>
								<p className="text-gray-600">{feature.description}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="bg-gray-900 text-white py-16 px-4">
				<div className="container mx-auto text-center">
					<h2 className="text-3xl md:text-4xl font-bold mb-4">
						Spremni za kupovinu?
					</h2>
					<p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
						Pregledajte našu kolekciju proizvoda i pronađite ono što tražite
					</p>
					<Link
						to="/products"
						className="inline-flex items-center justify-center px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:bg-primary/90 transition-colors"
					>
						Pregledaj proizvode
					</Link>
				</div>
			</section>
		</ShopLayout>
	);
}
