import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getUserOrdersQueryOptions } from "@/queries/orders";
import { ShopNavigation } from "@/components/shop/ShopNavigation";
import { Button } from "@/components/ui/button";
import { Loader2, Package, Calendar, DollarSign } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/account/orders")({
	component: OrdersPage,
	loader: async ({ context }) => {
		await context.queryClient.ensureQueryData(
			getUserOrdersQueryOptions({
				page: 1,
				limit: 10,
			})
		);
	},
});

const LIMIT = 10;

function OrdersPage() {
	const [page, setPage] = useState(1);

	const { data, isLoading } = useQuery(
		getUserOrdersQueryOptions({
			page,
			limit: LIMIT,
		})
	);

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
				className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}
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
		});
	};

	return (
		<div className="min-h-screen bg-gray-50">
			<ShopNavigation />
			<main className="container mx-auto px-4 py-8">
				<div className="max-w-4xl mx-auto">
					<div className="mb-8">
						<h1 className="text-3xl font-bold text-gray-900 mb-2">Moje narudžbe</h1>
						<p className="text-gray-600">
							Pregled svih vaših narudžbi i njihovih statusa
						</p>
					</div>

					{isLoading ? (
						<div className="flex items-center justify-center py-12">
							<Loader2 className="size-8 animate-spin text-primary" />
						</div>
					) : data && data.data.length > 0 ? (
						<>
							<div className="space-y-4">
								{data.data.map((order) => (
									<Link
										key={order.id}
										to="/account/orders/$orderId"
										params={{ orderId: order.id }}
										className="block"
									>
										<div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
											<div className="flex items-start justify-between">
												<div className="flex-1">
													<div className="flex items-center gap-3 mb-2">
														<Package className="size-5 text-gray-400" />
														<span className="font-semibold text-lg text-gray-900">
															{order.orderNumber}
														</span>
														{getStatusBadge(order.status)}
													</div>
													<div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
														<div className="flex items-center gap-1">
															<Calendar className="size-4" />
															<span>{formatDate(order.createdAt)}</span>
														</div>
														<div className="flex items-center gap-1">
															<DollarSign className="size-4" />
															<span className="font-medium">
																{parseFloat(order.total).toFixed(2)} {order.currency}
															</span>
														</div>
													</div>
												</div>
												<Button variant="ghost" size="sm" className="ml-4">
													Detalji →
												</Button>
											</div>
										</div>
									</Link>
								))}
							</div>

							{/* Pagination */}
							{(data.hasNextPage || data.hasPreviousPage) && (
								<div className="flex items-center justify-center gap-2 mt-8">
									<Button
										variant="outline"
										disabled={!data.hasPreviousPage}
										onClick={() => setPage(page - 1)}
									>
										Prethodno
									</Button>
								<span className="text-sm text-gray-600">
									Strana {page} od {Math.ceil((data.total || 0) / LIMIT)}
								</span>
									<Button
										variant="outline"
										disabled={!data.hasNextPage}
										onClick={() => setPage(page + 1)}
									>
										Sljedeće
									</Button>
								</div>
							)}
						</>
					) : (
						<div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
							<Package className="size-12 text-gray-400 mx-auto mb-4" />
							<h3 className="text-lg font-semibold text-gray-900 mb-2">
								Nema narudžbi
							</h3>
							<p className="text-gray-600 mb-6">
								Još niste napravili nijednu narudžbu.
							</p>
							<Button asChild>
								<Link to="/products">Pregledaj proizvode</Link>
							</Button>
						</div>
					)}
				</div>
			</main>
		</div>
	);
}

