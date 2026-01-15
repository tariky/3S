import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { searchProductsForOrderServerFn } from "@/queries/products";
import { Loader2, ImageOff, Plus } from "lucide-react";
import { ProxyImage } from "@/components/ui/proxy-image";

interface POProductSearchProps {
	onSelectProduct: (product: {
		productId: string;
		variantId: string;
		productName: string;
		variantTitle: string | null;
		sku: string | null;
		imageUrl: string | null;
		costPerUnit: number;
		quantityOrdered: number;
	}) => void;
}

export function POProductSearch({ onSelectProduct }: POProductSearchProps) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [selectedVariant, setSelectedVariant] = useState<{
		product: any;
		variant: any;
	} | null>(null);
	const [quantity, setQuantity] = useState("1");
	const [costPerUnit, setCostPerUnit] = useState("");
	const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Initialize debouncedSearch immediately when dialog opens
	useEffect(() => {
		if (open) {
			setDebouncedSearch("");
		}
	}, [open]);

	// Debounce search input (only when user types)
	useEffect(() => {
		if (!open) return;

		if (searchTimeoutRef.current) {
			clearTimeout(searchTimeoutRef.current);
		}

		// If search is empty, update immediately (no debounce)
		if (search === "") {
			setDebouncedSearch("");
			return;
		}

		// Otherwise, debounce the search
		searchTimeoutRef.current = setTimeout(() => {
			setDebouncedSearch(search);
		}, 300);

		return () => {
			if (searchTimeoutRef.current) {
				clearTimeout(searchTimeoutRef.current);
			}
		};
	}, [search, open]);

	const { data: products = [], isLoading } = useQuery({
		queryKey: ["products-search-po", debouncedSearch || "", open],
		queryFn: async () => {
			const searchTerm = debouncedSearch.trim() || undefined;
			const result = await searchProductsForOrderServerFn({
				data: { search: searchTerm, limit: searchTerm ? 20 : 10 },
			});
			return result || [];
		},
		enabled: open,
	});

	useEffect(() => {
		if (!open) {
			setSearch("");
			setDebouncedSearch("");
			setSelectedVariant(null);
			setQuantity("1");
			setCostPerUnit("");
		}
	}, [open]);

	const handleSelectVariant = (product: any, variant: any) => {
		setSelectedVariant({ product, variant });
		// Pre-fill cost from variant if available
		if (variant?.cost) {
			setCostPerUnit(parseFloat(variant.cost).toString());
		} else {
			setCostPerUnit("");
		}
	};

	const handleAddItem = () => {
		if (!selectedVariant) return;

		const { product, variant } = selectedVariant;
		const cost = parseFloat(costPerUnit) || 0;
		const qty = parseInt(quantity) || 1;

		// Build variant title from variant options
		const variantTitle =
			variant?.variantOptions
				?.map((vo: any) => vo.optionValue?.name)
				.filter(Boolean)
				.join(" / ") || null;

		onSelectProduct({
			productId: product.id,
			variantId: variant?.id || product.id,
			productName: product.name,
			variantTitle,
			sku: variant?.sku || product.sku || null,
			imageUrl: product.primaryImage || null,
			costPerUnit: cost,
			quantityOrdered: qty,
		});

		setOpen(false);
		setSearch("");
		setSelectedVariant(null);
		setQuantity("1");
		setCostPerUnit("");
	};

	const getVariantDisplayName = (variant: any, productName: string) => {
		if (variant?.variantOptions && variant.variantOptions.length > 0) {
			const optionNames = variant.variantOptions
				.map((vo: any) => vo.optionValue?.name)
				.filter(Boolean);
			return optionNames.length > 0 ? optionNames.join(" / ") : productName;
		}
		return productName;
	};

	const formatCurrency = (value: number) => {
		return new Intl.NumberFormat("hr-HR", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(value);
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm" className="gap-2">
					<Plus className="h-4 w-4" />
					Dodaj stavku
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
				<DialogHeader>
					<DialogTitle>Dodaj proizvod</DialogTitle>
					<DialogDescription>
						Pretražite i dodajte proizvode u narudžbenicu
					</DialogDescription>
				</DialogHeader>

				{selectedVariant ? (
					// Selected variant form
					<div className="flex flex-col gap-4 py-4">
						<div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
							{selectedVariant.product.primaryImage ? (
								<ProxyImage
									src={selectedVariant.product.primaryImage}
									alt={selectedVariant.product.name}
									width={80}
									height={80}
									resizingType="fill"
									className="w-16 h-16 rounded-md object-cover flex-shrink-0"
								/>
							) : (
								<div className="w-16 h-16 rounded-md bg-gray-200 flex flex-col items-center justify-center flex-shrink-0">
									<ImageOff className="size-5 text-gray-400" />
								</div>
							)}
							<div className="flex flex-col gap-1 flex-1 min-w-0">
								<span className="text-sm font-medium">
									{selectedVariant.product.name}
								</span>
								<span className="text-sm text-gray-600">
									{getVariantDisplayName(
										selectedVariant.variant,
										selectedVariant.product.name
									)}
								</span>
								{selectedVariant.variant?.sku && (
									<span className="text-xs text-gray-400">
										SKU: {selectedVariant.variant.sku}
									</span>
								)}
								<span className="text-xs text-gray-500">
									Dostupno: {selectedVariant.variant?.inventory?.available ?? 0}
								</span>
							</div>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setSelectedVariant(null)}
							>
								Promijeni
							</Button>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label>Količina *</Label>
								<Input
									type="number"
									min="1"
									value={quantity}
									onChange={(e) => setQuantity(e.target.value)}
									placeholder="1"
								/>
							</div>
							<div className="space-y-2">
								<Label>Nabavna cijena (KM) *</Label>
								<Input
									type="number"
									min="0"
									step="0.01"
									value={costPerUnit}
									onChange={(e) => setCostPerUnit(e.target.value)}
									placeholder={
										selectedVariant.variant?.cost
											? `Zadnja: ${formatCurrency(parseFloat(selectedVariant.variant.cost))}`
											: "0.00"
									}
								/>
							</div>
						</div>

						{costPerUnit && quantity && (
							<div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
								<span className="text-sm text-gray-600">Ukupno:</span>
								<span className="text-lg font-bold text-gray-900">
									{formatCurrency(
										(parseFloat(costPerUnit) || 0) * (parseInt(quantity) || 1)
									)}{" "}
									KM
								</span>
							</div>
						)}

						<div className="flex justify-end gap-2 pt-2">
							<Button variant="outline" onClick={() => setSelectedVariant(null)}>
								Nazad
							</Button>
							<Button
								onClick={handleAddItem}
								disabled={!costPerUnit || parseFloat(costPerUnit) <= 0}
							>
								Dodaj u narudžbenicu
							</Button>
						</div>
					</div>
				) : (
					// Product search
					<div className="flex flex-col gap-2 flex-1 min-h-0">
						<Input
							placeholder="Unesi SKU ili naziv proizvoda"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
						<div className="flex flex-col gap-2 overflow-y-auto flex-1">
							{isLoading && (
								<div className="flex items-center justify-center py-8">
									<Loader2 className="size-6 animate-spin" />
								</div>
							)}
							{!isLoading && Array.isArray(products) && products.length === 0 && (
								<div className="text-center py-8 text-gray-500">
									{search ? "Nema pronađenih proizvoda" : "Nema proizvoda"}
								</div>
							)}
							{!isLoading && Array.isArray(products) && products.length > 0 && (
								<div className="text-xs text-gray-500 mb-2">
									{search ? "Rezultati pretrage" : "Posljednji dodani proizvodi"}
								</div>
							)}
							{!isLoading &&
								Array.isArray(products) &&
								products.map((product: any) => {
									const hasVariants =
										product.variants && product.variants.length > 0;

									// If product has no variants, create a single "variant" representation
									const displayVariants = hasVariants
										? product.variants
										: [
												{
													id: product.id,
													price: product.price,
													cost: product.cost,
													sku: product.sku,
													inventory: { available: 0 },
													variantOptions: [],
												},
											];

									return (
										<div
											key={product.id}
											className="border rounded-md overflow-visible"
										>
											{/* Product Header */}
											<div className="flex gap-2 p-2 bg-gray-50 border-b">
												{product.primaryImage ? (
													<ProxyImage
														src={product.primaryImage}
														alt={product.name}
														width={64}
														height={64}
														resizingType="fill"
														className="w-16 h-16 rounded-md aspect-square object-cover flex-shrink-0"
													/>
												) : (
													<div className="w-16 h-16 rounded-md bg-gray-200 flex flex-col items-center justify-center flex-shrink-0">
														<ImageOff className="size-5 text-gray-400" />
														<span className="text-[10px] text-gray-400 mt-0.5">
															Nema slike
														</span>
													</div>
												)}
												<div className="flex flex-col gap-1 flex-1 min-w-0">
													<span className="text-sm font-medium">
														{product.name}
													</span>
													{hasVariants && product.variants.length > 1 && (
														<span className="text-xs text-gray-500">
															{product.variants.length} varijanti
														</span>
													)}
													{!hasVariants && (
														<span className="text-xs text-gray-500">
															Proizvod bez varijanti
														</span>
													)}
												</div>
											</div>

											{/* Variants List */}
											<div className="flex flex-col">
												{displayVariants.map((variant: any, index: number) => (
													<div
														key={variant.id || `default-${index}`}
														className={`flex gap-2 p-2 hover:bg-gray-100 cursor-pointer ${
															index > 0 ? "border-t" : ""
														}`}
														onClick={() => handleSelectVariant(product, variant)}
													>
														<div className="w-16" />{" "}
														{/* Spacer for image alignment */}
														<div className="flex flex-col gap-1 flex-1">
															<span className="text-sm font-medium">
																{getVariantDisplayName(variant, product.name)}
															</span>
															{variant.sku && (
																<span className="text-xs text-gray-400">
																	SKU: {variant.sku}
																</span>
															)}
															<div className="flex items-center gap-4">
																<span className="text-sm text-gray-500">
																	Dostupno: {variant.inventory?.available ?? 0}
																</span>
																{variant.cost && (
																	<span className="text-sm font-medium text-emerald-600">
																		Nabavna:{" "}
																		{formatCurrency(parseFloat(variant.cost))} KM
																	</span>
																)}
															</div>
														</div>
													</div>
												))}
											</div>
										</div>
									);
								})}
						</div>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
