"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import zipList from "@/data/ziplist";

// Normalize string by removing diacritics (š→s, ž→z, ć→c, č→c, đ→d, etc.)
function normalizeString(str: string): string {
	return str
		.toLowerCase()
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		// Handle specific characters that normalize() doesn't catch
		.replace(/đ/g, "d")
		.replace(/Đ/g, "d");
}

// Fuzzy search function - returns a score (higher = better match)
function fuzzyMatch(text: string, query: string): number {
	const textNorm = normalizeString(text);
	const queryNorm = normalizeString(query);

	// Exact match gets highest score
	if (textNorm === queryNorm) return 1000;

	// Starts with query gets high score
	if (textNorm.startsWith(queryNorm)) return 500 + (queryNorm.length / textNorm.length) * 100;

	// Contains query as substring
	if (textNorm.includes(queryNorm)) return 200 + (queryNorm.length / textNorm.length) * 100;

	// Fuzzy character matching
	let queryIndex = 0;
	let score = 0;
	let consecutiveBonus = 0;

	for (let i = 0; i < textNorm.length && queryIndex < queryNorm.length; i++) {
		if (textNorm[i] === queryNorm[queryIndex]) {
			score += 10 + consecutiveBonus;
			consecutiveBonus += 5; // Bonus for consecutive matches
			queryIndex++;
		} else {
			consecutiveBonus = 0;
		}
	}

	// All characters must be found
	if (queryIndex < queryNorm.length) return 0;

	return score;
}

interface CityComboboxProps {
	value: string;
	onCityChange: (city: string) => void;
	onZipChange: (zip: string) => void;
	placeholder?: string;
	disabled?: boolean;
	error?: boolean;
	className?: string;
}

export function CityCombobox({
	value,
	onCityChange,
	onZipChange,
	placeholder = "Odaberi grad...",
	disabled = false,
	error = false,
	className,
}: CityComboboxProps) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [highlightedIndex, setHighlightedIndex] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);

	// Filter and sort cities based on fuzzy search
	const filteredCities = search
		? zipList
				.map((city) => ({ city, score: fuzzyMatch(city.label, search) }))
				.filter(({ score }) => score > 0)
				.sort((a, b) => b.score - a.score)
				.map(({ city }) => city)
		: zipList;

	// Limit displayed cities for performance
	const displayedCities = filteredCities.slice(0, 100);

	// Find selected city from value
	const selectedCity = zipList.find((city) => {
		const cityName = city.label.split(" - ")[0];
		return cityName.toLowerCase() === value.toLowerCase();
	});

	// Reset highlighted index when search changes
	useEffect(() => {
		setHighlightedIndex(0);
	}, [search]);

	// Focus input when popover opens
	useEffect(() => {
		if (open && inputRef.current) {
			setTimeout(() => inputRef.current?.focus(), 0);
		}
		if (!open) {
			setHighlightedIndex(0);
		}
	}, [open]);

	// Scroll highlighted item into view
	useEffect(() => {
		if (open && listRef.current) {
			const highlightedElement = listRef.current.querySelector(
				`[data-index="${highlightedIndex}"]`
			);
			if (highlightedElement) {
				highlightedElement.scrollIntoView({ block: "nearest" });
			}
		}
	}, [highlightedIndex, open]);

	const handleSelect = useCallback((city: (typeof zipList)[0]) => {
		const cityName = city.label.split(" - ")[0];
		onCityChange(cityName);
		onZipChange(city.value);
		setOpen(false);
		setSearch("");
	}, [onCityChange, onZipChange]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (!open) return;

			switch (e.key) {
				case "ArrowDown":
					e.preventDefault();
					setHighlightedIndex((prev) =>
						prev < displayedCities.length - 1 ? prev + 1 : prev
					);
					break;
				case "ArrowUp":
					e.preventDefault();
					setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
					break;
				case "Enter":
					e.preventDefault();
					if (displayedCities[highlightedIndex]) {
						handleSelect(displayedCities[highlightedIndex]);
					}
					break;
				case "Escape":
					e.preventDefault();
					setOpen(false);
					break;
			}
		},
		[open, displayedCities, highlightedIndex, handleSelect]
	);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					disabled={disabled}
					className={cn(
						"w-full justify-between font-normal",
						!value && "text-muted-foreground",
						error && "border-destructive focus:ring-destructive",
						className
					)}
				>
					<span className="flex items-center gap-2 truncate">
						{selectedCity ? (
							<>
								<MapPin className="size-4 text-muted-foreground flex-shrink-0" />
								<span className="truncate">{selectedCity.label}</span>
							</>
						) : (
							placeholder
						)}
					</span>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
				<div className="flex flex-col">
					{/* Search Input */}
					<div className="flex items-center border-b px-3">
						<input
							ref={inputRef}
							type="text"
							placeholder="Pretraži grad..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							onKeyDown={handleKeyDown}
							className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
						/>
					</div>

					{/* City List */}
					<div ref={listRef} className="max-h-[300px] overflow-y-auto">
						{displayedCities.length === 0 ? (
							<div className="py-6 text-center text-sm text-muted-foreground">
								Nema pronađenih gradova.
							</div>
						) : (
							<div className="p-1">
								{displayedCities.map((city, index) => {
									const cityName = city.label.split(" - ")[0];
									const isSelected = value.toLowerCase() === cityName.toLowerCase();
									const isHighlighted = index === highlightedIndex;

									return (
										<button
											key={city.value + city.label}
											data-index={index}
											onClick={() => handleSelect(city)}
											onMouseEnter={() => setHighlightedIndex(index)}
											className={cn(
												"relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 px-2 text-sm outline-none transition-colors",
												isSelected && "text-primary",
												isHighlighted
													? "bg-accent text-accent-foreground"
													: "hover:bg-accent hover:text-accent-foreground"
											)}
										>
											<Check
												className={cn(
													"mr-2 h-4 w-4 flex-shrink-0",
													isSelected ? "opacity-100" : "opacity-0"
												)}
											/>
											<span className="truncate">{city.label}</span>
										</button>
									);
								})}
								{filteredCities.length > 100 && (
									<div className="py-2 text-center text-xs text-muted-foreground">
										Prikazano prvih 100 rezultata. Nastavite sa pretragom...
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
