import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PriceRangeSlider } from "./PriceRangeSlider";
import { SORT_OPTIONS, type SortOption } from "./CollectionSortSelect";
import { X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterMeta {
	priceRange: { min: number; max: number };
	categories: { id: string; name: string; count: number }[];
	options: {
		name: string;
		values: { value: string; count: number }[];
	}[];
	totalProducts: number;
}

interface ActiveFilters {
	sort: SortOption;
	minPrice?: number;
	maxPrice?: number;
	categoryId?: string;
	optionFilters: Record<string, string[]>;
}

interface CollectionFiltersProps {
	filterMeta: FilterMeta;
	activeFilters: ActiveFilters;
	onFilterChange: (filters: Partial<ActiveFilters>) => void;
	onClearFilters: () => void;
	showSort?: boolean;
}

export function CollectionFilters({
	filterMeta,
	activeFilters,
	onFilterChange,
	onClearFilters,
	showSort = true,
}: CollectionFiltersProps) {
	const { priceRange, categories, options } = filterMeta;

	// Count active filters
	const activeFilterCount = [
		activeFilters.minPrice !== undefined || activeFilters.maxPrice !== undefined,
		activeFilters.categoryId,
		...Object.values(activeFilters.optionFilters).map((v) => v.length > 0),
	].filter(Boolean).length;

	const handlePriceChange = (value: [number, number]) => {
		onFilterChange({
			minPrice: value[0] === priceRange.min ? undefined : value[0],
			maxPrice: value[1] === priceRange.max ? undefined : value[1],
		});
	};

	const handleCategoryToggle = (categoryId: string) => {
		onFilterChange({
			categoryId: activeFilters.categoryId === categoryId ? undefined : categoryId,
		});
	};

	const handleOptionToggle = (optionName: string, optionValue: string) => {
		const currentValues = activeFilters.optionFilters[optionName] || [];
		const newValues = currentValues.includes(optionValue)
			? currentValues.filter((v) => v !== optionValue)
			: [...currentValues, optionValue];

		onFilterChange({
			optionFilters: {
				...activeFilters.optionFilters,
				[optionName]: newValues,
			},
		});
	};

	// Determine which accordion items should be open by default
	const defaultOpenItems = ["price"];
	if (categories.length > 0) defaultOpenItems.push("category");
	options.slice(0, 2).forEach((opt) => defaultOpenItems.push(`option-${opt.name}`));

	return (
		<div className="space-y-4">
			{activeFilterCount > 0 && (
				<Button
					variant="outline"
					size="sm"
					onClick={onClearFilters}
					className="w-full justify-center gap-2 text-sm"
				>
					<X className="h-4 w-4" />
					Očisti filtere ({activeFilterCount})
				</Button>
			)}

			<Accordion
				type="multiple"
				defaultValue={defaultOpenItems}
				className="w-full"
			>
				{/* Sort Section */}
				{showSort && (
					<AccordionItem value="sort" className="border-b">
						<AccordionTrigger className="text-sm font-medium py-4 hover:no-underline">
							Sortiranje
						</AccordionTrigger>
						<AccordionContent className="pb-4">
							<RadioGroup
								value={activeFilters.sort}
								onValueChange={(v) => onFilterChange({ sort: v as SortOption })}
								className="space-y-3"
							>
								{SORT_OPTIONS.map((option) => (
									<div key={option.value} className="flex items-center space-x-3">
										<RadioGroupItem
											value={option.value}
											id={`sort-${option.value}`}
											className="border-border"
										/>
										<Label
											htmlFor={`sort-${option.value}`}
											className="text-sm font-normal cursor-pointer text-foreground/80"
										>
											{option.label}
										</Label>
									</div>
								))}
							</RadioGroup>
						</AccordionContent>
					</AccordionItem>
				)}

				{/* Price Range */}
				<AccordionItem value="price" className="border-b">
					<AccordionTrigger className="text-sm font-medium py-4 hover:no-underline">
						<span className="flex items-center gap-2">
							Cijena
							{(activeFilters.minPrice !== undefined || activeFilters.maxPrice !== undefined) && (
								<span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
									{activeFilters.minPrice ?? priceRange.min} - {activeFilters.maxPrice ?? priceRange.max} KM
								</span>
							)}
						</span>
					</AccordionTrigger>
					<AccordionContent className="pt-2 pb-4">
						<PriceRangeSlider
							min={priceRange.min}
							max={priceRange.max}
							value={[
								activeFilters.minPrice ?? priceRange.min,
								activeFilters.maxPrice ?? priceRange.max,
							]}
							onChange={handlePriceChange}
						/>
					</AccordionContent>
				</AccordionItem>

				{/* Categories */}
				{categories.length > 0 && (
					<AccordionItem value="category" className="border-b">
						<AccordionTrigger className="text-sm font-medium py-4 hover:no-underline">
							<span className="flex items-center gap-2">
								Kategorija
								{activeFilters.categoryId && (
									<span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
										1
									</span>
								)}
							</span>
						</AccordionTrigger>
						<AccordionContent className="pb-4">
							<div className="space-y-1">
								{categories.map((category) => {
									const isSelected = activeFilters.categoryId === category.id;
									return (
										<button
											key={category.id}
											onClick={() => handleCategoryToggle(category.id)}
											className={cn(
												"w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors",
												isSelected
													? "bg-primary text-primary-foreground"
													: "hover:bg-muted text-foreground/80"
											)}
										>
											<span>{category.name}</span>
											<span className={cn(
												"text-xs",
												isSelected ? "text-primary-foreground/60" : "text-muted-foreground"
											)}>
												{category.count}
											</span>
										</button>
									);
								})}
							</div>
						</AccordionContent>
					</AccordionItem>
				)}

				{/* Dynamic Options (Size, Color, etc.) */}
				{options.map((option) => {
					const selectedValues = activeFilters.optionFilters[option.name] || [];
					return (
						<AccordionItem key={option.name} value={`option-${option.name}`} className="border-b">
							<AccordionTrigger className="text-sm font-medium py-4 hover:no-underline">
								<span className="flex items-center gap-2">
									{option.name}
									{selectedValues.length > 0 && (
										<span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
											{selectedValues.length}
										</span>
									)}
								</span>
							</AccordionTrigger>
							<AccordionContent className="pb-4">
								<div className="flex flex-wrap gap-2">
									{option.values.map((val) => {
										const isSelected = selectedValues.includes(val.value);
										return (
											<button
												key={val.value}
												onClick={() => handleOptionToggle(option.name, val.value)}
												className={cn(
													"px-3 py-2 text-sm rounded-lg border transition-all flex items-center gap-1.5",
													isSelected
														? "bg-primary text-primary-foreground border-primary"
														: "bg-background hover:bg-muted border-border text-foreground/80"
												)}
											>
												{isSelected && <Check className="size-3.5" />}
												{val.value}
												<span className={cn(
													"text-xs",
													isSelected ? "text-primary-foreground/60" : "text-muted-foreground"
												)}>
													({val.count})
												</span>
											</button>
										);
									})}
								</div>
							</AccordionContent>
						</AccordionItem>
					);
				})}
			</Accordion>
		</div>
	);
}

export type { FilterMeta, ActiveFilters };
