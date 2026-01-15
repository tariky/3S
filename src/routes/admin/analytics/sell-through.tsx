import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
	getSellThroughAnalyticsQueryOptions,
	getProductSellThroughQueryOptions,
} from "@/queries/inventory";
import { getAllCategoriesForSelectServerFn } from "@/queries/products";
import {
	TrendingUp,
	Search,
	RefreshCw,
	ChevronLeft,
	ChevronRight,
	Filter,
	Package,
	Clock,
	Percent,
	BarChart3,
	ArrowUpRight,
	ArrowDownRight,
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
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/analytics/sell-through")({
	component: SellThroughAnalyticsPage,
});

function SellThroughAnalyticsPage() {
	const [categoryId, setCategoryId] = useState<string>("");
	const [startDate, setStartDate] = useState<string>("");
	const [endDate, setEndDate] = useState<string>("");
	const [page, setPage] = useState(1);
	const [sortBy, setSortBy] = useState<"sellThroughRate" | "daysToSellOut" | "totalSold" | "name">("sellThroughRate");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

	const { data: overallStats, isLoading: statsLoading } = useQuery(
		getSellThroughAnalyticsQueryOptions({
			categoryId: categoryId || undefined,
			startDate: startDate || undefined,
			endDate: endDate || undefined,
		})
	);

	const { data: productsData, isLoading, refetch } = useQuery(
		getProductSellThroughQueryOptions({
			startDate: startDate || undefined,
			endDate: endDate || undefined,
			page,
			limit: 25,
			sortBy,
			sortOrder,
		})
	);

	const { data: categories } = useQuery({
		queryKey: ["categories-select"],
		queryFn: () => getAllCategoriesForSelectServerFn({ data: {} }),
	});

	return (
		<div className="min-h-screen bg-gray-50/50">
			{/* Header */}
			<div className="sticky top-0 z-10 bg-gradient-to-r from-slate-800 to-slate-700 text-white">
				<div className="px-4 py-4 md:px-6 md:py-5">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
								<TrendingUp className="h-5 w-5" />
							</div>
							<div>
								<h1 className="text-lg font-semibold md:text-xl">
									Sell-Through Analitika
								</h1>
								<p className="text-sm text-slate-300 hidden sm:block">
									Praćenje brzine prodaje po restocku
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
						label="Ukupno batch-eva"
						value={overallStats?.totalBatches ?? 0}
						icon={Package}
						color="text-slate-600"
						bgColor="bg-slate-50"
						loading={statsLoading}
					/>
					<StatCard
						label="Prosječni sell-through"
						value={`${overallStats?.avgSellThroughRate ?? 0}%`}
						icon={Percent}
						color="text-emerald-600"
						bgColor="bg-emerald-50"
						loading={statsLoading}
						isText
					/>
					<StatCard
						label="Prosječno dana do rasprodaje"
						value={overallStats?.avgDaysToSellOut ?? "-"}
						icon={Clock}
						color="text-blue-600"
						bgColor="bg-blue-50"
						loading={statsLoading}
					/>
					<StatCard
						label="Ukupni sell-through"
						value={`${overallStats?.overallSellThroughRate ?? 0}%`}
						icon={BarChart3}
						color="text-purple-600"
						bgColor="bg-purple-50"
						loading={statsLoading}
						isText
					/>
				</div>

				{/* Filters */}
				<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
					<div className="grid grid-cols-1 md:grid-cols-4 gap-3">
						<div className="space-y-2">
							<Label className="text-xs text-gray-500">Kategorija</Label>
							<Select
								value={categoryId}
								onValueChange={(value) => {
									setCategoryId(value === "all" ? "" : value);
									setPage(1);
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder="Sve kategorije" />
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
						</div>
						<div className="space-y-2">
							<Label className="text-xs text-gray-500">Od datuma</Label>
							<Input
								type="date"
								value={startDate}
								onChange={(e) => {
									setStartDate(e.target.value);
									setPage(1);
								}}
							/>
						</div>
						<div className="space-y-2">
							<Label className="text-xs text-gray-500">Do datuma</Label>
							<Input
								type="date"
								value={endDate}
								onChange={(e) => {
									setEndDate(e.target.value);
									setPage(1);
								}}
							/>
						</div>
						<div className="space-y-2">
							<Label className="text-xs text-gray-500">Sortiraj po</Label>
							<div className="flex gap-2">
								<Select
									value={sortBy}
									onValueChange={(value) => setSortBy(value as typeof sortBy)}
								>
									<SelectTrigger className="flex-1">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="sellThroughRate">Sell-through %</SelectItem>
										<SelectItem value="daysToSellOut">Dana do rasprodaje</SelectItem>
										<SelectItem value="totalSold">Ukupno prodano</SelectItem>
										<SelectItem value="name">Naziv</SelectItem>
									</SelectContent>
								</Select>
								<Button
									variant="outline"
									size="icon"
									onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
								>
									{sortOrder === "desc" ? (
										<ArrowDownRight className="h-4 w-4" />
									) : (
										<ArrowUpRight className="h-4 w-4" />
									)}
								</Button>
							</div>
						</div>
					</div>
				</div>

				{/* Products List */}
				<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
					<div className="p-4 border-b border-gray-100">
						<h2 className="text-lg font-semibold text-gray-900">
							Proizvodi ({productsData?.total ?? 0})
						</h2>
					</div>

					{isLoading ? (
						<div className="p-8 text-center text-gray-500">
							<RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
							Učitavanje...
						</div>
					) : productsData?.data?.length === 0 ? (
						<div className="p-8 text-center text-gray-500">
							<TrendingUp className="h-12 w-12 mx-auto mb-3 text-gray-300" />
							<p className="font-medium">Nema podataka</p>
							<p className="text-sm mt-1">
								Dodajte proizvode i kreirajte batch-eve za praćenje
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
											<th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
												Batch-eva
											</th>
											<th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
												Prosječni sell-through
											</th>
											<th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
												Prosječno dana
											</th>
											<th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
												Ukupno prodano
											</th>
											<th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
												Trenutna zaliha
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-100">
										{productsData?.data?.map((product) => (
											<tr
												key={product.productId}
												className="hover:bg-gray-50/50 transition-colors"
											>
												<td className="px-4 py-3">
													<Link
														to="/admin/products/$productId"
														params={{ productId: product.productId }}
														className="font-medium text-gray-900 text-sm hover:text-blue-600"
													>
														{product.productName}
													</Link>
													{product.category && (
														<div className="text-xs text-gray-500">
															{product.category.name}
														</div>
													)}
												</td>
												<td className="px-4 py-3 text-center">
													<span className="text-sm text-gray-600">
														{product.batchesCount}
													</span>
												</td>
												<td className="px-4 py-3 text-right">
													<SellThroughBadge rate={product.avgSellThroughRate} />
												</td>
												<td className="px-4 py-3 text-sm text-gray-600 text-right">
													{product.avgDaysToSellOut ?? "-"}
												</td>
												<td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
													{product.totalQuantitySold}
												</td>
												<td className="px-4 py-3 text-right">
													<span
														className={cn(
															"text-sm font-medium",
															product.currentStock === 0
																? "text-red-600"
																: product.currentStock <= 10
																? "text-amber-600"
																: "text-gray-900"
														)}
													>
														{product.currentStock}
													</span>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>

							{/* Mobile Cards */}
							<div className="md:hidden divide-y divide-gray-100">
								{productsData?.data?.map((product) => (
									<Link
										key={product.productId}
										to="/admin/products/$productId"
										params={{ productId: product.productId }}
										className="block p-4 space-y-3 hover:bg-gray-50/50"
									>
										<div className="flex items-start justify-between gap-3">
											<div className="flex-1 min-w-0">
												<div className="font-medium text-gray-900 text-sm truncate">
													{product.productName}
												</div>
												{product.category && (
													<div className="text-xs text-gray-500">
														{product.category.name}
													</div>
												)}
											</div>
											<SellThroughBadge rate={product.avgSellThroughRate} />
										</div>
										<div className="flex items-center justify-between text-sm">
											<div className="text-gray-500">
												{product.batchesCount} batch-eva
											</div>
											<div className="text-gray-600">
												{product.avgDaysToSellOut
													? `${product.avgDaysToSellOut} dana`
													: "-"}
											</div>
										</div>
										<div className="flex items-center justify-between text-sm">
											<div className="text-gray-500">
												Prodano: {product.totalQuantitySold}
											</div>
											<div
												className={cn(
													"font-medium",
													product.currentStock === 0
														? "text-red-600"
														: product.currentStock <= 10
														? "text-amber-600"
														: "text-gray-900"
												)}
											>
												Na stanju: {product.currentStock}
											</div>
										</div>
									</Link>
								))}
							</div>

							{/* Pagination */}
							{productsData && productsData.total > 25 && (
								<div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between">
									<div className="text-sm text-gray-500">
										Prikazano {(page - 1) * 25 + 1}-
										{Math.min(page * 25, productsData.total)} od{" "}
										{productsData.total}
									</div>
									<div className="flex gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() => setPage((p) => Math.max(1, p - 1))}
											disabled={!productsData.hasPreviousPage}
										>
											<ChevronLeft className="h-4 w-4" />
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => setPage((p) => p + 1)}
											disabled={!productsData.hasNextPage}
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
	icon: typeof TrendingUp;
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

function SellThroughBadge({ rate }: { rate: number }) {
	const getColor = (rate: number) => {
		if (rate >= 80) return "text-emerald-600 bg-emerald-50";
		if (rate >= 50) return "text-amber-600 bg-amber-50";
		return "text-red-600 bg-red-50";
	};

	return (
		<span
			className={cn(
				"inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
				getColor(rate)
			)}
		>
			{rate}%
		</span>
	);
}
