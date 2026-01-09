"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

// Common icons for alerts and notifications
export const ALERT_ICONS = [
	"Bell",
	"BellRing",
	"AlertCircle",
	"AlertTriangle",
	"Info",
	"Tag",
	"Percent",
	"Gift",
	"Truck",
	"Package",
	"Star",
	"Heart",
	"Sparkles",
	"Zap",
	"Flame",
	"Clock",
	"Calendar",
	"ShoppingCart",
	"CreditCard",
	"Check",
	"X",
	"ExternalLink",
	"ArrowRight",
	"Megaphone",
	"PartyPopper",
	"Ticket",
	"BadgePercent",
	"CircleDollarSign",
	"ShoppingBag",
	"Store",
] as const;

// Get icon component by name
function getIconComponent(name: string): React.ComponentType<{ className?: string }> | null {
	const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
	return icons[name] || null;
}

interface IconPickerProps {
	value: string;
	onChange: (value: string) => void;
	icons?: readonly string[];
	placeholder?: string;
	searchPlaceholder?: string;
	emptyText?: string;
	className?: string;
}

export function IconPicker({
	value,
	onChange,
	icons = ALERT_ICONS,
	placeholder = "Odaberi ikonu",
	searchPlaceholder = "Pretraži ikone...",
	emptyText = "Ikona nije pronađena.",
	className,
}: IconPickerProps) {
	const [open, setOpen] = React.useState(false);

	const SelectedIcon = getIconComponent(value);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className={cn("w-full justify-between", className)}
				>
					<div className="flex items-center gap-2">
						{SelectedIcon && <SelectedIcon className="h-4 w-4" />}
						<span>{value || placeholder}</span>
					</div>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[280px] p-0" align="start">
				<Command>
					<CommandInput placeholder={searchPlaceholder} />
					<CommandList>
						<CommandEmpty>{emptyText}</CommandEmpty>
						<CommandGroup className="max-h-[300px] overflow-y-auto">
							{icons.map((iconName) => {
								const IconComponent = getIconComponent(iconName);
								if (!IconComponent) return null;

								return (
									<CommandItem
										key={iconName}
										value={iconName}
										onSelect={() => {
											onChange(iconName);
											setOpen(false);
										}}
									>
										<div className="flex items-center gap-2 flex-1">
											<IconComponent className="h-4 w-4" />
											<span>{iconName}</span>
										</div>
										<Check
											className={cn(
												"h-4 w-4",
												value === iconName ? "opacity-100" : "opacity-0"
											)}
										/>
									</CommandItem>
								);
							})}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}

// Export helper to render an icon by name
export function renderIcon(name: string, className?: string): React.ReactNode {
	const IconComponent = getIconComponent(name);
	if (!IconComponent) return null;
	return <IconComponent className={className} />;
}
