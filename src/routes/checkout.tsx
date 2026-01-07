import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ShopNavigation } from "@/components/shop/ShopNavigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCartQueryOptions, clearCartMutationOptions, CART_QUERY_KEY } from "@/queries/cart";
import { getActiveShippingMethodsQueryOptions } from "@/queries/shipping-methods";
import { createOrderServerFn } from "@/queries/orders";
import { useCartSession } from "@/hooks/useCartSession";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/checkout")({
	component: CheckoutPage,
});

const checkoutSchema = z.object({
	email: z.string().email("Email nije validan"),
	name: z.string().min(1, "Ime je obavezno"),
	lastName: z.string().min(1, "Prezime je obavezno"),
	address: z.string().min(1, "Adresa je obavezna"),
	city: z.string().min(1, "Grad je obavezan"),
	zip: z.string().min(1, "Poštanski broj je obavezan"),
	phone: z.string().min(1, "Telefon je obavezan"),
	shippingMethodId: z.string().min(1, "Morate odabrati način dostave"),
});

function CheckoutPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { sessionId, clearSession } = useCartSession();
	const { data: cartData, isLoading: cartLoading } = useQuery(
		getCartQueryOptions(sessionId || undefined)
	);
	const { data: shippingMethods = [], isLoading: shippingLoading } = useQuery(
		getActiveShippingMethodsQueryOptions()
	);

	const [selectedShippingMethodId, setSelectedShippingMethodId] = useState<
		string | null
	>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const clearCartMutation = useMutation(clearCartMutationOptions(sessionId || undefined));

	const form = useForm({
		defaultValues: {
			email: "",
			name: "",
			lastName: "",
			address: "",
			city: "",
			zip: "",
			phone: "",
			shippingMethodId: "",
		},
		onSubmit: async ({ value }) => {
			if (!cartData || !cartData.items || cartData.items.length === 0) {
				alert("Korpa je prazna");
				return;
			}

			setIsSubmitting(true);

			try {
				// Prepare order items from cart
				const orderItems = cartData.items.map((item) => {
					const price = parseFloat(
						item.variant?.price || item.product?.price || "0"
					);
					return {
						productId: item.productId || null,
						variantId: item.variantId || null,
						title: item.product?.name || "Proizvod",
						sku: item.variant?.sku || item.product?.sku || null,
						quantity: item.quantity,
						price: price,
						variantTitle: item.variant
							? `${item.variant.id}` // You might want to format this better
							: null,
					};
				});

				// Calculate totals
				const items = cartData.items || [];
				const subtotal = items.reduce((sum, item) => {
					const price = parseFloat(
						item.variant?.price || item.product?.price || "0"
					);
					return sum + price * item.quantity;
				}, 0);

				const selectedShippingMethod = shippingMethods.find(
					(method) => method.id === value.shippingMethodId
				);

				const calculateShippingCost = () => {
					if (!selectedShippingMethod) return 0;

					if (selectedShippingMethod.isFreeShipping) {
						const minimumAmount = selectedShippingMethod.minimumOrderAmount
							? parseFloat(selectedShippingMethod.minimumOrderAmount)
							: 0;
						if (subtotal >= minimumAmount) {
							return 0;
						}
					}

					return parseFloat(selectedShippingMethod.price || "0");
				};

				const shippingCost = calculateShippingCost();
				const total = subtotal + shippingCost;

				// Create order
				const order = await createOrderServerFn({
					data: {
						email: value.email,
						items: orderItems,
						shippingMethodId: value.shippingMethodId || null,
						paymentMethodId: null, // Default to cash on delivery
						subtotal: subtotal,
						tax: 0,
						shipping: shippingCost,
						discount: 0,
						total: total,
						shippingAddress: {
							firstName: value.name,
							lastName: value.lastName,
							address1: value.address,
							city: value.city,
							zip: value.zip,
							country: "Bosnia and Herzegovina", // Default country
							phone: value.phone,
						},
					},
				});

				// Clear cart after successful order creation
				// Important: Clear cart before clearing session to ensure we have the sessionId
				try {
					await clearCartMutation.mutateAsync();
					// Invalidate cart queries to refresh UI
					queryClient.invalidateQueries({ queryKey: [CART_QUERY_KEY] });
					// Clear session after cart is cleared
					clearSession();
				} catch (error) {
					console.error("Error clearing cart:", error);
					// Try to clear session anyway, but don't fail the order
					try {
						clearSession();
					} catch (sessionError) {
						console.error("Error clearing session:", sessionError);
					}
				}

				// Redirect to thank you page with order ID
				navigate({
					to: "/thank-you",
					search: { orderId: order.id },
				});
			} catch (error: any) {
				console.error("Error creating order:", error);
				// Show error message to user
				const errorMessage =
					error?.message ||
					"Greška pri kreiranju narudžbe. Molimo pokušajte ponovo.";
				alert(errorMessage);
			} finally {
				setIsSubmitting(false);
			}
		},
	});

	// Calculate totals
	const items = cartData?.items || [];
	const subtotal = items.reduce((sum, item) => {
		const price = parseFloat(
			item.variant?.price || item.product?.price || "0"
		);
		return sum + price * item.quantity;
	}, 0);

	// Filter shipping methods: show free shipping only if cart total meets minimum
	const availableShippingMethods = shippingMethods.filter((method) => {
		// If it's a free shipping method
		if (method.isFreeShipping) {
			const minimumAmount = method.minimumOrderAmount
				? parseFloat(method.minimumOrderAmount)
				: 0;
			// Only show if cart total meets minimum order amount
			return subtotal >= minimumAmount;
		}
		// Always show non-free shipping methods
		return true;
	});

	// Get selected shipping method
	const selectedShippingMethod = availableShippingMethods.find(
		(method) => method.id === selectedShippingMethodId
	);

	// Calculate shipping cost
	const calculateShippingCost = () => {
		if (!selectedShippingMethod) return 0;

		// Check if free shipping applies
		if (selectedShippingMethod.isFreeShipping) {
			const minimumAmount = selectedShippingMethod.minimumOrderAmount
				? parseFloat(selectedShippingMethod.minimumOrderAmount)
				: 0;
			if (subtotal >= minimumAmount) {
				return 0;
			}
		}

		return parseFloat(selectedShippingMethod.price || "0");
	};

	const shippingCost = calculateShippingCost();
	const total = subtotal + shippingCost;

	// Auto-select first shipping method if available
	if (
		availableShippingMethods.length > 0 &&
		!selectedShippingMethodId &&
		!shippingLoading
	) {
		setSelectedShippingMethodId(availableShippingMethods[0].id);
		form.setFieldValue("shippingMethodId", availableShippingMethods[0].id);
	}

	// Reset selection if current selection is not available
	if (
		selectedShippingMethodId &&
		!availableShippingMethods.find(
			(m) => m.id === selectedShippingMethodId
		) &&
		availableShippingMethods.length > 0
	) {
		setSelectedShippingMethodId(availableShippingMethods[0].id);
		form.setFieldValue("shippingMethodId", availableShippingMethods[0].id);
	}

	if (cartLoading || shippingLoading) {
		return (
			<div className="min-h-screen bg-gray-50">
				<ShopNavigation />
				<div className="container mx-auto px-4 py-12">
					<div className="flex items-center justify-center">
						<Loader2 className="size-8 animate-spin text-primary" />
					</div>
				</div>
			</div>
		);
	}

	if (!cartData || items.length === 0) {
		return (
			<div className="min-h-screen bg-gray-50">
				<ShopNavigation />
				<div className="container mx-auto px-4 py-12">
					<div className="text-center">
						<h1 className="text-2xl font-bold text-gray-900 mb-4">
							Korpa je prazna
						</h1>
						<p className="text-gray-600 mb-6">
							Morate imati proizvode u korpi da biste nastavili na plaćanje.
						</p>
						<Button asChild>
							<Link to="/products">Nastavi kupovinu</Link>
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<ShopNavigation />
			<main className="container mx-auto px-4 py-8">
				<div className="max-w-4xl mx-auto">
					<h1 className="text-3xl font-bold text-gray-900 mb-8">
						Plaćanje
					</h1>

					<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
						{/* Checkout Form */}
						<div className="lg:col-span-2 space-y-6">
							<form
								onSubmit={(e) => {
									e.preventDefault();
									e.stopPropagation();
									form.handleSubmit();
								}}
							>
								{/* Contact Information */}
								<div className="bg-white p-6 rounded-lg border border-gray-200">
									<h2 className="text-xl font-semibold text-gray-900 mb-4">
										Kontakt informacije
									</h2>
									<div className="space-y-4">
										{/* Email */}
										<form.Field
											name="email"
											validators={{
												onChange: ({ value }) => {
													const result = checkoutSchema.shape.email.safeParse(
														value
													);
													return result.success
														? undefined
														: result.error.errors[0]?.message;
												},
											}}
										>
											{(field) => (
												<div className="space-y-2">
													<Label htmlFor="email">Email *</Label>
													<Input
														id="email"
														type="email"
														value={field.state.value}
														onBlur={field.handleBlur}
														onChange={(e) => field.handleChange(e.target.value)}
														placeholder="vas@email.com"
														required
														className={cn(
															field.state.meta.errors.length > 0 &&
																"border-red-500"
														)}
													/>
													{field.state.meta.errors.length > 0 && (
														<p className="text-sm text-red-500">
															{field.state.meta.errors[0]}
														</p>
													)}
												</div>
											)}
										</form.Field>

										{/* Phone */}
										<form.Field
											name="phone"
											validators={{
												onChange: ({ value }) => {
													const result = checkoutSchema.shape.phone.safeParse(
														value
													);
													return result.success
														? undefined
														: result.error.errors[0]?.message;
												},
											}}
										>
											{(field) => (
												<div className="space-y-2">
													<Label htmlFor="phone">Telefon *</Label>
													<Input
														id="phone"
														type="tel"
														value={field.state.value}
														onBlur={field.handleBlur}
														onChange={(e) => field.handleChange(e.target.value)}
														placeholder="+387 61 123 456"
														required
														className={cn(
															field.state.meta.errors.length > 0 &&
																"border-red-500"
														)}
													/>
													{field.state.meta.errors.length > 0 && (
														<p className="text-sm text-red-500">
															{field.state.meta.errors[0]}
														</p>
													)}
												</div>
											)}
										</form.Field>
									</div>
								</div>

								{/* Shipping Address */}
								<div className="bg-white p-6 rounded-lg border border-gray-200">
									<h2 className="text-xl font-semibold text-gray-900 mb-4">
										Adresa za dostavu
									</h2>
									<div className="space-y-4">
										{/* Name and Last Name */}
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<form.Field
												name="name"
												validators={{
													onChange: ({ value }) => {
														const result = checkoutSchema.shape.name.safeParse(
															value
														);
														return result.success
															? undefined
															: result.error.errors[0]?.message;
													},
												}}
											>
												{(field) => (
													<div className="space-y-2">
														<Label htmlFor="name">Ime *</Label>
														<Input
															id="name"
															type="text"
															value={field.state.value}
															onBlur={field.handleBlur}
															onChange={(e) =>
																field.handleChange(e.target.value)
															}
															placeholder="Maja"
															required
															className={cn(
																field.state.meta.errors.length > 0 &&
																	"border-red-500"
															)}
														/>
														{field.state.meta.errors.length > 0 && (
															<p className="text-sm text-red-500">
																{field.state.meta.errors[0]}
															</p>
														)}
													</div>
												)}
											</form.Field>

											<form.Field
												name="lastName"
												validators={{
													onChange: ({ value }) => {
														const result =
															checkoutSchema.shape.lastName.safeParse(value);
														return result.success
															? undefined
															: result.error.errors[0]?.message;
													},
												}}
											>
												{(field) => (
													<div className="space-y-2">
														<Label htmlFor="lastName">Prezime *</Label>
														<Input
															id="lastName"
															type="text"
															value={field.state.value}
															onBlur={field.handleBlur}
															onChange={(e) =>
																field.handleChange(e.target.value)
															}
															placeholder="Majić"
															required
															className={cn(
																field.state.meta.errors.length > 0 &&
																	"border-red-500"
															)}
														/>
														{field.state.meta.errors.length > 0 && (
															<p className="text-sm text-red-500">
																{field.state.meta.errors[0]}
															</p>
														)}
													</div>
												)}
											</form.Field>
										</div>

										{/* Address */}
										<form.Field
											name="address"
											validators={{
												onChange: ({ value }) => {
													const result = checkoutSchema.shape.address.safeParse(
														value
													);
													return result.success
														? undefined
														: result.error.errors[0]?.message;
												},
											}}
										>
											{(field) => (
												<div className="space-y-2">
													<Label htmlFor="address">Adresa *</Label>
													<Input
														id="address"
														type="text"
														value={field.state.value}
														onBlur={field.handleBlur}
														onChange={(e) => field.handleChange(e.target.value)}
														placeholder="Ulica i broj"
														required
														className={cn(
															field.state.meta.errors.length > 0 &&
																"border-red-500"
														)}
													/>
													{field.state.meta.errors.length > 0 && (
														<p className="text-sm text-red-500">
															{field.state.meta.errors[0]}
														</p>
													)}
												</div>
											)}
										</form.Field>

										{/* City and Zip */}
										<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
											<form.Field
												name="city"
												validators={{
													onChange: ({ value }) => {
														const result = checkoutSchema.shape.city.safeParse(
															value
														);
														return result.success
															? undefined
															: result.error.errors[0]?.message;
													},
												}}
											>
												{(field) => (
													<div className="space-y-2">
														<Label htmlFor="city">Grad *</Label>
														<Input
															id="city"
															type="text"
															value={field.state.value}
															onBlur={field.handleBlur}
															onChange={(e) =>
																field.handleChange(e.target.value)
															}
															placeholder="Sarajevo"
															required
															className={cn(
																field.state.meta.errors.length > 0 &&
																	"border-red-500"
															)}
														/>
														{field.state.meta.errors.length > 0 && (
															<p className="text-sm text-red-500">
																{field.state.meta.errors[0]}
															</p>
														)}
													</div>
												)}
											</form.Field>

											<form.Field
												name="zip"
												validators={{
													onChange: ({ value }) => {
														const result = checkoutSchema.shape.zip.safeParse(
															value
														);
														return result.success
															? undefined
															: result.error.errors[0]?.message;
													},
												}}
											>
												{(field) => (
													<div className="space-y-2">
														<Label htmlFor="zip">Poštanski broj *</Label>
														<Input
															id="zip"
															type="text"
															value={field.state.value}
															onBlur={field.handleBlur}
															onChange={(e) =>
																field.handleChange(e.target.value)
															}
															placeholder="71000"
															required
															className={cn(
																field.state.meta.errors.length > 0 &&
																	"border-red-500"
															)}
														/>
														{field.state.meta.errors.length > 0 && (
															<p className="text-sm text-red-500">
																{field.state.meta.errors[0]}
															</p>
														)}
													</div>
												)}
											</form.Field>
										</div>
									</div>
								</div>

								{/* Shipping Method */}
								<div className="bg-white p-6 rounded-lg border border-gray-200">
									<h2 className="text-xl font-semibold text-gray-900 mb-4">
										Način dostave
									</h2>
									{availableShippingMethods.length === 0 ? (
										<div className="space-y-2">
											<p className="text-gray-600">
												Nema dostupnih načina dostave.
											</p>
											{shippingMethods.some(
												(m) =>
													m.isFreeShipping &&
													m.minimumOrderAmount &&
													subtotal < parseFloat(m.minimumOrderAmount)
											) && (
												<p className="text-sm text-gray-500">
													Za besplatnu dostavu potrebno je naručiti za najmanje{" "}
													{Math.min(
														...shippingMethods
															.filter(
																(m) =>
																	m.isFreeShipping &&
																	m.minimumOrderAmount
															)
															.map((m) => parseFloat(m.minimumOrderAmount!))
													).toFixed(2)}{" "}
													KM. Trenutna vrijednost korpe: {subtotal.toFixed(2)} KM
												</p>
											)}
										</div>
									) : (
										<form.Field
											name="shippingMethodId"
											validators={{
												onChange: ({ value }) => {
													const result =
														checkoutSchema.shape.shippingMethodId.safeParse(
															value
														);
													return result.success
														? undefined
														: result.error.errors[0]?.message;
												},
											}}
										>
											{(field) => (
												<div className="space-y-2">
													<div className="space-y-3">
														{availableShippingMethods.map((method) => {
															const methodPrice = parseFloat(
																method.price || "0"
															);
															const minimumAmount = method.minimumOrderAmount
																? parseFloat(method.minimumOrderAmount)
																: 0;
															const isFree =
																method.isFreeShipping &&
																subtotal >= minimumAmount;
															const displayPrice = isFree ? 0 : methodPrice;
															const isSelected = field.state.value === method.id;

															return (
																<label
																	key={method.id}
																	htmlFor={method.id}
																	className={cn(
																		"flex items-start space-x-3 p-4 border rounded-md cursor-pointer transition-colors",
																		isSelected
																			? "border-primary bg-primary/5"
																			: "border-gray-200 hover:border-gray-300"
																	)}
																>
																	<input
																		type="radio"
																		id={method.id}
																		name="shippingMethod"
																		value={method.id}
																		checked={isSelected}
																		onChange={(e) => {
																			field.handleChange(e.target.value);
																			setSelectedShippingMethodId(
																				e.target.value
																			);
																		}}
																		className="mt-1 size-4 text-primary focus:ring-primary"
																	/>
																	<div className="flex-1">
																		<div className="flex items-center justify-between">
																			<div>
																				<div className="font-medium text-gray-900">
																					{method.name}
																				</div>
																				{method.description && (
																					<div className="text-sm text-gray-600 mt-1">
																						{method.description}
																					</div>
																				)}
																				{method.isFreeShipping &&
																					minimumAmount > 0 && (
																						<div className="text-xs text-gray-500 mt-1">
																							Besplatna dostava za narudžbe
																							preko {minimumAmount.toFixed(2)} KM
																						</div>
																					)}
																			</div>
																			<div className="text-right ml-4">
																				{isFree ? (
																					<span className="font-semibold text-green-600">
																						Besplatno
																					</span>
																				) : (
																					<span className="font-semibold text-gray-900">
																						{displayPrice.toFixed(2)} KM
																					</span>
																				)}
																			</div>
																		</div>
																	</div>
																</label>
															);
														})}
													</div>
													{field.state.meta.errors.length > 0 && (
														<p className="text-sm text-red-500">
															{field.state.meta.errors[0]}
														</p>
													)}
												</div>
											)}
										</form.Field>
									)}
								</div>

								{/* Payment Method */}
								<div className="bg-white p-6 rounded-lg border border-gray-200">
									<h2 className="text-xl font-semibold text-gray-900 mb-4">
										Način plaćanja
									</h2>
									<div className="p-4 border border-gray-200 rounded-md bg-gray-50">
										<div className="flex items-center justify-between">
											<div>
												<div className="font-medium text-gray-900">
													Plaćanje pouzećem
												</div>
												<div className="text-sm text-gray-600 mt-1">
													Plaćanje prilikom preuzimanja
												</div>
											</div>
										</div>
									</div>
								</div>

								{/* Submit Button */}
								<div className="flex gap-4">
									<Button
										type="button"
										variant="outline"
										onClick={() => navigate({ to: "/products" })}
									>
										Nazad
									</Button>
									<form.Subscribe
										selector={(state) => [
											state.isSubmitting,
											state.canSubmit,
										]}
										children={([formIsSubmitting, canSubmit]) => (
											<Button
												type="submit"
												size="lg"
												disabled={formIsSubmitting || !canSubmit || isSubmitting}
												className="flex-1"
											>
												{formIsSubmitting || isSubmitting ? (
													<>
														<Loader2 className="size-4 mr-2 animate-spin" />
														Procesiranje...
													</>
												) : (
													`Naruči i plati ${total.toFixed(2)} KM`
												)}
											</Button>
										)}
									/>
								</div>
							</form>
						</div>

						{/* Order Summary */}
						<div className="lg:col-span-1">
							<div className="bg-white p-6 rounded-lg border border-gray-200 sticky top-20">
								<h2 className="text-xl font-semibold text-gray-900 mb-4">
									Pregled narudžbe
								</h2>

								{/* Items */}
								<div className="space-y-3 mb-4">
									{items.map((item) => {
										const price = parseFloat(
											item.variant?.price || item.product?.price || "0"
										);
										const itemTotal = price * item.quantity;

										return (
											<div
												key={item.id}
												className="flex items-start gap-3 text-sm"
											>
												<div className="relative w-12 h-12 flex-shrink-0 rounded-md overflow-hidden bg-gray-100">
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
												<div className="flex-1 min-w-0">
													<div className="font-medium text-gray-900 line-clamp-2">
														{item.product?.name || "Proizvod"}
													</div>
													<div className="text-gray-600">
														Količina: {item.quantity}
													</div>
												</div>
												<div className="text-gray-900 font-medium">
													{itemTotal.toFixed(2)} KM
												</div>
											</div>
										);
									})}
								</div>

								{/* Totals */}
								<div className="border-t border-gray-200 pt-4 space-y-2">
									<div className="flex justify-between text-sm">
										<span className="text-gray-600">Međuzbir</span>
										<span className="text-gray-900">{subtotal.toFixed(2)} KM</span>
									</div>
									<div className="flex justify-between text-sm">
										<span className="text-gray-600">Dostava</span>
										<span className="text-gray-900">
											{shippingCost === 0 ? (
												<span className="text-green-600 font-semibold">
													Besplatno
												</span>
											) : (
												`${shippingCost.toFixed(2)} KM`
											)}
										</span>
									</div>
									<div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
										<span>Ukupno</span>
										<span>{total.toFixed(2)} KM</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</main>
			<footer className="bg-gray-900 text-white mt-16">
				<div className="container mx-auto px-4 py-12">
					<div className="text-center text-sm text-gray-400">
						<p>
							&copy; {new Date().getFullYear()} Lunatik. Sva prava zadržana.
						</p>
					</div>
				</div>
			</footer>
		</div>
	);
}

