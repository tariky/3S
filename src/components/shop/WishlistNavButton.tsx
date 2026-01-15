"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface WishlistNavButtonProps {
	wishlistRef?: React.RefObject<HTMLButtonElement | null>;
	isWishlistBouncing?: boolean;
	className?: string;
}

export function WishlistNavButton({ wishlistRef, isWishlistBouncing, className }: WishlistNavButtonProps) {
	return (
		<Button
			ref={wishlistRef}
			variant="ghost"
			size="icon"
			className={cn(
				"h-9 w-9",
				isWishlistBouncing && "animate-cart-bounce",
				className
			)}
			asChild
		>
			<Link to="/wishlist">
				<Heart className="size-5" />
			</Link>
		</Button>
	);
}
