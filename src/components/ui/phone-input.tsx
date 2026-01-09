"use client";

import {
	PhoneInput as ReactPhoneInput,
	defaultCountries,
	parseCountry,
} from "react-international-phone";
import "react-international-phone/style.css";
import { cn } from "@/lib/utils";

// Filter countries to prioritize Bosnia and neighboring countries
const countries = defaultCountries.filter((country) => {
	const { iso2 } = parseCountry(country);
	return ["ba", "hr", "rs", "me", "si", "at", "de"].includes(iso2);
}).concat(
	defaultCountries.filter((country) => {
		const { iso2 } = parseCountry(country);
		return !["ba", "hr", "rs", "me", "si", "at", "de"].includes(iso2);
	})
);

interface PhoneInputProps {
	value: string;
	onChange: (phone: string) => void;
	disabled?: boolean;
	error?: boolean;
	placeholder?: string;
}

export function PhoneInput({
	value,
	onChange,
	disabled = false,
	error = false,
	placeholder = "61 123 456",
}: PhoneInputProps) {
	return (
		<ReactPhoneInput
			defaultCountry="ba"
			value={value}
			onChange={onChange}
			disabled={disabled}
			placeholder={placeholder}
			countries={countries}
			inputClassName={cn(
				"!h-11 !w-full !min-w-0 !rounded-md !rounded-l-none !border !border-l-0 !border-input !bg-transparent !px-3 !py-1 !text-base !shadow-xs !outline-none !transition-[color,box-shadow] placeholder:!text-muted-foreground disabled:!pointer-events-none disabled:!cursor-not-allowed disabled:!opacity-50 md:!text-sm",
				"focus:!border-ring focus:!ring-ring/50 focus:!ring-[3px]",
				error && "!border-red-500 focus:!border-red-500 focus:!ring-red-500/20"
			)}
			countrySelectorStyleProps={{
				buttonClassName: cn(
					"!h-11 !px-3 !border !border-input !border-r-0 !rounded-md !rounded-r-none !bg-transparent !shadow-xs !outline-none !transition-[color,box-shadow] hover:!bg-accent",
					"focus:!border-ring focus:!ring-ring/50 focus:!ring-[3px] focus:!z-10",
					error && "!border-red-500",
					disabled && "!pointer-events-none !cursor-not-allowed !opacity-50"
				),
				dropdownStyleProps: {
					className: "!z-50 !max-h-[280px] !overflow-y-auto !rounded-md !border !border-input !bg-background !shadow-lg !mt-1",
					listItemClassName: "!px-3 !py-2 !text-sm hover:!bg-accent !cursor-pointer",
				},
			}}
		/>
	);
}
