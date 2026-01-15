import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
	getPurchaseOrderQueryOptions,
	markPurchaseOrderOrderedServerFn,
	cancelPurchaseOrderServerFn,
	receivePurchaseOrderServerFn,
	PURCHASE_ORDERS_QUERY_KEY,
} from "@/queries/purchase-orders";
import {
	ClipboardList,
	ArrowLeft,
	Send,
	XCircle,
	PackageCheck,
	Clock,
	Truck,
	CheckCircle2,
	FileText,
	Package,
	Building2,
	Calendar,
	User,
	RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogFooter,
} from "@/components/ui/dialog";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ProxyImage } from "@/components/ui/proxy-image";

export const Route = createFileRoute("/admin/purchase-orders/$orderId")({
	component: PurchaseOrderDetailPage,
});

const statusConfig: Record<
	string,
	{ label: string; icon: typeof Clock; color: string; bgColor: string }
> = {
	draft: {
		label: "Draft",
		icon: FileText,
		color: "text-gray-600",
		bgColor: "bg-gray-50",
	},
	ordered: {
		label: "Naručeno",
		icon: Clock,
		color: "text-blue-600",
		bgColor: "bg-blue-50",
	},
	partially_received: {
		label: "Djelomično primljeno",
		icon: Truck,
		color: "text-amber-600",
		bgColor: "bg-amber-50",
	},
	received: {
		label: "Primljeno",
		icon: CheckCircle2,
		color: "text-emerald-600",
		bgColor: "bg-emerald-50",
	},
	cancelled: {
		label: "Otkazano",
		icon: XCircle,
		color: "text-red-600",
		bgColor: "bg-red-50",
	},
};

function PurchaseOrderDetailPage() {
	const { orderId } = Route.useParams();
	const queryClient = useQueryClient();

	const { data: purchaseOrder, isLoading, refetch } = useQuery(
		getPurchaseOrderQueryOptions(orderId)
	);

	const markOrderedMutation = useMutation({
		mutationFn: () => markPurchaseOrderOrderedServerFn({ data: { id: orderId } }),
		onSuccess: () => {
			toast.success("Narudžbenica označena kao naručena");
			queryClient.invalidateQueries({ queryKey: [PURCHASE_ORDERS_QUERY_KEY] });
		},
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : "Greška pri ažuriranju"
			);
		},
	});

	const cancelMutation = useMutation({
		mutationFn: () => cancelPurchaseOrderServerFn({ data: { id: orderId } }),
		onSuccess: () => {
			toast.success("Narudžbenica otkazana");
			queryClient.invalidateQueries({ queryKey: [PURCHASE_ORDERS_QUERY_KEY] });
		},
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : "Greška pri otkazivanju"
			);
		},
	});

	const formatDate = (date: string | Date | null) => {
		if (!date) return "-";
		return new Date(date).toLocaleDateString("hr-HR", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		});
	};

	const formatDateTime = (date: string | Date | null) => {
		if (!date) return "-";
		return new Date(date).toLocaleString("hr-HR", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const formatCurrency = (value: number | string | null) => {
		if (!value) return "0,00 KM";
		return new Intl.NumberFormat("hr-HR", {
			style: "currency",
			currency: "BAM",
			minimumFractionDigits: 2,
		}).format(Number(value));
	};

	if (isLoading) {
		return (
			<div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
				<RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
			</div>
		);
	}

	if (!purchaseOrder) {
		return (
			<div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
				<div className="text-center">
					<ClipboardList className="h-12 w-12 mx-auto mb-3 text-gray-300" />
					<p className="text-gray-500">Narudžbenica nije pronađena</p>
					<Button className="mt-4" asChild>
						<Link to="/admin/purchase-orders">Nazad na listu</Link>
					</Button>
				</div>
			</div>
		);
	}

	const statusInfo = statusConfig[purchaseOrder.status] || statusConfig.draft;
	const StatusIcon = statusInfo.icon;

	return (
		<div className="min-h-screen bg-gray-50/50">
			{/* Header */}
			<div className="sticky top-0 z-10 bg-gradient-to-r from-slate-800 to-slate-700 text-white">
				<div className="px-4 py-4 md:px-6 md:py-5">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<Button
								variant="ghost"
								size="sm"
								asChild
								className="text-white hover:bg-white/10"
							>
								<Link to="/admin/purchase-orders">
									<ArrowLeft className="h-4 w-4" />
								</Link>
							</Button>
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
								<ClipboardList className="h-5 w-5" />
							</div>
							<div>
								<h1 className="text-lg font-semibold md:text-xl">
									{purchaseOrder.orderNumber}
								</h1>
								<p className="text-sm text-slate-300 hidden sm:block">
									{purchaseOrder.vendorName}
								</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Button
								variant="secondary"
								size="sm"
								onClick={() => refetch()}
								className="gap-2"
							>
								<RefreshCw className="h-4 w-4" />
							</Button>

							{purchaseOrder.status === "draft" && (
								<Button
									size="sm"
									onClick={() => markOrderedMutation.mutate()}
									disabled={markOrderedMutation.isPending}
									className="gap-2"
								>
									<Send className="h-4 w-4" />
									<span className="hidden sm:inline">Označi naručeno</span>
								</Button>
							)}

							{(purchaseOrder.status === "ordered" ||
								purchaseOrder.status === "partially_received") && (
								<ReceiveStockDialog
									purchaseOrder={purchaseOrder}
									onSuccess={() => {
										queryClient.invalidateQueries({
											queryKey: [PURCHASE_ORDERS_QUERY_KEY],
										});
									}}
								/>
							)}

							{purchaseOrder.status !== "received" &&
								purchaseOrder.status !== "cancelled" && (
									<AlertDialog>
										<AlertDialogTrigger asChild>
											<Button variant="destructive" size="sm" className="gap-2">
												<XCircle className="h-4 w-4" />
												<span className="hidden sm:inline">Otkaži</span>
											</Button>
										</AlertDialogTrigger>
										<AlertDialogContent>
											<AlertDialogHeader>
												<AlertDialogTitle>Otkaži narudžbenicu?</AlertDialogTitle>
												<AlertDialogDescription>
													Jeste li sigurni da želite otkazati ovu narudžbenicu?
													Ova akcija se ne može poništiti.
												</AlertDialogDescription>
											</AlertDialogHeader>
											<AlertDialogFooter>
												<AlertDialogCancel>Odustani</AlertDialogCancel>
												<AlertDialogAction
													onClick={() => cancelMutation.mutate()}
													className="bg-red-600 hover:bg-red-700"
												>
													Otkaži narudžbenicu
												</AlertDialogAction>
											</AlertDialogFooter>
										</AlertDialogContent>
									</AlertDialog>
								)}
						</div>
					</div>
				</div>
			</div>

			<div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-5xl mx-auto">
				{/* Status and Info */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					{/* Status Card */}
					<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
						<div className="text-sm text-gray-500 mb-2">Status</div>
						<div
							className={cn(
								"inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium",
								statusInfo.color,
								statusInfo.bgColor
							)}
						>
							<StatusIcon className="h-4 w-4" />
							{statusInfo.label}
						</div>
						<div className="mt-3 space-y-1 text-sm">
							{purchaseOrder.orderDate && (
								<div className="text-gray-600">
									Naručeno: {formatDate(purchaseOrder.orderDate)}
								</div>
							)}
							{purchaseOrder.receivedDate && (
								<div className="text-gray-600">
									Primljeno: {formatDate(purchaseOrder.receivedDate)}
								</div>
							)}
						</div>
					</div>

					{/* Vendor Card */}
					<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
						<div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
							<Building2 className="h-4 w-4" />
							Dobavljač
						</div>
						<div className="font-medium text-gray-900">
							{purchaseOrder.vendorName}
						</div>
						{purchaseOrder.vendor && (
							<div className="mt-2 space-y-1 text-sm text-gray-600">
								{purchaseOrder.vendor.email && (
									<div>{purchaseOrder.vendor.email}</div>
								)}
								{purchaseOrder.vendor.phone && (
									<div>{purchaseOrder.vendor.phone}</div>
								)}
							</div>
						)}
					</div>

					{/* Summary Card */}
					<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
						<div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
							<Package className="h-4 w-4" />
							Sažetak
						</div>
						<div className="space-y-2">
							<div className="flex justify-between text-sm">
								<span className="text-gray-600">Stavki:</span>
								<span className="font-medium">{purchaseOrder.totalItems}</span>
							</div>
							<div className="flex justify-between text-sm">
								<span className="text-gray-600">Količina:</span>
								<span className="font-medium">
									{purchaseOrder.receivedQuantity}/{purchaseOrder.totalQuantity}
								</span>
							</div>
							<div className="flex justify-between text-sm">
								<span className="text-gray-600">Ukupno:</span>
								<span className="font-bold text-gray-900">
									{formatCurrency(purchaseOrder.totalCost)}
								</span>
							</div>
						</div>
					</div>
				</div>

				{/* Expected Date & Notes */}
				{(purchaseOrder.expectedDate || purchaseOrder.notes) && (
					<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
						{purchaseOrder.expectedDate && (
							<div>
								<div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
									<Calendar className="h-4 w-4" />
									Očekivani datum isporuke
								</div>
								<div className="font-medium text-gray-900">
									{formatDate(purchaseOrder.expectedDate)}
								</div>
							</div>
						)}
						{purchaseOrder.notes && (
							<div>
								<div className="text-sm text-gray-500 mb-1">Napomene</div>
								<div className="text-gray-900">{purchaseOrder.notes}</div>
							</div>
						)}
					</div>
				)}

				{/* Items */}
				<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
					<div className="p-4 border-b border-gray-100">
						<h2 className="text-lg font-semibold text-gray-900">
							Stavke ({purchaseOrder.items?.length || 0})
						</h2>
					</div>

					{/* Desktop Table */}
					<div className="hidden md:block overflow-x-auto">
						<table className="w-full">
							<thead>
								<tr className="border-b border-gray-100 bg-gray-50/50">
									<th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
										Proizvod
									</th>
									<th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
										SKU
									</th>
									<th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
										Naručeno
									</th>
									<th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
										Primljeno
									</th>
									<th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
										Cijena
									</th>
									<th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
										Ukupno
									</th>
									<th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
										Status
									</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-100">
								{purchaseOrder.items?.map((item) => {
									const itemStatusInfo =
										item.status === "received"
											? { label: "Primljeno", color: "text-emerald-600 bg-emerald-50" }
											: item.status === "partially_received"
											? { label: "Djelomično", color: "text-amber-600 bg-amber-50" }
											: { label: "Na čekanju", color: "text-gray-600 bg-gray-50" };

									return (
										<tr
											key={item.id}
											className="hover:bg-gray-50/50 transition-colors"
										>
											<td className="px-4 py-3">
												<div className="flex items-center gap-3">
													{item.product?.media?.[0]?.media?.url ? (
														<ProxyImage
															src={item.product.media[0].media.url}
															alt={item.productName}
															width={80}
															height={80}
															className="w-10 h-10 rounded object-cover"
														/>
													) : (
														<div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
															<Package className="h-5 w-5 text-gray-400" />
														</div>
													)}
													<div>
														<div className="font-medium text-gray-900 text-sm">
															{item.productName}
														</div>
														<div className="text-xs text-gray-500">
															{item.variantTitle || "Default"}
														</div>
													</div>
												</div>
											</td>
											<td className="px-4 py-3 text-sm text-gray-600">
												{item.sku || "-"}
											</td>
											<td className="px-4 py-3 text-sm text-gray-900 text-center font-medium">
												{item.quantityOrdered}
											</td>
											<td className="px-4 py-3 text-center">
												<span
													className={cn(
														"font-medium",
														item.quantityReceived >= item.quantityOrdered
															? "text-emerald-600"
															: item.quantityReceived > 0
															? "text-amber-600"
															: "text-gray-600"
													)}
												>
													{item.quantityReceived}
												</span>
											</td>
											<td className="px-4 py-3 text-sm text-gray-900 text-right">
												{formatCurrency(item.costPerUnit)}
											</td>
											<td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
												{formatCurrency(item.totalCost)}
											</td>
											<td className="px-4 py-3">
												<span
													className={cn(
														"inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
														itemStatusInfo.color
													)}
												>
													{itemStatusInfo.label}
												</span>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>

					{/* Mobile Cards */}
					<div className="md:hidden divide-y divide-gray-100">
						{purchaseOrder.items?.map((item) => {
							const itemStatusInfo =
								item.status === "received"
									? { label: "Primljeno", color: "text-emerald-600 bg-emerald-50" }
									: item.status === "partially_received"
									? { label: "Djelomično", color: "text-amber-600 bg-amber-50" }
									: { label: "Na čekanju", color: "text-gray-600 bg-gray-50" };

							return (
								<div key={item.id} className="p-4 space-y-3">
									<div className="flex items-start justify-between gap-3">
										<div className="flex items-center gap-3 flex-1 min-w-0">
											{item.product?.media?.[0]?.media?.url ? (
												<ProxyImage
													src={item.product.media[0].media.url}
													alt={item.productName}
													width={80}
													height={80}
													className="w-12 h-12 rounded object-cover flex-shrink-0"
												/>
											) : (
												<div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
													<Package className="h-6 w-6 text-gray-400" />
												</div>
											)}
											<div className="min-w-0">
												<div className="font-medium text-gray-900 text-sm truncate">
													{item.productName}
												</div>
												<div className="text-xs text-gray-500">
													{item.variantTitle || "Default"} | SKU: {item.sku || "-"}
												</div>
											</div>
										</div>
										<span
											className={cn(
												"inline-flex items-center px-2 py-1 rounded-full text-xs font-medium shrink-0",
												itemStatusInfo.color
											)}
										>
											{itemStatusInfo.label}
										</span>
									</div>
									<div className="flex items-center justify-between text-sm">
										<div className="text-gray-600">
											Primljeno: {item.quantityReceived}/{item.quantityOrdered}
										</div>
										<div className="font-medium text-gray-900">
											{formatCurrency(item.totalCost)}
										</div>
									</div>
								</div>
							);
						})}
					</div>
				</div>

				{/* Meta Info */}
				<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-sm text-gray-500">
					<div className="flex flex-wrap gap-4">
						{purchaseOrder.user && (
							<div className="flex items-center gap-1">
								<User className="h-4 w-4" />
								Kreirao: {purchaseOrder.user.name}
							</div>
						)}
						<div>Kreirano: {formatDateTime(purchaseOrder.createdAt)}</div>
						<div>Ažurirano: {formatDateTime(purchaseOrder.updatedAt)}</div>
					</div>
				</div>
			</div>
		</div>
	);
}

function ReceiveStockDialog({
	purchaseOrder,
	onSuccess,
}: {
	purchaseOrder: NonNullable<Awaited<ReturnType<typeof getPurchaseOrderQueryOptions>["queryFn"]>>;
	onSuccess: () => void;
}) {
	const [open, setOpen] = useState(false);
	const [receivedItems, setReceivedItems] = useState<
		Record<string, number>
	>(() => {
		const initial: Record<string, number> = {};
		purchaseOrder.items?.forEach((item) => {
			const remaining = item.quantityOrdered - item.quantityReceived;
			if (remaining > 0) {
				initial[item.id] = remaining;
			}
		});
		return initial;
	});

	const receiveMutation = useMutation({
		mutationFn: () =>
			receivePurchaseOrderServerFn({
				data: {
					purchaseOrderId: purchaseOrder.id,
					receivedItems: Object.entries(receivedItems)
						.filter(([_, qty]) => qty > 0)
						.map(([itemId, quantityReceived]) => ({
							itemId,
							quantityReceived,
						})),
				},
			}),
		onSuccess: () => {
			toast.success("Zaliha uspješno primljena");
			setOpen(false);
			onSuccess();
		},
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : "Greška pri primanju zalihe"
			);
		},
	});

	const handleReceiveAll = () => {
		const all: Record<string, number> = {};
		purchaseOrder.items?.forEach((item) => {
			const remaining = item.quantityOrdered - item.quantityReceived;
			if (remaining > 0) {
				all[item.id] = remaining;
			}
		});
		setReceivedItems(all);
	};

	const pendingItems = purchaseOrder.items?.filter(
		(item) => item.quantityReceived < item.quantityOrdered
	);

	const totalToReceive = Object.values(receivedItems).reduce(
		(sum, qty) => sum + qty,
		0
	);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm" className="gap-2 bg-emerald-600 hover:bg-emerald-700">
					<PackageCheck className="h-4 w-4" />
					<span className="hidden sm:inline">Primi zalihu</span>
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Primi zalihu</DialogTitle>
					<DialogDescription>
						Unesite količine koje ste primili za svaku stavku
					</DialogDescription>
				</DialogHeader>

				<div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
					<Button
						variant="outline"
						size="sm"
						onClick={handleReceiveAll}
						className="w-full"
					>
						Primi sve preostale
					</Button>

					<div className="space-y-3">
						{pendingItems?.map((item) => {
							const remaining = item.quantityOrdered - item.quantityReceived;

							return (
								<div
									key={item.id}
									className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
								>
									<div className="flex-1 min-w-0">
										<div className="font-medium text-gray-900 text-sm truncate">
											{item.productName}
										</div>
										<div className="text-xs text-gray-500">
											{item.variantTitle || "Default"}
										</div>
										<div className="text-xs text-gray-500">
											Preostalo: {remaining} od {item.quantityOrdered}
										</div>
									</div>
									<div className="space-y-1">
										<Label className="text-xs">Primlj. količina</Label>
										<Input
											type="number"
											min="0"
											max={remaining}
											value={receivedItems[item.id] || 0}
											onChange={(e) =>
												setReceivedItems({
													...receivedItems,
													[item.id]: Math.min(
														parseInt(e.target.value) || 0,
														remaining
													),
												})
											}
											className="w-24 h-8 text-sm"
										/>
									</div>
								</div>
							);
						})}
					</div>

					{pendingItems?.length === 0 && (
						<div className="text-center py-4 text-gray-500">
							Sve stavke su već primljene
						</div>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)}>
						Odustani
					</Button>
					<Button
						onClick={() => receiveMutation.mutate()}
						disabled={totalToReceive === 0 || receiveMutation.isPending}
						className="bg-emerald-600 hover:bg-emerald-700"
					>
						{receiveMutation.isPending
							? "Primanje..."
							: `Primi ${totalToReceive} kom.`}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
