"use client";

import * as React from "react";
import { ShoppingCart, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuantityPicker } from "./QuantityPicker";
import { cn } from "@/lib/utils";
import { useFlyToCartSafe } from "./FlyToCartProvider";

interface MobileStickyCartProps {
	price: number;
	compareAtPrice?: number | null;
	quantity: number;
	onQuantityChange: (quantity: number) => void;
	maxQuantity: number;
	onAddToCart: () => void;
	isAddingToCart: boolean;
	disabled?: boolean;
	showAddedFeedback?: boolean;
	allOptionsSelected?: boolean;
	imageRef?: React.RefObject<HTMLDivElement | null>;
	primaryImageUrl?: string;
}

export function MobileStickyCart({
	price,
	compareAtPrice,
	quantity,
	onQuantityChange,
	maxQuantity,
	onAddToCart,
	isAddingToCart,
	disabled = false,
	showAddedFeedback = false,
	allOptionsSelected = true,
	imageRef,
	primaryImageUrl,
}: MobileStickyCartProps) {
	const flyToCart = useFlyToCartSafe();
	const hasDiscount = compareAtPrice && compareAtPrice > price;
	// Only show out of stock if options are selected but no stock available
	const isOutOfStock = allOptionsSelected && maxQuantity === 0;

	const handleClick = () => {
		// Trigger fly animation if available
		if (flyToCart && imageRef?.current && primaryImageUrl) {
			flyToCart.triggerFly(primaryImageUrl, imageRef.current);
		}
		onAddToCart();
	};

	return (
		<div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-3 lg:hidden z-40 safe-area-bottom">
			<div className="flex items-center gap-3 max-w-lg mx-auto">
				{/* Price */}
				<div className="flex flex-col min-w-0">
					<span className="text-lg font-semibold text-foreground truncate">
						{price.toFixed(2)} KM
					</span>
					{hasDiscount && (
						<span className="text-xs text-muted-foreground line-through truncate">
							{compareAtPrice!.toFixed(2)} KM
						</span>
					)}
				</div>

				{/* Quantity Picker - only show when options are selected and in stock */}
				{allOptionsSelected && !isOutOfStock && (
					<QuantityPicker
						value={quantity}
						onChange={onQuantityChange}
						min={1}
						max={maxQuantity}
						disabled={disabled || isAddingToCart}
						size="sm"
					/>
				)}

				{/* Add to Cart Button */}
				<Button
					onClick={handleClick}
					disabled={!allOptionsSelected || disabled || isAddingToCart || isOutOfStock || showAddedFeedback}
					className={cn(
						"flex-1 h-10 font-medium transition-all duration-300",
						isOutOfStock && "bg-muted-foreground",
						showAddedFeedback && "bg-emerald-500 hover:bg-emerald-500"
					)}
				>
					{isAddingToCart ? (
						<Loader2 className="size-4 animate-spin" />
					) : showAddedFeedback ? (
						<span className="flex items-center gap-1.5 animate-success-pop">
							<Check className="size-4" />
							Dodano
						</span>
					) : !allOptionsSelected ? (
						"Odaberite opcije"
					) : isOutOfStock ? (
						"Nema na zalihi"
					) : (
						<>
							<ShoppingCart className="size-4 mr-2" />
							Dodaj
						</>
					)}
				</Button>
			</div>
		</div>
	);
}
