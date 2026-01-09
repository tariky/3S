"use client";

import { ShoppingCart, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuantityPicker } from "./QuantityPicker";
import { cn } from "@/lib/utils";

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
}: MobileStickyCartProps) {
	const hasDiscount = compareAtPrice && compareAtPrice > price;
	const isOutOfStock = maxQuantity === 0;

	return (
		<div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 lg:hidden z-40 safe-area-bottom">
			<div className="flex items-center gap-3 max-w-lg mx-auto">
				{/* Price */}
				<div className="flex flex-col min-w-0">
					<span className="text-lg font-semibold text-gray-900 truncate">
						{price.toFixed(2)} KM
					</span>
					{hasDiscount && (
						<span className="text-xs text-gray-400 line-through truncate">
							{compareAtPrice!.toFixed(2)} KM
						</span>
					)}
				</div>

				{/* Quantity Picker */}
				{!isOutOfStock && (
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
					onClick={onAddToCart}
					disabled={disabled || isAddingToCart || isOutOfStock || showAddedFeedback}
					className={cn(
						"flex-1 h-10 font-medium transition-all duration-300",
						isOutOfStock && "bg-gray-400",
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
