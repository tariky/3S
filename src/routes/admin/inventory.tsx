import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
	getInventoryOverviewQueryOptions,
	getInventoryStatsQueryOptions,
	adjustInventoryServerFn,
	INVENTORY_QUERY_KEY,
} from "@/queries/inventory";
import { getAllCategoriesForSelectServerFn } from "@/queries/products";
import {
	Package,
	Search,
	RefreshCw,
	ChevronLeft,
	ChevronRight,
	Filter,
	AlertTriangle,
	PackageX,
	PackageCheck,
	TrendingUp,
	Plus,
	Minus,
	History,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ProxyImage } from "@/components/ui/proxy-image";

export const Route = createFileRoute("/admin/inventory")({
	component: InventoryPage,
});

const stockStatusConfig: Record<
	string,
	{ label: string; icon: typeof Package; color: string; bgColor: string }
> = {
	in_stock: {
		label: "Na stanju",
		icon: PackageCheck,
		color: "text-emerald-600",
		bgColor: "bg-emerald-50",
	},
	low_stock: {
		label: "Niska zaliha",
		icon: AlertTriangle,
		color: "text-amber-600",
		bgColor: "bg-amber-50",
	},
	out_of_stock: {
		label: "Nema na stanju",
		icon: PackageX,
		color: "text-red-600",
		bgColor: "bg-red-50",
	},
};

function InventoryPage() {
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [categoryId, setCategoryId] = useState<string>("");
	const [stockStatus, setStockStatus] = useState<string>("all");
	const [page, setPage] = useState(1);

	const { data: stats, isLoading: statsLoading } = useQuery(
		getInventoryStatsQueryOptions()
	);

	const { data: inventoryData, isLoading, refetch } = useQuery(
		getInventoryOverviewQueryOptions({
			search: search || undefined,
			categoryId: categoryId || undefined,
			stockStatus: stockStatus as "all" | "in_stock" | "low_stock" | "out_of_stock",
			page,
			limit: 25,
		})
	);

	const { data: categories } = useQuery({
		queryKey: ["categories-select"],
		queryFn: () => getAllCategoriesForSelectServerFn({ data: {} }),
	});

	const formatDate = (date: string | Date | null) => {
		if (!date) return "-";
		return new Date(date).toLocaleDateString("hr-HR", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		});
	};

	return (
		<div className="min-h-screen bg-gray-50/50">
			{/* Header */}
			<div className="sticky top-0 z-10 bg-gradient-to-r from-slate-800 to-slate-700 text-white">
				<div className="px-4 py-4 md:px-6 md:py-5">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
								<Package className="h-5 w-5" />
							</div>
							<div>
								<h1 className="text-lg font-semibold md:text-xl">
									Pregled zaliha
								</h1>
								<p className="text-sm text-slate-300 hidden sm:block">
									Upravljanje zalihama i praćenje količina
								</p>
							</div>
						</div>
						<Button
							variant="secondary"
							size="sm"
							onClick={() => refetch()}
							className="gap-2"
						>
							<RefreshCw className="h-4 w-4" />
							<span className="hidden sm:inline">Osvježi</span>
						</Button>
					</div>
				</div>
			</div>

			<div className="p-4 md:p-6 space-y-4 md:space-y-6">
				{/* Stats Cards */}
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
					<StatCard
						label="Ukupno SKU"
						value={stats?.totalSKUs ?? 0}
						icon={Package}
						color="text-slate-600"
						bgColor="bg-slate-50"
						loading={statsLoading}
					/>
					<StatCard
						label="Na stanju"
						value={stats?.inStock ?? 0}
						icon={PackageCheck}
						color="text-emerald-600"
						bgColor="bg-emerald-50"
						loading={statsLoading}
					/>
					<StatCard
						label="Niska zaliha"
						value={stats?.lowStock ?? 0}
						icon={AlertTriangle}
						color="text-amber-600"
						bgColor="bg-amber-50"
						loading={statsLoading}
					/>
					<StatCard
						label="Nema na stanju"
						value={stats?.outOfStock ?? 0}
						icon={PackageX}
						color="text-red-600"
						bgColor="bg-red-50"
						loading={statsLoading}
					/>
				</div>

				{/* Filters */}
				<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
					<div className="flex flex-col sm:flex-row gap-3">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
							<Input
								placeholder="Pretraži proizvode..."
								value={search}
								onChange={(e) => {
									setSearch(e.target.value);
									setPage(1);
								}}
								className="pl-9"
							/>
						</div>
						<div className="flex gap-2">
							<Select
								value={categoryId}
								onValueChange={(value) => {
									setCategoryId(value === "all" ? "" : value);
									setPage(1);
								}}
							>
								<SelectTrigger className="w-full sm:w-[180px]">
									<Filter className="h-4 w-4 mr-2 text-gray-400" />
									<SelectValue placeholder="Kategorija" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">Sve kategorije</SelectItem>
									{categories?.map((cat) => (
										<SelectItem key={cat.id} value={cat.id}>
											{cat.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<Select
								value={stockStatus}
								onValueChange={(value) => {
									setStockStatus(value);
									setPage(1);
								}}
							>
								<SelectTrigger className="w-full sm:w-[160px]">
									<SelectValue placeholder="Status" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">Svi statusi</SelectItem>
									<SelectItem value="in_stock">Na stanju</SelectItem>
									<SelectItem value="low_stock">Niska zaliha</SelectItem>
									<SelectItem value="out_of_stock">Nema na stanju</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>

				{/* Inventory List */}
				<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
					{isLoading ? (
						<div className="p-8 text-center text-gray-500">
							<RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
							Učitavanje...
						</div>
					) : inventoryData?.data?.length === 0 ? (
						<div className="p-8 text-center text-gray-500">
							<Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
							<p className="font-medium">Nema proizvoda</p>
							<p className="text-sm mt-1">
								Dodajte proizvode da biste vidjeli njihove zalihe
							</p>
						</div>
					) : (
						<>
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
											<th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
												Na stanju
											</th>
											<th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
												Dostupno
											</th>
											<th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
												Rezervirano
											</th>
											<th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
												Status
											</th>
											<th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
												Zadnji restock
											</th>
											<th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
												Akcije
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-100">
										{inventoryData?.data?.map((item) => {
											const statusInfo =
												stockStatusConfig[item.stockStatus] ||
												stockStatusConfig.in_stock;
											const StatusIcon = statusInfo.icon;

											return (
												<tr
													key={item.productId}
													className="hover:bg-gray-50/50 transition-colors"
												>
													<td className="px-4 py-3">
														<div className="flex items-center gap-3">
															{item.image ? (
																<ProxyImage
																	src={item.image}
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
																<Link
																	to="/admin/products/$productId"
																	params={{ productId: item.productId }}
																	className="font-medium text-gray-900 text-sm hover:text-blue-600"
																>
																	{item.productName}
																</Link>
																{item.category && (
																	<div className="text-xs text-gray-500">
																		{item.category.name}
																	</div>
																)}
															</div>
														</div>
													</td>
													<td className="px-4 py-3 text-sm text-gray-600">
														{item.sku || "-"}
													</td>
													<td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
														{item.totalOnHand}
													</td>
													<td className="px-4 py-3 text-sm text-gray-900 text-right">
														{item.totalAvailable}
													</td>
													<td className="px-4 py-3 text-sm text-gray-500 text-right">
														{item.totalReserved}
													</td>
													<td className="px-4 py-3">
														<div
															className={cn(
																"inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
																statusInfo.color,
																statusInfo.bgColor
															)}
														>
															<StatusIcon className="h-3 w-3" />
															{statusInfo.label}
														</div>
													</td>
													<td className="px-4 py-3 text-sm text-gray-500">
														{formatDate(item.lastRestock)}
													</td>
													<td className="px-4 py-3">
														<div className="flex items-center justify-end gap-1">
															<StockAdjustmentDialog
																productId={item.productId}
																productName={item.productName}
																currentStock={item.totalOnHand}
																onSuccess={() => {
																	queryClient.invalidateQueries({
																		queryKey: [INVENTORY_QUERY_KEY],
																	});
																}}
															/>
															<Button
																variant="ghost"
																size="sm"
																asChild
																className="h-8 w-8 p-0"
															>
																<Link
																	to="/admin/products/$productId"
																	params={{ productId: item.productId }}
																>
																	<History className="h-4 w-4" />
																</Link>
															</Button>
														</div>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>

							{/* Mobile Cards */}
							<div className="md:hidden divide-y divide-gray-100">
								{inventoryData?.data?.map((item) => {
									const statusInfo =
										stockStatusConfig[item.stockStatus] ||
										stockStatusConfig.in_stock;
									const StatusIcon = statusInfo.icon;

									return (
										<div key={item.productId} className="p-4 space-y-3">
											<div className="flex items-start justify-between gap-3">
												<div className="flex items-center gap-3 flex-1 min-w-0">
													{item.image ? (
														<ProxyImage
															src={item.image}
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
														<Link
															to="/admin/products/$productId"
															params={{ productId: item.productId }}
															className="font-medium text-gray-900 text-sm hover:text-blue-600 truncate block"
														>
															{item.productName}
														</Link>
														<div className="text-xs text-gray-500">
															SKU: {item.sku || "-"}
														</div>
													</div>
												</div>
												<div
													className={cn(
														"inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium shrink-0",
														statusInfo.color,
														statusInfo.bgColor
													)}
												>
													<StatusIcon className="h-3 w-3" />
													{statusInfo.label}
												</div>
											</div>
											<div className="flex items-center justify-between text-sm">
												<div className="flex gap-4">
													<div>
														<span className="text-gray-500">Na stanju: </span>
														<span className="font-medium">{item.totalOnHand}</span>
													</div>
													<div>
														<span className="text-gray-500">Dostupno: </span>
														<span className="font-medium">{item.totalAvailable}</span>
													</div>
												</div>
												<StockAdjustmentDialog
													productId={item.productId}
													productName={item.productName}
													currentStock={item.totalOnHand}
													onSuccess={() => {
														queryClient.invalidateQueries({
															queryKey: [INVENTORY_QUERY_KEY],
														});
													}}
												/>
											</div>
										</div>
									);
								})}
							</div>

							{/* Pagination */}
							{inventoryData && inventoryData.total > 25 && (
								<div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between">
									<div className="text-sm text-gray-500">
										Prikazano {(page - 1) * 25 + 1}-
										{Math.min(page * 25, inventoryData.total)} od{" "}
										{inventoryData.total}
									</div>
									<div className="flex gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() => setPage((p) => Math.max(1, p - 1))}
											disabled={!inventoryData.hasPreviousPage}
										>
											<ChevronLeft className="h-4 w-4" />
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => setPage((p) => p + 1)}
											disabled={!inventoryData.hasNextPage}
										>
											<ChevronRight className="h-4 w-4" />
										</Button>
									</div>
								</div>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
}

function StatCard({
	label,
	value,
	icon: Icon,
	color,
	bgColor,
	loading,
}: {
	label: string;
	value: number;
	icon: typeof Package;
	color: string;
	bgColor: string;
	loading?: boolean;
}) {
	return (
		<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
			<div className="flex items-center gap-3">
				<div className={cn("p-2 rounded-lg", bgColor)}>
					<Icon className={cn("h-5 w-5", color)} />
				</div>
				<div>
					<div className="text-2xl font-bold text-gray-900">
						{loading ? "-" : value}
					</div>
					<div className="text-xs text-gray-500">{label}</div>
				</div>
			</div>
		</div>
	);
}

function StockAdjustmentDialog({
	productId,
	productName,
	currentStock,
	onSuccess,
}: {
	productId: string;
	productName: string;
	currentStock: number;
	onSuccess: () => void;
}) {
	const [open, setOpen] = useState(false);
	const [adjustmentType, setAdjustmentType] = useState<"add" | "remove" | "set">("add");
	const [quantity, setQuantity] = useState("");
	const [reason, setReason] = useState("");
	const [costPerUnit, setCostPerUnit] = useState("");

	const adjustMutation = useMutation({
		mutationFn: async (variantId: string) => {
			return adjustInventoryServerFn({
				data: {
					variantId,
					productId,
					adjustmentType,
					quantity: parseInt(quantity) || 0,
					costPerUnit: costPerUnit ? parseFloat(costPerUnit) : undefined,
					reason: reason || undefined,
				},
			});
		},
		onSuccess: () => {
			toast.success("Zaliha uspješno ažurirana");
			setOpen(false);
			setQuantity("");
			setReason("");
			setCostPerUnit("");
			onSuccess();
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Greška pri ažuriranju zalihe");
		},
	});

	const previewQuantity = () => {
		const qty = parseInt(quantity) || 0;
		switch (adjustmentType) {
			case "add":
				return currentStock + qty;
			case "remove":
				return Math.max(0, currentStock - qty);
			case "set":
				return qty;
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" className="gap-1">
					<Plus className="h-3 w-3" />
					<Minus className="h-3 w-3" />
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Prilagodi zalihu</DialogTitle>
					<DialogDescription>
						{productName} - Trenutna zaliha: {currentStock}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-4">
					<div className="space-y-2">
						<Label>Tip prilagodbe</Label>
						<Select
							value={adjustmentType}
							onValueChange={(value) => setAdjustmentType(value as "add" | "remove" | "set")}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="add">Dodaj zalihu</SelectItem>
								<SelectItem value="remove">Ukloni zalihu</SelectItem>
								<SelectItem value="set">Postavi na količinu</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-2">
						<Label>Količina</Label>
						<Input
							type="number"
							min="0"
							value={quantity}
							onChange={(e) => setQuantity(e.target.value)}
							placeholder="0"
						/>
					</div>

					{adjustmentType === "add" && (
						<div className="space-y-2">
							<Label>Cijena po jedinici (opcionalno)</Label>
							<Input
								type="number"
								min="0"
								step="0.01"
								value={costPerUnit}
								onChange={(e) => setCostPerUnit(e.target.value)}
								placeholder="0.00"
							/>
						</div>
					)}

					<div className="space-y-2">
						<Label>Razlog (opcionalno)</Label>
						<Textarea
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							placeholder="Razlog prilagodbe..."
							rows={2}
						/>
					</div>

					{quantity && (
						<div className="bg-gray-50 rounded-lg p-3">
							<div className="text-sm text-gray-600">
								Nova količina:{" "}
								<span className="font-semibold text-gray-900">
									{previewQuantity()}
								</span>
							</div>
						</div>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)}>
						Odustani
					</Button>
					<Button
						onClick={() => {
							// For now, we'll need to handle this at the variant level
							// This is a simplified version that works with the first variant
							toast.error("Molimo koristite stranicu proizvoda za detaljnu prilagodbu zalihe po varijanti");
						}}
						disabled={!quantity || parseInt(quantity) <= 0}
					>
						Primijeni
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
