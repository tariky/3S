"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	getCartQueryOptions,
	addToCartMutationOptions,
	updateCartItemMutationOptions,
	removeFromCartMutationOptions,
	CART_QUERY_KEY,
} from "@/queries/cart";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCartSession } from "@/hooks/useCartSession";
import { ShoppingCart, Plus, Minus, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

interface CartProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function Cart({ open, onOpenChange }: CartProps) {
	const { sessionId } = useCartSession();
	const queryClient = useQueryClient();

	const { data: cartData, isLoading } = useQuery(
		getCartQueryOptions(sessionId || undefined)
	);

	const addToCartMutation = useMutation(
		addToCartMutationOptions(sessionId || undefined)
	);
	const updateCartItemMutation = useMutation(
		updateCartItemMutationOptions(sessionId || undefined)
	);
	const removeFromCartMutation = useMutation(
		removeFromCartMutationOptions(sessionId || undefined)
	);

	const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
		try {
			await updateCartItemMutation.mutateAsync({
				itemId,
				quantity: newQuantity,
			});
			queryClient.invalidateQueries({ queryKey: [CART_QUERY_KEY] });
		} catch (error: any) {
			// Show error message if inventory check fails
			if (error?.message) {
				alert(error.message);
			} else {
				alert("Greška pri ažuriranju količine");
			}
		}
	};

	const handleRemoveItem = async (itemId: string) => {
		await removeFromCartMutation.mutateAsync({ itemId });
		queryClient.invalidateQueries({ queryKey: [CART_QUERY_KEY] });
	};

	const items = cartData?.items || [];
	const total = items.reduce((sum, item) => {
		const price = parseFloat(
			item.variant?.price || item.product?.price || "0"
		);
		return sum + price * item.quantity;
	}, 0);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="w-full sm:max-w-md flex flex-col">
				<SheetHeader>
					<SheetTitle>Korpa</SheetTitle>
				</SheetHeader>

				{isLoading ? (
					<div className="flex items-center justify-center py-12">
						<Loader2 className="size-8 animate-spin text-primary" />
					</div>
				) : items.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-12 text-center">
						<ShoppingCart className="size-16 text-gray-300 mb-4" />
						<p className="text-gray-600 mb-4">Vaša korpa je prazna</p>
						<Button asChild onClick={() => onOpenChange(false)}>
							<Link to="/products">Nastavi kupovinu</Link>
						</Button>
					</div>
				) : (
					<>
						<div className="flex-1 overflow-y-auto py-4">
							<div className="space-y-4">
								{items.map((item) => {
									const price = parseFloat(
										item.variant?.price || item.product?.price || "0"
									);
									const itemTotal = price * item.quantity;
									const availableQuantity =
										item.inventory?.available ?? 0;
									const isOutOfStock = availableQuantity <= 0;
									const canIncrease =
										!isOutOfStock && item.quantity < availableQuantity;

									return (
										<div
											key={item.id}
											className="flex gap-4 border-b border-gray-200 pb-4"
										>
											{/* Product Image */}
											<div className="relative aspect-square w-20 h-20 flex-shrink-0 rounded-md overflow-hidden bg-gray-100">
												{item.image ? (
													<img
														src={item.image}
														alt={item.product?.name || "Product"}
														className="w-full h-full object-cover"
													/>
												) : (
													<div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
														Slika
													</div>
												)}
											</div>

											{/* Product Info */}
											<div className="flex-1 min-w-0">
												<h3 className="font-medium text-gray-900 mb-1 line-clamp-2">
													{item.product?.name || "Proizvod"}
												</h3>
												{item.variant && (
													<p className="text-sm text-gray-500 mb-2">
														Variant: {item.variant.id}
													</p>
												)}
												<div className="flex items-center justify-between">
													<span className="text-sm font-semibold text-gray-900">
														{price.toFixed(2)} KM
													</span>
													{isOutOfStock ? (
														<span className="text-xs text-red-500">
															Nema na zalihi
														</span>
													) : (
														<span className="text-xs text-gray-500">
															Dostupno: {availableQuantity} kom
														</span>
													)}
												</div>

												{/* Quantity Controls */}
												<div className="flex items-center gap-2 mt-2">
													<button
														onClick={() =>
															handleUpdateQuantity(
																item.id,
																Math.max(0, item.quantity - 1)
															)
														}
														disabled={
															updateCartItemMutation.isPending ||
															item.quantity <= 1
														}
														className={cn(
															"p-1 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed",
															item.quantity <= 1 && "opacity-50"
														)}
													>
														{item.quantity === 1 ? (
															<Trash2 className="size-4 text-red-500" />
														) : (
															<Minus className="size-4" />
														)}
													</button>
													<span className="text-sm font-medium w-8 text-center">
														{item.quantity}
													</span>
													<button
														onClick={() =>
															handleUpdateQuantity(
																item.id,
																item.quantity + 1
															)
														}
														disabled={
															updateCartItemMutation.isPending ||
															!canIncrease
														}
														title={
															!canIncrease
																? `Dostupno: ${availableQuantity} kom`
																: undefined
														}
														className={cn(
															"p-1 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
														)}
													>
														<Plus className="size-4" />
													</button>
													<button
														onClick={() => handleRemoveItem(item.id)}
														disabled={removeFromCartMutation.isPending}
														className="ml-auto p-1 rounded-md text-red-500 hover:bg-red-50 disabled:opacity-50"
													>
														<Trash2 className="size-4" />
													</button>
												</div>
												<div className="text-sm text-gray-600 mt-1">
													Ukupno: {itemTotal.toFixed(2)} KM
												</div>
											</div>
										</div>
									);
								})}
							</div>
						</div>

						{/* Footer with Total */}
						<SheetFooter className="flex-col gap-4 border-t border-gray-200 pt-4">
							<div className="flex items-center justify-between w-full text-lg font-bold">
								<span>Ukupno:</span>
								<span>{total.toFixed(2)} KM</span>
							</div>
							<Button
								size="lg"
								className="w-full"
								asChild
								onClick={() => onOpenChange(false)}
							>
								<Link to="/checkout">Nastavi na plaćanje</Link>
							</Button>
							<Button
								variant="outline"
								className="w-full"
								onClick={() => onOpenChange(false)}
							>
								<Link to="/products">Nastavi kupovinu</Link>
							</Button>
						</SheetFooter>
					</>
				)}
			</SheetContent>
		</Sheet>
	);
}

