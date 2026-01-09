"use client";

import * as React from "react";
import { ChevronDown, Truck, CreditCard, Shirt } from "lucide-react";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface ProductInfoAccordionProps {
	shippingInfo?: string;
	paymentInfo?: string;
	material?: string | null;
}

interface AccordionItemProps {
	title: string;
	icon: React.ReactNode;
	children: React.ReactNode;
	defaultOpen?: boolean;
}

function AccordionItem({
	title,
	icon,
	children,
	defaultOpen = false,
}: AccordionItemProps) {
	const [isOpen, setIsOpen] = React.useState(defaultOpen);

	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen}>
			<CollapsibleTrigger className="flex items-center justify-between w-full py-4 text-left group">
				<div className="flex items-center gap-3">
					<span className="text-gray-500">{icon}</span>
					<span className="font-medium text-gray-900">{title}</span>
				</div>
				<ChevronDown
					className={cn(
						"size-5 text-gray-400 transition-transform duration-200",
						isOpen && "rotate-180"
					)}
				/>
			</CollapsibleTrigger>
			<CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
				<div className="pb-4 text-gray-600 text-sm leading-relaxed whitespace-pre-line">
					{children}
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}

const DEFAULT_SHIPPING_INFO = `Besplatna dostava za narudžbe preko 100 KM.
Standardna dostava: 2-4 radna dana.
Express dostava: 1-2 radna dana (+15 KM).`;

const DEFAULT_PAYMENT_INFO = `Prihvaćamo sljedeće načine plaćanja:
• Kartica (Visa, Mastercard)
• Pouzeće
• PayPal`;

export function ProductInfoAccordion({
	shippingInfo,
	paymentInfo,
	material,
}: ProductInfoAccordionProps) {
	return (
		<div className="divide-y divide-gray-200 border-t border-gray-200">
			<AccordionItem
				title="Dostava"
				icon={<Truck className="size-5" />}
			>
				{shippingInfo || DEFAULT_SHIPPING_INFO}
			</AccordionItem>

			<AccordionItem
				title="Plaćanje"
				icon={<CreditCard className="size-5" />}
			>
				{paymentInfo || DEFAULT_PAYMENT_INFO}
			</AccordionItem>

			{material && (
				<AccordionItem
					title="Materijal"
					icon={<Shirt className="size-5" />}
				>
					{material}
				</AccordionItem>
			)}
		</div>
	);
}
