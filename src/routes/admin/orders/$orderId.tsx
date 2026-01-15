import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
	ArrowLeft,
	Loader2,
	Edit,
	X,
	Save,
	XCircle,
	Package,
	User,
	ImageOff,
	CreditCard,
	Truck,
	Clock,
	CheckCircle2,
	AlertCircle,
	Receipt,
	FileText,
	Plus,
	Minus,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	getOrderByIdQueryOptions,
	updateOrderServerFn,
	cancelOrderServerFn,
	fulfillOrderServerFn,
	getInventoryForVariantsServerFn,
} from "@/queries/orders";
import { ProductSearch } from "@/components/orders/ProductSearch";
import { cn } from "@/lib/utils";
import { ProxyImage } from "@/components/ui/proxy-image";
import { useState, useMemo } from "react";
import { ORDERS_QUERY_KEY } from "@/queries/orders";

interface CartItem {
	id?: string;
	productId: string;
	variantId?: string;
	title: string;
	sku?: string;
	quantity: number;
	price: number;
	variantTitle?: string;
	imageUrl?: string;
	inventory?: {
		available: number;
		onHand: number;
		reserved: number;
		committed: number;
	};
}

export const Route = createFileRoute("/admin/orders/$orderId")({
	component: RouteComponent,
	loader: async ({ context, params }) => {
		await context.queryClient.ensureQueryData(
			getOrderByIdQueryOptions(params.orderId)
		);
	},
});

function RouteComponent() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { orderId } = Route.useParams();
	const { data: order, isLoading } = useQuery(
		getOrderByIdQueryOptions(orderId)
	);
	const [isEditMode, setIsEditMode] = useState(false);
	const [editedItems, setEditedItems] = useState<CartItem[]>([]);
	const [showCancelDialog, setShowCancelDialog] = useState(false);
	const [showFulfillDialog, setShowFulfillDialog] = useState(false);
	const [cancelReason, setCancelReason] = useState("");
	const [inventoryMap, setInventoryMap] = useState<
		Record<
			string,
			{ available: number; onHand: number; reserved: number; committed: number }
		>
	>({});
	const [fulfillTrackingNumber, setFulfillTrackingNumber] = useState("");
	const [fulfillShippingCompany, setFulfillShippingCompany] = useState("");

	// Fetch inventory for variants when entering edit mode
	const handleEditClick = async () => {
		if (order?.items) {
			const items = order.items.map((item) => ({
				id: item.id,
				productId: item.productId || "",
				variantId: item.variantId || undefined,
				title: item.title,
				sku: item.sku || undefined,
				quantity: item.quantity,
				price: parseFloat(item.price),
				variantTitle: item.variantTitle || undefined,
				imageUrl: (item as any).imageUrl || undefined,
			}));

			// Fetch inventory for all variants
			const variantIds = items
				.map((item) => item.variantId)
				.filter((id): id is string => !!id);

			if (variantIds.length > 0) {
				const inventoryData = await getInventoryForVariantsServerFn({
					data: { variantIds },
				});
				setInventoryMap(inventoryData);
			}

			setEditedItems(items);
		}
		setIsEditMode(true);
	};

	const handleCancelEdit = () => {
		setIsEditMode(false);
		setEditedItems([]);
	};

	const handleAddProduct = async (product: {
		productId: string;
		variantId?: string;
		title: string;
		sku?: string;
		price: number;
		variantTitle?: string;
		image?: string;
		inventory?: {
			available: number;
			onHand: number;
			reserved: number;
			committed: number;
		};
	}) => {
		const existingItem = editedItems.find(
			(item) =>
				item.productId === product.productId &&
				item.variantId === product.variantId
		);

		// Check inventory if variant exists
		if (product.variantId && product.inventory) {
			const available = product.inventory.available;
			if (existingItem) {
				if (existingItem.quantity >= available) {
					alert(`Nema dovoljno zaliha. Dostupno: ${available}`);
					return;
				}
			} else {
				if (available < 1) {
					alert(`Nema dovoljno zaliha. Dostupno: ${available}`);
					return;
				}
			}
		}

		if (existingItem) {
			setEditedItems(
				editedItems.map((item) =>
					item.id === existingItem.id
						? {
								...item,
								quantity: item.quantity + 1,
								inventory: product.inventory,
							}
						: item
				)
			);
		} else {
			// Fetch inventory if not provided
			if (product.variantId && !product.inventory) {
				const inventoryData = await getInventoryForVariantsServerFn({
					data: { variantIds: [product.variantId] },
				});
				if (inventoryData[product.variantId]) {
					product.inventory = inventoryData[product.variantId];
				}
			}

			setEditedItems([
				...editedItems,
				{
					productId: product.productId,
					variantId: product.variantId,
					title: product.title,
					sku: product.sku,
					quantity: 1,
					price: product.price,
					variantTitle: product.variantTitle,
					imageUrl: product.image,
					inventory: product.inventory,
				},
			]);

			// Update inventory map
			if (product.variantId && product.inventory) {
				setInventoryMap((prev) => ({
					...prev,
					[product.variantId!]: product.inventory!,
				}));
			}
		}
	};

	const handleRemoveItem = (itemId: string) => {
		setEditedItems(editedItems.filter((item) => item.id !== itemId));
	};

	const handleUpdateQuantity = async (itemId: string, quantity: number) => {
		if (quantity <= 0) {
			handleRemoveItem(itemId);
			return;
		}

		const item = editedItems.find((i) => i.id === itemId);
		if (!item) return;

		// Check inventory if variant exists
		if (item.variantId) {
			const inv = item.inventory || inventoryMap[item.variantId];
			if (inv && quantity > inv.available) {
				alert(`Nema dovoljno zaliha. Dostupno: ${inv.available}`);
				return;
			}
		}

		setEditedItems(
			editedItems.map((item) =>
				item.id === itemId ? { ...item, quantity } : item
			)
		);
	};

	const editedSubtotal = useMemo(() => {
		return editedItems.reduce(
			(sum, item) => sum + item.price * item.quantity,
			0
		);
	}, [editedItems]);

	const editedShipping = useMemo(() => {
		if (!order) return 0;
		return parseFloat(order.shipping);
	}, [order]);

	const editedDiscount = useMemo(() => {
		if (!order) return 0;
		return parseFloat(order.discount);
	}, [order]);

	const editedTax = useMemo(() => {
		if (!order) return 0;
		return parseFloat(order.tax);
	}, [order]);

	const editedTotal =
		editedSubtotal + editedShipping - editedDiscount + editedTax;

	const updateOrderMutation = useMutation({
		mutationFn: async () => {
			return await updateOrderServerFn({
				data: {
					orderId,
					items: editedItems.map((item) => ({
						id: item.id,
						productId: item.productId,
						variantId: item.variantId,
						title: item.title,
						sku: item.sku,
						quantity: item.quantity,
						price: item.price,
						variantTitle: item.variantTitle,
					})),
					subtotal: editedSubtotal,
					tax: editedTax,
					shipping: editedShipping,
					discount: editedDiscount,
					total: editedTotal,
					note: order?.note || null,
				},
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });
			setIsEditMode(false);
			setEditedItems([]);
		},
	});

	const cancelOrderMutation = useMutation({
		mutationFn: async () => {
			return await cancelOrderServerFn({
				data: {
					orderId,
					reason: cancelReason || undefined,
				},
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });
			setShowCancelDialog(false);
			setCancelReason("");
		},
	});

	const fulfillOrderMutation = useMutation({
		mutationFn: async () => {
			return await fulfillOrderServerFn({
				data: {
					orderId,
					trackingNumber: fulfillTrackingNumber || undefined,
					shippingCompany: fulfillShippingCompany || undefined,
				},
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });
			setShowFulfillDialog(false);
			setFulfillTrackingNumber("");
			setFulfillShippingCompany("");
		},
		onError: (error: any) => {
			alert(error.message || "Došlo je do greške pri isporuci narudžbe.");
		},
	});

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-16">
				<div className="flex flex-col items-center gap-3">
					<Loader2 className="size-8 animate-spin text-blue-500" />
					<span className="text-sm text-gray-500">Učitavanje narudžbe...</span>
				</div>
			</div>
		);
	}

	if (!order) {
		return (
			<div className="flex flex-col items-center justify-center py-16 gap-4">
				<AlertCircle className="size-12 text-gray-400" />
				<h2 className="text-xl font-medium text-gray-700">
					Narudžba nije pronađena
				</h2>
				<Button
					variant="outline"
					onClick={() =>
						navigate({
							to: "/admin/orders",
							search: { search: "", page: 1, limit: 25 },
						})
					}
				>
					<ArrowLeft className="size-4 mr-2" />
					Povratak na listu
				</Button>
			</div>
		);
	}

	// Helper to get inventory for an item
	const getItemInventory = (
		item: CartItem | ((typeof order.items)[0] & { imageUrl?: string | null })
	) => {
		if (isEditMode && "inventory" in item) {
			return (
				item.inventory ||
				(item.variantId ? inventoryMap[item.variantId] : undefined)
			);
		}
		return item.variantId ? inventoryMap[item.variantId] : undefined;
	};

	const isCancelled = order.status === "cancelled";
	const displayItems: (
		| CartItem
		| ((typeof order.items)[0] & { imageUrl?: string | null })
	)[] = isEditMode ? editedItems : order.items || [];
	const displaySubtotal = isEditMode
		? editedSubtotal
		: parseFloat(order.subtotal);
	const displayShipping = isEditMode
		? editedShipping
		: parseFloat(order.shipping);
	const displayDiscount = isEditMode
		? editedDiscount
		: parseFloat(order.discount);
	const displayTax = isEditMode ? editedTax : parseFloat(order.tax);
	const displayTotal = isEditMode ? editedTotal : parseFloat(order.total);

	const getStatusConfig = (status: string) => {
		const configs: Record<
			string,
			{ label: string; color: string; bg: string; icon: React.ReactNode }
		> = {
			pending: {
				label: "Na čekanju",
				color: "text-amber-700",
				bg: "bg-amber-50 border-amber-200",
				icon: <Clock className="size-3.5" />,
			},
			paid: {
				label: "Plaćeno",
				color: "text-blue-700",
				bg: "bg-blue-50 border-blue-200",
				icon: <CreditCard className="size-3.5" />,
			},
			fulfilled: {
				label: "Isporučeno",
				color: "text-emerald-700",
				bg: "bg-emerald-50 border-emerald-200",
				icon: <CheckCircle2 className="size-3.5" />,
			},
			cancelled: {
				label: "Otkazano",
				color: "text-red-700",
				bg: "bg-red-50 border-red-200",
				icon: <XCircle className="size-3.5" />,
			},
			refunded: {
				label: "Refundirano",
				color: "text-gray-700",
				bg: "bg-gray-50 border-gray-200",
				icon: <Receipt className="size-3.5" />,
			},
		};
		return configs[status] || configs.pending;
	};

	const getFinancialStatusConfig = (status: string | null | undefined) => {
		if (!status)
			return {
				label: "-",
				color: "text-gray-500",
				bg: "bg-gray-50 border-gray-200",
			};
		const configs: Record<
			string,
			{ label: string; color: string; bg: string }
		> = {
			pending: {
				label: "Na čekanju",
				color: "text-amber-700",
				bg: "bg-amber-50 border-amber-200",
			},
			paid: {
				label: "Plaćeno",
				color: "text-emerald-700",
				bg: "bg-emerald-50 border-emerald-200",
			},
			refunded: {
				label: "Refundirano",
				color: "text-gray-700",
				bg: "bg-gray-50 border-gray-200",
			},
		};
		return configs[status] || configs.pending;
	};

	const getFulfillmentStatusConfig = (status: string | null | undefined) => {
		if (!status)
			return {
				label: "-",
				color: "text-gray-500",
				bg: "bg-gray-50 border-gray-200",
			};
		const configs: Record<
			string,
			{ label: string; color: string; bg: string }
		> = {
			unfulfilled: {
				label: "Neisporučeno",
				color: "text-amber-700",
				bg: "bg-amber-50 border-amber-200",
			},
			fulfilled: {
				label: "Isporučeno",
				color: "text-emerald-700",
				bg: "bg-emerald-50 border-emerald-200",
			},
			partial: {
				label: "Djelomično",
				color: "text-blue-700",
				bg: "bg-blue-50 border-blue-200",
			},
		};
		return configs[status] || configs.unfulfilled;
	};

	const statusConfig = getStatusConfig(order.status);
	const financialConfig = getFinancialStatusConfig(order.financialStatus);
	const fulfillmentConfig = getFulfillmentStatusConfig(order.fulfillmentStatus);

	const formatDate = (date: string | Date) => {
		const dateObj = new Date(date);
		const day = String(dateObj.getDate()).padStart(2, "0");
		const month = String(dateObj.getMonth() + 1).padStart(2, "0");
		const year = dateObj.getFullYear();
		const hours = String(dateObj.getHours()).padStart(2, "0");
		const minutes = String(dateObj.getMinutes()).padStart(2, "0");
		return `${day}.${month}.${year} u ${hours}:${minutes}`;
	};

	return (
		<div className="flex flex-col gap-6 container mx-auto max-w-7xl pb-8">
			{/* Header */}
			<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
				<div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-4">
							<Button
								variant="ghost"
								size="icon"
								onClick={() =>
									navigate({
										to: "/admin/orders",
										search: { search: "", page: 1, limit: 25 },
									})
								}
								className="text-white hover:bg-white/10"
							>
								<ArrowLeft className="size-5" />
							</Button>
							<div>
								<div className="flex items-center gap-3">
									<h1 className="text-xl font-semibold text-white">
										{order.orderNumber}
									</h1>
									<span
										className={cn(
											"inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
											statusConfig.bg,
											statusConfig.color
										)}
									>
										{statusConfig.icon}
										{statusConfig.label}
									</span>
								</div>
								<p className="text-sm text-slate-300 mt-0.5">
									Kreirana {formatDate(order.createdAt)}
								</p>
							</div>
						</div>
						{!isCancelled && (
							<div className="flex items-center gap-2">
								{!isEditMode ? (
									<>
										{order.fulfillmentStatus !== "fulfilled" && (
											<Button
												onClick={() => setShowFulfillDialog(true)}
												disabled={fulfillOrderMutation.isPending}
												className="bg-emerald-500 hover:bg-emerald-600 text-white"
											>
												<Package className="size-4 mr-2" />
												Isporuči
											</Button>
										)}
										<Button
											variant="secondary"
											onClick={handleEditClick}
											className="bg-white/10 hover:bg-white/20 text-white border-0"
										>
											<Edit className="size-4 mr-2" />
											Uredi
										</Button>
										<Button
											variant="ghost"
											onClick={() => setShowCancelDialog(true)}
											className="text-red-300 hover:text-red-200 hover:bg-red-500/20"
										>
											<XCircle className="size-4 mr-2" />
											Otkaži
										</Button>
									</>
								) : (
									<>
										<Button
											variant="ghost"
											onClick={handleCancelEdit}
											disabled={updateOrderMutation.isPending}
											className="text-white hover:bg-white/10"
										>
											Odustani
										</Button>
										<Button
											onClick={() => updateOrderMutation.mutate()}
											disabled={
												updateOrderMutation.isPending ||
												editedItems.length === 0
											}
											className="bg-emerald-500 hover:bg-emerald-600 text-white"
										>
											{updateOrderMutation.isPending && (
												<Loader2 className="size-4 animate-spin mr-2" />
											)}
											<Save className="size-4 mr-2" />
											Sačuvaj izmjene
										</Button>
									</>
								)}
							</div>
						)}
					</div>
				</div>

				{/* Status Badges Row */}
				<div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-6">
					<div className="flex items-center gap-2">
						<span className="text-xs text-gray-500">Finansijski status:</span>
						<span
							className={cn(
								"inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
								financialConfig.bg,
								financialConfig.color
							)}
						>
							{financialConfig.label}
						</span>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-xs text-gray-500">Status isporuke:</span>
						<span
							className={cn(
								"inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
								fulfillmentConfig.bg,
								fulfillmentConfig.color
							)}
						>
							{fulfillmentConfig.label}
						</span>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Main Content - Left Side */}
				<div className="lg:col-span-2 flex flex-col gap-6">
					{/* Order Items Card */}
					<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
						<div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Package className="size-5 text-gray-400" />
								<h2 className="font-semibold text-gray-900">
									Stavke narudžbe
								</h2>
								<span className="text-sm text-gray-500">
									({displayItems.length})
								</span>
							</div>
							{isEditMode && <ProductSearch onSelectProduct={handleAddProduct} />}
						</div>
						<div className="divide-y divide-gray-100">
							{displayItems && displayItems.length > 0 ? (
								displayItems.map((item) => (
									<div
										key={item.id}
										className={cn(
											"p-4 transition-colors",
											isEditMode && "hover:bg-gray-50"
										)}
									>
										<div className="flex gap-4">
											<div className="relative flex-shrink-0">
												{(item as any).imageUrl ? (
													<ProxyImage
														src={(item as any).imageUrl}
														alt={item.title}
														width={80}
														height={80}
														resizingType="fill"
														className="w-20 h-20 rounded-lg object-cover bg-gray-100"
													/>
												) : (
													<div className="w-20 h-20 rounded-lg bg-gray-100 flex flex-col items-center justify-center">
														<ImageOff className="size-6 text-gray-400" />
														<span className="text-[10px] text-gray-400 mt-1">Nema slike</span>
													</div>
												)}
												{isEditMode && (
													<button
														onClick={() => handleRemoveItem(item.id!)}
														className="absolute -top-2 -right-2 size-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md transition-colors"
													>
														<X className="size-3.5" />
													</button>
												)}
											</div>
											<div className="flex-1 min-w-0">
												<div className="flex items-start justify-between gap-4">
													<div>
														<h3 className="font-medium text-gray-900 line-clamp-1">
															{item.title}
														</h3>
														{item.variantTitle && (
															<p className="text-sm text-gray-500 mt-0.5">
																{item.variantTitle}
															</p>
														)}
														{item.sku && (
															<p className="text-xs text-gray-400 mt-1">
																SKU: {item.sku}
															</p>
														)}
													</div>
													<div className="text-right flex-shrink-0">
														<p className="font-semibold text-gray-900">
															{(
																(typeof item.price === "number"
																	? item.price
																	: parseFloat(item.price as any)) *
																item.quantity
															).toFixed(2)}{" "}
															KM
														</p>
														<p className="text-sm text-gray-500">
															{typeof item.price === "number"
																? item.price.toFixed(2)
																: parseFloat(item.price as any).toFixed(2)}{" "}
															KM / kom
														</p>
													</div>
												</div>
												<div className="mt-3 flex items-center gap-4">
													{isEditMode ? (
														<div className="flex items-center gap-2">
															<div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
																<button
																	onClick={() =>
																		handleUpdateQuantity(
																			item.id!,
																			item.quantity - 1
																		)
																	}
																	className="size-8 flex items-center justify-center hover:bg-gray-100 transition-colors"
																>
																	<Minus className="size-3.5" />
																</button>
																<Input
																	type="number"
																	value={item.quantity}
																	onChange={(e) =>
																		handleUpdateQuantity(
																			item.id!,
																			parseInt(e.target.value) || 0
																		)
																	}
																	className="w-12 h-8 text-center text-sm border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0"
																	min="1"
																	max={
																		item.variantId && getItemInventory(item)
																			? getItemInventory(item)?.available
																			: undefined
																	}
																/>
																<button
																	onClick={() =>
																		handleUpdateQuantity(
																			item.id!,
																			item.quantity + 1
																		)
																	}
																	disabled={
																		item.variantId && getItemInventory(item)
																			? (getItemInventory(item)?.available ||
																					0) <= item.quantity
																			: false
																	}
																	className="size-8 flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
																>
																	<Plus className="size-3.5" />
																</button>
															</div>
															{item.variantId && getItemInventory(item) && (
																<span className="text-xs text-gray-500">
																	Dostupno:{" "}
																	{getItemInventory(item)?.available || 0}
																</span>
															)}
														</div>
													) : (
														<span className="inline-flex items-center px-2.5 py-1 bg-gray-100 rounded-md text-sm text-gray-600">
															Količina: {item.quantity}
														</span>
													)}
												</div>
											</div>
										</div>
									</div>
								))
							) : (
								<div className="py-12 text-center">
									<Package className="size-12 text-gray-300 mx-auto mb-3" />
									<p className="text-gray-500">Nema stavki u narudžbi</p>
								</div>
							)}
						</div>
					</div>

					{/* Customer & Addresses Card */}
					<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
						<div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
							<User className="size-5 text-gray-400" />
							<h2 className="font-semibold text-gray-900">
								Podaci o kupcu
							</h2>
						</div>
						<div className="p-6">
							<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
								{/* Customer Info */}
								<div>
									<h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
										Kupac
									</h3>
									{order.customer ? (
										<div className="flex items-start gap-3">
											<div className="size-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium flex-shrink-0">
												{(
													order.customer.firstName?.[0] ||
													order.customer.email?.[0] ||
													"?"
												).toUpperCase()}
											</div>
											<div>
												<p className="font-medium text-gray-900">
													{order.customer.firstName || order.customer.lastName
														? `${order.customer.firstName || ""} ${order.customer.lastName || ""}`.trim()
														: "Nepoznat kupac"}
												</p>
												{order.customer.email &&
													(order.customer.hasEmail ||
														(!order.customer.email.endsWith(
															"@placeholder.local"
														) &&
															!order.customer.email.includes("customer-") &&
															!order.customer.email.includes(
																"@placeholder"
															))) && (
														<p className="text-sm text-gray-500">
															{order.customer.email}
														</p>
													)}
												{order.customer.phone && (
													<p className="text-sm text-gray-500">
														{order.customer.phone}
													</p>
												)}
											</div>
										</div>
									) : order.email &&
										!order.email.endsWith("@placeholder.local") &&
										!order.email.includes("customer-") &&
										!order.email.includes("@placeholder") ? (
										<div className="flex items-start gap-3">
											<div className="size-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500">
												<User className="size-5" />
											</div>
											<div>
												<p className="text-sm text-gray-500">{order.email}</p>
											</div>
										</div>
									) : (
										<p className="text-sm text-gray-400">
											Nema podataka o kupcu
										</p>
									)}
								</div>

								{/* Billing Address */}
								<div>
									<h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
										<CreditCard className="size-3.5" />
										Adresa za naplatu
									</h3>
									{order.billingAddress ? (
										<div className="text-sm text-gray-600 space-y-0.5">
											{(order.billingAddress.firstName ||
												order.billingAddress.lastName) && (
												<p className="font-medium text-gray-900">
													{order.billingAddress.firstName}{" "}
													{order.billingAddress.lastName}
												</p>
											)}
											{order.billingAddress.company && (
												<p>{order.billingAddress.company}</p>
											)}
											<p>{order.billingAddress.address1}</p>
											{order.billingAddress.address2 && (
												<p>{order.billingAddress.address2}</p>
											)}
											<p>
												{order.billingAddress.city}{" "}
												{order.billingAddress.zip}
											</p>
											{order.billingAddress.state && (
												<p>{order.billingAddress.state}</p>
											)}
											<p>{order.billingAddress.country}</p>
											{order.billingAddress.phone && (
												<p className="text-gray-500">
													{order.billingAddress.phone}
												</p>
											)}
										</div>
									) : (
										<p className="text-sm text-gray-400">Nije navedena</p>
									)}
								</div>

								{/* Shipping Address */}
								<div>
									<h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
										<Truck className="size-3.5" />
										Adresa za dostavu
									</h3>
									{order.shippingAddress ? (
										<div className="text-sm text-gray-600 space-y-0.5">
											{(order.shippingAddress.firstName ||
												order.shippingAddress.lastName) && (
												<p className="font-medium text-gray-900">
													{order.shippingAddress.firstName}{" "}
													{order.shippingAddress.lastName}
												</p>
											)}
											{order.shippingAddress.company && (
												<p>{order.shippingAddress.company}</p>
											)}
											<p>{order.shippingAddress.address1}</p>
											{order.shippingAddress.address2 && (
												<p>{order.shippingAddress.address2}</p>
											)}
											<p>
												{order.shippingAddress.city}{" "}
												{order.shippingAddress.zip}
											</p>
											{order.shippingAddress.state && (
												<p>{order.shippingAddress.state}</p>
											)}
											<p>{order.shippingAddress.country}</p>
											{order.shippingAddress.phone && (
												<p className="text-gray-500">
													{order.shippingAddress.phone}
												</p>
											)}
										</div>
									) : (
										<p className="text-sm text-gray-400">Nije navedena</p>
									)}
								</div>
							</div>
						</div>
					</div>

					{/* Note Card */}
					{order.note && (
						<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
							<div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
								<FileText className="size-5 text-gray-400" />
								<h2 className="font-semibold text-gray-900">Napomena</h2>
							</div>
							<div className="p-6">
								<p className="text-sm text-gray-600 whitespace-pre-wrap">
									{order.note}
								</p>
							</div>
						</div>
					)}
				</div>

				{/* Sidebar - Right Side */}
				<div className="lg:col-span-1">
					<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden sticky top-4">
						<div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
							<Receipt className="size-5 text-gray-400" />
							<h2 className="font-semibold text-gray-900">Pregled</h2>
						</div>
						<div className="p-6 space-y-4">
							<div className="flex justify-between items-center">
								<span className="text-sm text-gray-500">Međuzbir</span>
								<span className="text-sm font-medium">
									{displaySubtotal.toFixed(2)} KM
								</span>
							</div>
							<div className="flex justify-between items-center">
								<span className="text-sm text-gray-500">Dostava</span>
								<span className="text-sm font-medium">
									{displayShipping.toFixed(2)} KM
								</span>
							</div>
							{displayDiscount > 0 && (
								<div className="flex justify-between items-center">
									<span className="text-sm text-gray-500">Popust</span>
									<span className="text-sm font-medium text-emerald-600">
										-{displayDiscount.toFixed(2)} KM
									</span>
								</div>
							)}
							{displayTax > 0 && (
								<div className="flex justify-between items-center">
									<span className="text-sm text-gray-500">PDV</span>
									<span className="text-sm font-medium">
										{displayTax.toFixed(2)} KM
									</span>
								</div>
							)}
							<div className="border-t border-gray-100 pt-4">
								<div className="flex justify-between items-center">
									<span className="font-semibold text-gray-900">Ukupno</span>
									<span className="text-xl font-bold text-gray-900">
										{displayTotal.toFixed(2)} {order.currency || "KM"}
									</span>
								</div>
							</div>

							{/* Quick Status Info */}
							<div className="border-t border-gray-100 pt-4 space-y-3">
								<div className="flex items-center justify-between">
									<span className="text-xs text-gray-500">Broj stavki</span>
									<span className="text-sm font-medium">
										{displayItems.reduce((sum, item) => sum + item.quantity, 0)}
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-xs text-gray-500">Metoda plaćanja</span>
									<span className="text-sm font-medium">
										{order.paymentMethodTitle || "-"}
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-xs text-gray-500">Dostava</span>
									<span className="text-sm font-medium">
										{order.shippingMethodTitle || "-"}
									</span>
								</div>
							</div>

							{/* Tracking Information */}
							{(order.trackingNumber || order.shippingCompany) && (
								<div className="border-t border-gray-100 pt-4 space-y-3">
									<div className="flex items-center gap-2 text-emerald-600">
										<Truck className="size-4" />
										<span className="text-xs font-medium uppercase tracking-wider">
											Informacije o dostavi
										</span>
									</div>
									{order.shippingCompany && (
										<div className="flex items-center justify-between">
											<span className="text-xs text-gray-500">Kurirska služba</span>
											<span className="text-sm font-medium">
												{order.shippingCompany}
											</span>
										</div>
									)}
									{order.trackingNumber && (
										<div className="flex items-center justify-between">
											<span className="text-xs text-gray-500">Broj pošiljke</span>
											<span className="text-sm font-medium font-mono">
												{order.trackingNumber}
											</span>
										</div>
									)}
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Cancel Dialog */}
			<AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
				<AlertDialogContent className="sm:max-w-md">
					<AlertDialogHeader>
						<AlertDialogTitle className="flex items-center gap-2">
							<XCircle className="size-5 text-red-500" />
							Otkaži narudžbu
						</AlertDialogTitle>
						<AlertDialogDescription>
							Da li ste sigurni da želite otkazati ovu narudžbu? Ova akcija ne
							može biti poništena.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<div className="flex flex-col gap-2 py-2">
						<label className="text-sm font-medium text-gray-700">
							Razlog otkazivanja (opciono)
						</label>
						<Input
							placeholder="Unesi razlog otkazivanja"
							value={cancelReason}
							onChange={(e) => setCancelReason(e.target.value)}
							className="focus-visible:ring-red-500"
						/>
					</div>
					<AlertDialogFooter>
						<AlertDialogCancel className="hover:bg-gray-100">
							Odustani
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => cancelOrderMutation.mutate()}
							disabled={cancelOrderMutation.isPending}
							className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
						>
							{cancelOrderMutation.isPending && (
								<Loader2 className="size-4 animate-spin mr-2" />
							)}
							Otkaži narudžbu
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Fulfill Dialog */}
			<AlertDialog open={showFulfillDialog} onOpenChange={setShowFulfillDialog}>
				<AlertDialogContent className="sm:max-w-lg">
					<AlertDialogHeader>
						<AlertDialogTitle className="flex items-center gap-2">
							<Package className="size-5 text-emerald-500" />
							Isporuči narudžbu
						</AlertDialogTitle>
						<AlertDialogDescription>
							Da li ste sigurni da želite isporučiti ovu narudžbu? Ova akcija će
							smanjiti zalihe za sve proizvode u narudžbi.
						</AlertDialogDescription>
					</AlertDialogHeader>

					{/* Tracking Information */}
					<div className="space-y-4 py-2">
						<div className="flex flex-col gap-2">
							<label className="text-sm font-medium text-gray-700">
								Kurirska služba (opciono)
							</label>
							<Input
								placeholder="npr. BEX, DHL, GLS..."
								value={fulfillShippingCompany}
								onChange={(e) => setFulfillShippingCompany(e.target.value)}
								className="focus-visible:ring-emerald-500"
							/>
						</div>
						<div className="flex flex-col gap-2">
							<label className="text-sm font-medium text-gray-700">
								Broj za praćenje pošiljke (opciono)
							</label>
							<Input
								placeholder="Unesi broj za praćenje"
								value={fulfillTrackingNumber}
								onChange={(e) => setFulfillTrackingNumber(e.target.value)}
								className="focus-visible:ring-emerald-500"
							/>
						</div>
					</div>

					{order.items && order.items.length > 0 && (
						<div className="py-2">
							<p className="text-sm font-medium text-gray-700 mb-2">
								Proizvodi koji će biti isporučeni:
							</p>
							<div className="max-h-48 overflow-y-auto space-y-2 rounded-lg bg-gray-50 p-3">
								{order.items.map((item) => (
									<div
										key={item.id}
										className="flex items-center justify-between text-sm"
									>
										<div>
											<span className="font-medium">{item.title}</span>
											{item.variantTitle && (
												<span className="text-gray-500">
													{" "}
													- {item.variantTitle}
												</span>
											)}
										</div>
										<span className="text-gray-500 flex-shrink-0 ml-2">
											x{item.quantity}
										</span>
									</div>
								))}
							</div>
						</div>
					)}
					<AlertDialogFooter>
						<AlertDialogCancel className="hover:bg-gray-100">
							Odustani
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => fulfillOrderMutation.mutate()}
							disabled={fulfillOrderMutation.isPending}
							className="bg-emerald-500 hover:bg-emerald-600 focus:ring-emerald-500"
						>
							{fulfillOrderMutation.isPending && (
								<Loader2 className="size-4 animate-spin mr-2" />
							)}
							Isporuči narudžbu
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
