"use client";

import * as React from "react";
import { Plus, Minus } from "lucide-react";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ProductInfoAccordionProps {
	shippingInfo?: string;
	paymentInfo?: string;
	material?: string | null;
}

interface AccordionItemProps {
	title: string;
	children: React.ReactNode;
	defaultOpen?: boolean;
}

function AccordionItem({
	title,
	children,
	defaultOpen = false,
}: AccordionItemProps) {
	const [isOpen, setIsOpen] = React.useState(defaultOpen);

	return (
		<Collapsible open={isOpen} onOpenChange={setIsOpen}>
			<CollapsibleTrigger className="flex items-center justify-between w-full py-4 text-left group">
				<span className="text-sm font-medium text-foreground">{title}</span>
				<span className="size-5 flex items-center justify-center text-muted-foreground">
					{isOpen ? (
						<Minus className="size-4" />
					) : (
						<Plus className="size-4" />
					)}
				</span>
			</CollapsibleTrigger>
			<CollapsibleContent className="overflow-hidden data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
				<div className="pb-4 text-muted-foreground text-sm leading-relaxed whitespace-pre-line">
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
		<div className="divide-y divide-border border-y border-border">
			<AccordionItem title="Dostava">
				{shippingInfo || DEFAULT_SHIPPING_INFO}
			</AccordionItem>

			<AccordionItem title="Plaćanje">
				{paymentInfo || DEFAULT_PAYMENT_INFO}
			</AccordionItem>

			{material && (
				<AccordionItem title="Materijal">
					{material}
				</AccordionItem>
			)}
		</div>
	);
}
