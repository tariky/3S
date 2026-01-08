"use client";

import { useState, useEffect, useMemo } from "react";
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
import { getAllTagsForSelectServerFn } from "@/queries/products";
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
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { ArrowLeft, Plus, Trash2, Loader2, GripVertical, Tag, Package, DollarSign, Boxes, FolderTree, Store } from "lucide-react";
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

// Rule type icons and colors for better visual distinction
const RULE_TYPE_CONFIG: Record<string, { icon: typeof Tag; color: string; bgColor: string }> = {
	price: { icon: DollarSign, color: "text-green-600", bgColor: "bg-green-50" },
	compare_at_price: { icon: DollarSign, color: "text-emerald-600", bgColor: "bg-emerald-50" },
	inventory: { icon: Boxes, color: "text-blue-600", bgColor: "bg-blue-50" },
	category: { icon: FolderTree, color: "text-purple-600", bgColor: "bg-purple-50" },
	vendor: { icon: Store, color: "text-orange-600", bgColor: "bg-orange-50" },
	tag: { icon: Tag, color: "text-pink-600", bgColor: "bg-pink-50" },
	status: { icon: Package, color: "text-gray-600", bgColor: "bg-gray-50" },
};

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

	// Fetch categories, vendors, and tags for rule values
	const { data: categoriesData } = useQuery(getCategoriesQueryOptions());
	const { data: vendorsData } = useQuery(getVendorsQueryOptions());
	const { data: tagsData } = useQuery({
		queryKey: ["tags", "all"],
		queryFn: () => getAllTagsForSelectServerFn({ data: {} }),
	});

	// Memoize options to prevent infinite loops from recreating arrays
	const categoryOptions = useMemo(
		() => (categoriesData ?? []).map((category) => ({ value: category.id, label: category.name })),
		[categoriesData]
	);
	const vendorOptions = useMemo(
		() => (vendorsData ?? []).map((vendor) => ({ value: vendor.id, label: vendor.name })),
		[vendorsData]
	);
	const tagOptions = useMemo(
		() => (tagsData ?? []).map((tag: { id: string; name: string }) => ({ value: tag.id, label: tag.name })),
		[tagsData]
	);

	// Stable references for lookups
	const categories = categoriesData ?? [];
	const vendors = vendorsData ?? [];
	const tags = tagsData ?? [];

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
		onSuccess: (_result, variables) => {
			// Invalidate collection list query
			queryClient.invalidateQueries({ queryKey: [COLLECTIONS_QUERY_KEY], exact: true });
			// Invalidate this specific collection's data
			if (collection?.id) {
				queryClient.invalidateQueries({
					queryKey: [COLLECTIONS_QUERY_KEY, collection.id],
					exact: true
				});
				// Only invalidate products if sort order CHANGED
				// Don't invalidate if sortOrder stayed "manual" (to prevent race with drag-drop)
				const sortOrderChanged = variables.sortOrder !== collection.sortOrder;
				if (sortOrderChanged) {
					queryClient.invalidateQueries({
						queryKey: [COLLECTIONS_QUERY_KEY, collection.id, "products"]
					});
				}
			}
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
				ruleType: "category",
				operator: "equals",
				value: "",
				position: rules.length,
			},
		]);
	};

	const updateRule = (id: string, updates: Partial<CollectionRule>) => {
		setRules((prevRules) =>
			prevRules.map((rule) =>
				rule.id === id ? { ...rule, ...updates } : rule
			)
		);
	};

	const removeRule = (id: string) => {
		setRules(rules.filter((rule) => rule.id !== id));
	};

	// Get available operators for a rule type
	const getOperatorsForType = (ruleType: string) => {
		if (["category", "vendor", "status", "tag"].includes(ruleType)) {
			return {
				equals: "je",
				not_equals: "nije",
			};
		}
		return RULE_OPERATORS;
	};

	// Get display value for a rule
	const getDisplayValue = (rule: CollectionRule): string | null => {
		if (!rule.value) return null;

		switch (rule.ruleType) {
			case "category":
				return categories.find(c => c.id === rule.value)?.name || null;
			case "vendor":
				return vendors.find(v => v.id === rule.value)?.name || null;
			case "tag":
				return tags.find((t: { id: string; name: string }) => t.id === rule.value)?.name || null;
			case "status":
				const statusLabels: Record<string, string> = {
					active: "Aktivan",
					draft: "Nacrt",
					archived: "Arhiviran",
				};
				return statusLabels[rule.value] || null;
			default:
				return rule.value;
		}
	};

	// Render value input based on rule type
	const renderValueInput = (rule: CollectionRule) => {
		switch (rule.ruleType) {
			case "category":
				return (
					<Combobox
						options={categoryOptions}
						value={rule.value}
						onValueChange={(value) => updateRule(rule.id, { value })}
						placeholder="Odaberi kategoriju"
						searchPlaceholder="Pretraži kategorije..."
						emptyText="Nema kategorija."
					/>
				);

			case "vendor":
				return (
					<Combobox
						options={vendorOptions}
						value={rule.value}
						onValueChange={(value) => updateRule(rule.id, { value })}
						placeholder="Odaberi dobavljača"
						searchPlaceholder="Pretraži dobavljače..."
						emptyText="Nema dobavljača."
					/>
				);

			case "tag":
				return (
					<Combobox
						options={tagOptions}
						value={rule.value}
						onValueChange={(value) => updateRule(rule.id, { value })}
						placeholder="Odaberi tag"
						searchPlaceholder="Pretraži tagove..."
						emptyText="Nema tagova."
					/>
				);

			case "status":
				return (
					<Select
						value={rule.value}
						onValueChange={(value) => updateRule(rule.id, { value })}
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
					<div className="relative">
						<Input
							type="number"
							step="0.01"
							min="0"
							value={rule.value}
							onChange={(e) => updateRule(rule.id, { value: e.target.value })}
							placeholder="0.00"
							className="pr-12"
						/>
						<span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
							KM
						</span>
					</div>
				);

			case "inventory":
				return (
					<Input
						type="number"
						min="0"
						value={rule.value}
						onChange={(e) => updateRule(rule.id, { value: e.target.value })}
						placeholder="0"
					/>
				);

			default:
				return (
					<Input
						value={rule.value}
						onChange={(e) => updateRule(rule.id, { value: e.target.value })}
						placeholder="Vrijednost"
					/>
				);
		}
	};

	const getRuleTypeIcon = (ruleType: string) => {
		const config = RULE_TYPE_CONFIG[ruleType];
		if (!config) return null;
		const Icon = config.icon;
		return <Icon className={cn("size-4", config.color)} />;
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
								<div>
									<CardTitle>Pravila za filtriranje</CardTitle>
									<p className="text-sm text-muted-foreground mt-1">
										Definirajte pravila za automatsko uključivanje proizvoda u kolekciju
									</p>
								</div>
								<div className="flex items-center gap-2">
									<span className="text-sm text-muted-foreground">Proizvod mora zadovoljiti:</span>
									<Select
										value={ruleMatch}
										onValueChange={(value: "all" | "any") => setRuleMatch(value)}
									>
										<SelectTrigger className="w-[140px]">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="all">Sva pravila</SelectItem>
											<SelectItem value="any">Bilo koje</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							{rules.length === 0 ? (
								<div className="text-center py-12 border-2 border-dashed rounded-lg">
									<Package className="size-12 mx-auto text-muted-foreground/50 mb-4" />
									<h3 className="font-medium text-gray-900 mb-2">Nema pravila</h3>
									<p className="text-sm text-muted-foreground mb-4">
										Dodajte pravila za automatsko filtriranje proizvoda u ovu kolekciju
									</p>
									<Button type="button" variant="outline" onClick={addRule}>
										<Plus className="size-4 mr-2" />
										Dodaj prvo pravilo
									</Button>
								</div>
							) : (
								<div className="space-y-3">
									{rules.map((rule) => {
										const config = RULE_TYPE_CONFIG[rule.ruleType] || {};
										return (
											<div
												key={rule.id}
												className={cn(
													"flex items-center gap-3 p-4 rounded-lg border transition-colors",
													config.bgColor || "bg-gray-50"
												)}
											>
												<div className="flex items-center gap-2">
													<GripVertical className="size-4 text-gray-400 cursor-grab" />
													<div className={cn(
														"flex items-center justify-center size-8 rounded-full bg-white shadow-sm",
													)}>
														{getRuleTypeIcon(rule.ruleType)}
													</div>
												</div>

												{/* Rule Type */}
												<Select
													value={rule.ruleType}
													onValueChange={(value) => {
														// Reset operator and value when type changes
														const availableOps = getOperatorsForType(value);
														updateRule(rule.id, {
															ruleType: value,
															operator: Object.keys(availableOps)[0],
															value: "",
														});
													}}
												>
													<SelectTrigger className="w-[160px] bg-white">
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{Object.entries(RULE_TYPES).map(([value, label]) => (
															<SelectItem key={value} value={value}>
																<div className="flex items-center gap-2">
																	{getRuleTypeIcon(value)}
																	<span>{label}</span>
																</div>
															</SelectItem>
														))}
													</SelectContent>
												</Select>

												{/* Operator */}
												<Select
													value={rule.operator}
													onValueChange={(value) => updateRule(rule.id, { operator: value })}
												>
													<SelectTrigger className="w-[140px] bg-white">
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
												<div className="flex-1 min-w-[200px]">{renderValueInput(rule)}</div>

												{/* Remove Button */}
												<Button
													type="button"
													variant="ghost"
													size="icon"
													className="shrink-0 hover:bg-red-50 hover:text-red-600"
													onClick={() => removeRule(rule.id)}
												>
													<Trash2 className="size-4" />
												</Button>
											</div>
										);
									})}

									<Button
										type="button"
										variant="outline"
										onClick={addRule}
										className="w-full"
									>
										<Plus className="size-4 mr-2" />
										Dodaj pravilo
									</Button>
								</div>
							)}

							{rules.length > 0 && (
								<div className="pt-4 border-t">
									<div className="flex items-center gap-2 text-sm text-muted-foreground">
										<span>Pregled:</span>
										<span className="font-medium text-foreground">
											Proizvodi gdje{" "}
											{rules.map((rule, index) => {
												const displayValue = getDisplayValue(rule);
												const operators = getOperatorsForType(rule.ruleType);
												const operatorLabel = operators[rule.operator as keyof typeof operators] || rule.operator;
												return (
													<span key={rule.id}>
														{index > 0 && (
															<Badge variant="outline" className="mx-1">
																{ruleMatch === "all" ? "I" : "ILI"}
															</Badge>
														)}
														<Badge variant="secondary" className="mx-1">
															{RULE_TYPES[rule.ruleType as keyof typeof RULE_TYPES]}
														</Badge>
														{operatorLabel}
														{displayValue && (
															<Badge className="mx-1">{displayValue}</Badge>
														)}
													</span>
												);
											})}
										</span>
									</div>
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

					{/* Quick Tips */}
					<Card>
						<CardHeader>
							<CardTitle className="text-sm">Savjeti</CardTitle>
						</CardHeader>
						<CardContent className="text-sm text-muted-foreground space-y-2">
							<p>• Koristite <strong>"Sva pravila"</strong> za strože filtriranje</p>
							<p>• Koristite <strong>"Bilo koje"</strong> za šire filtriranje</p>
							<p>• Proizvodi se automatski ažuriraju kada se promijene pravila</p>
						</CardContent>
					</Card>
				</div>
			</div>
		</form>
	);
}
