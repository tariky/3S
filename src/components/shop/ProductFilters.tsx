"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery } from "@tanstack/react-query";
import { getShopCategoriesQueryOptions } from "@/queries/shop-products";
import { cn } from "@/lib/utils";

interface ProductFiltersProps {
	search: string;
	onSearchChange: (value: string) => void;
	categoryId: string;
	onCategoryChange: (value: string) => void;
	minPrice: string;
	onMinPriceChange: (value: string) => void;
	maxPrice: string;
	onMaxPriceChange: (value: string) => void;
	sizes: string[];
	onSizesChange: (sizes: string[]) => void;
	colors: string[];
	onColorsChange: (colors: string[]) => void;
	onReset: () => void;
	availableSizes?: string[];
	availableColors?: string[];
}

export function ProductFilters({
	search,
	onSearchChange,
	categoryId,
	onCategoryChange,
	minPrice,
	onMinPriceChange,
	maxPrice,
	onMaxPriceChange,
	sizes,
	onSizesChange,
	colors,
	onColorsChange,
	onReset,
	availableSizes = [],
	availableColors = [],
}: ProductFiltersProps) {
	const [isMobileOpen, setIsMobileOpen] = React.useState(false);
	const { data: categories = [] } = useQuery(getShopCategoriesQueryOptions());

	const hasActiveFilters =
		search ||
		categoryId ||
		minPrice ||
		maxPrice ||
		sizes.length > 0 ||
		colors.length > 0;

	const handleSizeToggle = (size: string) => {
		if (sizes.includes(size)) {
			onSizesChange(sizes.filter((s) => s !== size));
		} else {
			onSizesChange([...sizes, size]);
		}
	};

	const handleColorToggle = (color: string) => {
		if (colors.includes(color)) {
			onColorsChange(colors.filter((c) => c !== color));
		} else {
			onColorsChange([...colors, color]);
		}
	};

	return (
		<>
			{/* Mobile Filter Button */}
			<div className="md:hidden mb-4">
				<Button
					variant="outline"
					onClick={() => setIsMobileOpen(true)}
					className="w-full"
				>
					Filtriraj
					{hasActiveFilters && (
						<span className="ml-2 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs">
							{sizes.length + colors.length + (categoryId ? 1 : 0) + (minPrice || maxPrice ? 1 : 0)}
						</span>
					)}
				</Button>
			</div>

			{/* Mobile Filter Overlay */}
			{isMobileOpen && (
				<div className="fixed inset-0 bg-black/50 z-50 md:hidden">
					<div className="bg-white h-full w-80 overflow-y-auto p-4">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-lg font-semibold">Filtriraj</h2>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => setIsMobileOpen(false)}
							>
								<X className="size-4" />
							</Button>
						</div>
						<FilterContent
							search={search}
							onSearchChange={onSearchChange}
							categoryId={categoryId}
							onCategoryChange={onCategoryChange}
							categories={categories}
							minPrice={minPrice}
							onMinPriceChange={onMinPriceChange}
							maxPrice={maxPrice}
							onMaxPriceChange={onMaxPriceChange}
							sizes={sizes}
							onSizesChange={handleSizeToggle}
							colors={colors}
							onColorsChange={handleColorToggle}
							onReset={onReset}
							availableSizes={availableSizes}
							availableColors={availableColors}
						/>
						<Button
							className="w-full mt-4"
							onClick={() => setIsMobileOpen(false)}
						>
							Primijeni filtere
						</Button>
					</div>
				</div>
			)}

			{/* Desktop Filters */}
			<div className="hidden md:block">
				<FilterContent
					search={search}
					onSearchChange={onSearchChange}
					categoryId={categoryId}
					onCategoryChange={onCategoryChange}
					categories={categories}
					minPrice={minPrice}
					onMinPriceChange={onMinPriceChange}
					maxPrice={maxPrice}
					onMaxPriceChange={onMaxPriceChange}
					sizes={sizes}
					onSizesChange={handleSizeToggle}
					colors={colors}
					onColorsChange={handleColorToggle}
					onReset={onReset}
					availableSizes={availableSizes}
					availableColors={availableColors}
				/>
			</div>
		</>
	);
}

function FilterContent({
	search,
	onSearchChange,
	categoryId,
	onCategoryChange,
	categories,
	minPrice,
	onMinPriceChange,
	maxPrice,
	onMaxPriceChange,
	sizes,
	onSizesChange,
	colors,
	onColorsChange,
	onReset,
	availableSizes = [],
	availableColors = [],
}: {
	search: string;
	onSearchChange: (value: string) => void;
	categoryId: string;
	onCategoryChange: (value: string) => void;
	categories: Array<{ id: string; name: string }>;
	minPrice: string;
	onMinPriceChange: (value: string) => void;
	maxPrice: string;
	onMaxPriceChange: (value: string) => void;
	sizes: string[];
	onSizesChange: (size: string) => void;
	colors: string[];
	onColorsChange: (color: string) => void;
	onReset: () => void;
	availableSizes?: string[];
	availableColors?: string[];
}) {
	return (
		<div className="space-y-6">
			{/* Search */}
			<div>
				<Label htmlFor="search">Pretraga</Label>
				<Input
					id="search"
					placeholder="Pretraži proizvode..."
					value={search}
					onChange={(e) => onSearchChange(e.target.value)}
				/>
			</div>

			{/* Category */}
			<div>
				<Label htmlFor="category">Kategorija</Label>
				<Select value={categoryId || "all"} onValueChange={(value) => onCategoryChange(value === "all" ? "" : value)}>
					<SelectTrigger id="category">
						<SelectValue placeholder="Sve kategorije" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Sve kategorije</SelectItem>
						{categories.map((cat) => (
							<SelectItem key={cat.id} value={cat.id}>
								{cat.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Price Range */}
			<div>
				<Label>Cijena</Label>
				<div className="flex gap-2 mt-2">
					<Input
						type="number"
						placeholder="Min"
						value={minPrice}
						onChange={(e) => onMinPriceChange(e.target.value)}
					/>
					<Input
						type="number"
						placeholder="Max"
						value={maxPrice}
						onChange={(e) => onMaxPriceChange(e.target.value)}
					/>
				</div>
			</div>

			{/* Sizes */}
			{availableSizes.length > 0 && (
				<div>
					<Label>Veličina</Label>
					<div className="flex flex-wrap gap-2 mt-2">
						{availableSizes.map((size) => (
							<label
								key={size}
								className="flex items-center gap-2 cursor-pointer"
							>
								<Checkbox
									checked={sizes.includes(size)}
									onCheckedChange={() => onSizesChange(size)}
								/>
								<span className="text-sm">{size}</span>
							</label>
						))}
					</div>
				</div>
			)}

			{/* Colors */}
			{availableColors.length > 0 && (
				<div>
					<Label>Boja</Label>
					<div className="flex flex-wrap gap-2 mt-2">
						{availableColors.map((color) => (
							<label
								key={color}
								className="flex items-center gap-2 cursor-pointer"
							>
								<Checkbox
									checked={colors.includes(color)}
									onCheckedChange={() => onColorsChange(color)}
								/>
								<span className="text-sm">{color}</span>
							</label>
						))}
					</div>
				</div>
			)}

			{/* Reset Button */}
			<Button variant="outline" onClick={onReset} className="w-full">
				Resetuj filtere
			</Button>
		</div>
	);
}

