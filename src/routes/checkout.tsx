import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ShopLayout } from "@/components/shop/ShopLayout";
import { getPublicShopSettingsServerFn } from "@/queries/settings";
import { getPublicNavigationServerFn } from "@/queries/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
import { captureAbandonedCheckoutServerFn } from "@/queries/abandoned-checkouts";
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
	Tag,
	X,
	MapPin,
	Mail,
	Phone,
	Home,
	Truck,
	Wallet,
	Store,
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

	const shippingMethods = shippingMethodsRaw.map((method) => ({
		id: method.id,
		name: method.name,
		description: method.description,
		price: method.price?.toString() || null,
		isFreeShipping: method.isFreeShipping,
		isLocalPickup: method.isLocalPickup ?? false,
		minimumOrderAmount: method.minimumOrderAmount?.toString() || null,
	}));

	const { data: session } = authClient.useSession();
	const isAuthenticated = !!session?.user;

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

	const [deliveryType, setDeliveryType] = useState<"shipping" | "pickup">("shipping");
	const [selectedShippingMethodId, setSelectedShippingMethodId] = useState<string | null>(null);
	const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
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
	const [phoneBlurred, setPhoneBlurred] = useState(false);

	const clearCartMutation = useMutation(clearCartMutationOptions(sessionId || undefined));

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
				toast.error("Korpa je prazna");
				return;
			}

			setIsSubmitting(true);

			try {
				const orderItems = cartData.items.map((item) => {
					const price = parseFloat(item.variant?.price || item.product?.price || "0");
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

				const items = cartData.items || [];
				const subtotal = items.reduce((sum: number, item: CartItem) => {
					const price = parseFloat(item.variant?.price || item.product?.price || "0");
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
						if (subtotal >= minimumAmount) return 0;
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

				if (appliedDiscount?.id) {
					try {
						await incrementDiscountUsageServerFn({
							data: { discountId: appliedDiscount.id },
						});
					} catch (error) {
						console.error("Error incrementing discount usage:", error);
					}
				}

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
					err?.message || "Greška pri kreiranju narudžbe. Molimo pokušajte ponovo.";

				const isInventoryError =
					errorMessage.includes("nije dostupan") || errorMessage.includes("na zalihi");

				if (isInventoryError) {
					toast.error(errorMessage, {
						duration: 6000,
						description: "Molimo osvježite korpu i pokušajte ponovo.",
					});
					queryClient.invalidateQueries({ queryKey: [CART_QUERY_KEY] });
				} else {
					toast.error(errorMessage);
				}
			} finally {
				setIsSubmitting(false);
			}
		},
	});

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

	useEffect(() => {
		if (session?.user?.email) {
			form.setFieldValue("email", session.user.email);
		}
	}, [session?.user?.email]);

	const fillFormWithAddress = (address: (typeof savedAddresses)[0]) => {
		form.setFieldValue("name", address.firstName || "");
		form.setFieldValue("lastName", address.lastName || "");
		form.setFieldValue("address", address.address1 || "");
		form.setFieldValue("city", address.city || "");
		form.setFieldValue("zip", address.zip || "");
		form.setFieldValue("phone", address.phone || "");
	};

	const handleAddressSelect = (addressId: string) => {
		const address = savedAddresses.find((a) => a.id === addressId);
		if (address) {
			setSelectedAddressId(addressId);
			setShowNewAddressForm(false);
			fillFormWithAddress(address);
		}
	};

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

	const saveAddressToBook = async (addressData: {
		firstName: string;
		lastName: string;
		address1: string;
		city: string;
		zip: string;
		phone: string;
	}) => {
		if (!isAuthenticated || !saveAddress || selectedAddressId) return;

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

	const items = cartData?.items || [];
	const subtotal = items.reduce((sum: number, item: CartItem) => {
		const price = parseFloat(item.variant?.price || item.product?.price || "0");
		return sum + price * item.quantity;
	}, 0);

	// Separate shipping methods by type
	const localPickupMethod = shippingMethods.find((method) => method.isLocalPickup);
	const deliveryMethods = shippingMethods.filter((method) => !method.isLocalPickup);

	// Check if local pickup is available
	const hasLocalPickup = !!localPickupMethod;

	// Filter available shipping methods based on delivery type and cart subtotal
	const availableShippingMethods = deliveryMethods.filter((method) => {
		if (method.isFreeShipping) {
			const minimumAmount = method.minimumOrderAmount
				? parseFloat(method.minimumOrderAmount)
				: 0;
			return subtotal >= minimumAmount;
		}
		return true;
	});

	const selectedShippingMethod = deliveryType === "pickup" && localPickupMethod
		? localPickupMethod
		: availableShippingMethods.find((method) => method.id === selectedShippingMethodId);

	const calculateShippingCost = () => {
		if (!selectedShippingMethod) return 0;
		if (selectedShippingMethod.isFreeShipping) {
			const minimumAmount = selectedShippingMethod.minimumOrderAmount
				? parseFloat(selectedShippingMethod.minimumOrderAmount)
				: 0;
			if (subtotal >= minimumAmount) return 0;
		}
		return parseFloat(selectedShippingMethod.price || "0");
	};

	const shippingCost = calculateShippingCost();
	const calculateDiscountAmount = () => {
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
	const discountAmount = calculateDiscountAmount();
	const total = subtotal + shippingCost - discountAmount;
	const itemCount = items.reduce((sum: number, item: CartItem) => sum + item.quantity, 0);

	// Handle delivery type changes
	useEffect(() => {
		if (deliveryType === "pickup" && localPickupMethod) {
			setSelectedShippingMethodId(localPickupMethod.id);
			form.setFieldValue("shippingMethodId", localPickupMethod.id);
		} else if (deliveryType === "shipping" && availableShippingMethods.length > 0) {
			// When switching to shipping, select first available method
			const currentMethodIsValid = availableShippingMethods.find(
				(m) => m.id === selectedShippingMethodId
			);
			if (!currentMethodIsValid) {
				setSelectedShippingMethodId(availableShippingMethods[0].id);
				form.setFieldValue("shippingMethodId", availableShippingMethods[0].id);
			}
		}
	}, [deliveryType, localPickupMethod?.id, availableShippingMethods.length]);

	// Auto-select first shipping method on load
	useEffect(() => {
		if (
			deliveryType === "shipping" &&
			availableShippingMethods.length > 0 &&
			!selectedShippingMethodId &&
			!shippingLoading
		) {
			setSelectedShippingMethodId(availableShippingMethods[0].id);
			form.setFieldValue("shippingMethodId", availableShippingMethods[0].id);
		}
	}, [availableShippingMethods.length, shippingLoading, deliveryType]);

	// Ensure selected method is valid
	useEffect(() => {
		if (
			deliveryType === "shipping" &&
			selectedShippingMethodId &&
			!availableShippingMethods.find((m) => m.id === selectedShippingMethodId) &&
			availableShippingMethods.length > 0
		) {
			setSelectedShippingMethodId(availableShippingMethods[0].id);
			form.setFieldValue("shippingMethodId", availableShippingMethods[0].id);
		}
	}, [selectedShippingMethodId, availableShippingMethods, deliveryType]);

	if (cartLoading || shippingLoading || (isAuthenticated && addressesLoading)) {
		return (
			<ShopLayout settings={settings} navigationItems={navigationItems}>
				<div className="min-h-[60vh] flex items-center justify-center">
					<Loader2 className="size-8 animate-spin text-muted-foreground" />
				</div>
			</ShopLayout>
		);
	}

	if (!cartData || items.length === 0) {
		return (
			<ShopLayout settings={settings} navigationItems={navigationItems}>
				<div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
					<div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-6">
						<ShoppingBag className="size-8 text-muted-foreground" />
					</div>
					<h1 className="text-xl font-semibold text-foreground mb-2">Korpa je prazna</h1>
					<p className="text-sm text-muted-foreground mb-8 text-center max-w-xs">
						Dodajte proizvode u korpu da biste nastavili
					</p>
					<Button asChild>
						<Link to="/products" search={{ tags: undefined }}>
							Pogledaj proizvode
						</Link>
					</Button>
				</div>
			</ShopLayout>
		);
	}

	const inputClassName = "h-12 bg-background";

	return (
		<ShopLayout settings={settings} navigationItems={navigationItems}>
			<main className="min-h-screen bg-background">
				<div className="container mx-auto px-4 py-8 lg:py-12">
					<div className="max-w-5xl mx-auto">
						{/* Header */}
						<div className="mb-10">
							<h1 className="text-2xl lg:text-3xl font-semibold text-foreground">Naplata</h1>
						</div>

						<div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
							{/* Checkout Form */}
							<div className="lg:col-span-7">
								<form
									onSubmit={(e) => {
										e.preventDefault();
										e.stopPropagation();
										form.handleSubmit();
									}}
									className="space-y-10"
								>
									{/* Contact Section */}
									<section>
										<div className="flex items-center gap-3 mb-6">
											<div className="flex items-center justify-center w-8 h-8 rounded-full bg-foreground text-background text-sm font-medium">
												1
											</div>
											<h2 className="text-lg font-medium text-foreground">Kontakt</h2>
										</div>

										<div className="space-y-4">
											<form.Field
												name="email"
												validators={{
													onChange: ({ value }) => {
														const result = checkoutSchema.shape.email.safeParse(value);
														return result.success ? undefined : result.error.issues[0]?.message;
													},
												}}
											>
												{(field) => (
													<div className="space-y-2">
														<Label htmlFor="email" className="text-sm font-medium">
															Email
														</Label>
														<div className="relative">
															<Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
															<Input
																id="email"
																type="email"
																value={field.state.value}
																onBlur={async () => {
																	field.handleBlur();
																	// Capture abandoned checkout on email blur
																	const email = field.state.value;
																	if (email && checkoutSchema.shape.email.safeParse(email).success && cartData?.items?.length) {
																		try {
																			await captureAbandonedCheckoutServerFn({
																				data: {
																					email,
																					cartData: cartData.items.map((item) => ({
																						productId: item.productId || null,
																						variantId: item.variantId || null,
																						title: item.product?.name || "Proizvod",
																						sku: item.variant?.sku || item.product?.sku || null,
																						quantity: item.quantity,
																						price: parseFloat(item.variant?.price || item.product?.price || "0"),
																						variantTitle: item.variantOptions?.map((opt) => opt.optionValue).join(" / ") || null,
																						imageUrl: item.image || null,
																					})),
																					customerName: form.getFieldValue("name") && form.getFieldValue("lastName")
																						? `${form.getFieldValue("name")} ${form.getFieldValue("lastName")}`
																						: null,
																					phone: form.getFieldValue("phone") || null,
																					subtotal,
																					checkoutUrl: window.location.href,
																				},
																			});
																		} catch (error) {
																			// Silently fail - this is a non-critical operation
																			console.error("Failed to capture abandoned checkout:", error);
																		}
																	}
																}}
																onChange={(e) => field.handleChange(e.target.value)}
																placeholder="vas@email.com"
																className={cn(
																	inputClassName,
																	"pl-10",
																	field.state.meta.errors.length > 0 && "border-destructive"
																)}
															/>
														</div>
														{field.state.meta.errors.length > 0 && (
															<p className="text-xs text-destructive">{field.state.meta.errors[0]}</p>
														)}
													</div>
												)}
											</form.Field>

											<form.Field
												name="phone"
												validators={{
													onChange: ({ value }) => {
														// Only validate after user has blurred the field
														if (!phoneBlurred) return undefined;
														const result = checkoutSchema.shape.phone.safeParse(value);
														return result.success ? undefined : result.error.issues[0]?.message;
													},
												}}
											>
												{(field) => {
													const showError = phoneBlurred && field.state.meta.errors.length > 0;
													return (
														<div className="space-y-2">
															<Label htmlFor="phone" className="text-sm font-medium">
																Telefon
															</Label>
															<PhoneInput
																value={field.state.value}
																onChange={(phone) => field.handleChange(phone)}
																onBlur={() => {
																	setPhoneBlurred(true);
																	field.handleBlur();
																}}
																error={showError}
																className={inputClassName}
															/>
															{showError && (
																<p className="text-xs text-destructive">{field.state.meta.errors[0]}</p>
															)}
														</div>
													);
												}}
											</form.Field>
										</div>
									</section>

									{/* Address Section */}
									<section>
										<div className="flex items-center gap-3 mb-6">
											<div className="flex items-center justify-center w-8 h-8 rounded-full bg-foreground text-background text-sm font-medium">
												2
											</div>
											<h2 className="text-lg font-medium text-foreground">Adresa dostave</h2>
										</div>

										{/* Saved Addresses */}
										{isAuthenticated && savedAddresses.length > 0 && (
											<div className="space-y-3 mb-6">
												{savedAddresses
													.filter((addr) => addr.type === "shipping" || !addr.type)
													.map((address) => (
														<button
															key={address.id}
															type="button"
															onClick={() => handleAddressSelect(address.id)}
															className={cn(
																"w-full text-left p-4 rounded-xl border-2 transition-all",
																selectedAddressId === address.id
																	? "border-foreground bg-muted/50"
																	: "border-border hover:border-muted-foreground/50"
															)}
														>
															<div className="flex items-start gap-3">
																<div
																	className={cn(
																		"mt-0.5 size-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
																		selectedAddressId === address.id
																			? "border-foreground bg-foreground"
																			: "border-muted-foreground/30"
																	)}
																>
																	{selectedAddressId === address.id && (
																		<Check className="size-3 text-background" />
																	)}
																</div>
																<div className="flex-1 min-w-0">
																	<div className="flex items-center gap-2">
																		<span className="font-medium text-foreground">
																			{[address.firstName, address.lastName].filter(Boolean).join(" ") ||
																				"Adresa"}
																		</span>
																		{address.isDefault && (
																			<span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
																				Zadano
																			</span>
																		)}
																	</div>
																	<p className="text-sm text-muted-foreground mt-1">
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
														"w-full text-left p-4 rounded-xl border-2 border-dashed transition-all",
														showNewAddressForm && !selectedAddressId
															? "border-foreground bg-muted/50"
															: "border-border hover:border-muted-foreground/50"
													)}
												>
													<div className="flex items-center gap-3">
														<div
															className={cn(
																"size-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
																showNewAddressForm && !selectedAddressId
																	? "border-foreground bg-foreground"
																	: "border-muted-foreground/30"
															)}
														>
															{showNewAddressForm && !selectedAddressId ? (
																<Check className="size-3 text-background" />
															) : (
																<Plus className="size-3 text-muted-foreground" />
															)}
														</div>
														<span className="font-medium text-muted-foreground">Nova adresa</span>
													</div>
												</button>
											</div>
										)}

										{/* Address Form */}
										{(!isAuthenticated ||
											savedAddresses.length === 0 ||
											showNewAddressForm ||
											!selectedAddressId) && (
											<div className="space-y-4">
												{isAuthenticated && !selectedAddressId && (
													<label className="flex items-center gap-3 cursor-pointer group">
														<div
															className={cn(
																"size-5 rounded border-2 flex items-center justify-center transition-colors",
																saveAddress
																	? "border-foreground bg-foreground"
																	: "border-muted-foreground/30 group-hover:border-muted-foreground/50"
															)}
														>
															{saveAddress && <Check className="size-3 text-background" />}
														</div>
														<input
															type="checkbox"
															checked={saveAddress}
															onChange={(e) => setSaveAddress(e.target.checked)}
															className="sr-only"
														/>
														<span className="text-sm text-muted-foreground">
															Sačuvaj adresu za sljedeći put
														</span>
													</label>
												)}

												<div className="grid grid-cols-2 gap-4">
													<form.Field
														name="name"
														validators={{
															onChange: ({ value }) => {
																const result = checkoutSchema.shape.name.safeParse(value);
																return result.success ? undefined : result.error.issues[0]?.message;
															},
														}}
													>
														{(field) => (
															<div className="space-y-2">
																<Label htmlFor="name" className="text-sm font-medium">
																	Ime
																</Label>
																<Input
																	id="name"
																	type="text"
																	value={field.state.value}
																	onBlur={field.handleBlur}
																	onChange={(e) => field.handleChange(e.target.value)}
																	placeholder="Ime"
																	className={cn(
																		inputClassName,
																		field.state.meta.errors.length > 0 && "border-destructive"
																	)}
																/>
															</div>
														)}
													</form.Field>

													<form.Field
														name="lastName"
														validators={{
															onChange: ({ value }) => {
																const result = checkoutSchema.shape.lastName.safeParse(value);
																return result.success ? undefined : result.error.issues[0]?.message;
															},
														}}
													>
														{(field) => (
															<div className="space-y-2">
																<Label htmlFor="lastName" className="text-sm font-medium">
																	Prezime
																</Label>
																<Input
																	id="lastName"
																	type="text"
																	value={field.state.value}
																	onBlur={field.handleBlur}
																	onChange={(e) => field.handleChange(e.target.value)}
																	placeholder="Prezime"
																	className={cn(
																		inputClassName,
																		field.state.meta.errors.length > 0 && "border-destructive"
																	)}
																/>
															</div>
														)}
													</form.Field>
												</div>

												<form.Field
													name="address"
													validators={{
														onChange: ({ value }) => {
															const result = checkoutSchema.shape.address.safeParse(value);
															return result.success ? undefined : result.error.issues[0]?.message;
														},
													}}
												>
													{(field) => (
														<div className="space-y-2">
															<Label htmlFor="address" className="text-sm font-medium">
																Adresa
															</Label>
															<div className="relative">
																<Home className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
																<Input
																	id="address"
																	type="text"
																	value={field.state.value}
																	onBlur={field.handleBlur}
																	onChange={(e) => field.handleChange(e.target.value)}
																	placeholder="Ulica i broj"
																	className={cn(
																		inputClassName,
																		"pl-10",
																		field.state.meta.errors.length > 0 && "border-destructive"
																	)}
																/>
															</div>
														</div>
													)}
												</form.Field>

												<div className="grid grid-cols-2 gap-4">
													<form.Field
														name="city"
														validators={{
															onChange: ({ value }) => {
																const result = checkoutSchema.shape.city.safeParse(value);
																return result.success ? undefined : result.error.issues[0]?.message;
															},
														}}
													>
														{(field) => (
															<div className="space-y-2">
																<Label htmlFor="city" className="text-sm font-medium">
																	Grad
																</Label>
																<CityCombobox
																	value={field.state.value}
																	onCityChange={(city) => field.handleChange(city)}
																	onZipChange={(zip) => form.setFieldValue("zip", zip)}
																	error={field.state.meta.errors.length > 0}
																	className={inputClassName}
																/>
															</div>
														)}
													</form.Field>

													<form.Field
														name="zip"
														validators={{
															onChange: ({ value }) => {
																const result = checkoutSchema.shape.zip.safeParse(value);
																return result.success ? undefined : result.error.issues[0]?.message;
															},
														}}
													>
														{(field) => (
															<div className="space-y-2">
																<Label htmlFor="zip" className="text-sm font-medium">
																	Poštanski broj
																</Label>
																<Input
																	id="zip"
																	type="text"
																	value={field.state.value}
																	onBlur={field.handleBlur}
																	onChange={(e) => field.handleChange(e.target.value)}
																	placeholder="71000"
																	className={cn(
																		inputClassName,
																		field.state.meta.errors.length > 0 && "border-destructive"
																	)}
																/>
															</div>
														)}
													</form.Field>
												</div>
											</div>
										)}
									</section>

									{/* Shipping Section */}
									<section>
										<div className="flex items-center gap-3 mb-6">
											<div className="flex items-center justify-center w-8 h-8 rounded-full bg-foreground text-background text-sm font-medium">
												3
											</div>
											<h2 className="text-lg font-medium text-foreground">Dostava</h2>
										</div>

										{/* Delivery Type Selector */}
										{hasLocalPickup && (
											<div className="grid grid-cols-2 gap-3 mb-6">
												<button
													type="button"
													onClick={() => setDeliveryType("shipping")}
													className={cn(
														"flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
														deliveryType === "shipping"
															? "border-foreground bg-muted/50"
															: "border-border hover:border-muted-foreground/50"
													)}
												>
													<div
														className={cn(
															"w-10 h-10 rounded-full flex items-center justify-center transition-colors",
															deliveryType === "shipping"
																? "bg-foreground text-background"
																: "bg-muted text-muted-foreground"
														)}
													>
														<Truck className="size-5" />
													</div>
													<span className="font-medium text-foreground">Dostava na adresu</span>
												</button>

												<button
													type="button"
													onClick={() => setDeliveryType("pickup")}
													className={cn(
														"flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
														deliveryType === "pickup"
															? "border-foreground bg-muted/50"
															: "border-border hover:border-muted-foreground/50"
													)}
												>
													<div
														className={cn(
															"w-10 h-10 rounded-full flex items-center justify-center transition-colors",
															deliveryType === "pickup"
																? "bg-foreground text-background"
																: "bg-muted text-muted-foreground"
														)}
													>
														<Store className="size-5" />
													</div>
													<span className="font-medium text-foreground">Preuzimanje</span>
												</button>
											</div>
										)}

										{/* Local Pickup Info */}
										{deliveryType === "pickup" && localPickupMethod && (
											<div className="p-4 rounded-xl border-2 border-foreground bg-muted/50">
												<div className="flex items-center gap-3">
													<div className="size-5 rounded-full border-2 border-foreground bg-foreground flex items-center justify-center">
														<Check className="size-3 text-background" />
													</div>
													<Store className="size-4 text-muted-foreground" />
													<div>
														<div className="font-medium text-foreground">{localPickupMethod.name}</div>
														{localPickupMethod.description && (
															<div className="text-sm text-muted-foreground">
																{localPickupMethod.description}
															</div>
														)}
													</div>
												</div>
											</div>
										)}

										{/* Shipping Methods - Only show when delivery type is shipping */}
										{deliveryType === "shipping" && (
											<>
												{availableShippingMethods.length === 0 ? (
													<p className="text-sm text-muted-foreground">Nema dostupnih načina dostave.</p>
												) : (
													<form.Field name="shippingMethodId">
														{(field) => (
															<div className="space-y-3">
																{availableShippingMethods.map((method) => {
																	const methodPrice = parseFloat(method.price || "0");
																	const minimumAmount = method.minimumOrderAmount
																		? parseFloat(method.minimumOrderAmount)
																		: 0;
																	const isFree = method.isFreeShipping && subtotal >= minimumAmount;
																	const displayPrice = isFree ? 0 : methodPrice;
																	const isSelected = field.state.value === method.id;

																	return (
																		<label
																			key={method.id}
																			className={cn(
																				"flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all",
																				isSelected
																					? "border-foreground bg-muted/50"
																					: "border-border hover:border-muted-foreground/50"
																			)}
																		>
																			<div className="flex items-center gap-3">
																				<div
																					className={cn(
																						"size-5 rounded-full border-2 flex items-center justify-center transition-colors",
																						isSelected
																							? "border-foreground bg-foreground"
																							: "border-muted-foreground/30"
																					)}
																				>
																					{isSelected && <Check className="size-3 text-background" />}
																				</div>
																				<Truck className="size-4 text-muted-foreground" />
																				<div>
																					<div className="font-medium text-foreground">{method.name}</div>
																					{method.description && (
																						<div className="text-sm text-muted-foreground">
																							{method.description}
																						</div>
																					)}
																				</div>
																			</div>
																			<div className="text-right">
																				{isFree ? (
																					<span className="font-semibold text-emerald-600">Besplatno</span>
																				) : (
																					<span className="font-semibold text-foreground">
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
																					setSelectedShippingMethodId(e.target.value);
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
									</>
								)}
									</section>

									{/* Payment Section */}
									<section>
										<div className="flex items-center gap-3 mb-6">
											<div className="flex items-center justify-center w-8 h-8 rounded-full bg-foreground text-background text-sm font-medium">
												4
											</div>
											<h2 className="text-lg font-medium text-foreground">Plaćanje</h2>
										</div>

										<div className="p-4 rounded-xl border-2 border-foreground bg-muted/50">
											<div className="flex items-center gap-3">
												<div className="size-5 rounded-full border-2 border-foreground bg-foreground flex items-center justify-center">
													<Check className="size-3 text-background" />
												</div>
												<Wallet className="size-4 text-muted-foreground" />
												<div>
													<div className="font-medium text-foreground">Plaćanje pouzećem</div>
													<div className="text-sm text-muted-foreground">
														Platite prilikom preuzimanja
													</div>
												</div>
											</div>
										</div>
									</section>

									{/* Discount Code - Mobile */}
									<section className="lg:hidden">
										<div className="flex items-center gap-2 mb-4">
											<Tag className="size-4 text-muted-foreground" />
											<span className="font-medium text-foreground">Kod za popust</span>
										</div>
										{appliedDiscount ? (
											<div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
												<div className="flex items-center gap-2">
													<Check className="size-4 text-emerald-600" />
													<span className="font-medium text-emerald-700 dark:text-emerald-400">
														{appliedDiscount.code}
													</span>
												</div>
												<button
													type="button"
													onClick={removeDiscount}
													className="text-muted-foreground hover:text-foreground transition-colors"
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
													className={cn(inputClassName, "flex-1", discountError && "border-destructive")}
												/>
												<Button
													type="button"
													variant="outline"
													onClick={handleApplyDiscount}
													disabled={discountLoading}
													className="h-12 px-6"
												>
													{discountLoading ? <Loader2 className="size-4 animate-spin" /> : "Primjeni"}
												</Button>
											</div>
										)}
										{discountError && <p className="text-xs text-destructive mt-2">{discountError}</p>}
									</section>

									{/* Submit Button */}
									<div className="pt-4">
										<form.Subscribe selector={(state) => [state.isSubmitting, state.canSubmit]}>
											{([formIsSubmitting, canSubmit]) => (
												<Button
													type="submit"
													size="lg"
													disabled={formIsSubmitting || !canSubmit || isSubmitting}
													className="w-full h-14 text-base font-semibold"
												>
													{formIsSubmitting || isSubmitting ? (
														<>
															<Loader2 className="size-5 mr-2 animate-spin" />
															Procesiranje...
														</>
													) : (
														"Potvrdi narudžbu"
													)}
												</Button>
											)}
										</form.Subscribe>
									</div>
								</form>
							</div>

							{/* Order Summary - Desktop */}
							<div className="hidden lg:block lg:col-span-5">
								<div className="sticky top-24">
									<h2 className="text-lg font-medium text-foreground mb-6">
										Narudžba ({itemCount})
									</h2>

									{/* Items */}
									<div className="space-y-4 mb-6">
										{items.map((item) => {
											const price = parseFloat(
												item.variant?.price || item.product?.price || "0"
											);
											const variantLabel =
												item.variantOptions && item.variantOptions.length > 0
													? item.variantOptions.map((opt) => opt.optionValue).join(" / ")
													: null;

											return (
												<div key={item.id} className="flex gap-4">
													<div className="relative flex-shrink-0">
														<div className="w-16 h-16 rounded-lg overflow-hidden bg-muted">
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
																	<ShoppingBag className="size-5 text-muted-foreground" />
																</div>
															)}
														</div>
														<span className="absolute -top-1 -right-1 z-10 w-5 h-5 bg-foreground text-background text-xs rounded-full flex items-center justify-center font-medium">
															{item.quantity}
														</span>
													</div>
													<div className="flex-1 min-w-0">
														<div className="font-medium text-foreground line-clamp-2">
															{item.product?.name || "Proizvod"}
														</div>
														{variantLabel && (
															<div className="text-sm text-muted-foreground mt-0.5">
																{variantLabel}
															</div>
														)}
														<div className="font-semibold text-foreground mt-1">
															{(price * item.quantity).toFixed(2)} KM
														</div>
													</div>
												</div>
											);
										})}
									</div>

									{/* Discount Code */}
									<div className="py-6 border-t border-border">
										<div className="flex items-center gap-2 mb-3">
											<Tag className="size-4 text-muted-foreground" />
											<span className="text-sm font-medium text-foreground">Kod za popust</span>
										</div>
										{appliedDiscount ? (
											<div className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl">
												<div className="flex items-center gap-2">
													<Check className="size-4 text-emerald-600" />
													<span className="font-medium text-emerald-700 dark:text-emerald-400">
														{appliedDiscount.code}
													</span>
												</div>
												<button
													type="button"
													onClick={removeDiscount}
													className="text-muted-foreground hover:text-foreground transition-colors"
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
													className={cn(inputClassName, "flex-1", discountError && "border-destructive")}
												/>
												<Button
													type="button"
													variant="outline"
													onClick={handleApplyDiscount}
													disabled={discountLoading}
													className="h-12 px-5"
												>
													{discountLoading ? <Loader2 className="size-4 animate-spin" /> : "Primjeni"}
												</Button>
											</div>
										)}
										{discountError && <p className="text-xs text-destructive mt-2">{discountError}</p>}
									</div>

									{/* Totals */}
									<div className="py-6 border-t border-border space-y-3">
										<div className="flex justify-between text-sm">
											<span className="text-muted-foreground">Međuzbir</span>
											<span className="text-foreground">{subtotal.toFixed(2)} KM</span>
										</div>
										<div className="flex justify-between text-sm">
											<span className="text-muted-foreground">Dostava</span>
											<span className="text-foreground">
												{shippingCost === 0 ? (
													<span className="text-emerald-600 font-medium">Besplatno</span>
												) : (
													`${shippingCost.toFixed(2)} KM`
												)}
											</span>
										</div>
										{appliedDiscount && (
											<div className="flex justify-between text-sm">
												<span className="text-muted-foreground">Popust</span>
												<span className="text-emerald-600 font-medium">
													-{discountAmount.toFixed(2)} KM
												</span>
											</div>
										)}
									</div>

									<div className="flex justify-between items-center pt-6 border-t border-border">
										<span className="text-lg font-semibold text-foreground">Ukupno</span>
										<span className="text-2xl font-bold text-foreground">
											{total.toFixed(2)} KM
										</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Mobile Order Summary */}
				<div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border z-40">
					{showOrderSummary && (
						<div className="border-b border-border max-h-[50vh] overflow-y-auto">
							<div className="p-4 space-y-4">
								{items.map((item) => {
									const price = parseFloat(item.variant?.price || item.product?.price || "0");
									const variantLabel =
										item.variantOptions && item.variantOptions.length > 0
											? item.variantOptions.map((opt) => opt.optionValue).join(" / ")
											: null;

									return (
										<div key={item.id} className="flex gap-3">
											<div className="relative flex-shrink-0">
												<div className="w-12 h-12 rounded-lg overflow-hidden bg-muted">
													{item.image ? (
														<ProxyImage
															src={item.image}
															alt={item.product?.name || "Product"}
															width={48}
															height={48}
															resizingType="fill"
															className="w-full h-full object-cover"
														/>
													) : (
														<div className="w-full h-full flex items-center justify-center">
															<ShoppingBag className="size-4 text-muted-foreground" />
														</div>
													)}
												</div>
												<span className="absolute -top-1 -right-1 z-10 w-4 h-4 bg-foreground text-background text-[10px] rounded-full flex items-center justify-center font-medium">
													{item.quantity}
												</span>
											</div>
											<div className="flex-1 min-w-0">
												<div className="font-medium text-foreground text-sm line-clamp-1">
													{item.product?.name || "Proizvod"}
												</div>
												{variantLabel && (
													<div className="text-xs text-muted-foreground">{variantLabel}</div>
												)}
											</div>
											<div className="text-sm font-semibold text-foreground">
												{(price * item.quantity).toFixed(2)} KM
											</div>
										</div>
									);
								})}

								<div className="pt-4 border-t border-border space-y-2">
									<div className="flex justify-between text-sm">
										<span className="text-muted-foreground">Međuzbir</span>
										<span className="text-foreground">{subtotal.toFixed(2)} KM</span>
									</div>
									<div className="flex justify-between text-sm">
										<span className="text-muted-foreground">Dostava</span>
										<span className="text-foreground">
											{shippingCost === 0 ? (
												<span className="text-emerald-600 font-medium">Besplatno</span>
											) : (
												`${shippingCost.toFixed(2)} KM`
											)}
										</span>
									</div>
									{appliedDiscount && (
										<div className="flex justify-between text-sm">
											<span className="text-muted-foreground">Popust</span>
											<span className="text-emerald-600 font-medium">
												-{discountAmount.toFixed(2)} KM
											</span>
										</div>
									)}
								</div>
							</div>
						</div>
					)}

					<div className="px-4 py-3 safe-area-bottom">
						<button
							type="button"
							onClick={() => setShowOrderSummary(!showOrderSummary)}
							className="flex items-center justify-between w-full"
						>
							<div className="flex items-center gap-2">
								<ShoppingBag className="size-4 text-muted-foreground" />
								<span className="text-sm font-medium text-foreground">
									{showOrderSummary ? "Sakrij" : "Prikaži"} ({itemCount})
								</span>
								<ChevronDown
									className={cn(
										"size-4 text-muted-foreground transition-transform",
										showOrderSummary && "rotate-180"
									)}
								/>
							</div>
							<span className="text-lg font-bold text-foreground">{total.toFixed(2)} KM</span>
						</button>
					</div>
				</div>

				<div className="h-24 lg:hidden" />
			</main>
		</ShopLayout>
	);
}
