"use client";

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
	createDiscountServerFn,
	updateDiscountServerFn,
	DISCOUNTS_QUERY_KEY,
} from "@/queries/discounts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2, Wand2, Percent, DollarSign } from "lucide-react";

interface DiscountData {
	id?: string;
	code: string;
	type: "percentage" | "fixed";
	value: number;
	minimumPurchase?: number | null;
	maximumDiscount?: number | null;
	usageLimit?: number | null;
	usageCount?: number;
	startsAt?: string | Date | null;
	endsAt?: string | Date | null;
	active: boolean;
}

interface DiscountEditorProps {
	discount?: DiscountData;
	isEditing?: boolean;
}

export function DiscountEditor({ discount, isEditing = false }: DiscountEditorProps) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	// Form state
	const [code, setCode] = useState(discount?.code || "");
	const [type, setType] = useState<"percentage" | "fixed">(discount?.type || "percentage");
	const [value, setValue] = useState<string>(discount?.value?.toString() || "");
	const [minimumPurchase, setMinimumPurchase] = useState<string>(
		discount?.minimumPurchase?.toString() || ""
	);
	const [maximumDiscount, setMaximumDiscount] = useState<string>(
		discount?.maximumDiscount?.toString() || ""
	);
	const [usageLimit, setUsageLimit] = useState<string>(
		discount?.usageLimit?.toString() || ""
	);
	const [startsAt, setStartsAt] = useState(() => {
		if (!discount?.startsAt) return "";
		const date = typeof discount.startsAt === "string"
			? discount.startsAt
			: new Date(discount.startsAt).toISOString();
		return date.slice(0, 16);
	});
	const [endsAt, setEndsAt] = useState(() => {
		if (!discount?.endsAt) return "";
		const date = typeof discount.endsAt === "string"
			? discount.endsAt
			: new Date(discount.endsAt).toISOString();
		return date.slice(0, 16);
	});
	const [active, setActive] = useState(discount?.active ?? true);
	const [errors, setErrors] = useState<Record<string, string>>({});

	// Generate random code
	const generateCode = () => {
		const generated = Math.random().toString(36).substring(2, 10).toUpperCase();
		setCode(generated);
	};

	// Validation
	const validate = (): boolean => {
		const newErrors: Record<string, string> = {};

		if (!code.trim()) {
			newErrors.code = "Kod je obavezan";
		}

		const numValue = parseFloat(value);
		if (!value || isNaN(numValue) || numValue <= 0) {
			newErrors.value = "Vrijednost mora biti pozitivan broj";
		} else if (type === "percentage" && numValue > 100) {
			newErrors.value = "Postotak ne može biti veći od 100";
		}

		if (startsAt && endsAt && new Date(startsAt) >= new Date(endsAt)) {
			newErrors.endsAt = "Datum završetka mora biti nakon datuma početka";
		}

		setErrors(newErrors);
		return Object.keys(newErrors).length === 0;
	};

	// Mutations
	const createMutation = useMutation({
		mutationFn: async (data: any) => {
			return await createDiscountServerFn({ data });
		},
		onSuccess: (result) => {
			queryClient.invalidateQueries({ queryKey: [DISCOUNTS_QUERY_KEY] });
			navigate({ to: "/admin/discounts/$discountId", params: { discountId: result.id } });
		},
		onError: (error: Error) => {
			setErrors({ submit: error.message });
		},
	});

	const updateMutation = useMutation({
		mutationFn: async (data: any) => {
			return await updateDiscountServerFn({ data });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [DISCOUNTS_QUERY_KEY] });
		},
		onError: (error: Error) => {
			setErrors({ submit: error.message });
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (!validate()) return;

		const data = {
			...(isEditing && { id: discount?.id }),
			code: code.toUpperCase(),
			type,
			value: parseFloat(value),
			minimumPurchase: minimumPurchase ? parseFloat(minimumPurchase) : null,
			maximumDiscount: type === "percentage" && maximumDiscount ? parseFloat(maximumDiscount) : null,
			usageLimit: usageLimit ? parseInt(usageLimit) : null,
			startsAt: startsAt || null,
			endsAt: endsAt || null,
			active,
		};

		if (isEditing) {
			updateMutation.mutate(data);
		} else {
			createMutation.mutate(data);
		}
	};

	const isPending = createMutation.isPending || updateMutation.isPending;

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Header */}
			<div className="flex items-center gap-4">
				<Button
					type="button"
					variant="ghost"
					size="icon"
					onClick={() => navigate({ to: "/admin/discounts" })}
				>
					<ArrowLeft className="size-5" />
				</Button>
				<div className="flex-1">
					<h1 className="text-2xl font-bold text-gray-900">
						{isEditing ? "Uredi popust" : "Novi popust"}
					</h1>
					<p className="text-gray-600 mt-1">
						{isEditing
							? "Ažurirajte informacije o popustu"
							: "Kreirajte novi kod za popust"}
					</p>
				</div>
				<Button type="submit" disabled={isPending}>
					{isPending && <Loader2 className="size-4 mr-2 animate-spin" />}
					{isEditing ? "Sačuvaj" : "Kreiraj"}
				</Button>
			</div>

			{errors.submit && (
				<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
					{errors.submit}
				</div>
			)}

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Main content */}
				<div className="lg:col-span-2 space-y-6">
					{/* Code */}
					<Card>
						<CardHeader>
							<CardTitle>Kod za popust</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="code">Kod</Label>
								<div className="flex gap-2">
									<Input
										id="code"
										placeholder="npr. LJETO2024"
										value={code}
										onChange={(e) => setCode(e.target.value.toUpperCase())}
										className={errors.code ? "border-red-500" : ""}
									/>
									<Button
										type="button"
										variant="outline"
										onClick={generateCode}
									>
										<Wand2 className="size-4 mr-2" />
										Generiši
									</Button>
								</div>
								{errors.code && (
									<p className="text-sm text-red-500">{errors.code}</p>
								)}
								<p className="text-sm text-gray-500">
									Kupci će koristiti ovaj kod prilikom naručivanja
								</p>
							</div>
						</CardContent>
					</Card>

					{/* Type and Value */}
					<Card>
						<CardHeader>
							<CardTitle>Tip i vrijednost</CardTitle>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="space-y-3">
								<Label>Tip popusta</Label>
								<div className="grid grid-cols-2 gap-4">
									<button
										type="button"
										onClick={() => setType("percentage")}
										className={`flex items-center gap-3 border rounded-lg p-4 cursor-pointer transition-colors text-left ${
											type === "percentage"
												? "border-primary bg-primary/5"
												: "border-gray-200 hover:border-gray-300"
										}`}
									>
										<div className={`w-4 h-4 shrink-0 rounded-full border-2 flex items-center justify-center ${
											type === "percentage" ? "border-primary" : "border-gray-300"
										}`}>
											{type === "percentage" && (
												<div className="w-2 h-2 rounded-full bg-primary" />
											)}
										</div>
										<div className="p-2 rounded-lg bg-blue-100 shrink-0">
											<Percent className="size-4 text-blue-600" />
										</div>
										<span className="font-medium">Postotak</span>
									</button>
									<button
										type="button"
										onClick={() => setType("fixed")}
										className={`flex items-center gap-3 border rounded-lg p-4 cursor-pointer transition-colors text-left ${
											type === "fixed"
												? "border-primary bg-primary/5"
												: "border-gray-200 hover:border-gray-300"
										}`}
									>
										<div className={`w-4 h-4 shrink-0 rounded-full border-2 flex items-center justify-center ${
											type === "fixed" ? "border-primary" : "border-gray-300"
										}`}>
											{type === "fixed" && (
												<div className="w-2 h-2 rounded-full bg-primary" />
											)}
										</div>
										<div className="p-2 rounded-lg bg-green-100 shrink-0">
											<DollarSign className="size-4 text-green-600" />
										</div>
										<span className="font-medium">Fiksni iznos</span>
									</button>
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="value">Vrijednost</Label>
								<div className="relative">
									<Input
										id="value"
										type="number"
										step={type === "percentage" ? "1" : "0.01"}
										min="0"
										max={type === "percentage" ? "100" : undefined}
										placeholder={type === "percentage" ? "10" : "5.00"}
										value={value}
										onChange={(e) => setValue(e.target.value)}
										className={`pr-12 ${errors.value ? "border-red-500" : ""}`}
									/>
									<span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
										{type === "percentage" ? "%" : "KM"}
									</span>
								</div>
								{errors.value && (
									<p className="text-sm text-red-500">{errors.value}</p>
								)}
							</div>

							<div className="space-y-2">
								<Label htmlFor="minimumPurchase">Minimalna kupnja (opcionalno)</Label>
								<div className="relative">
									<Input
										id="minimumPurchase"
										type="number"
										step="0.01"
										min="0"
										placeholder="0.00"
										value={minimumPurchase}
										onChange={(e) => setMinimumPurchase(e.target.value)}
									/>
									<span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
										KM
									</span>
								</div>
								<p className="text-sm text-gray-500">
									Popust će biti primjenjiv samo ako je ukupna vrijednost narudžbe
									veća od ovog iznosa
								</p>
							</div>

							{type === "percentage" && (
								<div className="space-y-2">
									<Label htmlFor="maximumDiscount">Maksimalni popust (opcionalno)</Label>
									<div className="relative">
										<Input
											id="maximumDiscount"
											type="number"
											step="0.01"
											min="0"
											placeholder="0.00"
											value={maximumDiscount}
											onChange={(e) => setMaximumDiscount(e.target.value)}
										/>
										<span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
											KM
										</span>
									</div>
									<p className="text-sm text-gray-500">
										Ograničite maksimalni iznos popusta u KM
									</p>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Usage Limit */}
					<Card>
						<CardHeader>
							<CardTitle>Ograničenje korištenja</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="usageLimit">Maksimalni broj korištenja (opcionalno)</Label>
								<Input
									id="usageLimit"
									type="number"
									min="1"
									placeholder="Bez ograničenja"
									value={usageLimit}
									onChange={(e) => setUsageLimit(e.target.value)}
								/>
								<p className="text-sm text-gray-500">
									Ostavite prazno za neograničeno korištenje
								</p>
							</div>
							{isEditing && discount?.usageCount !== undefined && (
								<div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
									<span className="text-sm text-gray-600">Trenutno korišteno</span>
									<span className="font-semibold">{discount.usageCount} puta</span>
								</div>
							)}
						</CardContent>
					</Card>
				</div>

				{/* Sidebar */}
				<div className="space-y-6">
					{/* Status */}
					<Card>
						<CardHeader>
							<CardTitle>Status</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex items-center justify-between">
								<div>
									<Label>Aktivan</Label>
									<p className="text-sm text-gray-500">
										Popust je dostupan za korištenje
									</p>
								</div>
								<Switch checked={active} onCheckedChange={setActive} />
							</div>
						</CardContent>
					</Card>

					{/* Date Range */}
					<Card>
						<CardHeader>
							<CardTitle>Period važenja</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="startsAt">Početak (opcionalno)</Label>
								<Input
									id="startsAt"
									type="datetime-local"
									value={startsAt}
									onChange={(e) => setStartsAt(e.target.value)}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="endsAt">Završetak (opcionalno)</Label>
								<Input
									id="endsAt"
									type="datetime-local"
									value={endsAt}
									onChange={(e) => setEndsAt(e.target.value)}
									className={errors.endsAt ? "border-red-500" : ""}
								/>
								{errors.endsAt && (
									<p className="text-sm text-red-500">{errors.endsAt}</p>
								)}
							</div>
							<p className="text-sm text-gray-500">
								Ostavite prazno za popust bez vremenskog ograničenja
							</p>
						</CardContent>
					</Card>
				</div>
			</div>
		</form>
	);
}
