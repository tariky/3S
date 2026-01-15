import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
	getPurchaseOrdersQueryOptions,
	getPurchaseOrderStatsQueryOptions,
} from "@/queries/purchase-orders";
import {
	ClipboardList,
	Search,
	RefreshCw,
	ChevronLeft,
	ChevronRight,
	Filter,
	Plus,
	FileText,
	Clock,
	Truck,
	CheckCircle2,
	XCircle,
	Package,
	DollarSign,
	Eye,
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
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/purchase-orders/")({
	component: PurchaseOrdersPage,
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

function PurchaseOrdersPage() {
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState<string>("all");
	const [page, setPage] = useState(1);

	const { data: stats, isLoading: statsLoading } = useQuery(
		getPurchaseOrderStatsQueryOptions()
	);

	const { data: purchaseOrdersData, isLoading, refetch } = useQuery(
		getPurchaseOrdersQueryOptions({
			search: search || undefined,
			status: status as "all" | "draft" | "ordered" | "partially_received" | "received" | "cancelled",
			page,
			limit: 25,
		})
	);

	const formatDate = (date: string | Date | null) => {
		if (!date) return "-";
		return new Date(date).toLocaleDateString("hr-HR", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
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

	return (
		<div className="min-h-screen bg-gray-50/50">
			{/* Header */}
			<div className="sticky top-0 z-10 bg-gradient-to-r from-slate-800 to-slate-700 text-white">
				<div className="px-4 py-4 md:px-6 md:py-5">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
								<ClipboardList className="h-5 w-5" />
							</div>
							<div>
								<h1 className="text-lg font-semibold md:text-xl">
									Narudžbenice
								</h1>
								<p className="text-sm text-slate-300 hidden sm:block">
									Upravljanje narudžbenicama od dobavljača
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
								<span className="hidden sm:inline">Osvježi</span>
							</Button>
							<Button size="sm" className="gap-2" asChild>
								<Link to="/admin/purchase-orders/new">
									<Plus className="h-4 w-4" />
									<span className="hidden sm:inline">Nova narudžbenica</span>
								</Link>
							</Button>
						</div>
					</div>
				</div>
			</div>

			<div className="p-4 md:p-6 space-y-4 md:space-y-6">
				{/* Stats Cards */}
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
					<StatCard
						label="Ukupno"
						value={stats?.total ?? 0}
						icon={ClipboardList}
						color="text-slate-600"
						bgColor="bg-slate-50"
						loading={statsLoading}
					/>
					<StatCard
						label="Čeka isporuku"
						value={stats?.pendingDelivery ?? 0}
						icon={Truck}
						color="text-blue-600"
						bgColor="bg-blue-50"
						loading={statsLoading}
					/>
					<StatCard
						label="Vrijednost u tranzitu"
						value={formatCurrency(stats?.valueInTransit ?? 0)}
						icon={DollarSign}
						color="text-amber-600"
						bgColor="bg-amber-50"
						loading={statsLoading}
						isText
					/>
					<StatCard
						label="Primljeno ovaj mjesec"
						value={formatCurrency(stats?.receivedThisMonth ?? 0)}
						icon={Package}
						color="text-emerald-600"
						bgColor="bg-emerald-50"
						loading={statsLoading}
						isText
					/>
				</div>

				{/* Filters */}
				<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
					<div className="flex flex-col sm:flex-row gap-3">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
							<Input
								placeholder="Pretraži po broju narudžbenice ili dobavljaču..."
								value={search}
								onChange={(e) => {
									setSearch(e.target.value);
									setPage(1);
								}}
								className="pl-9"
							/>
						</div>
						<Select
							value={status}
							onValueChange={(value) => {
								setStatus(value);
								setPage(1);
							}}
						>
							<SelectTrigger className="w-full sm:w-[200px]">
								<Filter className="h-4 w-4 mr-2 text-gray-400" />
								<SelectValue placeholder="Status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">Svi statusi</SelectItem>
								<SelectItem value="draft">Draft</SelectItem>
								<SelectItem value="ordered">Naručeno</SelectItem>
								<SelectItem value="partially_received">Djelomično primljeno</SelectItem>
								<SelectItem value="received">Primljeno</SelectItem>
								<SelectItem value="cancelled">Otkazano</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				{/* Purchase Orders List */}
				<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
					{isLoading ? (
						<div className="p-8 text-center text-gray-500">
							<RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
							Učitavanje...
						</div>
					) : purchaseOrdersData?.data?.length === 0 ? (
						<div className="p-8 text-center text-gray-500">
							<ClipboardList className="h-12 w-12 mx-auto mb-3 text-gray-300" />
							<p className="font-medium">Nema narudžbenica</p>
							<p className="text-sm mt-1">Kreirajte prvu narudžbenicu</p>
							<Button className="mt-4" asChild>
								<Link to="/admin/purchase-orders/new">
									<Plus className="h-4 w-4 mr-2" />
									Nova narudžbenica
								</Link>
							</Button>
						</div>
					) : (
						<>
							{/* Desktop Table */}
							<div className="hidden md:block overflow-x-auto">
								<table className="w-full">
									<thead>
										<tr className="border-b border-gray-100 bg-gray-50/50">
											<th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
												Broj
											</th>
											<th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
												Dobavljač
											</th>
											<th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
												Status
											</th>
											<th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
												Stavke
											</th>
											<th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
												Ukupno
											</th>
											<th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
												Očekivano
											</th>
											<th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
												Kreirano
											</th>
											<th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
												Akcije
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-100">
										{purchaseOrdersData?.data?.map((po) => {
											const statusInfo =
												statusConfig[po.status] || statusConfig.draft;
											const StatusIcon = statusInfo.icon;

											return (
												<tr
													key={po.id}
													className="hover:bg-gray-50/50 transition-colors"
												>
													<td className="px-4 py-3">
														<Link
															to="/admin/purchase-orders/$orderId"
															params={{ orderId: po.id }}
															className="font-medium text-blue-600 hover:text-blue-700 text-sm"
														>
															{po.orderNumber}
														</Link>
													</td>
													<td className="px-4 py-3 text-sm text-gray-900">
														{po.vendorName}
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
													<td className="px-4 py-3 text-center">
														<span className="text-sm text-gray-600">
															{po.receivedQuantity}/{po.totalQuantity}
														</span>
													</td>
													<td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
														{formatCurrency(po.totalCost)}
													</td>
													<td className="px-4 py-3 text-sm text-gray-500">
														{formatDate(po.expectedDate)}
													</td>
													<td className="px-4 py-3 text-sm text-gray-500">
														{formatDate(po.createdAt)}
													</td>
													<td className="px-4 py-3">
														<div className="flex items-center justify-end">
															<Button
																variant="ghost"
																size="sm"
																asChild
																className="h-8 w-8 p-0"
															>
																<Link
																	to="/admin/purchase-orders/$orderId"
																	params={{ orderId: po.id }}
																>
																	<Eye className="h-4 w-4" />
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
								{purchaseOrdersData?.data?.map((po) => {
									const statusInfo =
										statusConfig[po.status] || statusConfig.draft;
									const StatusIcon = statusInfo.icon;

									return (
										<Link
											key={po.id}
											to="/admin/purchase-orders/$orderId"
											params={{ orderId: po.id }}
											className="block p-4 space-y-3 hover:bg-gray-50/50"
										>
											<div className="flex items-start justify-between gap-3">
												<div className="flex-1 min-w-0">
													<div className="font-medium text-blue-600 text-sm">
														{po.orderNumber}
													</div>
													<div className="text-sm text-gray-900 mt-0.5">
														{po.vendorName}
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
												<div className="text-gray-500">
													{po.receivedQuantity}/{po.totalQuantity} stavki
												</div>
												<div className="font-medium text-gray-900">
													{formatCurrency(po.totalCost)}
												</div>
											</div>
											<div className="text-xs text-gray-500">
												Očekivano: {formatDate(po.expectedDate)}
											</div>
										</Link>
									);
								})}
							</div>

							{/* Pagination */}
							{purchaseOrdersData && purchaseOrdersData.total > 25 && (
								<div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between">
									<div className="text-sm text-gray-500">
										Prikazano {(page - 1) * 25 + 1}-
										{Math.min(page * 25, purchaseOrdersData.total)} od{" "}
										{purchaseOrdersData.total}
									</div>
									<div className="flex gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() => setPage((p) => Math.max(1, p - 1))}
											disabled={!purchaseOrdersData.hasPreviousPage}
										>
											<ChevronLeft className="h-4 w-4" />
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => setPage((p) => p + 1)}
											disabled={!purchaseOrdersData.hasNextPage}
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
	isText,
}: {
	label: string;
	value: number | string;
	icon: typeof Clock;
	color: string;
	bgColor: string;
	loading?: boolean;
	isText?: boolean;
}) {
	return (
		<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
			<div className="flex items-center gap-3">
				<div className={cn("p-2 rounded-lg", bgColor)}>
					<Icon className={cn("h-5 w-5", color)} />
				</div>
				<div>
					<div
						className={cn(
							"font-bold text-gray-900",
							isText ? "text-lg" : "text-2xl"
						)}
					>
						{loading ? "-" : value}
					</div>
					<div className="text-xs text-gray-500">{label}</div>
				</div>
			</div>
		</div>
	);
}
