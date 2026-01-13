import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ShopLayout } from "@/components/shop/ShopLayout";
import { getPublicShopSettingsServerFn } from "@/queries/settings";
import { getPublicNavigationServerFn } from "@/queries/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	getCartQueryOptions,
	clearCartMutationOptions,
	CART_QUERY_KEY,
} from "@/queries/cart";
import {
	validateDiscountCodeServerFn,
	incrementDiscountUsageServerFn,
} from "@/queries/discounts";
import { getActiveShippingMethodsQueryOptions } from "@/queries/shipping-methods";
import { createOrderServerFn } from "@/queries/orders";
import {
	getUserAddressesQueryOptions,
	createUserAddressServerFn,
	ADDRESSES_QUERY_KEY,
} from "@/queries/addresses";
import { useCartSession } from "@/hooks/useCartSession";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Loader2,
	Plus,
	Check,
	ShoppingBag,
	ChevronDown,
	Truck,
	CreditCard,
	Tag,
	X,
} from "lucide-react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { cn } from "@/lib/utils";
import { ProxyImage } from "@/components/ui/proxy-image";
import { authClient } from "@/lib/auth-client";
import { PhoneInput } from "@/components/ui/phone-input";
import { CityCombobox } from "@/components/ui/city-combobox";

export const Route = createFileRoute("/checkout")({
	component: CheckoutPage,
	loader: async () => {
		const [settings, navigationItems] = await Promise.all([
			getPublicShopSettingsServerFn(),
			getPublicNavigationServerFn(),
		]);
		return { settings, navigationItems };
	},
});

const checkoutSchema = z.object({
	email: z.string().email("Email nije validan"),
	name: z.string().min(1, "Ime je obavezno"),
	lastName: z.string().min(1, "Prezime je obavezno"),
	address: z.string().min(1, "Adresa je obavezna"),
	city: z.string().min(1, "Grad je obavezan"),
	zip: z.string().min(1, "Poštanski broj je obavezan"),
	phone: z.string().min(6, "Telefon je obavezan"),
	shippingMethodId: z.string().min(1, "Morate odabrati način dostave"),
});

interface CartItem {
	id: string;
	quantity: number;
	productId: string;
	variantId: string | null;
	image: string | null;
	product: {
		id: string;
		name: string;
		slug: string;
		price: string;
		sku: string | null;
	} | null;
	variant: {
		id: string;
		price: string | null;
		sku: string | null;
	} | null;
	variantOptions?: { optionName: string; optionValue: string }[];
}

interface CartData {
	cart: { id: string };
	items: CartItem[];
}

function CheckoutPage() {
	const { settings, navigationItems } = Route.useLoaderData();
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { sessionId, clearSession } = useCartSession();

	const { data: cartData, isLoading: cartLoading } = useQuery(
		getCartQueryOptions(sessionId || undefined)
	) as { data: CartData | undefined; isLoading: boolean };

	const { data: shippingMethodsRaw = [], isLoading: shippingLoading } = useQuery(
		getActiveShippingMethodsQueryOptions()
	);

	// Transform shipping methods to use string prices
	const shippingMethods = shippingMethodsRaw.map((method) => ({
		id: method.id,
		name: method.name,
		description: method.description,
		price: method.price?.toString() || null,
		isFreeShipping: method.isFreeShipping,
		minimumOrderAmount: method.minimumOrderAmount?.toString() || null,
	}));

	// Auth state
	const { data: session } = authClient.useSession();
	const isAuthenticated = !!session?.user;

	// Fetch user's saved addresses if authenticated
	const { data: savedAddresses = [], isLoading: addressesLoading } = useQuery({
		...getUserAddressesQueryOptions(),
		enabled: isAuthenticated,
	}) as {
		data: {
			id: string;
			firstName: string | null;
			lastName: string | null;
			address1: string | null;
			city: string | null;
			zip: string | null;
			phone: string | null;
			type: string;
			isDefault: boolean;
		}[];
		isLoading: boolean;
	};

	const [selectedShippingMethodId, setSelectedShippingMethodId] = useState<
		string | null
	>(null);
	const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
		null
	);
	const [showNewAddressForm, setShowNewAddressForm] = useState(false);
	const [saveAddress, setSaveAddress] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [showOrderSummary, setShowOrderSummary] = useState(false);
	const [discountCode, setDiscountCode] = useState("");
	const [appliedDiscount, setAppliedDiscount] = useState<{
		id: string;
		code: string;
		amount: number;
		type: "percentage" | "fixed";
		maxDiscount: number | null;
	} | null>(null);
	const [discountError, setDiscountError] = useState("");
	const [discountLoading, setDiscountLoading] = useState(false);

	const clearCartMutation = useMutation(
		clearCartMutationOptions(sessionId || undefined)
	);

	// Get default shipping address
	const defaultShippingAddress =
		savedAddresses.find((addr) => addr.type === "shipping" && addr.isDefault) ||
		savedAddresses.find((addr) => addr.type === "shipping") ||
		savedAddresses[0];

	const form = useForm({
		defaultValues: {
			email: session?.user?.email || "",
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
					const variantLabel =
						item.variantOptions && item.variantOptions.length > 0
							? item.variantOptions.map((opt) => opt.optionValue).join(" / ")
							: null;
					return {
						productId: item.productId || null,
						variantId: item.variantId || null,
						title: item.product?.name || "Proizvod",
						sku: item.variant?.sku || item.product?.sku || null,
						quantity: item.quantity,
						price: price,
						variantTitle: variantLabel,
					};
				});

				// Calculate totals
				const items = cartData.items || [];
				const subtotal = items.reduce((sum: number, item: CartItem) => {
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
				const calcDiscount = () => {
					if (!appliedDiscount) return 0;
					let discount = 0;
					if (appliedDiscount.type === "percentage") {
						discount = (subtotal * appliedDiscount.amount) / 100;
						if (appliedDiscount.maxDiscount) {
							discount = Math.min(discount, appliedDiscount.maxDiscount);
						}
					} else {
						discount = appliedDiscount.amount;
					}
					return Math.min(discount, subtotal);
				};
				const discountAmount = calcDiscount();
				const total = subtotal + shippingCost - discountAmount;

				// Create order
				const order = (await createOrderServerFn({
					data: {
						email: value.email,
						items: orderItems,
						shippingMethodId: value.shippingMethodId || null,
						paymentMethodId: null,
						subtotal: subtotal,
						tax: 0,
						shipping: shippingCost,
						discount: discountAmount,
						total: total,
						discountId: appliedDiscount?.id || null,
						discountCode: appliedDiscount?.code || null,
						shippingAddress: {
							firstName: value.name,
							lastName: value.lastName,
							address1: value.address,
							city: value.city,
							zip: value.zip,
							country: "Bosnia and Herzegovina",
							phone: value.phone,
						},
					},
				})) as { id: string };

				// Increment discount usage if discount was applied
				if (appliedDiscount?.id) {
					try {
						await incrementDiscountUsageServerFn({
							data: { discountId: appliedDiscount.id },
						});
					} catch (error) {
						console.error("Error incrementing discount usage:", error);
					}
				}

				// Save address to address book if user is authenticated and wants to save
				if (isAuthenticated && saveAddress && !selectedAddressId) {
					await saveAddressToBook({
						firstName: value.name,
						lastName: value.lastName,
						address1: value.address,
						city: value.city,
						zip: value.zip,
						phone: value.phone,
					});
				}

				// Clear cart
				try {
					await clearCartMutation.mutateAsync();
					queryClient.invalidateQueries({ queryKey: [CART_QUERY_KEY] });
					clearSession();
				} catch (error) {
					console.error("Error clearing cart:", error);
					try {
						clearSession();
					} catch (sessionError) {
						console.error("Error clearing session:", sessionError);
					}
				}

				navigate({
					to: "/thank-you",
					search: { orderId: order.id },
				});
			} catch (error: unknown) {
				console.error("Error creating order:", error);
				const err = error as { message?: string };
				const errorMessage =
					err?.message ||
					"Greška pri kreiranju narudžbe. Molimo pokušajte ponovo.";
				alert(errorMessage);
			} finally {
				setIsSubmitting(false);
			}
		},
	});

	// Auto-fill form with default address when addresses are loaded
	useEffect(() => {
		if (
			isAuthenticated &&
			defaultShippingAddress &&
			!selectedAddressId &&
			savedAddresses.length > 0
		) {
			setSelectedAddressId(defaultShippingAddress.id);
			fillFormWithAddress(defaultShippingAddress);
		}
	}, [isAuthenticated, savedAddresses.length, defaultShippingAddress?.id]);

	// Fill form with user email when session loads
	useEffect(() => {
		if (session?.user?.email) {
			form.setFieldValue("email", session.user.email);
		}
	}, [session?.user?.email]);

	// Function to fill form with address data
	const fillFormWithAddress = (address: (typeof savedAddresses)[0]) => {
		form.setFieldValue("name", address.firstName || "");
		form.setFieldValue("lastName", address.lastName || "");
		form.setFieldValue("address", address.address1 || "");
		form.setFieldValue("city", address.city || "");
		form.setFieldValue("zip", address.zip || "");
		form.setFieldValue("phone", address.phone || "");
	};

	// Handle address selection
	const handleAddressSelect = (addressId: string) => {
		const address = savedAddresses.find((a) => a.id === addressId);
		if (address) {
			setSelectedAddressId(addressId);
			setShowNewAddressForm(false);
			fillFormWithAddress(address);
		}
	};

	// Handle new address form toggle
	const handleNewAddressClick = () => {
		setSelectedAddressId(null);
		setShowNewAddressForm(true);
		form.setFieldValue("name", "");
		form.setFieldValue("lastName", "");
		form.setFieldValue("address", "");
		form.setFieldValue("city", "");
		form.setFieldValue("zip", "");
		form.setFieldValue("phone", "");
	};

	// Save address to address book
	const saveAddressToBook = async (addressData: {
		firstName: string;
		lastName: string;
		address1: string;
		city: string;
		zip: string;
		phone: string;
	}) => {
		if (!isAuthenticated || !saveAddress || selectedAddressId) {
			return;
		}

		try {
			await createUserAddressServerFn({
				data: {
					type: "shipping",
					firstName: addressData.firstName,
					lastName: addressData.lastName,
					address1: addressData.address1,
					city: addressData.city,
					zip: addressData.zip,
					country: "Bosnia and Herzegovina",
					phone: addressData.phone,
					isDefault: savedAddresses.length === 0,
				},
			});
			queryClient.invalidateQueries({ queryKey: [ADDRESSES_QUERY_KEY] });
		} catch (error) {
			console.error("Error saving address:", error);
		}
	};

	// Apply discount code
	const handleApplyDiscount = async () => {
		setDiscountError("");
		setDiscountLoading(true);

		if (!discountCode.trim()) {
			setDiscountError("Unesite kod za popust");
			setDiscountLoading(false);
			return;
		}

		try {
			const result = await validateDiscountCodeServerFn({
				data: {
					code: discountCode.trim().toUpperCase(),
					cartSubtotal: subtotal,
				},
			});

			if (result.valid && result.discount) {
				setAppliedDiscount({
					id: result.discount.id,
					code: result.discount.code,
					type: result.discount.type as "percentage" | "fixed",
					amount: result.discount.value,
					maxDiscount: result.discount.maximumDiscount,
				});
				setDiscountCode("");
			} else {
				setDiscountError(result.error || "Kod za popust nije validan");
			}
		} catch (error) {
			setDiscountError("Greška pri provjeri koda za popust");
		} finally {
			setDiscountLoading(false);
		}
	};

	const removeDiscount = () => {
		setAppliedDiscount(null);
		setDiscountCode("");
		setDiscountError("");
	};

	// Calculate totals
	const items = cartData?.items || [];
	const subtotal = items.reduce((sum: number, item: CartItem) => {
		const price = parseFloat(
			item.variant?.price || item.product?.price || "0"
		);
		return sum + price * item.quantity;
	}, 0);

	// Filter shipping methods
	const availableShippingMethods = shippingMethods.filter((method) => {
		if (method.isFreeShipping) {
			const minimumAmount = method.minimumOrderAmount
				? parseFloat(method.minimumOrderAmount)
				: 0;
			return subtotal >= minimumAmount;
		}
		return true;
	});

	// Get selected shipping method
	const selectedShippingMethod = availableShippingMethods.find(
		(method) => method.id === selectedShippingMethodId
	);

	// Calculate shipping cost
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
	const calculateDiscountAmount = () => {
		if (!appliedDiscount) return 0;

		let discount = 0;
		if (appliedDiscount.type === "percentage") {
			discount = (subtotal * appliedDiscount.amount) / 100;
			// Apply maximum discount cap if set
			if (appliedDiscount.maxDiscount) {
				discount = Math.min(discount, appliedDiscount.maxDiscount);
			}
		} else {
			discount = appliedDiscount.amount;
		}

		// Discount cannot exceed subtotal
		return Math.min(discount, subtotal);
	};
	const discountAmount = calculateDiscountAmount();
	const total = subtotal + shippingCost - discountAmount;
	const itemCount = items.reduce(
		(sum: number, item: CartItem) => sum + item.quantity,
		0
	);

	// Auto-select first shipping method
	useEffect(() => {
		if (
			availableShippingMethods.length > 0 &&
			!selectedShippingMethodId &&
			!shippingLoading
		) {
			setSelectedShippingMethodId(availableShippingMethods[0].id);
			form.setFieldValue("shippingMethodId", availableShippingMethods[0].id);
		}
	}, [availableShippingMethods.length, shippingLoading]);

	// Reset selection if current selection is not available
	useEffect(() => {
		if (
			selectedShippingMethodId &&
			!availableShippingMethods.find((m) => m.id === selectedShippingMethodId) &&
			availableShippingMethods.length > 0
		) {
			setSelectedShippingMethodId(availableShippingMethods[0].id);
			form.setFieldValue("shippingMethodId", availableShippingMethods[0].id);
		}
	}, [selectedShippingMethodId, availableShippingMethods]);

	if (
		cartLoading ||
		shippingLoading ||
		(isAuthenticated && addressesLoading)
	) {
		return (
			<ShopLayout settings={settings} navigationItems={navigationItems}>
				<div className="min-h-[60vh] flex items-center justify-center">
					<Loader2 className="size-8 animate-spin text-gray-400" />
				</div>
			</ShopLayout>
		);
	}

	if (!cartData || items.length === 0) {
		return (
			<ShopLayout settings={settings} navigationItems={navigationItems}>
				<div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
					<div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-6">
						<ShoppingBag className="size-10 text-gray-300" />
					</div>
					<h1 className="text-xl font-semibold text-gray-900 mb-2">
						Korpa je prazna
					</h1>
					<p className="text-sm text-gray-500 mb-8 text-center max-w-xs">
						Dodajte proizvode u korpu da biste nastavili na plaćanje
					</p>
					<Button asChild size="lg">
						<Link to="/products" search={{ tags: undefined }}>
							Pogledaj proizvode
						</Link>
					</Button>
				</div>
			</ShopLayout>
		);
	}

	return (
		<ShopLayout settings={settings} navigationItems={navigationItems}>
			<main className="min-h-screen bg-gray-50">
				<div className="container mx-auto px-4 py-6 lg:py-10">
					<div className="max-w-6xl mx-auto">
						{/* Header */}
						<div className="mb-8">
							<h1 className="text-2xl lg:text-3xl font-semibold text-gray-900">
								Naplata
							</h1>
							<p className="text-sm text-gray-500 mt-1">
								Popunite podatke za dostavu i plaćanje
							</p>
						</div>

						<div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
							{/* Checkout Form */}
							<div className="lg:col-span-7 space-y-6">
								<form
									onSubmit={(e) => {
										e.preventDefault();
										e.stopPropagation();
										form.handleSubmit();
									}}
									className="space-y-6"
								>
									{/* Contact Information */}
									<section className="bg-white rounded-xl p-6 shadow-sm">
										<h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
											<div className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center">
												1
											</div>
											Kontakt podaci
										</h2>

										<div className="space-y-4">
											{/* Email */}
											<form.Field
												name="email"
												validators={{
													onChange: ({ value }) => {
														const result =
															checkoutSchema.shape.email.safeParse(value);
														return result.success
															? undefined
															: result.error.issues[0]?.message;
													},
												}}
											>
												{(field) => (
													<div className="space-y-1.5">
														<Label htmlFor="email" className="text-sm">
															Email adresa
														</Label>
														<Input
															id="email"
															type="email"
															value={field.state.value}
															onBlur={field.handleBlur}
															onChange={(e) =>
																field.handleChange(e.target.value)
															}
															placeholder="vas@email.com"
															className={cn(
																"h-11",
																field.state.meta.errors.length > 0 &&
																	"border-red-500"
															)}
														/>
														{field.state.meta.errors.length > 0 && (
															<p className="text-xs text-red-500">
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
													onBlur: ({ value }) => {
														const result =
															checkoutSchema.shape.phone.safeParse(value);
														return result.success
															? undefined
															: result.error.issues[0]?.message;
													},
												}}
											>
												{(field) => (
													<div className="space-y-1.5">
														<Label htmlFor="phone" className="text-sm">
															Telefon
														</Label>
														<PhoneInput
															value={field.state.value}
															onChange={(phone) => field.handleChange(phone)}
															error={field.state.meta.isTouched && field.state.meta.errors.length > 0}
														/>
														{field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
															<p className="text-xs text-red-500">
																{field.state.meta.errors[0]}
															</p>
														)}
													</div>
												)}
											</form.Field>
										</div>
									</section>

									{/* Shipping Address */}
									<section className="bg-white rounded-xl p-6 shadow-sm">
										<h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
											<div className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center">
												2
											</div>
											Adresa za dostavu
										</h2>

										{/* Saved Addresses */}
										{isAuthenticated && savedAddresses.length > 0 && (
											<div className="mb-6">
												<div className="space-y-2">
													{savedAddresses
														.filter(
															(addr) =>
																addr.type === "shipping" || !addr.type
														)
														.map((address) => (
															<button
																key={address.id}
																type="button"
																onClick={() =>
																	handleAddressSelect(address.id)
																}
																className={cn(
																	"w-full text-left p-4 border rounded-lg transition-all",
																	selectedAddressId === address.id
																		? "border-gray-900 bg-gray-50"
																		: "border-gray-200 hover:border-gray-300"
																)}
															>
																<div className="flex items-start gap-3">
																	<div
																		className={cn(
																			"mt-0.5 size-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
																			selectedAddressId === address.id
																				? "border-gray-900 bg-gray-900"
																				: "border-gray-300"
																		)}
																	>
																		{selectedAddressId === address.id && (
																			<Check className="size-3 text-white" />
																		)}
																	</div>
																	<div className="flex-1 min-w-0">
																		<div className="flex items-center gap-2">
																			<span className="font-medium text-gray-900 text-sm">
																				{[
																					address.firstName,
																					address.lastName,
																				]
																					.filter(Boolean)
																					.join(" ") || "Adresa"}
																			</span>
																			{address.isDefault && (
																				<span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
																					Zadano
																				</span>
																			)}
																		</div>
																		<p className="text-sm text-gray-600 mt-0.5">
																			{address.address1}
																			{address.city && `, ${address.city}`}
																			{address.zip && ` ${address.zip}`}
																		</p>
																	</div>
																</div>
															</button>
														))}

													<button
														type="button"
														onClick={handleNewAddressClick}
														className={cn(
															"w-full text-left p-4 border border-dashed rounded-lg transition-all",
															showNewAddressForm && !selectedAddressId
																? "border-gray-900 bg-gray-50"
																: "border-gray-300 hover:border-gray-400"
														)}
													>
														<div className="flex items-center gap-3">
															<div
																className={cn(
																	"size-5 rounded-full border-2 flex items-center justify-center flex-shrink-0",
																	showNewAddressForm && !selectedAddressId
																		? "border-gray-900 bg-gray-900"
																		: "border-gray-300"
																)}
															>
																{showNewAddressForm && !selectedAddressId ? (
																	<Check className="size-3 text-white" />
																) : (
																	<Plus className="size-3 text-gray-400" />
																)}
															</div>
															<span className="font-medium text-gray-700 text-sm">
																Koristi novu adresu
															</span>
														</div>
													</button>
												</div>
											</div>
										)}

										{/* Address Form */}
										{(!isAuthenticated ||
											savedAddresses.length === 0 ||
											showNewAddressForm ||
											!selectedAddressId) && (
											<div className="space-y-4">
												{isAuthenticated && !selectedAddressId && (
													<label className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer">
														<input
															type="checkbox"
															checked={saveAddress}
															onChange={(e) =>
																setSaveAddress(e.target.checked)
															}
															className="size-4 text-gray-900 rounded"
														/>
														<span className="text-sm text-gray-700">
															Sačuvaj adresu za buduće narudžbe
														</span>
													</label>
												)}

												{/* Name Row */}
												<div className="grid grid-cols-2 gap-4">
													<form.Field
														name="name"
														validators={{
															onChange: ({ value }) => {
																const result =
																	checkoutSchema.shape.name.safeParse(value);
																return result.success
																	? undefined
																	: result.error.issues[0]?.message;
															},
														}}
													>
														{(field) => (
															<div className="space-y-1.5">
																<Label htmlFor="name" className="text-sm">
																	Ime
																</Label>
																<Input
																	id="name"
																	type="text"
																	value={field.state.value}
																	onBlur={field.handleBlur}
																	onChange={(e) =>
																		field.handleChange(e.target.value)
																	}
																	placeholder="Ime"
																	className={cn(
																		"h-11",
																		field.state.meta.errors.length > 0 &&
																			"border-red-500"
																	)}
																/>
															</div>
														)}
													</form.Field>

													<form.Field
														name="lastName"
														validators={{
															onChange: ({ value }) => {
																const result =
																	checkoutSchema.shape.lastName.safeParse(
																		value
																	);
																return result.success
																	? undefined
																	: result.error.issues[0]?.message;
															},
														}}
													>
														{(field) => (
															<div className="space-y-1.5">
																<Label htmlFor="lastName" className="text-sm">
																	Prezime
																</Label>
																<Input
																	id="lastName"
																	type="text"
																	value={field.state.value}
																	onBlur={field.handleBlur}
																	onChange={(e) =>
																		field.handleChange(e.target.value)
																	}
																	placeholder="Prezime"
																	className={cn(
																		"h-11",
																		field.state.meta.errors.length > 0 &&
																			"border-red-500"
																	)}
																/>
															</div>
														)}
													</form.Field>
												</div>

												{/* Address */}
												<form.Field
													name="address"
													validators={{
														onChange: ({ value }) => {
															const result =
																checkoutSchema.shape.address.safeParse(value);
															return result.success
																? undefined
																: result.error.issues[0]?.message;
														},
													}}
												>
													{(field) => (
														<div className="space-y-1.5">
															<Label htmlFor="address" className="text-sm">
																Ulica i broj
															</Label>
															<Input
																id="address"
																type="text"
																value={field.state.value}
																onBlur={field.handleBlur}
																onChange={(e) =>
																	field.handleChange(e.target.value)
																}
																placeholder="Ulica i kućni broj"
																className={cn(
																	"h-11",
																	field.state.meta.errors.length > 0 &&
																		"border-red-500"
																)}
															/>
														</div>
													)}
												</form.Field>

												{/* City and Zip */}
												<div className="grid grid-cols-2 gap-4">
													<form.Field
														name="city"
														validators={{
															onChange: ({ value }) => {
																const result =
																	checkoutSchema.shape.city.safeParse(value);
																return result.success
																	? undefined
																	: result.error.issues[0]?.message;
															},
														}}
													>
														{(field) => (
															<div className="space-y-1.5">
																<Label htmlFor="city" className="text-sm">
																	Grad
																</Label>
																<CityCombobox
																	value={field.state.value}
																	onCityChange={(city) =>
																		field.handleChange(city)
																	}
																	onZipChange={(zip) =>
																		form.setFieldValue("zip", zip)
																	}
																	error={field.state.meta.errors.length > 0}
																/>
															</div>
														)}
													</form.Field>

													<form.Field
														name="zip"
														validators={{
															onChange: ({ value }) => {
																const result =
																	checkoutSchema.shape.zip.safeParse(value);
																return result.success
																	? undefined
																	: result.error.issues[0]?.message;
															},
														}}
													>
														{(field) => (
															<div className="space-y-1.5">
																<Label htmlFor="zip" className="text-sm">
																	Poštanski broj
																</Label>
																<Input
																	id="zip"
																	type="text"
																	value={field.state.value}
																	onBlur={field.handleBlur}
																	onChange={(e) =>
																		field.handleChange(e.target.value)
																	}
																	placeholder="71000"
																	className={cn(
																		"h-11",
																		field.state.meta.errors.length > 0 &&
																			"border-red-500"
																	)}
																/>
															</div>
														)}
													</form.Field>
												</div>
											</div>
										)}
									</section>

									{/* Discount Code - Mobile Only */}
									<section className="bg-white rounded-xl p-6 shadow-sm lg:hidden">
										<div className="flex items-center gap-2 mb-4">
											<Tag className="size-4 text-gray-500" />
											<span className="text-base font-semibold text-gray-900">
												Kod za popust
											</span>
										</div>
										{appliedDiscount ? (
											<div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
												<div className="flex items-center gap-2">
													<Check className="size-4 text-emerald-600" />
													<span className="text-sm font-medium text-emerald-700">
														{appliedDiscount.code}
													</span>
												</div>
												<button
													type="button"
													onClick={removeDiscount}
													className="text-gray-500 hover:text-gray-700"
												>
													<X className="size-4" />
												</button>
											</div>
										) : (
											<div className="flex gap-2">
												<Input
													value={discountCode}
													onChange={(e) => setDiscountCode(e.target.value)}
													placeholder="Unesite kod"
													className={cn(
														"h-11 flex-1",
														discountError && "border-red-500"
													)}
												/>
												<Button
													type="button"
													variant="outline"
													onClick={handleApplyDiscount}
													disabled={discountLoading}
													className="h-11 px-4"
												>
													{discountLoading ? (
														<Loader2 className="size-4 animate-spin" />
													) : (
														"Primjeni"
													)}
												</Button>
											</div>
										)}
										{discountError && (
											<p className="text-xs text-red-500 mt-2">
												{discountError}
											</p>
										)}
									</section>

									{/* Shipping Method */}
									<section className="bg-white rounded-xl p-6 shadow-sm">
										<h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
											<div className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center">
												3
											</div>
											<Truck className="size-4" />
											Dostava
										</h2>

										{availableShippingMethods.length === 0 ? (
											<p className="text-sm text-gray-500">
												Nema dostupnih načina dostave.
											</p>
										) : (
											<form.Field name="shippingMethodId">
												{(field) => (
													<div className="space-y-2">
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
															const isSelected =
																field.state.value === method.id;

															return (
																<label
																	key={method.id}
																	className={cn(
																		"flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all",
																		isSelected
																			? "border-gray-900 bg-gray-50"
																			: "border-gray-200 hover:border-gray-300"
																	)}
																>
																	<div className="flex items-center gap-3">
																		<div
																			className={cn(
																				"size-5 rounded-full border-2 flex items-center justify-center",
																				isSelected
																					? "border-gray-900 bg-gray-900"
																					: "border-gray-300"
																			)}
																		>
																			{isSelected && (
																				<Check className="size-3 text-white" />
																			)}
																		</div>
																		<div>
																			<div className="font-medium text-gray-900 text-sm">
																				{method.name}
																			</div>
																			{method.description && (
																				<div className="text-xs text-gray-500 mt-0.5">
																					{method.description}
																				</div>
																			)}
																		</div>
																	</div>
																	<div className="text-right">
																		{isFree ? (
																			<span className="font-semibold text-emerald-600 text-sm">
																				Besplatno
																			</span>
																		) : (
																			<span className="font-semibold text-gray-900 text-sm">
																				{displayPrice.toFixed(2)} KM
																			</span>
																		)}
																	</div>
																	<input
																		type="radio"
																		name="shippingMethod"
																		value={method.id}
																		checked={isSelected}
																		onChange={(e) => {
																			field.handleChange(e.target.value);
																			setSelectedShippingMethodId(
																				e.target.value
																			);
																		}}
																		className="sr-only"
																	/>
																</label>
															);
														})}
													</div>
												)}
											</form.Field>
										)}
									</section>

									{/* Payment Method */}
									<section className="bg-white rounded-xl p-6 shadow-sm">
										<h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
											<div className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center">
												4
											</div>
											<CreditCard className="size-4" />
											Plaćanje
										</h2>

										<div className="p-4 border border-gray-900 rounded-lg bg-gray-50">
											<div className="flex items-center gap-3">
												<div className="size-5 rounded-full border-2 border-gray-900 bg-gray-900 flex items-center justify-center">
													<Check className="size-3 text-white" />
												</div>
												<div>
													<div className="font-medium text-gray-900 text-sm">
														Plaćanje pouzećem
													</div>
													<div className="text-xs text-gray-500 mt-0.5">
														Platite prilikom preuzimanja paketa
													</div>
												</div>
											</div>
										</div>
									</section>

									{/* Submit Button */}
									<div>
										<form.Subscribe
											selector={(state) => [
												state.isSubmitting,
												state.canSubmit,
											]}
										>
											{([formIsSubmitting, canSubmit]) => (
												<Button
													type="submit"
													size="lg"
													disabled={
														formIsSubmitting || !canSubmit || isSubmitting
													}
													className="w-full h-12 text-base font-medium"
												>
													{formIsSubmitting || isSubmitting ? (
														<>
															<Loader2 className="size-5 mr-2 animate-spin" />
															Procesiranje...
														</>
													) : (
														`Potvrdi narudžbu - ${total.toFixed(2)} KM`
													)}
												</Button>
											)}
										</form.Subscribe>
									</div>
								</form>
							</div>

							{/* Order Summary - Desktop */}
							<div className="hidden lg:block lg:col-span-5">
								<div className="bg-white rounded-xl p-6 shadow-sm sticky top-24">
									<h2 className="text-base font-semibold text-gray-900 mb-5">
										Pregled narudžbe ({itemCount})
									</h2>

									{/* Items */}
									<div className="space-y-4 mb-6">
										{items.map((item) => {
											const price = parseFloat(
												item.variant?.price || item.product?.price || "0"
											);
											const variantLabel =
												item.variantOptions &&
												item.variantOptions.length > 0
													? item.variantOptions
															.map((opt) => opt.optionValue)
															.join(" / ")
													: null;

											return (
												<div
													key={item.id}
													className="flex gap-3"
												>
													<div className="relative w-16 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
														{item.image ? (
															<ProxyImage
																src={item.image}
																alt={item.product?.name || "Product"}
																width={64}
																height={80}
																resizingType="fill"
																className="w-full h-full object-cover"
															/>
														) : (
															<div className="w-full h-full flex items-center justify-center">
																<ShoppingBag className="size-5 text-gray-300" />
															</div>
														)}
														<span className="absolute -top-1 -right-1 w-5 h-5 bg-gray-900 text-white text-xs rounded-full flex items-center justify-center">
															{item.quantity}
														</span>
													</div>
													<div className="flex-1 min-w-0">
														<div className="font-medium text-gray-900 text-sm line-clamp-2">
															{item.product?.name || "Proizvod"}
														</div>
														{variantLabel && (
															<div className="text-xs text-gray-500 mt-0.5">
																{variantLabel}
															</div>
														)}
														<div className="text-sm font-semibold text-gray-900 mt-1">
															{(price * item.quantity).toFixed(2)} KM
														</div>
													</div>
												</div>
											);
										})}
									</div>

									{/* Discount Code */}
									<div className="border-t border-gray-100 pt-4 mb-4">
										<div className="flex items-center gap-2 mb-2">
											<Tag className="size-4 text-gray-500" />
											<span className="text-sm font-medium text-gray-700">
												Kod za popust
											</span>
										</div>
										{appliedDiscount ? (
											<div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
												<div className="flex items-center gap-2">
													<Check className="size-4 text-emerald-600" />
													<span className="text-sm font-medium text-emerald-700">
														{appliedDiscount.code}
													</span>
												</div>
												<button
													type="button"
													onClick={removeDiscount}
													className="text-gray-500 hover:text-gray-700"
												>
													<X className="size-4" />
												</button>
											</div>
										) : (
											<div className="flex gap-2">
												<Input
													value={discountCode}
													onChange={(e) => setDiscountCode(e.target.value)}
													placeholder="Unesite kod"
													className={cn(
														"h-10 flex-1",
														discountError && "border-red-500"
													)}
												/>
												<Button
													type="button"
													variant="outline"
													onClick={handleApplyDiscount}
													disabled={discountLoading}
													className="h-10 px-4"
												>
													{discountLoading ? (
														<Loader2 className="size-4 animate-spin" />
													) : (
														"Primjeni"
													)}
												</Button>
											</div>
										)}
										{discountError && (
											<p className="text-xs text-red-500 mt-1">
												{discountError}
											</p>
										)}
									</div>

									{/* Totals */}
									<div className="border-t border-gray-100 pt-4 space-y-2">
										<div className="flex justify-between text-sm">
											<span className="text-gray-600">Međuzbir</span>
											<span className="text-gray-900">
												{subtotal.toFixed(2)} KM
											</span>
										</div>
										<div className="flex justify-between text-sm">
											<span className="text-gray-600">Dostava</span>
											<span className="text-gray-900">
												{shippingCost === 0 ? (
													<span className="text-emerald-600 font-medium">
														Besplatno
													</span>
												) : (
													`${shippingCost.toFixed(2)} KM`
												)}
											</span>
										</div>
										{appliedDiscount && (
											<div className="flex justify-between text-sm">
												<span className="text-gray-600">Popust</span>
												<span className="text-emerald-600 font-medium">
													-{discountAmount.toFixed(2)} KM
												</span>
											</div>
										)}
										<div className="flex justify-between text-lg font-semibold pt-3 border-t border-gray-100">
											<span className="text-gray-900">Ukupno</span>
											<span className="text-gray-900">
												{total.toFixed(2)} KM
											</span>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Mobile Order Summary */}
				<div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40">
					{/* Collapsible Summary */}
					{showOrderSummary && (
						<div className="border-b border-gray-100 max-h-[50vh] overflow-y-auto">
							<div className="p-4 space-y-4">
								{/* Items */}
								{items.map((item) => {
									const price = parseFloat(
										item.variant?.price || item.product?.price || "0"
									);
									const variantLabel =
										item.variantOptions && item.variantOptions.length > 0
											? item.variantOptions
													.map((opt) => opt.optionValue)
													.join(" / ")
											: null;

									return (
										<div key={item.id} className="flex gap-3">
											<div className="relative w-12 h-15 flex-shrink-0 rounded-md overflow-hidden bg-gray-100">
												{item.image ? (
													<ProxyImage
														src={item.image}
														alt={item.product?.name || "Product"}
														width={48}
														height={60}
														resizingType="fill"
														className="w-full h-full object-cover"
													/>
												) : (
													<div className="w-full h-full flex items-center justify-center">
														<ShoppingBag className="size-4 text-gray-300" />
													</div>
												)}
												<span className="absolute -top-1 -right-1 w-4 h-4 bg-gray-900 text-white text-[10px] rounded-full flex items-center justify-center">
													{item.quantity}
												</span>
											</div>
											<div className="flex-1 min-w-0">
												<div className="font-medium text-gray-900 text-xs line-clamp-1">
													{item.product?.name || "Proizvod"}
												</div>
												{variantLabel && (
													<div className="text-xs text-gray-500">
														{variantLabel}
													</div>
												)}
											</div>
											<div className="text-xs font-semibold text-gray-900">
												{(price * item.quantity).toFixed(2)} KM
											</div>
										</div>
									);
								})}

								{/* Totals */}
								<div className="pt-3 border-t border-gray-100 space-y-1">
									<div className="flex justify-between text-sm">
										<span className="text-gray-600">Međuzbir</span>
										<span className="text-gray-900">
											{subtotal.toFixed(2)} KM
										</span>
									</div>
									<div className="flex justify-between text-sm">
										<span className="text-gray-600">Dostava</span>
										<span className="text-gray-900">
											{shippingCost === 0 ? (
												<span className="text-emerald-600 font-medium">
													Besplatno
												</span>
											) : (
												`${shippingCost.toFixed(2)} KM`
											)}
										</span>
									</div>
									{appliedDiscount && (
										<div className="flex justify-between text-sm">
											<span className="text-gray-600">Popust</span>
											<span className="text-emerald-600 font-medium">
												-{discountAmount.toFixed(2)} KM
											</span>
										</div>
									)}
								</div>
							</div>
						</div>
					)}

					{/* Fixed Bottom Bar */}
					<div className="px-4 py-3 safe-area-bottom">
						{/* Toggle Summary */}
						<button
							type="button"
							onClick={() => setShowOrderSummary(!showOrderSummary)}
							className="flex items-center justify-between w-full"
						>
							<div className="flex items-center gap-2">
								<ShoppingBag className="size-4 text-gray-500" />
								<span className="text-sm font-medium text-gray-700">
									{showOrderSummary ? "Sakrij" : "Prikaži"} narudžbu ({itemCount})
								</span>
								<ChevronDown
									className={cn(
										"size-4 text-gray-500 transition-transform",
										showOrderSummary && "rotate-180"
									)}
								/>
							</div>
							<span className="text-lg font-semibold text-gray-900">
								{total.toFixed(2)} KM
							</span>
						</button>
					</div>
				</div>

				{/* Bottom padding for mobile sticky bar */}
				<div className="h-40 lg:hidden" />
			</main>
		</ShopLayout>
	);
}
