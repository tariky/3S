import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
	getAbandonedCheckoutsQueryOptions,
	getAbandonedCheckoutStatsQueryOptions,
	sendAbandonedCheckoutEmailServerFn,
	expireAbandonedCheckoutServerFn,
	ABANDONED_CHECKOUTS_QUERY_KEY,
	type AbandonedCartItem,
} from "@/queries/abandoned-checkouts";
import {
	ShoppingCart,
	Search,
	CheckCircle2,
	XCircle,
	Clock,
	RefreshCw,
	ChevronLeft,
	ChevronRight,
	Filter,
	Mail,
	MailCheck,
	TrendingUp,
	DollarSign,
	Eye,
	Send,
	Trash2,
	Package,
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
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ProxyImage } from "@/components/ui/proxy-image";

export const Route = createFileRoute("/admin/abandoned-checkouts")({
	component: AbandonedCheckoutsPage,
});

const statusConfig: Record<
	string,
	{ label: string; icon: typeof CheckCircle2; color: string; bgColor: string }
> = {
	pending: {
		label: "Na čekanju",
		icon: Clock,
		color: "text-amber-600",
		bgColor: "bg-amber-50",
	},
	email_sent: {
		label: "Email poslan",
		icon: MailCheck,
		color: "text-blue-600",
		bgColor: "bg-blue-50",
	},
	recovered: {
		label: "Oporavljen",
		icon: CheckCircle2,
		color: "text-emerald-600",
		bgColor: "bg-emerald-50",
	},
	expired: {
		label: "Isteklo",
		icon: XCircle,
		color: "text-gray-500",
		bgColor: "bg-gray-50",
	},
};

function AbandonedCheckoutsPage() {
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState<string>("");
	const [page, setPage] = useState(1);
	const [_selectedCheckout, setSelectedCheckout] = useState<string | null>(null);

	const { data: stats, isLoading: statsLoading } = useQuery(
		getAbandonedCheckoutStatsQueryOptions()
	);

	const { data: checkoutsData, isLoading, refetch } = useQuery(
		getAbandonedCheckoutsQueryOptions({
			search: search || undefined,
			status: status || undefined,
			page,
			limit: 25,
		})
	);

	// Type the checkouts data
	const checkouts = checkoutsData as {
		data: Array<{
			id: string;
			email: string;
			cartData: unknown;
			customerName: string | null;
			phone: string | null;
			subtotal: string | number;
			status: string;
			emailSentCount: number;
			emailSentAt: string | Date | null;
			nextEmailAt: string | Date | null;
			createdAt: string | Date;
			expiresAt: string | Date;
			recoveredOrderId: string | null;
			recoveredOrder: { id: string } | null;
		}>;
		total: number;
		hasNextPage: boolean;
		hasPreviousPage: boolean;
	} | undefined;

	const sendEmailMutation = useMutation({
		mutationFn: async (id: string) => {
			return await sendAbandonedCheckoutEmailServerFn({ data: { id } });
		},
		onSuccess: () => {
			toast.success("Email uspješno poslan");
			queryClient.invalidateQueries({ queryKey: [ABANDONED_CHECKOUTS_QUERY_KEY] });
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : "Greška pri slanju emaila");
		},
	});

	const expireMutation = useMutation({
		mutationFn: async (id: string) => {
			return await expireAbandonedCheckoutServerFn({ data: { id } });
		},
		onSuccess: () => {
			toast.success("Označeno kao isteklo");
			queryClient.invalidateQueries({ queryKey: [ABANDONED_CHECKOUTS_QUERY_KEY] });
		},
		onError: () => {
			toast.error("Greška pri označavanju");
		},
	});

	const formatDate = (date: string | Date) => {
		return new Date(date).toLocaleString("hr-HR", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const formatPrice = (price: number | string) => {
		const numPrice = typeof price === "string" ? parseFloat(price) : price;
		return `${numPrice.toFixed(2)} KM`;
	};

	const parseCartData = (cartData: unknown): AbandonedCartItem[] => {
		if (Array.isArray(cartData)) {
			return cartData as AbandonedCartItem[];
		}
		return [];
	};

	return (
		<div className="min-h-screen bg-gray-50/50">
			{/* Header */}
			<div className="sticky top-0 z-10 bg-gradient-to-r from-slate-800 to-slate-700 text-white">
				<div className="px-4 py-4 md:px-6 md:py-5">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
								<ShoppingCart className="h-5 w-5" />
							</div>
							<div>
								<h1 className="text-lg font-semibold md:text-xl">
									Napuštene korpe
								</h1>
								<p className="text-sm text-slate-300 hidden sm:block">
									Upravljanje napuštenim checkoutima
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
						label="Ukupno napušteno"
						value={stats?.totalAbandoned ?? 0}
						icon={ShoppingCart}
						color="text-slate-600"
						bgColor="bg-slate-50"
						loading={statsLoading}
					/>
					<StatCard
						label="Emailova poslano"
						value={stats?.emailsSent ?? 0}
						icon={Mail}
						color="text-blue-600"
						bgColor="bg-blue-50"
						loading={statsLoading}
					/>
					<StatCard
						label="Oporavljeno"
						value={stats?.recovered ?? 0}
						icon={CheckCircle2}
						color="text-emerald-600"
						bgColor="bg-emerald-50"
						loading={statsLoading}
					/>
					<StatCard
						label="Stopa oporavka"
						value={`${stats?.recoveryRate ?? 0}%`}
						icon={TrendingUp}
						color="text-purple-600"
						bgColor="bg-purple-50"
						loading={statsLoading}
					/>
				</div>

				{/* Revenue Recovered Card */}
				<div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl shadow-sm p-4 text-white">
					<div className="flex items-center gap-3">
						<div className="p-2 rounded-lg bg-white/20">
							<DollarSign className="h-6 w-6" />
						</div>
						<div>
							<div className="text-sm opacity-90">Oporavljena vrijednost</div>
							<div className="text-2xl font-bold">
								{statsLoading ? "-" : formatPrice(stats?.revenueRecovered ?? 0)}
							</div>
						</div>
					</div>
				</div>

				{/* Filters */}
				<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
					<div className="flex flex-col sm:flex-row gap-3">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
							<Input
								placeholder="Pretraži po emailu..."
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
								setStatus(value === "all" ? "" : value);
								setPage(1);
							}}
						>
							<SelectTrigger className="w-full sm:w-[180px]">
								<Filter className="h-4 w-4 mr-2 text-gray-400" />
								<SelectValue placeholder="Status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">Svi statusi</SelectItem>
								<SelectItem value="pending">Na čekanju</SelectItem>
								<SelectItem value="email_sent">Email poslan</SelectItem>
								<SelectItem value="recovered">Oporavljen</SelectItem>
								<SelectItem value="expired">Isteklo</SelectItem>
							</SelectContent>
						</Select>
					</div>
				</div>

				{/* Checkouts List */}
				<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
					{isLoading ? (
						<div className="p-8 text-center text-gray-500">
							<RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
							Učitavanje...
						</div>
					) : checkouts?.data?.length === 0 ? (
						<div className="p-8 text-center text-gray-500">
							<ShoppingCart className="h-12 w-12 mx-auto mb-3 text-gray-300" />
							<p className="font-medium">Nema napuštenih korpi</p>
							<p className="text-sm mt-1">
								Napuštene korpe će se pojaviti ovdje
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
												Kupac
											</th>
											<th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
												Proizvodi
											</th>
											<th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
												Iznos
											</th>
											<th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
												Status
											</th>
											<th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
												Kreirano
											</th>
											<th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
												Akcije
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-100">
										{checkouts?.data?.map((checkout) => {
											const statusInfo = statusConfig[checkout.status] || statusConfig.pending;
											const StatusIcon = statusInfo.icon;
											const cartItems = parseCartData(checkout.cartData);

											return (
												<tr
													key={checkout.id}
													className="hover:bg-gray-50/50 transition-colors"
												>
													<td className="px-4 py-3">
														<div className="font-medium text-gray-900 text-sm">
															{checkout.email}
														</div>
														{checkout.customerName && (
															<div className="text-xs text-gray-500">
																{checkout.customerName}
															</div>
														)}
													</td>
													<td className="px-4 py-3">
														<div className="text-sm text-gray-900">
															{cartItems.length} proizvod(a)
														</div>
													</td>
													<td className="px-4 py-3">
														<div className="text-sm font-medium text-gray-900">
															{formatPrice(checkout.subtotal)}
														</div>
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
														{checkout.emailSentCount > 0 && (
															<div className="text-xs text-gray-500 mt-1">
																{checkout.emailSentCount} email(a) poslano
															</div>
														)}
													</td>
													<td className="px-4 py-3 text-sm text-gray-500">
														{formatDate(checkout.createdAt)}
													</td>
													<td className="px-4 py-3">
														<div className="flex items-center gap-2">
															<Dialog>
																<DialogTrigger asChild>
																	<Button
																		variant="ghost"
																		size="sm"
																		onClick={() => setSelectedCheckout(checkout.id)}
																	>
																		<Eye className="h-4 w-4" />
																	</Button>
																</DialogTrigger>
																<DialogContent className="max-w-lg">
																	<DialogHeader>
																		<DialogTitle>Detalji napuštene korpe</DialogTitle>
																		<DialogDescription>
																			{checkout.email}
																		</DialogDescription>
																	</DialogHeader>
																	<CheckoutDetails
																		checkout={checkout}
																		cartItems={cartItems}
																		formatPrice={formatPrice}
																		formatDate={formatDate}
																	/>
																</DialogContent>
															</Dialog>
															{checkout.status !== "recovered" && checkout.status !== "expired" && (
																<>
																	<Button
																		variant="ghost"
																		size="sm"
																		onClick={() => sendEmailMutation.mutate(checkout.id)}
																		disabled={sendEmailMutation.isPending}
																	>
																		<Send className="h-4 w-4" />
																	</Button>
																	<Button
																		variant="ghost"
																		size="sm"
																		onClick={() => expireMutation.mutate(checkout.id)}
																		disabled={expireMutation.isPending}
																	>
																		<Trash2 className="h-4 w-4" />
																	</Button>
																</>
															)}
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
								{checkouts?.data?.map((checkout) => {
									const statusInfo = statusConfig[checkout.status] || statusConfig.pending;
									const StatusIcon = statusInfo.icon;
									const cartItems = parseCartData(checkout.cartData);

									return (
										<div key={checkout.id} className="p-4 space-y-3">
											<div className="flex items-start justify-between gap-3">
												<div className="flex-1 min-w-0">
													<div className="font-medium text-gray-900 text-sm truncate">
														{checkout.email}
													</div>
													{checkout.customerName && (
														<div className="text-xs text-gray-500 mt-0.5">
															{checkout.customerName}
														</div>
													)}
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
												<span className="text-gray-500">
													{cartItems.length} proizvod(a)
												</span>
												<span className="font-medium text-gray-900">
													{formatPrice(checkout.subtotal)}
												</span>
											</div>
											<div className="flex items-center justify-between">
												<div className="text-xs text-gray-500">
													{formatDate(checkout.createdAt)}
												</div>
												<div className="flex items-center gap-2">
													<Dialog>
														<DialogTrigger asChild>
															<Button variant="ghost" size="sm">
																<Eye className="h-4 w-4" />
															</Button>
														</DialogTrigger>
														<DialogContent className="max-w-lg">
															<DialogHeader>
																<DialogTitle>Detalji napuštene korpe</DialogTitle>
																<DialogDescription>
																	{checkout.email}
																</DialogDescription>
															</DialogHeader>
															<CheckoutDetails
																checkout={checkout}
																cartItems={cartItems}
																formatPrice={formatPrice}
																formatDate={formatDate}
															/>
														</DialogContent>
													</Dialog>
													{checkout.status !== "recovered" && checkout.status !== "expired" && (
														<Button
															variant="ghost"
															size="sm"
															onClick={() => sendEmailMutation.mutate(checkout.id)}
															disabled={sendEmailMutation.isPending}
														>
															<Send className="h-4 w-4" />
														</Button>
													)}
												</div>
											</div>
										</div>
									);
								})}
							</div>

							{/* Pagination */}
							{checkouts && checkouts.total > 25 && (
								<div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between">
									<div className="text-sm text-gray-500">
										Prikazano {(page - 1) * 25 + 1}-
										{Math.min(page * 25, checkouts.total)} od {checkouts.total}
									</div>
									<div className="flex gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() => setPage((p) => Math.max(1, p - 1))}
											disabled={!checkouts.hasPreviousPage}
										>
											<ChevronLeft className="h-4 w-4" />
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => setPage((p) => p + 1)}
											disabled={!checkouts.hasNextPage}
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
	value: number | string;
	icon: typeof ShoppingCart;
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

function CheckoutDetails({
	checkout,
	cartItems,
	formatPrice,
	formatDate,
}: {
	checkout: {
		id: string;
		email: string;
		customerName: string | null;
		phone: string | null;
		subtotal: unknown;
		status: string;
		emailSentCount: number;
		emailSentAt: string | Date | null;
		createdAt: string | Date;
		expiresAt: string | Date;
		recoveredOrderId: string | null;
	};
	cartItems: AbandonedCartItem[];
	formatPrice: (price: number | string) => string;
	formatDate: (date: string | Date) => string;
}) {
	return (
		<div className="space-y-4">
			{/* Customer Info */}
			<div className="space-y-2">
				<h4 className="text-sm font-medium text-gray-900">Informacije o kupcu</h4>
				<div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1">
					<div>
						<span className="text-gray-500">Email:</span>{" "}
						<span className="text-gray-900">{checkout.email}</span>
					</div>
					{checkout.customerName && (
						<div>
							<span className="text-gray-500">Ime:</span>{" "}
							<span className="text-gray-900">{checkout.customerName}</span>
						</div>
					)}
					{checkout.phone && (
						<div>
							<span className="text-gray-500">Telefon:</span>{" "}
							<span className="text-gray-900">{checkout.phone}</span>
						</div>
					)}
				</div>
			</div>

			{/* Cart Items */}
			<div className="space-y-2">
				<h4 className="text-sm font-medium text-gray-900">Proizvodi u korpi</h4>
				<div className="space-y-2">
					{cartItems.map((item, index) => (
						<div
							key={index}
							className="flex items-center gap-3 bg-gray-50 rounded-lg p-3"
						>
							{item.imageUrl ? (
								<ProxyImage
									src={item.imageUrl}
									alt={item.title}
									width={96}
									height={96}
									className="w-16 h-16 object-cover rounded"
									fallback={
										<div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
											<Package className="h-6 w-6 text-gray-400" />
										</div>
									}
								/>
							) : (
								<div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
									<Package className="h-6 w-6 text-gray-400" />
								</div>
							)}
							<div className="flex-1 min-w-0">
								<div className="text-sm font-medium text-gray-900 truncate">
									{item.title}
								</div>
								{item.variantTitle && (
									<div className="text-xs text-gray-500">{item.variantTitle}</div>
								)}
								<div className="text-xs text-gray-500">
									Količina: {item.quantity}
								</div>
							</div>
							<div className="text-sm font-medium text-gray-900">
								{formatPrice(item.price * item.quantity)}
							</div>
						</div>
					))}
				</div>
			</div>

			{/* Summary */}
			<div className="border-t pt-4 space-y-2">
				<div className="flex justify-between text-sm">
					<span className="text-gray-500">Ukupno</span>
					<span className="font-bold text-gray-900">
						{formatPrice(checkout.subtotal as number)}
					</span>
				</div>
			</div>

			{/* Status Info */}
			<div className="border-t pt-4 space-y-2 text-sm">
				<div className="flex justify-between">
					<span className="text-gray-500">Kreirano</span>
					<span className="text-gray-900">{formatDate(checkout.createdAt)}</span>
				</div>
				<div className="flex justify-between">
					<span className="text-gray-500">Ističe</span>
					<span className="text-gray-900">{formatDate(checkout.expiresAt)}</span>
				</div>
				<div className="flex justify-between">
					<span className="text-gray-500">Emailova poslano</span>
					<span className="text-gray-900">{checkout.emailSentCount}</span>
				</div>
				{checkout.emailSentAt && (
					<div className="flex justify-between">
						<span className="text-gray-500">Zadnji email</span>
						<span className="text-gray-900">{formatDate(checkout.emailSentAt)}</span>
					</div>
				)}
				{checkout.recoveredOrderId && (
					<div className="flex justify-between">
						<span className="text-gray-500">Oporavljena narudžba</span>
						<a
							href={`/admin/orders/${checkout.recoveredOrderId}`}
							className="text-blue-600 hover:underline"
						>
							Pogledaj
						</a>
					</div>
				)}
			</div>
		</div>
	);
}
