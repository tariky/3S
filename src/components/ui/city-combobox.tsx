"use client";

import { useState, useEffect, useRef } from "react";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import zipList from "@/data/ziplist";

interface CityComboboxProps {
	value: string;
	onCityChange: (city: string) => void;
	onZipChange: (zip: string) => void;
	placeholder?: string;
	disabled?: boolean;
	error?: boolean;
}

export function CityCombobox({
	value,
	onCityChange,
	onZipChange,
	placeholder = "Odaberi grad...",
	disabled = false,
	error = false,
}: CityComboboxProps) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	// Filter cities based on search
	const filteredCities = zipList.filter((city) =>
		city.label.toLowerCase().includes(search.toLowerCase())
	);

	// Find selected city from value
	const selectedCity = zipList.find((city) => {
		const cityName = city.label.split(" - ")[0];
		return cityName.toLowerCase() === value.toLowerCase();
	});

	// Focus input when popover opens
	useEffect(() => {
		if (open && inputRef.current) {
			setTimeout(() => inputRef.current?.focus(), 0);
		}
	}, [open]);

	const handleSelect = (city: (typeof zipList)[0]) => {
		const cityName = city.label.split(" - ")[0];
		onCityChange(cityName);
		onZipChange(city.value);
		setOpen(false);
		setSearch("");
	};

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					disabled={disabled}
					className={cn(
						"w-full justify-between font-normal h-10",
						!value && "text-muted-foreground",
						error && "border-red-500 focus:ring-red-500"
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
							className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
						/>
					</div>

					{/* City List */}
					<div className="max-h-[300px] overflow-y-auto">
						{filteredCities.length === 0 ? (
							<div className="py-6 text-center text-sm text-muted-foreground">
								Nema pronađenih gradova.
							</div>
						) : (
							<div className="p-1">
								{filteredCities.slice(0, 100).map((city) => {
									const cityName = city.label.split(" - ")[0];
									const isSelected = value.toLowerCase() === cityName.toLowerCase();

									return (
										<button
											key={city.value + city.label}
											onClick={() => handleSelect(city)}
											className={cn(
												"relative flex w-full cursor-pointer select-none items-center rounded-sm py-2 px-2 text-sm outline-none transition-colors",
												isSelected
													? "bg-primary/10 text-primary"
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
