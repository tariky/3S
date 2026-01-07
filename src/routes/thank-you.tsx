import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ShopNavigation } from "@/components/shop/ShopNavigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOrderByIdQueryOptions } from "@/queries/orders";
import { activateAccountServerFn } from "@/server/auth.server";
import { CheckCircle2, Package, Mail, Phone, MapPin, Lock } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";
import { useState, useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { CART_QUERY_KEY, mergeCartsMutationOptions } from "@/queries/cart";
import { useCartSession } from "@/hooks/useCartSession";
import { getUserRoleServerFn } from "@/server/auth.server";

export const Route = createFileRoute("/thank-you")({
	component: ThankYouPage,
	validateSearch: (search: Record<string, unknown>) => {
		return {
			orderId: (search.orderId as string) || undefined,
		};
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
	const [isCheckingSession, setIsCheckingSession] = useState(true);
	const [isLoggedIn, setIsLoggedIn] = useState(false);

	const mergeCartsMutation = useMutation(mergeCartsMutationOptions());

	// Check if user is already logged in
	useEffect(() => {
		authClient.getSession().then((session) => {
			if (session?.data?.user) {
				setIsLoggedIn(true);
			}
			setIsCheckingSession(false);
		});
	}, []);

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
					
					// Merge guest cart with user cart if guest session exists
					if (sessionId && result.user.id) {
						try {
							await mergeCartsMutation.mutateAsync({
								guestSessionId: sessionId,
								userId: result.user.id,
							});
							queryClient.invalidateQueries({ queryKey: [CART_QUERY_KEY] });
							clearSession();
						} catch (error) {
							console.error("Error merging carts:", error);
						}
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

	if (isCheckingSession) {
		return (
			<div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-6">
				<div className="flex items-center justify-center">
					<Loader2 className="size-5 animate-spin text-blue-600" />
				</div>
			</div>
		);
	}

	if (isActivated || isLoggedIn) {
		return null; // Hide form after activation or if already logged in
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

	const { data: order, isLoading, error } = useQuery(
		getOrderByIdQueryOptions(orderId || "")
	);

	if (!orderId) {
		return (
			<div className="min-h-screen bg-gray-50">
				<ShopNavigation />
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
			</div>
		);
	}

	if (isLoading) {
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

	if (error || !order) {
		return (
			<div className="min-h-screen bg-gray-50">
				<ShopNavigation />
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
			</div>
		);
	}

	const shippingAddress = order.shippingAddress;
	const items = order.items || [];

	return (
		<div className="min-h-screen bg-gray-50">
			<ShopNavigation />
			<main className="container mx-auto px-4 py-12">
				<div className="max-w-3xl mx-auto">
					{/* Success Header */}
					<div className="text-center mb-8">
						<div className="flex justify-center mb-4">
							<CheckCircle2 className="size-16 text-green-600" />
						</div>
						<h1 className="text-3xl font-bold text-gray-900 mb-2">
							Hvala vam na narudžbi!
						</h1>
						<p className="text-lg text-gray-600">
							Vaša narudžba je uspješno primljena i procesira se.
						</p>
						<p className="text-sm text-gray-500 mt-2">
							Broj narudžbe: <span className="font-semibold">{order.orderNumber}</span>
						</p>
					</div>

					{/* Order Summary */}
					<div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
						<h2 className="text-xl font-semibold text-gray-900 mb-4">
							Pregled narudžbe
						</h2>

						{/* Order Items */}
						<div className="space-y-4 mb-6">
							{items.map((item) => {
								const itemTotal = parseFloat(item.total || "0");
								return (
									<div
										key={item.id}
										className="flex items-start gap-4 pb-4 border-b border-gray-200 last:border-0"
									>
										{item.imageUrl && (
											<div className="relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden bg-gray-100">
												<img
													src={item.imageUrl}
													alt={item.title}
													className="w-full h-full object-cover"
												/>
											</div>
										)}
										<div className="flex-1 min-w-0">
											<div className="font-medium text-gray-900">
												{item.title}
											</div>
											{item.variantTitle && (
												<div className="text-sm text-gray-600 mt-1">
													{item.variantTitle}
												</div>
											)}
											<div className="text-sm text-gray-600 mt-1">
												Količina: {item.quantity} × {parseFloat(item.price || "0").toFixed(2)} KM
											</div>
										</div>
										<div className="text-gray-900 font-medium">
											{itemTotal.toFixed(2)} KM
										</div>
									</div>
								);
							})}
						</div>

						{/* Order Totals */}
						<div className="border-t border-gray-200 pt-4 space-y-2">
							<div className="flex justify-between text-sm">
								<span className="text-gray-600">Međuzbir</span>
								<span className="text-gray-900">
									{parseFloat(order.subtotal || "0").toFixed(2)} KM
								</span>
							</div>
							<div className="flex justify-between text-sm">
								<span className="text-gray-600">Dostava</span>
								<span className="text-gray-900">
									{parseFloat(order.shipping || "0").toFixed(2)} KM
								</span>
							</div>
							<div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
								<span>Ukupno</span>
								<span>{parseFloat(order.total || "0").toFixed(2)} KM</span>
							</div>
						</div>
					</div>

					{/* Shipping Information */}
					{shippingAddress && (
						<div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
							<h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
								<MapPin className="size-5" />
								Adresa za dostavu
							</h2>
							<div className="space-y-1 text-gray-700">
								<div className="font-medium">
									{shippingAddress.firstName} {shippingAddress.lastName}
								</div>
								<div>{shippingAddress.address1}</div>
								{shippingAddress.address2 && <div>{shippingAddress.address2}</div>}
								<div>
									{shippingAddress.zip} {shippingAddress.city}
								</div>
								{shippingAddress.state && <div>{shippingAddress.state}</div>}
								<div>{shippingAddress.country}</div>
								{shippingAddress.phone && (
									<div className="flex items-center gap-2 mt-2">
										<Phone className="size-4" />
										{shippingAddress.phone}
									</div>
								)}
							</div>
						</div>
					)}

					{/* Contact Information */}
					{order.email && (
						<div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
							<h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
								<Mail className="size-5" />
								Kontakt informacije
							</h2>
							<div className="text-gray-700">
								<div className="flex items-center gap-2">
									<Mail className="size-4" />
									{order.email}
								</div>
							</div>
						</div>
					)}

					{/* Account Activation Card */}
					{order.email && (
						<AccountActivationCard email={order.email} />
					)}

					{/* Order Status */}
					<div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
						<div className="flex items-start gap-3">
							<Package className="size-5 text-blue-600 mt-0.5 flex-shrink-0" />
							<div>
								<h3 className="font-semibold text-blue-900 mb-1">
									Šta dalje?
								</h3>
								<p className="text-sm text-blue-800">
									Primili smo vašu narudžbu i procesiramo je. Poslat ćemo vam
									email potvrdu na {order.email || "vašu email adresu"} kada
									narudžba bude spremna za slanje. Očekivano vrijeme isporuke je
									3-5 radnih dana.
								</p>
							</div>
						</div>
					</div>

					{/* Actions */}
					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						<Button asChild size="lg">
							<Link to="/products">Nastavi kupovinu</Link>
						</Button>
						<Button asChild variant="outline" size="lg">
							<Link to="/">Početna stranica</Link>
						</Button>
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

