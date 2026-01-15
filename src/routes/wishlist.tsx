import { createFileRoute, Link } from "@tanstack/react-router";
import { ShopLayout } from "@/components/shop/ShopLayout";
import { ProductCard } from "@/components/shop/ProductCard";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	getWishlistQueryOptions,
	removeFromWishlistServerFn,
	WISHLIST_QUERY_KEY,
} from "@/queries/wishlist";
import { getPublicShopSettingsServerFn } from "@/queries/settings";
import { getPublicNavigationServerFn } from "@/queries/navigation";
import { useCartSession } from "@/hooks/useCartSession";
import { Button } from "@/components/ui/button";
import { Loader2, Heart, Trash2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/wishlist")({
	component: WishlistPage,
	loader: async () => {
		const [settings, navigationItems] = await Promise.all([
			getPublicShopSettingsServerFn(),
			getPublicNavigationServerFn(),
		]);
		return { settings, navigationItems };
	},
	head: () => ({
		meta: [
			{ title: "Lista želja" },
			{ name: "description", content: "Pregledajte proizvode koje ste sačuvali" },
		],
	}),
});

function WishlistPage() {
	const { settings, navigationItems } = Route.useLoaderData();
	const { sessionId } = useCartSession();
	const queryClient = useQueryClient();

	const { data, isLoading } = useQuery(
		getWishlistQueryOptions(sessionId || undefined)
	);

	const removeMutation = useMutation({
		mutationFn: async (productId: string) => {
			return await removeFromWishlistServerFn({
				data: { productId, sessionId: sessionId || undefined },
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [WISHLIST_QUERY_KEY] });
			toast.success("Proizvod uklonjen iz liste želja");
		},
		onError: () => {
			toast.error("Greška pri uklanjanju proizvoda");
		},
	});

	const items = data?.items || [];

	return (
		<ShopLayout settings={settings} navigationItems={navigationItems}>
			<div className="bg-white min-h-screen">
				<div className="container mx-auto px-4 py-8">
					<div className="flex items-center gap-3 mb-8">
						<Heart className="size-8 text-red-500 fill-red-500" />
						<h1 className="text-3xl font-bold text-gray-900">
							Lista želja
						</h1>
					</div>

					{isLoading ? (
						<div className="flex items-center justify-center py-12">
							<Loader2 className="size-8 animate-spin text-primary" />
						</div>
					) : items.length > 0 ? (
						<>
							<p className="text-gray-600 mb-6">
								{items.length} {items.length === 1 ? "proizvod" : "proizvoda"} u listi želja
							</p>
							<div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
								{items.map((item) => {
									const product = item.product;
									if (!product) return null;

									const primaryMedia = product.media?.[0]?.media;

									// Format variants for ProductCard
									const variants = (product.variants || []).map((v: any) => {
										// Get inventory available - it's a single object, not array
										const inv = v.inventory;
										const available = inv ? (typeof inv.available === 'number' ? inv.available : Number(inv.available) || 0) : 0;

										// Map variant options to the format ProductCard expects
										const options = (v.variantOptions || []).map((vo: any) => ({
											optionName: vo.option?.name || "",
											optionValue: vo.optionValue?.name || "",
										}));

										return {
											id: v.id,
											price: v.price ? String(v.price) : "0",
											compareAtPrice: v.compareAtPrice ? String(v.compareAtPrice) : null,
											options,
											inventory: { available },
										};
									});

									// Calculate prices from formatted variants
									const prices = variants.map((v: any) => parseFloat(v.price) || 0);
									const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0;
									const comparePrices = variants
										.map((v: any) => v.compareAtPrice ? parseFloat(v.compareAtPrice) : 0)
										.filter((p: number) => p > 0);
									const highestComparePrice = comparePrices.length > 0 ? Math.max(...comparePrices) : null;

									return (
										<div key={item.id} className="relative group">
											<ProductCard
												id={product.id}
												name={product.name}
												price={String(lowestPrice)}
												compareAtPrice={highestComparePrice && highestComparePrice > lowestPrice ? String(highestComparePrice) : null}
												image={primaryMedia?.url || null}
												slug={product.slug}
												variants={variants}
											/>
											<button
												onClick={() => removeMutation.mutate(product.id)}
												disabled={removeMutation.isPending}
												className="absolute bottom-16 left-3 z-10 p-2 rounded-full bg-white/90 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors shadow-sm"
												aria-label="Ukloni iz liste želja"
											>
												<Trash2 className="size-4" />
											</button>
										</div>
									);
								})}
							</div>
						</>
					) : (
						<div className="text-center py-16">
							<Heart className="size-16 text-gray-300 mx-auto mb-4" />
							<h2 className="text-xl font-semibold text-gray-700 mb-2">
								Lista želja je prazna
							</h2>
							<p className="text-gray-500 mb-6">
								Dodajte proizvode u listu želja klikom na ikonu srca
							</p>
							<Button asChild>
								<Link to="/">
									<ShoppingBag className="size-4 mr-2" />
									Pregledaj proizvode
								</Link>
							</Button>
						</div>
					)}
				</div>
			</div>
		</ShopLayout>
	);
}
