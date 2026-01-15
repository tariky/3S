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
import { ShoppingBag, Plus, Minus, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { ProxyImage } from "@/components/ui/proxy-image";

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
				<SheetHeader className="px-6 py-4 border-b border-border">
					<div className="flex items-center justify-between">
						<SheetTitle className="text-lg font-semibold">
							Korpa
							{itemCount > 0 && (
								<span className="ml-2 text-sm font-normal text-muted-foreground">
									({itemCount} {itemCount === 1 ? "artikal" : "artikla"})
								</span>
							)}
						</SheetTitle>
					</div>
				</SheetHeader>

				{isLoading ? (
					<div className="flex-1 flex items-center justify-center">
						<Loader2 className="size-8 animate-spin text-muted-foreground" />
					</div>
				) : items.length === 0 ? (
					<div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
						<div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
							<ShoppingBag className="size-10 text-muted-foreground/50" />
						</div>
						<h3 className="text-lg font-medium text-foreground mb-2">
							Vaša korpa je prazna
						</h3>
						<p className="text-sm text-muted-foreground mb-8 max-w-[240px]">
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
							<div className="px-6 py-4 space-y-0 divide-y divide-border">
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
										<div key={item.id} className="py-3 first:pt-0 last:pb-0">
											<div className="flex gap-3">
												{/* Product Image - Square */}
												<Link
													to="/product/$slug"
													params={{ slug: item.product?.slug || "" }}
													onClick={() => onOpenChange(false)}
													className="relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-muted"
												>
													{item.image ? (
														<ProxyImage
															src={item.image}
															alt={item.product?.name || "Product"}
															width={64}
															height={64}
															resizingType="fill"
															className="w-full h-full object-cover"
														/>
													) : (
														<div className="w-full h-full flex items-center justify-center">
															<ShoppingBag className="size-5 text-muted-foreground/50" />
														</div>
													)}
												</Link>

												{/* Product Info - Compact */}
												<div className="flex-1 min-w-0">
													{/* Title Row */}
													<div className="flex items-start justify-between gap-2">
														<Link
															to="/product/$slug"
															params={{ slug: item.product?.slug || "" }}
															onClick={() => onOpenChange(false)}
															className="text-sm font-medium text-foreground leading-tight line-clamp-1 hover:text-muted-foreground transition-colors"
														>
															{item.product?.name || "Proizvod"}
														</Link>
														<button
															onClick={() => handleRemoveItem(item.id)}
															disabled={removeFromCartMutation.isPending}
															className="p-0.5 -mr-0.5 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
															aria-label="Ukloni proizvod"
														>
															<Trash2 className="size-3.5" />
														</button>
													</div>

													{/* Variant & Price Row */}
													<div className="flex items-center gap-2 mt-0.5">
														{variantLabel && (
															<span className="text-xs text-muted-foreground">
																{variantLabel}
															</span>
														)}
														{variantLabel && (
															<span className="text-xs text-muted-foreground">·</span>
														)}
														<span className="text-xs font-medium text-foreground">
															{price.toFixed(2)} KM
														</span>
													</div>

													{/* Quantity & Total Row */}
													<div className="flex items-center justify-between mt-2">
														<div className="flex items-center border border-border rounded-md overflow-hidden bg-background">
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
																className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
																aria-label="Smanji količinu"
															>
																<Minus className="size-3" />
															</button>
															<span className="w-8 h-7 flex items-center justify-center text-xs font-medium text-foreground border-x border-border">
																{item.quantity}
															</span>
															<button
																onClick={() =>
																	handleUpdateQuantity(item.id, item.quantity + 1)
																}
																disabled={
																	updateCartItemMutation.isPending || !canIncrease
																}
																className="w-7 h-7 flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:text-muted-foreground/30"
																aria-label="Povećaj količinu"
															>
																<Plus className="size-3" />
															</button>
														</div>

														{/* Item Total */}
														<span className="text-sm font-semibold text-foreground">
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
						<div className="border-t border-border bg-background px-4 py-4 space-y-3">
							{/* Subtotal */}
							<div className="flex items-center justify-between">
								<span className="text-sm text-muted-foreground">Ukupno (bez dostave)</span>
								<span className="text-base font-semibold text-foreground">
									{subtotal.toFixed(2)} KM
								</span>
							</div>

							{/* Actions */}
							<div className="rainbow-border-wrapper">
								<Button
									size="lg"
									className="w-full h-12 text-base font-semibold shadow-lg bg-primary"
									asChild
									onClick={() => onOpenChange(false)}
								>
									<Link to="/checkout">Dovrši narudžbu</Link>
								</Button>
							</div>
							<Button
								variant="ghost"
								size="sm"
								className="w-full text-muted-foreground"
								onClick={() => onOpenChange(false)}
								asChild
							>
								<Link to="/products" search={{ tags: undefined }}>
									Nastavi kupovinu
								</Link>
							</Button>
						</div>
					</>
				)}
			</SheetContent>
		</Sheet>
	);
}
