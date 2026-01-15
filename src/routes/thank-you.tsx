import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ShopLayout } from "@/components/shop/ShopLayout";
import { getPublicShopSettingsServerFn } from "@/queries/settings";
import { getPublicNavigationServerFn } from "@/queries/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOrderByIdQueryOptions } from "@/queries/orders";
import { activateAccountServerFn, checkEmailHasAccountServerFn } from "@/server/auth.server";
import { CheckCircle2, Package, Mail, Phone, MapPin, Lock } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { useState, useEffect, useRef, useCallback } from "react";
import confetti from "canvas-confetti";
import { authClient } from "@/lib/auth-client";
import { CART_QUERY_KEY, mergeCartsMutationOptions } from "@/queries/cart";
import { WISHLIST_QUERY_KEY, mergeWishlistsMutationOptions } from "@/queries/wishlist";
import { useCartSession } from "@/hooks/useCartSession";
import { getUserRoleServerFn } from "@/server/auth.server";
import { RecommendationCarousel } from "@/components/shop/RecommendationCarousel";
import {
	trackPurchaseServerFn,
	getRecommendationsServerFn,
} from "@/queries/gorse";
import { ProxyImage } from "@/components/ui/proxy-image";

export const Route = createFileRoute("/thank-you")({
	component: ThankYouPage,
	validateSearch: (search: Record<string, unknown>) => {
		return {
			orderId: (search.orderId as string) || undefined,
		};
	},
	loader: async () => {
		const [settings, navigationItems] = await Promise.all([
			getPublicShopSettingsServerFn(),
			getPublicNavigationServerFn(),
		]);
		return { settings, navigationItems };
	},
});

const passwordSchema = z.object({
	password: z.string().min(8, "Lozinka mora biti najmanje 8 karaktera"),
	confirmPassword: z.string().min(8, "Potvrda lozinke mora biti najmanje 8 karaktera"),
}).refine((data) => data.password === data.confirmPassword, {
	message: "Lozinke se ne poklapaju",
	path: ["confirmPassword"],
});

function AccountActivationCard({ email }: { email: string }) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { sessionId, clearSession } = useCartSession();
	const [isActivated, setIsActivated] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isChecking, setIsChecking] = useState(true);
	const [shouldShow, setShouldShow] = useState(false);

	const mergeCartsMutation = useMutation(mergeCartsMutationOptions());
	const mergeWishlistsMutation = useMutation(mergeWishlistsMutationOptions());

	// Check if user is already logged in OR email already has an account
	useEffect(() => {
		const checkAccount = async () => {
			// First check if already logged in
			const session = await authClient.getSession();
			if (session?.data?.user) {
				setIsChecking(false);
				setShouldShow(false);
				return;
			}

			// Check if email already has a registered account with password
			try {
				const result = await checkEmailHasAccountServerFn({ data: { email } });
				setShouldShow(!result.hasAccount);
			} catch (error) {
				// On error, don't show the form
				setShouldShow(false);
			}
			setIsChecking(false);
		};

		checkAccount();
	}, [email]);

	const form = useForm({
		defaultValues: {
			password: "",
			confirmPassword: "",
		},
		onSubmit: async ({ value }) => {
			setError(null);
			try {
				const result = await activateAccountServerFn({
					data: {
						email,
						password: value.password,
					},
				});

				if (result.success && result.user) {
					setIsActivated(true);

					// Merge guest cart and wishlist with user if guest session exists
					if (sessionId && result.user.id) {
						try {
							await mergeCartsMutation.mutateAsync({
								guestSessionId: sessionId,
								userId: result.user.id,
							});
							queryClient.invalidateQueries({ queryKey: [CART_QUERY_KEY] });
						} catch (error) {
							console.error("Error merging carts:", error);
						}

						try {
							await mergeWishlistsMutation.mutateAsync({
								guestSessionId: sessionId,
								userId: result.user.id,
							});
							queryClient.invalidateQueries({ queryKey: [WISHLIST_QUERY_KEY] });
						} catch (error) {
							console.error("Error merging wishlists:", error);
						}

						clearSession();
					}

					// Show success message
					alert("Nalog aktiviran!");

					// Get user role and navigate accordingly
					try {
						const userRole = await getUserRoleServerFn({
							data: { userId: result.user.id },
						});
						if (userRole === "admin") {
							navigate({ to: "/admin", replace: true });
						} else {
							// Refresh the page to show logged-in state
							window.location.reload();
						}
					} catch (error) {
						console.error("Error getting user role:", error);
						window.location.reload();
					}
				} else {
					setError(result.message || "Greška pri aktivaciji naloga");
				}
			} catch (error: any) {
				setError(error?.message || "Greška pri aktivaciji naloga. Molimo pokušajte ponovo.");
			}
		},
	});

	if (isChecking) {
		return (
			<div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-6">
				<div className="flex items-center justify-center">
					<Loader2 className="size-5 animate-spin text-blue-600" />
				</div>
			</div>
		);
	}

	if (isActivated || !shouldShow) {
		return null; // Hide form after activation or if user already has an account
	}

	return (
		<div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-6">
			<div className="flex items-start gap-3 mb-4">
				<Lock className="size-5 text-blue-600 mt-0.5 flex-shrink-0" />
				<div className="flex-1">
					<h3 className="font-semibold text-blue-900 mb-1">
						Pratite svoju narudžbu lakše
					</h3>
					<p className="text-sm text-blue-800">
						Detalji vaše narudžbe su sačuvani na <strong>{email}</strong>. Postavite lozinku da biste pratili ovu pošiljku i ubrzali buduće kupovine.
					</p>
				</div>
			</div>

			{error && (
				<div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
					{error}
				</div>
			)}

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="space-y-4"
			>
				<form.Field
					name="password"
					validators={{
						onChange: ({ value }) => {
							const result = passwordSchema.shape.password.safeParse(value);
							return result.success
								? undefined
								: result.error.errors[0]?.message;
						},
					}}
				>
					{(field) => (
						<div className="space-y-2">
							<Label htmlFor="password">Lozinka</Label>
							<Input
								id="password"
								type="password"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								placeholder="Najmanje 8 karaktera"
								required
								className={
									field.state.meta.errors.length > 0
										? "border-red-500"
										: ""
								}
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
					name="confirmPassword"
					validators={{
						onChange: ({ value }) => {
							const result = passwordSchema.shape.confirmPassword.safeParse(value);
							if (!result.success) {
								return result.error.errors[0]?.message;
							}
							// Check if passwords match
							if (value !== form.state.values.password) {
								return "Lozinke se ne poklapaju";
							}
							return undefined;
						},
					}}
				>
					{(field) => (
						<div className="space-y-2">
							<Label htmlFor="confirmPassword">Potvrdite lozinku</Label>
							<Input
								id="confirmPassword"
								type="password"
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={(e) => field.handleChange(e.target.value)}
								placeholder="Ponovite lozinku"
								required
								className={
									field.state.meta.errors.length > 0
										? "border-red-500"
										: ""
								}
							/>
							{field.state.meta.errors.length > 0 && (
								<p className="text-sm text-red-500">
									{field.state.meta.errors[0]}
								</p>
							)}
						</div>
					)}
				</form.Field>

				<form.Subscribe
					selector={(state) => [state.isSubmitting, state.canSubmit]}
					children={([isSubmitting, canSubmit]) => (
						<Button
							type="submit"
							disabled={isSubmitting || !canSubmit}
							className="w-full"
						>
							{isSubmitting ? (
								<>
									<Loader2 className="size-4 mr-2 animate-spin" />
									Aktiviranje...
								</>
							) : (
								"Aktiviraj nalog"
							)}
						</Button>
					)}
				/>
			</form>
		</div>
	);
}

function ThankYouPage() {
	const { orderId } = Route.useSearch();
	const { settings, navigationItems } = Route.useLoaderData();
	const { sessionId } = useCartSession();
	const purchaseTrackedRef = useRef(false);
	const confettiTriggeredRef = useRef(false);

	const { data: order, isLoading, error } = useQuery(
		getOrderByIdQueryOptions(orderId || "")
	);

	// Trigger confetti celebration when order loads
	const triggerConfetti = useCallback(() => {
		// Fire multiple bursts for a more celebratory effect
		const duration = 3000;
		const end = Date.now() + duration;

		const colors = ["#00ff88", "#00d4ff", "#ff0044", "#ff3399", "#aa55ff", "#ff6644"];

		const frame = () => {
			confetti({
				particleCount: 3,
				angle: 60,
				spread: 55,
				origin: { x: 0, y: 0.6 },
				colors: colors,
			});
			confetti({
				particleCount: 3,
				angle: 120,
				spread: 55,
				origin: { x: 1, y: 0.6 },
				colors: colors,
			});

			if (Date.now() < end) {
				requestAnimationFrame(frame);
			}
		};

		// Initial big burst
		confetti({
			particleCount: 100,
			spread: 70,
			origin: { y: 0.6 },
			colors: colors,
		});

		// Continuous side bursts
		frame();
	}, []);

	useEffect(() => {
		if (order && !confettiTriggeredRef.current) {
			confettiTriggeredRef.current = true;
			// Small delay to let the page render first
			setTimeout(triggerConfetti, 300);
		}
	}, [order, triggerConfetti]);

	// Track purchases when order loads - use customerId from order as stable identifier
	useEffect(() => {
		if (order && !purchaseTrackedRef.current) {
			purchaseTrackedRef.current = true;
			const userId = order.customerId || sessionId || "anonymous";

			// Track each item as a purchase
			order.items?.forEach((item) => {
				if (item.productId) {
					trackPurchaseServerFn({
						data: { itemId: item.productId, userId },
					});
				}
			});
		}
	}, [order]);

	// Fetch recommendations - use orderId as stable key since sessionId changes after checkout
	const { data: recommendedData, isLoading: recommendedLoading } = useQuery({
		queryKey: ["thank-you-recommendations", orderId],
		queryFn: () =>
			getRecommendationsServerFn({
				data: { userId: order?.customerId || sessionId || "anonymous", count: 8 },
			}),
		enabled: !!order,
		staleTime: 1000 * 60 * 5,
	});

	const recommendedProducts = recommendedData?.products || [];

	if (!orderId) {
		return (
			<ShopLayout settings={settings} navigationItems={navigationItems}>
				<div className="container mx-auto px-4 py-12">
					<div className="max-w-2xl mx-auto text-center">
						<h1 className="text-3xl font-bold text-gray-900 mb-4">
							Greška
						</h1>
						<p className="text-gray-600 mb-6">
							Narudžba nije pronađena. Molimo provjerite link ili kontaktirajte
							podršku.
						</p>
						<Button asChild>
							<Link to="/products">Nastavi kupovinu</Link>
						</Button>
					</div>
				</div>
			</ShopLayout>
		);
	}

	if (isLoading) {
		return (
			<ShopLayout settings={settings} navigationItems={navigationItems}>
				<div className="container mx-auto px-4 py-12">
					<div className="flex items-center justify-center">
						<Loader2 className="size-8 animate-spin text-primary" />
					</div>
				</div>
			</ShopLayout>
		);
	}

	if (error || !order) {
		return (
			<ShopLayout settings={settings} navigationItems={navigationItems}>
				<div className="container mx-auto px-4 py-12">
					<div className="max-w-2xl mx-auto text-center">
						<h1 className="text-3xl font-bold text-gray-900 mb-4">
							Greška
						</h1>
						<p className="text-gray-600 mb-6">
							Narudžba nije pronađena. Molimo kontaktirajte podršku ako mislite
							da je došlo do greške.
						</p>
						<Button asChild>
							<Link to="/products">Nastavi kupovinu</Link>
						</Button>
					</div>
				</div>
			</ShopLayout>
		);
	}

	const shippingAddress = order.shippingAddress;
	const items = order.items || [];
	const shippingCost = parseFloat(order.shipping || "0");
	const discountAmount = parseFloat(order.discount || "0");

	return (
		<ShopLayout settings={settings} navigationItems={navigationItems}>
			<main className="min-h-screen bg-background">
				<div className="container mx-auto px-4 py-8 lg:py-16">
					<div className="max-w-2xl mx-auto">
						{/* Success Header */}
						<div className="text-center mb-12">
							<div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-6">
								<CheckCircle2 className="size-10 text-emerald-600" />
							</div>
							<h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
								Hvala vam na narudžbi!
							</h1>
							<p className="text-sm text-muted-foreground">
								Broj narudžbe:{" "}
								<span className="font-mono font-semibold text-foreground">{order.orderNumber}</span>
							</p>
						</div>

						{/* What's Next */}
						<div className="text-center mb-10 px-4">
							<p className="text-sm text-muted-foreground leading-relaxed">
								Poslat ćemo vam email potvrdu na{" "}
								<span className="font-medium text-foreground">{order.email}</span> kada
								narudžba bude spremna za slanje. Očekivano vrijeme isporuke je 3-5 radnih dana.
							</p>
							<p className="text-sm text-muted-foreground mt-3">
								Ukoliko podaci nisu ispravni, kontaktirajte nas na{" "}
								<a href="mailto:office@lunatik.ba" className="font-medium text-foreground underline underline-offset-2 hover:text-primary">
									office@lunatik.ba
								</a>
							</p>
						</div>

						{/* Order Items */}
						<div className="mb-8 pl-1">
							<h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
								Proizvodi
							</h2>
							<div className="space-y-4">
								{items.map((item) => {
									const itemTotal = parseFloat(item.total || "0");
									return (
										<div key={item.id} className="flex gap-4">
											<div className="relative flex-shrink-0">
												<div className="w-16 h-16 rounded-xl overflow-hidden bg-muted">
													{item.imageUrl ? (
														<ProxyImage
															src={item.imageUrl}
															alt={item.title}
															width={64}
															height={64}
															resizingType="fill"
															className="w-full h-full object-cover"
														/>
													) : (
														<div className="w-full h-full flex items-center justify-center">
															<Package className="size-6 text-muted-foreground" />
														</div>
													)}
												</div>
												<span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-foreground text-background text-xs rounded-full flex items-center justify-center font-medium">
													{item.quantity}
												</span>
											</div>
											<div className="flex-1 min-w-0">
												<div className="font-medium text-foreground line-clamp-1">
													{item.title}
												</div>
												{item.variantTitle && (
													<div className="text-sm text-muted-foreground">
														{item.variantTitle}
													</div>
												)}
											</div>
											<div className="font-semibold text-foreground">
												{itemTotal.toFixed(2)} KM
											</div>
										</div>
									);
								})}
							</div>
						</div>

						{/* Totals */}
						<div className="mb-8 py-6 px-1 border-y border-border">
							<div className="space-y-2">
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Međuzbir</span>
									<span className="text-foreground">{parseFloat(order.subtotal || "0").toFixed(2)} KM</span>
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
								{discountAmount > 0 && (
									<div className="flex justify-between text-sm">
										<span className="text-muted-foreground">Popust</span>
										<span className="text-emerald-600 font-medium">-{discountAmount.toFixed(2)} KM</span>
									</div>
								)}
							</div>
							<div className="flex justify-between items-center mt-4 pt-4 border-t border-border">
								<span className="text-lg font-semibold text-foreground">Ukupno</span>
								<span className="text-2xl font-bold text-foreground">
									{parseFloat(order.total || "0").toFixed(2)} KM
								</span>
							</div>
						</div>

						{/* Delivery & Contact Info */}
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-10 pl-1">
							{/* Shipping Address */}
							{shippingAddress && (
								<div>
									<h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
										<MapPin className="size-3.5" />
										Dostava
									</h2>
									<div className="space-y-1 text-sm text-foreground">
										<div className="font-medium">
											{shippingAddress.firstName} {shippingAddress.lastName}
										</div>
										<div className="text-muted-foreground">{shippingAddress.address1}</div>
										{shippingAddress.address2 && (
											<div className="text-muted-foreground">{shippingAddress.address2}</div>
										)}
										<div className="text-muted-foreground">
											{shippingAddress.zip} {shippingAddress.city}
										</div>
									</div>
								</div>
							)}

							{/* Contact */}
							<div>
								<h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
									<Mail className="size-3.5" />
									Kontakt
								</h2>
								<div className="space-y-1 text-sm">
									{order.email && (
										<div className="text-muted-foreground">{order.email}</div>
									)}
									{shippingAddress?.phone && (
										<div className="text-muted-foreground">{shippingAddress.phone}</div>
									)}
								</div>
							</div>
						</div>

						{/* Account Activation Card */}
						{order.email && (
							<AccountActivationCard email={order.email} />
						)}

						{/* Actions */}
						<div className="flex flex-col sm:flex-row gap-3 justify-center">
							<Button asChild size="lg" className="h-12 px-8">
								<Link to="/products">Nastavi kupovinu</Link>
							</Button>
							<Button asChild variant="outline" size="lg" className="h-12 px-8">
								<Link to="/">Početna stranica</Link>
							</Button>
						</div>

						{/* Recommendations */}
						{(recommendedProducts.length > 0 || recommendedLoading) && (
							<div className="mt-16 pt-10 border-t border-border pl-1">
								<RecommendationCarousel
									title="Možda vam se također sviđa"
									products={recommendedProducts}
									loading={recommendedLoading}
								/>
							</div>
						)}
					</div>
				</div>
			</main>
		</ShopLayout>
	);
}

