import { createFileRoute, Link } from "@tanstack/react-router";
import { ShopNavigation } from "@/components/shop/ShopNavigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getShopProductBySlugQueryOptions } from "@/queries/shop-products";
import { addToCartMutationOptions, CART_QUERY_KEY } from "@/queries/cart";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCartSession } from "@/hooks/useCartSession";

export const Route = createFileRoute("/product/$slug")({
	component: ProductDetailPage,
	loader: async ({ params }) => {
		// Prefetch the product data
		return {};
	},
});

function ProductDetailPage() {
	const { slug } = Route.useParams();
	const { sessionId } = useCartSession();
	const queryClient = useQueryClient();
	const { data: product, isLoading, error } = useQuery(
		getShopProductBySlugQueryOptions(slug)
	);
	const [selectedImageIndex, setSelectedImageIndex] = useState(0);
	const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
	const [selectedOptions, setSelectedOptions] = useState<
		Record<string, string>
	>({});
	const addToCartMutation = useMutation(
		addToCartMutationOptions(sessionId || undefined)
	);

	// Get images from media
	const images =
		product?.media
			?.map((item) => item.media?.url)
			.filter((url): url is string => !!url) || [];

	// Determine selected variant based on selected options
	const getSelectedVariant = () => {
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
	};

	const currentVariant = getSelectedVariant();
	const displayPrice = currentVariant?.price || product?.price || "0";
	const displayComparePrice =
		currentVariant?.compareAtPrice || product?.compareAtPrice;
	const priceNum = parseFloat(displayPrice);
	const comparePriceNum = displayComparePrice
		? parseFloat(displayComparePrice)
		: null;
	const hasDiscount = comparePriceNum && comparePriceNum > priceNum;

	// Get available inventory
	const availableQuantity =
		currentVariant?.inventory?.available || 0;
	const isInStock = availableQuantity > 0;

	const handleOptionChange = (optionId: string, valueId: string) => {
		setSelectedOptions((prev) => ({
			...prev,
			[optionId]: valueId,
		}));
	};

	const handleAddToCart = async () => {
		if (!product || !currentVariant) return;
		try {
			await addToCartMutation.mutateAsync({
				productId: product.id,
				variantId: currentVariant.id,
				quantity: 1,
			});
			queryClient.invalidateQueries({ queryKey: [CART_QUERY_KEY] });
		} catch (error: any) {
			if (error?.message) {
				alert(error.message);
			} else {
				console.error("Error adding to cart:", error);
			}
		}
	};

	const nextImage = () => {
		setSelectedImageIndex((prev) => (prev + 1) % images.length);
	};

	const prevImage = () => {
		setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length);
	};

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gray-50">
				<ShopNavigation />
				<div className="container mx-auto px-4 py-12">
					<div className="flex items-center justify-center">
						<Loader2 className="size-8 animate-spin text-primary" />
					</div>
				</div>
			</div>
		);
	}

	if (error || !product) {
		return (
			<div className="min-h-screen bg-gray-50">
				<ShopNavigation />
				<div className="container mx-auto px-4 py-12">
					<div className="text-center">
						<h1 className="text-2xl font-bold text-gray-900 mb-4">
							Proizvod nije pronađen
						</h1>
						<p className="text-gray-600 mb-6">
							Proizvod koji tražite ne postoji ili je uklonjen.
						</p>
						<Button asChild>
							<Link to="/products">Nazad na proizvode</Link>
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<ShopNavigation />
			<main className="container mx-auto px-4 py-8">
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
					{/* Image Carousel */}
					<div className="space-y-4">
						{/* Main Image */}
						<div className="relative aspect-square bg-white rounded-lg overflow-hidden border border-gray-200">
							{images.length > 0 ? (
								<>
									<img
										src={images[selectedImageIndex]}
										alt={product.name}
										className="w-full h-full object-cover"
									/>
									{/* Navigation Arrows */}
									{images.length > 1 && (
										<>
											<button
												onClick={prevImage}
												className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-colors lg:hidden"
												aria-label="Prethodna slika"
											>
												<ChevronLeft className="size-5" />
											</button>
											<button
												onClick={nextImage}
												className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg transition-colors lg:hidden"
												aria-label="Sljedeća slika"
											>
												<ChevronRight className="size-5" />
											</button>
										</>
									)}
									{/* Image Counter */}
									{images.length > 1 && (
										<div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full">
											{selectedImageIndex + 1} / {images.length}
										</div>
									)}
								</>
							) : (
								<div className="w-full h-full flex items-center justify-center text-gray-400">
									<span>Nema slike</span>
								</div>
							)}
						</div>

						{/* Thumbnail Images - Desktop */}
						{images.length > 1 && (
							<div className="hidden lg:grid grid-cols-4 gap-2">
								{images.map((image, index) => (
									<button
										key={index}
										onClick={() => setSelectedImageIndex(index)}
										className={cn(
											"aspect-square rounded-md overflow-hidden border-2 transition-all",
											selectedImageIndex === index
												? "border-primary"
												: "border-gray-200 hover:border-gray-300"
										)}
									>
										<img
											src={image}
											alt={`${product.name} ${index + 1}`}
											className="w-full h-full object-cover"
										/>
									</button>
								))}
							</div>
						)}

						{/* Thumbnail Images - Mobile (Horizontal Scroll) */}
						{images.length > 1 && (
							<div className="lg:hidden flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
								{images.map((image, index) => (
									<button
										key={index}
										onClick={() => setSelectedImageIndex(index)}
										className={cn(
											"flex-shrink-0 aspect-square w-20 rounded-md overflow-hidden border-2 transition-all",
											selectedImageIndex === index
												? "border-primary"
												: "border-gray-200"
										)}
									>
										<img
											src={image}
											alt={`${product.name} ${index + 1}`}
											className="w-full h-full object-cover"
										/>
									</button>
								))}
							</div>
						)}
					</div>

					{/* Product Info */}
					<div className="space-y-6">
						{/* Category */}
						{product.category && (
							<div className="text-sm text-gray-600">
								{product.category.name}
							</div>
						)}

						{/* Title */}
						<h1 className="text-3xl lg:text-4xl font-bold text-gray-900">
							{product.name}
						</h1>

						{/* Price */}
						<div className="flex items-center gap-3">
							<span className="text-3xl font-bold text-gray-900">
								{priceNum.toFixed(2)} KM
							</span>
							{hasDiscount && (
								<>
									<span className="text-xl text-gray-500 line-through">
										{comparePriceNum!.toFixed(2)} KM
									</span>
									<span className="bg-red-500 text-white text-sm font-semibold px-2 py-1 rounded">
										-{Math.round(
											((comparePriceNum! - priceNum) / comparePriceNum!) * 100
										)}%
									</span>
								</>
							)}
						</div>

						{/* Description */}
						{product.description && (
							<div className="prose max-w-none">
								<p className="text-gray-700 whitespace-pre-line">
									{product.description}
								</p>
							</div>
						)}

						{/* Variant Options */}
						{product.options && product.options.length > 0 && (
							<div className="space-y-4">
								{product.options.map((option) => (
									<div key={option.id}>
										<label className="block text-sm font-medium text-gray-900 mb-2">
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
															"px-4 py-2 rounded-md border-2 text-sm font-medium transition-all",
															isSelected
																? "border-primary bg-primary text-primary-foreground"
																: "border-gray-300 bg-white text-gray-900 hover:border-gray-400"
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

						{/* Stock Status */}
						<div className="flex items-center gap-2">
							{isInStock ? (
								<>
									<div className="size-3 bg-green-500 rounded-full" />
									<span className="text-sm text-gray-700">
										Na zalihi ({availableQuantity} kom)
									</span>
								</>
							) : (
								<>
									<div className="size-3 bg-red-500 rounded-full" />
									<span className="text-sm text-gray-700">Nema na zalihi</span>
								</>
							)}
						</div>

						{/* Add to Cart Button */}
						<Button
							size="lg"
							className="w-full"
							disabled={!isInStock || addToCartMutation.isPending}
							onClick={handleAddToCart}
						>
							<ShoppingCart className="size-5 mr-2" />
							{addToCartMutation.isPending
								? "Dodavanje..."
								: isInStock
									? "Dodaj u korpu"
									: "Nema na zalihi"}
						</Button>

						{/* Additional Info */}
						{product.sku && (
							<div className="text-sm text-gray-600">
								<span className="font-medium">SKU:</span> {product.sku}
							</div>
						)}
					</div>
				</div>
			</main>
			<footer className="bg-gray-900 text-white mt-16">
				<div className="container mx-auto px-4 py-12">
					<div className="text-center text-sm text-gray-400">
						<p>&copy; {new Date().getFullYear()} Lunatik. Sva prava zadržana.</p>
					</div>
				</div>
			</footer>
		</div>
	);
}
