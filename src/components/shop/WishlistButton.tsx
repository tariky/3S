"use client";

import * as React from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	toggleWishlistServerFn,
	getWishlistProductIdsQueryOptions,
	WISHLIST_QUERY_KEY,
} from "@/queries/wishlist";
import { useCartSession } from "@/hooks/useCartSession";
import { toast } from "sonner";
import { useFlyToCartSafe } from "./FlyToCartProvider";

interface WishlistButtonProps {
	productId: string;
	className?: string;
	size?: "sm" | "md" | "lg";
	imageUrl?: string | null;
	imageRef?: React.RefObject<HTMLElement>;
}

export function WishlistButton({
	productId,
	className,
	size = "md",
	imageUrl,
	imageRef,
}: WishlistButtonProps) {
	const { sessionId } = useCartSession();
	const queryClient = useQueryClient();
	const buttonRef = React.useRef<HTMLButtonElement>(null);
	const flyToCart = useFlyToCartSafe();

	// Get all wishlisted product IDs for quick lookup
	const { data: wishlistData } = useQuery(
		getWishlistProductIdsQueryOptions(sessionId || undefined)
	);

	const isInWishlist = wishlistData?.productIds?.includes(productId) ?? false;

	const handleFlyAnimation = React.useCallback(() => {
		if (flyToCart?.triggerFlyToWishlist && imageUrl) {
			const startElement = imageRef?.current || buttonRef.current;
			if (startElement) {
				flyToCart.triggerFlyToWishlist(imageUrl, startElement);
			}
		}
	}, [flyToCart, imageUrl, imageRef]);

	const toggleMutation = useMutation({
		mutationFn: async () => {
			return await toggleWishlistServerFn({
				data: { productId, sessionId: sessionId || undefined },
			});
		},
		onSuccess: (data) => {
			// Only trigger animation when ADDING to wishlist
			if (data.isInWishlist) {
				handleFlyAnimation();
			}
			queryClient.invalidateQueries({ queryKey: [WISHLIST_QUERY_KEY] });
		},
		onError: () => {
			toast.error("Greška pri ažuriranju liste želja");
		},
	});

	const handleClick = (e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		toggleMutation.mutate();
	};

	const sizeClasses = {
		sm: "size-8",
		md: "size-10",
		lg: "size-12",
	};

	const iconSizes = {
		sm: "size-4",
		md: "size-5",
		lg: "size-6",
	};

	return (
		<button
			ref={buttonRef}
			onClick={handleClick}
			disabled={toggleMutation.isPending}
			className={cn(
				"rounded-full flex items-center justify-center transition-all duration-200",
				"hover:scale-110 active:scale-95",
				sizeClasses[size],
				isInWishlist
					? "bg-red-500 text-white hover:bg-red-600"
					: "bg-white/90 text-gray-600 hover:bg-white hover:text-red-500 shadow-md",
				toggleMutation.isPending && "opacity-50 cursor-not-allowed",
				className
			)}
			aria-label={isInWishlist ? "Ukloni iz liste želja" : "Dodaj u listu želja"}
		>
			<Heart
				className={cn(
					iconSizes[size],
					"transition-all duration-200",
					isInWishlist && "fill-current"
				)}
			/>
		</button>
	);
}
