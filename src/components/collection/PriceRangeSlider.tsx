import { useState, useEffect, useRef } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PriceRangeSliderProps {
	min: number;
	max: number;
	value: [number, number];
	onChange: (value: [number, number]) => void;
	currency?: string;
	debounceMs?: number;
}

export function PriceRangeSlider({
	min,
	max,
	value,
	onChange,
	currency = "KM",
	debounceMs = 500,
}: PriceRangeSliderProps) {
	const [localValue, setLocalValue] = useState<[number, number]>(value);
	const [minInput, setMinInput] = useState(String(value[0]));
	const [maxInput, setMaxInput] = useState(String(value[1]));
	const debounceRef = useRef<NodeJS.Timeout | null>(null);

	// Sync with external value changes
	useEffect(() => {
		setLocalValue(value);
		setMinInput(String(value[0]));
		setMaxInput(String(value[1]));
	}, [value]);

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (debounceRef.current) {
				clearTimeout(debounceRef.current);
			}
		};
	}, []);

	// Debounced onChange
	const debouncedOnChange = (newValue: [number, number]) => {
		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
		}
		debounceRef.current = setTimeout(() => {
			onChange(newValue);
		}, debounceMs);
	};

	const handleSliderChange = (newValue: number[]) => {
		const typedValue: [number, number] = [newValue[0], newValue[1]];
		setLocalValue(typedValue);
		setMinInput(String(newValue[0]));
		setMaxInput(String(newValue[1]));
		debouncedOnChange(typedValue);
	};

	const handleMinInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const inputValue = e.target.value;
		setMinInput(inputValue);

		const numValue = parseFloat(inputValue);
		if (!isNaN(numValue) && numValue >= min && numValue <= localValue[1]) {
			const newValue: [number, number] = [numValue, localValue[1]];
			setLocalValue(newValue);
			debouncedOnChange(newValue);
		}
	};

	const handleMaxInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const inputValue = e.target.value;
		setMaxInput(inputValue);

		const numValue = parseFloat(inputValue);
		if (!isNaN(numValue) && numValue <= max && numValue >= localValue[0]) {
			const newValue: [number, number] = [localValue[0], numValue];
			setLocalValue(newValue);
			debouncedOnChange(newValue);
		}
	};

	const handleMinBlur = () => {
		const numValue = parseFloat(minInput);
		if (isNaN(numValue) || numValue < min) {
			setMinInput(String(localValue[0]));
		} else if (numValue > localValue[1]) {
			setMinInput(String(localValue[1]));
			const newValue: [number, number] = [localValue[1], localValue[1]];
			setLocalValue(newValue);
			onChange(newValue);
		}
	};

	const handleMaxBlur = () => {
		const numValue = parseFloat(maxInput);
		if (isNaN(numValue) || numValue > max) {
			setMaxInput(String(localValue[1]));
		} else if (numValue < localValue[0]) {
			setMaxInput(String(localValue[0]));
			const newValue: [number, number] = [localValue[0], localValue[0]];
			setLocalValue(newValue);
			onChange(newValue);
		}
	};

	return (
		<div className="space-y-4">
			<Slider
				min={min}
				max={max}
				step={1}
				value={localValue}
				onValueChange={handleSliderChange}
				className="w-full"
			/>
			<div className="flex items-center gap-3">
				<div className="flex-1">
					<Label className="sr-only">Min cijena</Label>
					<div className="relative">
						<Input
							type="number"
							value={minInput}
							onChange={handleMinInputChange}
							onBlur={handleMinBlur}
							min={min}
							max={max}
							className="pr-10 text-sm"
						/>
						<span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
							{currency}
						</span>
					</div>
				</div>
				<span className="text-muted-foreground">—</span>
				<div className="flex-1">
					<Label className="sr-only">Max cijena</Label>
					<div className="relative">
						<Input
							type="number"
							value={maxInput}
							onChange={handleMaxInputChange}
							onBlur={handleMaxBlur}
							min={min}
							max={max}
							className="pr-10 text-sm"
						/>
						<span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
							{currency}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
