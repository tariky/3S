"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { getCartQueryOptions } from "@/queries/cart";
import { Button } from "@/components/ui/button";
import { ShoppingCart } from "lucide-react";
import { useCartSession } from "@/hooks/useCartSession";
import { cn } from "@/lib/utils";

interface CartItem {
	quantity: number;
}

interface CartData {
	items: CartItem[];
}

interface CartButtonProps {
	onClick: () => void;
	className?: string;
	cartRef?: React.RefObject<HTMLButtonElement | null>;
	isCartBouncing?: boolean;
}

export function CartButton({ onClick, className, cartRef, isCartBouncing }: CartButtonProps) {
	const { sessionId } = useCartSession();
	const localRef = React.useRef<HTMLButtonElement>(null);

	// Sync external ref with local ref
	React.useEffect(() => {
		if (cartRef && localRef.current) {
			(cartRef as React.MutableRefObject<HTMLButtonElement | null>).current = localRef.current;
		}
	});

	const { data: cartData } = useQuery(
		getCartQueryOptions(sessionId || undefined)
	) as { data: CartData | undefined };

	const itemCount =
		cartData?.items.reduce(
			(sum: number, item: CartItem) => sum + item.quantity,
			0
		) || 0;

	return (
		<Button
			ref={localRef}
			variant="outline"
			size="icon"
			onClick={onClick}
			className={cn(
				"relative",
				isCartBouncing && "animate-cart-bounce",
				className
			)}
		>
			<ShoppingCart className="size-5" />
			{itemCount > 0 && (
				<span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold rounded-full size-5 flex items-center justify-center">
					{itemCount > 99 ? "99+" : itemCount}
				</span>
			)}
		</Button>
	);
}

