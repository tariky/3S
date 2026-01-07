"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createCollectionServerFn,
	updateCollectionServerFn,
	COLLECTIONS_QUERY_KEY,
	RULE_TYPES,
	RULE_OPERATORS,
} from "@/queries/collections";
import { getCategoriesQueryOptions } from "@/queries/categories";
import { getVendorsQueryOptions } from "@/queries/vendors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, Loader2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { nanoid } from "nanoid";

interface CollectionRule {
	id: string;
	ruleType: string;
	operator: string;
	value: string;
	position: number;
}

interface CollectionData {
	id?: string;
	name: string;
	slug: string;
	description?: string | null;
	image?: string | null;
	ruleMatch: "all" | "any";
	sortOrder: string;
	active: boolean;
	seoTitle?: string | null;
	seoDescription?: string | null;
	rules: CollectionRule[];
}

interface CollectionEditorProps {
	collection?: CollectionData;
	isEditing?: boolean;
}

const SORT_OPTIONS = [
	{ value: "manual", label: "Ručno" },
	{ value: "best-selling", label: "Najprodavanije" },
	{ value: "alphabetical-asc", label: "Abecedno (A-Z)" },
	{ value: "alphabetical-desc", label: "Abecedno (Z-A)" },
	{ value: "price-asc", label: "Cijena (rastući)" },
	{ value: "price-desc", label: "Cijena (opadajući)" },
	{ value: "created-asc", label: "Datum kreiranja (starije prvo)" },
	{ value: "created-desc", label: "Datum kreiranja (novije prvo)" },
];

export function CollectionEditor({ collection, isEditing = false }: CollectionEditorProps) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	// Form state
	const [name, setName] = useState(collection?.name || "");
	const [slug, setSlug] = useState(collection?.slug || "");
	const [description, setDescription] = useState(collection?.description || "");
	const [ruleMatch, setRuleMatch] = useState<"all" | "any">(collection?.ruleMatch || "all");
	const [sortOrder, setSortOrder] = useState(collection?.sortOrder || "manual");
	const [active, setActive] = useState(collection?.active ?? true);
	const [rules, setRules] = useState<CollectionRule[]>(
		collection?.rules || []
	);

	// Fetch categories and vendors for rule values
	const { data: categories = [] } = useQuery(getCategoriesQueryOptions());
	const { data: vendors = [] } = useQuery(getVendorsQueryOptions());

	// Auto-generate slug from name
	useEffect(() => {
		if (!isEditing && name) {
			const generatedSlug = name
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/^-+|-+$/g, "");
			setSlug(generatedSlug);
		}
	}, [name, isEditing]);

	// Mutations
	const createMutation = useMutation({
		mutationFn: async (data: any) => {
			return await createCollectionServerFn({ data });
		},
		onSuccess: (result) => {
			queryClient.invalidateQueries({ queryKey: [COLLECTIONS_QUERY_KEY] });
			navigate({ to: "/admin/collections/$collectionId", params: { collectionId: result.id } });
		},
	});

	const updateMutation = useMutation({
		mutationFn: async (data: any) => {
			return await updateCollectionServerFn({ data });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [COLLECTIONS_QUERY_KEY] });
		},
	});

	const isLoading = createMutation.isPending || updateMutation.isPending;

	// Handle form submission
	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		const data = {
			name,
			slug,
			description: description || undefined,
			ruleMatch,
			sortOrder,
			active,
			rules: rules.map((rule, index) => ({
				...rule,
				position: index,
			})),
		};

		if (isEditing && collection?.id) {
			updateMutation.mutate({ ...data, collectionId: collection.id });
		} else {
			createMutation.mutate(data);
		}
	};

	// Rule management
	const addRule = () => {
		setRules([
			...rules,
			{
				id: nanoid(),
				ruleType: "price",
				operator: "greater_than",
				value: "",
				position: rules.length,
			},
		]);
	};

	const updateRule = (id: string, field: string, value: string) => {
		setRules(
			rules.map((rule) =>
				rule.id === id ? { ...rule, [field]: value } : rule
			)
		);
	};

	const removeRule = (id: string) => {
		setRules(rules.filter((rule) => rule.id !== id));
	};

	// Get available operators for a rule type
	const getOperatorsForType = (ruleType: string) => {
		if (["category", "vendor", "status"].includes(ruleType)) {
			return {
				equals: "jednako",
				not_equals: "nije jednako",
			};
		}
		return RULE_OPERATORS;
	};

	// Render value input based on rule type
	const renderValueInput = (rule: CollectionRule) => {
		switch (rule.ruleType) {
			case "category":
				return (
					<Select
						value={rule.value}
						onValueChange={(value) => updateRule(rule.id, "value", value)}
					>
						<SelectTrigger>
							<SelectValue placeholder="Odaberi kategoriju" />
						</SelectTrigger>
						<SelectContent>
							{categories.map((category) => (
								<SelectItem key={category.id} value={category.id}>
									{category.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				);

			case "vendor":
				return (
					<Select
						value={rule.value}
						onValueChange={(value) => updateRule(rule.id, "value", value)}
					>
						<SelectTrigger>
							<SelectValue placeholder="Odaberi dobavljača" />
						</SelectTrigger>
						<SelectContent>
							{vendors.map((vendor) => (
								<SelectItem key={vendor.id} value={vendor.id}>
									{vendor.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				);

			case "status":
				return (
					<Select
						value={rule.value}
						onValueChange={(value) => updateRule(rule.id, "value", value)}
					>
						<SelectTrigger>
							<SelectValue placeholder="Odaberi status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="active">Aktivan</SelectItem>
							<SelectItem value="draft">Nacrt</SelectItem>
							<SelectItem value="archived">Arhiviran</SelectItem>
						</SelectContent>
					</Select>
				);

			case "price":
			case "compare_at_price":
				return (
					<div className="flex items-center gap-2">
						<Input
							type="number"
							step="0.01"
							min="0"
							value={rule.value}
							onChange={(e) => updateRule(rule.id, "value", e.target.value)}
							placeholder="0.00"
						/>
						<span className="text-sm text-gray-500">KM</span>
					</div>
				);

			case "inventory":
				return (
					<Input
						type="number"
						min="0"
						value={rule.value}
						onChange={(e) => updateRule(rule.id, "value", e.target.value)}
						placeholder="0"
					/>
				);

			default:
				return (
					<Input
						value={rule.value}
						onChange={(e) => updateRule(rule.id, "value", e.target.value)}
						placeholder="Vrijednost"
					/>
				);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4">
					<Button
						type="button"
						variant="ghost"
						onClick={() => navigate({ to: "/admin/collections" })}
					>
						<ArrowLeft className="size-4 mr-2" />
						Nazad
					</Button>
					<h1 className="text-2xl font-bold text-gray-900">
						{isEditing ? "Uredi kolekciju" : "Nova kolekcija"}
					</h1>
				</div>
				<Button type="submit" disabled={isLoading || !name || !slug}>
					{isLoading ? (
						<Loader2 className="size-4 mr-2 animate-spin" />
					) : null}
					{isEditing ? "Sačuvaj" : "Kreiraj"}
				</Button>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Main Content */}
				<div className="lg:col-span-2 space-y-6">
					{/* Basic Info */}
					<Card>
						<CardHeader>
							<CardTitle>Osnovne informacije</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="name">Naziv *</Label>
								<Input
									id="name"
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="Npr. Zimska kolekcija"
									required
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="slug">URL slug *</Label>
								<div className="flex items-center gap-2">
									<span className="text-sm text-gray-500">/collections/</span>
									<Input
										id="slug"
										value={slug}
										onChange={(e) => setSlug(e.target.value)}
										placeholder="zimska-kolekcija"
										required
									/>
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="description">Opis</Label>
								<Textarea
									id="description"
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									placeholder="Opis kolekcije..."
									rows={3}
								/>
							</div>
						</CardContent>
					</Card>

					{/* Rules */}
					<Card>
						<CardHeader>
							<div className="flex items-center justify-between">
								<CardTitle>Pravila</CardTitle>
								<div className="flex items-center gap-4">
									<div className="flex items-center gap-2 text-sm">
										<span className="text-gray-600">Proizvod mora zadovoljiti:</span>
										<Select
											value={ruleMatch}
											onValueChange={(value: "all" | "any") => setRuleMatch(value)}
										>
											<SelectTrigger className="w-[180px]">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="all">Sva pravila (I)</SelectItem>
												<SelectItem value="any">Bilo koje pravilo (ILI)</SelectItem>
											</SelectContent>
										</Select>
									</div>
								</div>
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							{rules.length === 0 ? (
								<div className="text-center py-8 text-gray-500">
									<p className="mb-4">Nema pravila. Dodajte pravila za automatsko filtriranje proizvoda.</p>
								</div>
							) : (
								<div className="space-y-3">
									{rules.map((rule, index) => (
										<div
											key={rule.id}
											className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg"
										>
											<GripVertical className="size-4 text-gray-400 cursor-grab" />
											
											{/* Rule Type */}
											<Select
												value={rule.ruleType}
												onValueChange={(value) => {
													updateRule(rule.id, "ruleType", value);
													// Reset operator and value when type changes
													const availableOps = getOperatorsForType(value);
													updateRule(rule.id, "operator", Object.keys(availableOps)[0]);
													updateRule(rule.id, "value", "");
												}}
											>
												<SelectTrigger className="w-[160px]">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{Object.entries(RULE_TYPES).map(([value, label]) => (
														<SelectItem key={value} value={value}>
															{label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>

											{/* Operator */}
											<Select
												value={rule.operator}
												onValueChange={(value) => updateRule(rule.id, "operator", value)}
											>
												<SelectTrigger className="w-[180px]">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{Object.entries(getOperatorsForType(rule.ruleType)).map(
														([value, label]) => (
															<SelectItem key={value} value={value}>
																{label}
															</SelectItem>
														)
													)}
												</SelectContent>
											</Select>

											{/* Value */}
											<div className="flex-1">{renderValueInput(rule)}</div>

											{/* Remove Button */}
											<Button
												type="button"
												variant="ghost"
												size="icon"
												onClick={() => removeRule(rule.id)}
											>
												<Trash2 className="size-4 text-red-500" />
											</Button>
										</div>
									))}
								</div>
							)}

							<Button
								type="button"
								variant="outline"
								onClick={addRule}
								className="w-full"
							>
								<Plus className="size-4 mr-2" />
								Dodaj pravilo
							</Button>
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
								<Label htmlFor="active">Aktivna kolekcija</Label>
								<Switch
									id="active"
									checked={active}
									onCheckedChange={setActive}
								/>
							</div>
							<p className="text-sm text-gray-500 mt-2">
								Neaktivne kolekcije nisu vidljive na frontendu
							</p>
						</CardContent>
					</Card>

					{/* Sort Order */}
					<Card>
						<CardHeader>
							<CardTitle>Sortiranje proizvoda</CardTitle>
						</CardHeader>
						<CardContent>
							<Select value={sortOrder} onValueChange={setSortOrder}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{SORT_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value}>
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<p className="text-sm text-gray-500 mt-2">
								Odaberite kako će proizvodi biti sortirani u kolekciji
							</p>
						</CardContent>
					</Card>
				</div>
			</div>
		</form>
	);
}

