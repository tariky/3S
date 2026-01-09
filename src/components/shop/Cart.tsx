"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	getCartQueryOptions,
	updateCartItemMutationOptions,
	removeFromCartMutationOptions,
	CART_QUERY_KEY,
} from "@/queries/cart";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCartSession } from "@/hooks/useCartSession";
import { ShoppingBag, Plus, Minus, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

interface CartItem {
	id: string;
	quantity: number;
	image: string | null;
	inventory: { available: number } | null;
	variantOptions: { optionName: string; optionValue: string }[];
	product: {
		id: string;
		name: string;
		slug: string;
		price: string;
	} | null;
	variant: {
		id: string;
		price: string | null;
	} | null;
}

interface CartData {
	cart: { id: string };
	items: CartItem[];
}

interface CartProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function Cart({ open, onOpenChange }: CartProps) {
	const { sessionId } = useCartSession();
	const queryClient = useQueryClient();

	const { data: cartData, isLoading } = useQuery(
		getCartQueryOptions(sessionId || undefined)
	) as { data: CartData | undefined; isLoading: boolean };

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
		} catch (error: unknown) {
			const err = error as { message?: string };
			if (err?.message) {
				alert(err.message);
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
	const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
	const subtotal = items.reduce((sum, item) => {
		const price = parseFloat(
			item.variant?.price || item.product?.price || "0"
		);
		return sum + price * item.quantity;
	}, 0);

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="w-full sm:max-w-[420px] flex flex-col p-0">
				{/* Header */}
				<SheetHeader className="px-6 py-4 border-b border-gray-100">
					<div className="flex items-center justify-between">
						<SheetTitle className="text-lg font-semibold">
							Korpa
							{itemCount > 0 && (
								<span className="ml-2 text-sm font-normal text-gray-500">
									({itemCount} {itemCount === 1 ? "artikal" : "artikla"})
								</span>
							)}
						</SheetTitle>
					</div>
				</SheetHeader>

				{isLoading ? (
					<div className="flex-1 flex items-center justify-center">
						<Loader2 className="size-8 animate-spin text-gray-400" />
					</div>
				) : items.length === 0 ? (
					<div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
						<div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-6">
							<ShoppingBag className="size-10 text-gray-300" />
						</div>
						<h3 className="text-lg font-medium text-gray-900 mb-2">
							Vaša korpa je prazna
						</h3>
						<p className="text-sm text-gray-500 mb-8 max-w-[240px]">
							Izgleda da još niste dodali ništa u korpu
						</p>
						<Button
							size="lg"
							className="w-full max-w-[200px]"
							asChild
							onClick={() => onOpenChange(false)}
						>
							<Link to="/products" search={{ tags: undefined }}>
								Pogledaj proizvode
							</Link>
						</Button>
					</div>
				) : (
					<>
						{/* Items List */}
						<div className="flex-1 overflow-y-auto">
							<div className="px-6 py-4 space-y-0 divide-y divide-gray-100">
								{items.map((item) => {
									const price = parseFloat(
										item.variant?.price || item.product?.price || "0"
									);
									const availableQuantity = item.inventory?.available ?? 99;
									const canIncrease = item.quantity < availableQuantity;

									// Format variant options (e.g., "M" or "M / Crna")
									const variantLabel =
										item.variantOptions && item.variantOptions.length > 0
											? item.variantOptions
													.map((opt) => opt.optionValue)
													.join(" / ")
											: null;

									return (
										<div key={item.id} className="py-4 first:pt-0 last:pb-0">
											<div className="flex gap-4">
												{/* Product Image */}
												<Link
													to="/product/$slug"
													params={{ slug: item.product?.slug || "" }}
													onClick={() => onOpenChange(false)}
													className="relative w-[88px] h-[110px] flex-shrink-0 rounded-lg overflow-hidden bg-gray-50 group"
												>
													{item.image ? (
														<img
															src={item.image}
															alt={item.product?.name || "Product"}
															className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
														/>
													) : (
														<div className="w-full h-full flex items-center justify-center">
															<ShoppingBag className="size-6 text-gray-300" />
														</div>
													)}
												</Link>

												{/* Product Info */}
												<div className="flex-1 min-w-0 flex flex-col">
													{/* Title and Remove Button Row */}
													<div className="flex items-start justify-between gap-2">
														<Link
															to="/product/$slug"
															params={{ slug: item.product?.slug || "" }}
															onClick={() => onOpenChange(false)}
															className="font-medium text-gray-900 text-sm leading-tight line-clamp-2 hover:text-gray-600 transition-colors"
														>
															{item.product?.name || "Proizvod"}
														</Link>
														<button
															onClick={() => handleRemoveItem(item.id)}
															disabled={removeFromCartMutation.isPending}
															className="p-1 -mr-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
															aria-label="Ukloni proizvod"
														>
															<X className="size-4" />
														</button>
													</div>

													{/* Variant */}
													{variantLabel && (
														<span className="text-xs text-gray-500 mt-1">
															{variantLabel}
														</span>
													)}

													{/* Price */}
													<span className="text-sm font-semibold text-gray-900 mt-auto pt-2">
														{price.toFixed(2)} KM
													</span>

													{/* Quantity Controls */}
													<div className="flex items-center justify-between mt-3">
														<div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
															<button
																onClick={() =>
																	item.quantity === 1
																		? handleRemoveItem(item.id)
																		: handleUpdateQuantity(
																				item.id,
																				item.quantity - 1
																			)
																}
																disabled={updateCartItemMutation.isPending}
																className={cn(
																	"w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50",
																	item.quantity <= 1 && "text-gray-400"
																)}
																aria-label="Smanji količinu"
															>
																<Minus className="size-3.5" />
															</button>
															<span className="w-10 h-8 flex items-center justify-center text-sm font-medium text-gray-900 border-x border-gray-200">
																{item.quantity}
															</span>
															<button
																onClick={() =>
																	handleUpdateQuantity(item.id, item.quantity + 1)
																}
																disabled={
																	updateCartItemMutation.isPending || !canIncrease
																}
																className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:text-gray-300"
																aria-label="Povećaj količinu"
															>
																<Plus className="size-3.5" />
															</button>
														</div>

														{/* Item Total */}
														<span className="text-sm font-semibold text-gray-900">
															{(price * item.quantity).toFixed(2)} KM
														</span>
													</div>
												</div>
											</div>
										</div>
									);
								})}
							</div>
						</div>

						{/* Footer */}
						<div className="border-t border-gray-100 bg-white">
							{/* Subtotal */}
							<div className="px-6 py-4 space-y-3">
								<div className="flex items-center justify-between">
									<span className="text-sm text-gray-600">Ukupno</span>
									<span className="text-lg font-semibold text-gray-900">
										{subtotal.toFixed(2)} KM
									</span>
								</div>
								<p className="text-xs text-gray-500">
									Dostava se obračunava prilikom naručivanja
								</p>
							</div>

							{/* Actions */}
							<div className="px-6 pb-6 pt-2 space-y-3">
								<Button
									size="lg"
									className="w-full h-12 text-base font-medium"
									asChild
									onClick={() => onOpenChange(false)}
								>
									<Link to="/checkout">Nastavi na plaćanje</Link>
								</Button>
								<Button
									variant="outline"
									size="lg"
									className="w-full h-11"
									onClick={() => onOpenChange(false)}
									asChild
								>
									<Link to="/products" search={{ tags: undefined }}>
										Nastavi kupovinu
									</Link>
								</Button>
							</div>
						</div>
					</>
				)}
			</SheetContent>
		</Sheet>
	);
}
