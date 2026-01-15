import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

export type SortOption = "default" | "price-asc" | "price-desc" | "name-asc" | "name-desc" | "newest";

interface CollectionSortSelectProps {
	value: SortOption;
	onChange: (value: SortOption) => void;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
	{ value: "default", label: "Preporučeno" },
	{ value: "price-asc", label: "Cijena: Niža → Viša" },
	{ value: "price-desc", label: "Cijena: Viša → Niža" },
	{ value: "name-asc", label: "Naziv: A → Z" },
	{ value: "name-desc", label: "Naziv: Z → A" },
	{ value: "newest", label: "Najnovije" },
];

export function CollectionSortSelect({ value, onChange }: CollectionSortSelectProps) {
	return (
		<Select value={value} onValueChange={(v) => onChange(v as SortOption)}>
			<SelectTrigger className="w-[180px]">
				<SelectValue placeholder="Sortiraj" />
			</SelectTrigger>
			<SelectContent>
				{SORT_OPTIONS.map((option) => (
					<SelectItem key={option.value} value={option.value}>
						{option.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

export { SORT_OPTIONS };
