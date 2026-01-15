"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, ShoppingCart, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFlyToCartSafe } from "@/components/shop/FlyToCartProvider";

interface AddToCartWithAnimationProps {
	onAddToCart: () => Promise<void>;
	isAdding: boolean;
	showAddedFeedback: boolean;
	disabled: boolean;
	allOptionsSelected: boolean;
	isInStock: boolean;
	imageRef?: React.RefObject<HTMLDivElement | null>;
	primaryImageUrl?: string;
	size?: "default" | "lg";
	className?: string;
}

export function AddToCartWithAnimation({
	onAddToCart,
	isAdding,
	showAddedFeedback,
	disabled,
	allOptionsSelected,
	isInStock,
	imageRef,
	primaryImageUrl,
	size = "lg",
	className,
}: AddToCartWithAnimationProps) {
	const flyToCart = useFlyToCartSafe();

	const handleClick = async () => {
		// Trigger fly animation if available
		if (flyToCart && imageRef?.current && primaryImageUrl) {
			flyToCart.triggerFly(primaryImageUrl, imageRef.current);
		}

		// Execute the add to cart logic
		await onAddToCart();
	};

	return (
		<Button
			size={size}
			className={cn(
				"flex-1 h-12 text-base font-medium transition-all duration-300",
				showAddedFeedback && "bg-emerald-500 hover:bg-emerald-500",
				className
			)}
			disabled={!allOptionsSelected || !isInStock || isAdding || showAddedFeedback || disabled}
			onClick={handleClick}
		>
			{isAdding ? (
				<Loader2 className="size-5 animate-spin" />
			) : showAddedFeedback ? (
				<span className="flex items-center gap-2 animate-success-pop">
					<Check className="size-5" />
					Dodano u korpu
				</span>
			) : !allOptionsSelected ? (
				"Odaberite opcije"
			) : (
				<>
					<ShoppingCart className="size-5 mr-2" />
					{isInStock ? "Dodaj u korpu" : "Nema na zalihi"}
				</>
			)}
		</Button>
	);
}
