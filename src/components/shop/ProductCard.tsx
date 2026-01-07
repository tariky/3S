"use client";

import * as React from "react";
import { Link } from "@tanstack/react-router";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addToCartMutationOptions, CART_QUERY_KEY } from "@/queries/cart";
import { useCartSession } from "@/hooks/useCartSession";

interface ProductCardProps {
	id: string;
	name: string;
	price: string;
	compareAtPrice?: string | null;
	image?: string | null;
	slug: string;
	variants?: Array<{
		inventory?: {
			available: number;
		} | null;
	}>;
}

export function ProductCard({
	id,
	name,
	price,
	compareAtPrice,
	image,
	slug,
	variants,
}: ProductCardProps) {
	const [isHovered, setIsHovered] = React.useState(false);
	const { sessionId } = useCartSession();
	const queryClient = useQueryClient();
	const addToCartMutation = useMutation(
		addToCartMutationOptions(sessionId || undefined)
	);

	const priceNum = parseFloat(price || "0");
	const comparePriceNum = compareAtPrice
		? parseFloat(compareAtPrice)
		: null;
	const hasDiscount = comparePriceNum && comparePriceNum > priceNum;

	// Check if product has any available variants
	const isInStock = React.useMemo(() => {
		if (!variants || variants.length === 0) {
			// If no variants, assume in stock (for products without variants)
			return true;
		}
		// Check if any variant has available inventory > 0
		return variants.some(
			(variant) => (variant.inventory?.available ?? 0) > 0
		);
	}, [variants]);

	return (
		<div
			className="group relative bg-white rounded-lg overflow-hidden border border-gray-200 hover:shadow-lg transition-shadow"
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			<Link to={`/product/${slug}`} className="block">
				{/* Product Image */}
				<div className="relative aspect-square bg-gray-100 overflow-hidden">
					{image ? (
						<img
							src={image}
							alt={name}
							className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
						/>
					) : (
						<div className="w-full h-full flex items-center justify-center text-gray-400">
							<span>Nema slike</span>
						</div>
					)}

					{/* Discount Badge */}
					{hasDiscount && (
						<div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded">
							-{Math.round(((comparePriceNum! - priceNum) / comparePriceNum!) * 100)}%
						</div>
					)}

					{/* Stock Status Badge */}
					{!isInStock && (
						<div className="absolute top-2 right-2 bg-gray-900/70 text-white text-xs font-semibold px-2 py-1 rounded">
							Nema na zalihi
						</div>
					)}

					{/* Add to Cart Overlay */}
					<div
						className={cn(
							"absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity duration-300",
							isHovered ? "opacity-100" : "opacity-0"
						)}
					>
						<Button
							size="lg"
							className="bg-white text-gray-900 hover:bg-gray-100"
							disabled={!isInStock || addToCartMutation.isPending}
							onClick={async (e) => {
								e.preventDefault();
								e.stopPropagation();
								try {
									await addToCartMutation.mutateAsync({
										productId: id,
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
							}}
						>
							<ShoppingCart className="w-5 h-5 mr-2" />
							{addToCartMutation.isPending ? "Dodavanje..." : "Dodaj u korpu"}
						</Button>
					</div>
				</div>

				{/* Product Info */}
				<div className="p-4">
					<h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
						{name}
					</h3>
					<div className="flex items-center gap-2 mb-2">
						<span className="text-lg font-bold text-gray-900">
							{priceNum.toFixed(2)} KM
						</span>
						{hasDiscount && (
							<span className="text-sm text-gray-500 line-through">
								{comparePriceNum!.toFixed(2)} KM
							</span>
						)}
					</div>
					{/* Stock Status */}
					<div className="flex items-center gap-1.5">
						<div
							className={cn(
								"size-2 rounded-full",
								isInStock ? "bg-green-500" : "bg-gray-400"
							)}
						/>
						<span
							className={cn(
								"text-xs",
								isInStock ? "text-gray-600" : "text-gray-400"
							)}
						>
							{isInStock ? "Na zalihi" : "Nema na zalihi"}
						</span>
					</div>
				</div>
			</Link>
		</div>
	);
}

