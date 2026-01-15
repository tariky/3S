import { useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { CollectionFilters, type FilterMeta, type ActiveFilters } from "./CollectionFilters";

interface CollectionFilterSheetProps {
	filterMeta: FilterMeta;
	activeFilters: ActiveFilters;
	onFilterChange: (filters: Partial<ActiveFilters>) => void;
	onClearFilters: () => void;
	defaultSort?: string;
}

export function CollectionFilterSheet({
	filterMeta,
	activeFilters,
	onFilterChange,
	onClearFilters,
	defaultSort = "default",
}: CollectionFilterSheetProps) {
	const [open, setOpen] = useState(false);
	const [pendingFilters, setPendingFilters] = useState<ActiveFilters>(activeFilters);

	// Count active filters (sort is active if different from collection default)
	const activeFilterCount = [
		activeFilters.sort !== defaultSort,
		activeFilters.minPrice !== undefined || activeFilters.maxPrice !== undefined,
		activeFilters.categoryId,
		...Object.values(activeFilters.optionFilters).map((v) => v.length > 0),
	].filter(Boolean).length;

	const handleOpenChange = (isOpen: boolean) => {
		if (isOpen) {
			setPendingFilters(activeFilters);
		}
		setOpen(isOpen);
	};

	const handlePendingFilterChange = (filters: Partial<ActiveFilters>) => {
		setPendingFilters((prev) => ({
			...prev,
			...filters,
			optionFilters: filters.optionFilters
				? { ...prev.optionFilters, ...filters.optionFilters }
				: prev.optionFilters,
		}));
	};

	const handleApply = () => {
		onFilterChange(pendingFilters);
		setOpen(false);
	};

	const handleClear = () => {
		const clearedFilters: ActiveFilters = {
			sort: defaultSort as ActiveFilters["sort"],
			minPrice: undefined,
			maxPrice: undefined,
			categoryId: undefined,
			optionFilters: {},
		};
		setPendingFilters(clearedFilters);
		onClearFilters();
		setOpen(false);
	};

	return (
		<Sheet open={open} onOpenChange={handleOpenChange}>
			<SheetTrigger asChild>
				<Button variant="outline" size="sm" className="gap-2">
					<SlidersHorizontal className="h-4 w-4" />
					Filteri
					{activeFilterCount > 0 && (
						<span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
							{activeFilterCount}
						</span>
					)}
				</Button>
			</SheetTrigger>
			<SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
				<SheetHeader className="px-4 py-4 border-b">
					<SheetTitle>Filteri i sortiranje</SheetTitle>
				</SheetHeader>
				<div className="flex-1 overflow-auto px-4 py-4">
					<CollectionFilters
						filterMeta={filterMeta}
						activeFilters={pendingFilters}
						onFilterChange={handlePendingFilterChange}
						onClearFilters={handleClear}
						showSort={true}
					/>
				</div>
				<div className="flex gap-3 border-t p-4 bg-background">
					<Button
						variant="outline"
						onClick={handleClear}
						className="flex-1"
					>
						Očisti
					</Button>
					<Button onClick={handleApply} className="flex-1">
						Primijeni
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	);
}
