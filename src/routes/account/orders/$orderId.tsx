import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getUserOrderByIdQueryOptions } from "@/queries/orders";
import { ShopLayout } from "@/components/shop/ShopLayout";
import { getPublicShopSettingsServerFn } from "@/queries/settings";
import { getPublicNavigationServerFn } from "@/queries/navigation";
import { Button } from "@/components/ui/button";
import {
	Loader2,
	ArrowLeft,
	Package,
	Calendar,
	MapPin,
	Phone,
} from "lucide-react";

export const Route = createFileRoute("/account/orders/$orderId")({
	component: OrderDetailPage,
	loader: async ({ context, params }) => {
		const [settings, navigationItems] = await Promise.all([
			getPublicShopSettingsServerFn(),
			getPublicNavigationServerFn(),
			context.queryClient.ensureQueryData(
				getUserOrderByIdQueryOptions(params.orderId)
			),
		]);
		return { settings, navigationItems };
	},
});

function OrderDetailPage() {
	const { orderId } = Route.useParams();
	const { settings, navigationItems } = Route.useLoaderData();
	const { data: order, isLoading } = useQuery(getUserOrderByIdQueryOptions(orderId));

	const getStatusBadge = (status: string) => {
		const statusMap: Record<string, { label: string; className: string }> = {
			pending: { label: "Na čekanju", className: "bg-yellow-100 text-yellow-800" },
			paid: { label: "Plaćeno", className: "bg-blue-100 text-blue-800" },
			fulfilled: { label: "Isporučeno", className: "bg-green-100 text-green-800" },
			cancelled: { label: "Otkazano", className: "bg-red-100 text-red-800" },
			refunded: { label: "Refundirano", className: "bg-gray-100 text-gray-800" },
		};

		const statusInfo = statusMap[status] || {
			label: status,
			className: "bg-gray-100 text-gray-800",
		};

		return (
			<span
				className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusInfo.className}`}
			>
				{statusInfo.label}
			</span>
		);
	};

	const formatDate = (date: string | Date) => {
		return new Date(date).toLocaleDateString("bs-BA", {
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const formatAddress = (address: {
		address1?: string | null;
		address2?: string | null;
		city?: string | null;
		state?: string | null;
		zip?: string | null;
		country?: string | null;
	} | null | undefined) => {
		if (!address) return null;
		const parts = [
			address.address1,
			address.address2,
			`${address.zip || ""} ${address.city || ""}`.trim(),
			address.state,
			address.country,
		].filter(Boolean);
		return parts.join(", ");
	};

	if (isLoading) {
		return (
			<ShopLayout settings={settings} navigationItems={navigationItems}>
				<main className="container mx-auto px-4 py-8">
					<div className="flex items-center justify-center py-12">
						<Loader2 className="size-8 animate-spin text-primary" />
					</div>
				</main>
			</ShopLayout>
		);
	}

	if (!order) {
		return (
			<ShopLayout settings={settings} navigationItems={navigationItems}>
				<main className="container mx-auto px-4 py-8">
					<div className="text-center py-12">
						<p className="text-gray-600">Narudžba nije pronađena.</p>
						<Button asChild className="mt-4">
							<Link to="/account/orders">Nazad na narudžbe</Link>
						</Button>
					</div>
				</main>
			</ShopLayout>
		);
	}

	return (
		<ShopLayout settings={settings} navigationItems={navigationItems}>
			<main className="container mx-auto px-4 py-8">
				<div className="max-w-4xl mx-auto">
					<Button variant="ghost" asChild className="mb-6">
						<Link to="/account/orders">
							<ArrowLeft className="size-4 mr-2" />
							Nazad na narudžbe
						</Link>
					</Button>

					<div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
						<div className="flex items-start justify-between mb-4">
							<div>
								<h1 className="text-2xl font-bold text-gray-900 mb-2">
									Narudžba {order.orderNumber}
								</h1>
								<div className="flex items-center gap-4 text-sm text-gray-600">
									<div className="flex items-center gap-1">
										<Calendar className="size-4" />
										<span>{formatDate(order.createdAt)}</span>
									</div>
								</div>
							</div>
							{getStatusBadge(order.status)}
						</div>

						{order.note && (
							<div className="mt-4 p-4 bg-gray-50 rounded-md">
								<p className="text-sm text-gray-700">
									<strong>Napomena:</strong> {order.note}
								</p>
							</div>
						)}
					</div>

					<div className="grid md:grid-cols-2 gap-6 mb-6">
						{order.billingAddress && (
							<div className="bg-white rounded-lg border border-gray-200 p-6">
								<h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
									<MapPin className="size-5" />
									Adresa za naplatu
								</h3>
								<div className="space-y-2 text-sm text-gray-600">
									{order.billingAddress.firstName ||
									order.billingAddress.lastName ? (
										<p className="font-medium text-gray-900">
											{[
												order.billingAddress.firstName,
												order.billingAddress.lastName,
											]
												.filter(Boolean)
												.join(" ")}
										</p>
									) : null}
									{order.billingAddress.company && (
										<p>{order.billingAddress.company}</p>
									)}
									<p>{formatAddress(order.billingAddress)}</p>
									{order.billingAddress.phone && (
										<p className="flex items-center gap-1">
											<Phone className="size-4" />
											{order.billingAddress.phone}
										</p>
									)}
								</div>
							</div>
						)}

						{order.shippingAddress && (
							<div className="bg-white rounded-lg border border-gray-200 p-6">
								<h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
									<Package className="size-5" />
									Adresa za dostavu
								</h3>
								<div className="space-y-2 text-sm text-gray-600">
									{order.shippingAddress.firstName ||
									order.shippingAddress.lastName ? (
										<p className="font-medium text-gray-900">
											{[
												order.shippingAddress.firstName,
												order.shippingAddress.lastName,
											]
												.filter(Boolean)
												.join(" ")}
										</p>
									) : null}
									{order.shippingAddress.company && (
										<p>{order.shippingAddress.company}</p>
									)}
									<p>{formatAddress(order.shippingAddress)}</p>
									{order.shippingAddress.phone && (
										<p className="flex items-center gap-1">
											<Phone className="size-4" />
											{order.shippingAddress.phone}
										</p>
									)}
								</div>
							</div>
						)}
					</div>

					<div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
						<h3 className="font-semibold text-gray-900 mb-4">Stavke narudžbe</h3>
						<div className="space-y-4">
							{order.items?.map((item) => (
								<div
									key={item.id}
									className="flex items-start gap-4 pb-4 border-b border-gray-200 last:border-0"
								>
									{item.imageUrl && (
										<img
											src={item.imageUrl}
											alt={item.title}
											className="w-20 h-20 object-cover rounded-md"
										/>
									)}
									<div className="flex-1">
										<h4 className="font-medium text-gray-900">{item.title}</h4>
										{item.variantTitle && (
											<p className="text-sm text-gray-600 mt-1">
												{item.variantTitle}
											</p>
										)}
										{item.sku && (
											<p className="text-xs text-gray-500 mt-1">SKU: {item.sku}</p>
										)}
										<p className="text-sm text-gray-600 mt-2">
											Količina: {item.quantity}
										</p>
									</div>
									<div className="text-right">
										<p className="font-semibold text-gray-900">
											{parseFloat(item.total).toFixed(2)} {order.currency}
										</p>
										<p className="text-sm text-gray-600">
											{parseFloat(item.price).toFixed(2)} {order.currency} po
											komadu
										</p>
									</div>
								</div>
							))}
						</div>
					</div>

					<div className="bg-white rounded-lg border border-gray-200 p-6">
						<div className="space-y-3">
							<div className="flex justify-between text-sm">
								<span className="text-gray-600">Međuzbir:</span>
								<span className="text-gray-900">
									{parseFloat(order.subtotal).toFixed(2)} {order.currency}
								</span>
							</div>
							{parseFloat(order.discount) > 0 && (
								<div className="flex justify-between text-sm">
									<span className="text-gray-600">Popust:</span>
									<span className="text-green-600">
										-{parseFloat(order.discount).toFixed(2)} {order.currency}
									</span>
								</div>
							)}
							{parseFloat(order.shipping) > 0 && (
								<div className="flex justify-between text-sm">
									<span className="text-gray-600">Dostava:</span>
									<span className="text-gray-900">
										{parseFloat(order.shipping).toFixed(2)} {order.currency}
									</span>
								</div>
							)}
							{parseFloat(order.tax) > 0 && (
								<div className="flex justify-between text-sm">
									<span className="text-gray-600">Porez:</span>
									<span className="text-gray-900">
										{parseFloat(order.tax).toFixed(2)} {order.currency}
									</span>
								</div>
							)}
							<div className="flex justify-between pt-3 border-t border-gray-200">
								<span className="font-semibold text-gray-900">Ukupno:</span>
								<span className="font-bold text-lg text-gray-900">
									{parseFloat(order.total).toFixed(2)} {order.currency}
								</span>
							</div>
						</div>
					</div>
				</div>
			</main>
		</ShopLayout>
	);
}

