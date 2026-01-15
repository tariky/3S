import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
	createPurchaseOrderServerFn,
	addPurchaseOrderItemServerFn,
	markPurchaseOrderOrderedServerFn,
} from "@/queries/purchase-orders";
import { getVendorsQueryOptions } from "@/queries/vendors";
import {
	ClipboardList,
	ArrowLeft,
	Save,
	Send,
	Trash2,
	Package,
	Building2,
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ProxyImage } from "@/components/ui/proxy-image";
import { POProductSearch } from "@/components/purchase-orders/POProductSearch";

export const Route = createFileRoute("/admin/purchase-orders/new")({
	component: NewPurchaseOrderPage,
});

type PurchaseOrderItem = {
	id: string;
	productId: string;
	variantId: string;
	productName: string;
	variantTitle: string | null;
	sku: string | null;
	imageUrl: string | null;
	quantityOrdered: number;
	costPerUnit: number;
	totalCost: number;
};

function NewPurchaseOrderPage() {
	const navigate = useNavigate();
	const [vendorId, setVendorId] = useState<string>("");
	const [vendorName, setVendorName] = useState("");
	const [expectedDate, setExpectedDate] = useState("");
	const [notes, setNotes] = useState("");
	const [items, setItems] = useState<PurchaseOrderItem[]>([]);
	const [isCreating, setIsCreating] = useState(false);

	const { data: vendorsData } = useQuery(getVendorsQueryOptions());

	const handleVendorChange = (value: string) => {
		setVendorId(value);
		const vendor = vendorsData?.find((v) => v.id === value);
		if (vendor) {
			setVendorName(vendor.name);
		}
	};

	const handleAddItem = (product: {
		productId: string;
		variantId: string;
		productName: string;
		variantTitle: string | null;
		sku: string | null;
		imageUrl: string | null;
		costPerUnit: number;
		quantityOrdered: number;
	}) => {
		// Check if item already exists
		const existingIndex = items.findIndex(
			(i) => i.variantId === product.variantId
		);
		if (existingIndex >= 0) {
			// Update quantity instead
			const newItems = [...items];
			newItems[existingIndex].quantityOrdered += product.quantityOrdered;
			newItems[existingIndex].costPerUnit = product.costPerUnit; // Update cost to latest
			newItems[existingIndex].totalCost =
				newItems[existingIndex].quantityOrdered *
				newItems[existingIndex].costPerUnit;
			setItems(newItems);
		} else {
			const newItem: PurchaseOrderItem = {
				id: crypto.randomUUID(),
				productId: product.productId,
				variantId: product.variantId,
				productName: product.productName,
				variantTitle: product.variantTitle,
				sku: product.sku,
				imageUrl: product.imageUrl,
				quantityOrdered: product.quantityOrdered,
				costPerUnit: product.costPerUnit,
				totalCost: product.quantityOrdered * product.costPerUnit,
			};
			setItems([...items, newItem]);
		}
	};

	const handleRemoveItem = (variantId: string) => {
		setItems(items.filter((i) => i.variantId !== variantId));
	};

	const handleUpdateItem = (
		variantId: string,
		field: "quantityOrdered" | "costPerUnit",
		value: number
	) => {
		const newItems = items.map((item) => {
			if (item.variantId === variantId) {
				const updated = { ...item, [field]: value };
				updated.totalCost = updated.quantityOrdered * updated.costPerUnit;
				return updated;
			}
			return item;
		});
		setItems(newItems);
	};

	const totalCost = items.reduce((sum, item) => sum + item.totalCost, 0);
	const totalQuantity = items.reduce((sum, item) => sum + item.quantityOrdered, 0);

	const handleSaveDraft = async () => {
		if (!vendorName) {
			toast.error("Unesite naziv dobavljača");
			return;
		}

		if (items.length === 0) {
			toast.error("Dodajte barem jednu stavku");
			return;
		}

		setIsCreating(true);

		try {
			// Create the PO
			const po = await createPurchaseOrderServerFn({
				data: {
					vendorId: vendorId || null,
					vendorName,
					expectedDate: expectedDate || null,
					notes: notes || null,
				},
			});

			// Add items
			for (const item of items) {
				await addPurchaseOrderItemServerFn({
					data: {
						purchaseOrderId: po.id,
						productId: item.productId,
						variantId: item.variantId,
						productName: item.productName,
						variantTitle: item.variantTitle,
						sku: item.sku,
						quantityOrdered: item.quantityOrdered,
						costPerUnit: item.costPerUnit,
					},
				});
			}

			toast.success("Narudžbenica spremljena kao draft");
			navigate({ to: "/admin/purchase-orders/$orderId", params: { orderId: po.id } });
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Greška pri kreiranju narudžbenice"
			);
		} finally {
			setIsCreating(false);
		}
	};

	const handleSaveAndOrder = async () => {
		if (!vendorName) {
			toast.error("Unesite naziv dobavljača");
			return;
		}

		if (items.length === 0) {
			toast.error("Dodajte barem jednu stavku");
			return;
		}

		setIsCreating(true);

		try {
			// Create the PO
			const po = await createPurchaseOrderServerFn({
				data: {
					vendorId: vendorId || null,
					vendorName,
					expectedDate: expectedDate || null,
					notes: notes || null,
				},
			});

			// Add items
			for (const item of items) {
				await addPurchaseOrderItemServerFn({
					data: {
						purchaseOrderId: po.id,
						productId: item.productId,
						variantId: item.variantId,
						productName: item.productName,
						variantTitle: item.variantTitle,
						sku: item.sku,
						quantityOrdered: item.quantityOrdered,
						costPerUnit: item.costPerUnit,
					},
				});
			}

			// Mark as ordered
			await markPurchaseOrderOrderedServerFn({ data: { id: po.id } });

			toast.success("Narudžbenica kreirana i označena kao naručena");
			navigate({ to: "/admin/purchase-orders/$orderId", params: { orderId: po.id } });
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Greška pri kreiranju narudžbenice"
			);
		} finally {
			setIsCreating(false);
		}
	};

	const formatCurrency = (value: number) => {
		return new Intl.NumberFormat("hr-HR", {
			style: "currency",
			currency: "BAM",
			minimumFractionDigits: 2,
		}).format(value);
	};

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
									Nova narudžbenica
								</h1>
								<p className="text-sm text-slate-300 hidden sm:block">
									Kreirajte narudžbenicu za nabavu
								</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Button
								variant="secondary"
								size="sm"
								onClick={handleSaveDraft}
								disabled={isCreating}
								className="gap-2"
							>
								<Save className="h-4 w-4" />
								<span className="hidden sm:inline">Spremi draft</span>
							</Button>
							<Button
								size="sm"
								onClick={handleSaveAndOrder}
								disabled={isCreating}
								className="gap-2"
							>
								<Send className="h-4 w-4" />
								<span className="hidden sm:inline">Spremi i naruči</span>
							</Button>
						</div>
					</div>
				</div>
			</div>

			<div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-5xl mx-auto">
				{/* Supplier Info */}
				<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
					<h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
						<Building2 className="h-5 w-5" />
						Dobavljač
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Odaberi dobavljača</Label>
							<Select value={vendorId} onValueChange={handleVendorChange}>
								<SelectTrigger>
									<SelectValue placeholder="Odaberi dobavljača" />
								</SelectTrigger>
								<SelectContent>
									{vendorsData?.map((vendor) => (
										<SelectItem key={vendor.id} value={vendor.id}>
											{vendor.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label>Ili unesite naziv *</Label>
							<Input
								value={vendorName}
								onChange={(e) => setVendorName(e.target.value)}
								placeholder="Naziv dobavljača"
							/>
						</div>
						<div className="space-y-2">
							<Label>Očekivani datum isporuke</Label>
							<Input
								type="date"
								value={expectedDate}
								onChange={(e) => setExpectedDate(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label>Napomene</Label>
							<Textarea
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								placeholder="Dodatne napomene..."
								rows={2}
							/>
						</div>
					</div>
				</div>

				{/* Items */}
				<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 md:p-6">
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
							<Package className="h-5 w-5" />
							Stavke ({items.length})
						</h2>
						<POProductSearch onSelectProduct={handleAddItem} />
					</div>

					{items.length === 0 ? (
						<div className="text-center py-8 text-gray-500">
							<Package className="h-12 w-12 mx-auto mb-3 text-gray-300" />
							<p className="font-medium">Nema stavki</p>
							<p className="text-sm mt-1">Dodajte proizvode u narudžbenicu</p>
						</div>
					) : (
						<div className="space-y-3">
							{items.map((item) => (
								<div
									key={item.variantId}
									className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
								>
									{item.imageUrl ? (
										<ProxyImage
											src={item.imageUrl}
											alt={item.productName}
											width={80}
											height={80}
											className="w-12 h-12 rounded object-cover flex-shrink-0"
										/>
									) : (
										<div className="w-12 h-12 rounded bg-gray-200 flex items-center justify-center flex-shrink-0">
											<Package className="h-6 w-6 text-gray-400" />
										</div>
									)}
									<div className="flex-1 min-w-0">
										<div className="font-medium text-gray-900 text-sm truncate">
											{item.productName}
										</div>
										<div className="text-xs text-gray-500">
											{item.variantTitle || "Default"} | SKU: {item.sku || "-"}
										</div>
									</div>
									<div className="flex items-center gap-3">
										<div className="space-y-1">
											<Label className="text-xs">Količina</Label>
											<Input
												type="number"
												min="1"
												value={item.quantityOrdered}
												onChange={(e) =>
													handleUpdateItem(
														item.variantId,
														"quantityOrdered",
														parseInt(e.target.value) || 1
													)
												}
												className="w-20 h-8 text-sm"
											/>
										</div>
										<div className="space-y-1">
											<Label className="text-xs">Cijena</Label>
											<Input
												type="number"
												min="0"
												step="0.01"
												value={item.costPerUnit}
												onChange={(e) =>
													handleUpdateItem(
														item.variantId,
														"costPerUnit",
														parseFloat(e.target.value) || 0
													)
												}
												className="w-24 h-8 text-sm"
											/>
										</div>
										<div className="text-right min-w-[80px]">
											<div className="text-xs text-gray-500">Ukupno</div>
											<div className="font-medium text-gray-900 text-sm">
												{formatCurrency(item.totalCost)}
											</div>
										</div>
										<Button
											variant="ghost"
											size="sm"
											onClick={() => handleRemoveItem(item.variantId)}
											className="h-8 w-8 p-0 text-red-600"
										>
											<Trash2 className="h-4 w-4" />
										</Button>
									</div>
								</div>
							))}
						</div>
					)}

					{items.length > 0 && (
						<div className="mt-4 pt-4 border-t border-gray-200">
							<div className="flex justify-between items-center">
								<div className="text-gray-600">
									Ukupno stavki: <span className="font-medium">{totalQuantity}</span>
								</div>
								<div className="text-lg font-bold text-gray-900">
									Ukupno: {formatCurrency(totalCost)}
								</div>
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

