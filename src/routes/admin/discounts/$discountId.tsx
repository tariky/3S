import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
	getDiscountByIdServerFn,
	getDiscountUsageHistoryServerFn,
	DISCOUNTS_QUERY_KEY,
} from "@/queries/discounts";
import { DiscountEditor } from "@/components/discounts/DiscountEditor";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users } from "lucide-react";

export const Route = createFileRoute("/admin/discounts/$discountId")({
	component: EditDiscountPage,
});

function EditDiscountPage() {
	const { discountId } = Route.useParams();

	const { data: discount, isLoading } = useQuery({
		queryKey: [DISCOUNTS_QUERY_KEY, discountId],
		queryFn: () => getDiscountByIdServerFn({ data: { id: discountId } }),
	});

	const { data: usageHistory = [], isLoading: isLoadingHistory } = useQuery({
		queryKey: [DISCOUNTS_QUERY_KEY, discountId, "history"],
		queryFn: () =>
			getDiscountUsageHistoryServerFn({ data: { discountId } }),
		enabled: !!discountId,
	});

	const formatDate = (date: string) => {
		return new Date(date).toLocaleDateString("hr-HR", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const formatPrice = (price: number | string) => {
		return Number(price).toFixed(2);
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-64">
				<Loader2 className="size-8 animate-spin text-primary" />
			</div>
		);
	}

	if (!discount) {
		return (
			<div className="text-center py-12">
				<p className="text-gray-500">Popust nije pronađen</p>
			</div>
		);
	}

	const discountData = {
		id: discount.id,
		code: discount.code,
		type: discount.type as "percentage" | "fixed",
		value: Number(discount.value),
		minimumPurchase: discount.minimumPurchase ? Number(discount.minimumPurchase) : null,
		maximumDiscount: discount.maximumDiscount ? Number(discount.maximumDiscount) : null,
		usageLimit: discount.usageLimit,
		usageCount: discount.usageCount,
		startsAt: discount.startsAt,
		endsAt: discount.endsAt,
		active: discount.active,
	};

	return (
		<div className="space-y-8">
			<DiscountEditor discount={discountData} isEditing />

			{/* Usage History Section */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Users className="size-5" />
						Historija korištenja ({usageHistory.length})
					</CardTitle>
				</CardHeader>
				<CardContent>
					{isLoadingHistory ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="size-6 animate-spin text-gray-400" />
						</div>
					) : usageHistory.length > 0 ? (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Narudžba</TableHead>
									<TableHead>Kupac</TableHead>
									<TableHead>Datum</TableHead>
									<TableHead className="text-right">Ukupno</TableHead>
									<TableHead className="text-right">Popust</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{usageHistory.map((order: any) => (
									<TableRow key={order.id}>
										<TableCell>
											<Link
												to="/admin/orders/$orderId"
												params={{ orderId: order.id }}
												className="text-blue-600 hover:underline font-medium"
											>
												#{order.orderNumber}
											</Link>
										</TableCell>
										<TableCell>
											{order.customer ? (
												<div>
													<div className="font-medium">
														{order.customer.firstName} {order.customer.lastName}
													</div>
													<div className="text-sm text-gray-500">
														{order.customer.email}
													</div>
												</div>
											) : (
												<span className="text-gray-400">Gost</span>
											)}
										</TableCell>
										<TableCell className="text-gray-500">
											{formatDate(order.createdAt)}
										</TableCell>
										<TableCell className="text-right font-medium">
											{formatPrice(order.total)} KM
										</TableCell>
										<TableCell className="text-right text-green-600 font-medium">
											-{formatPrice(order.discount)} KM
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					) : (
						<div className="text-center py-8 text-gray-500 border rounded-lg border-dashed">
							Ovaj popust još nije korišten
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
