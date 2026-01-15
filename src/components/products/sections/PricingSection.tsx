"use client";

import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PriceInput } from "@/components/ui/price-input";
import { DollarSign, Info } from "lucide-react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";

interface PricingSectionProps {
	form: any;
	hasVariants: boolean;
	defaultExpanded?: boolean;
}

export function PricingSection({
	form,
	hasVariants,
	defaultExpanded = false,
}: PricingSectionProps) {
	// If product has variants, show a message instead of price fields
	if (hasVariants) {
		const infoContent = (
			<div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
				<Info className="size-5 text-blue-500 flex-shrink-0 mt-0.5" />
				<div>
					<p className="text-sm font-medium text-blue-900">
						Cijene se upravljaju kroz varijante
					</p>
					<p className="text-sm text-blue-700 mt-1">
						Ovaj proizvod ima varijante. Cijene, troškove i količine možete
						postaviti za svaku varijantu posebno u sekciji ispod.
					</p>
				</div>
			</div>
		);

		return (
			<>
				{/* Desktop version */}
				<div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
					<div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
						<DollarSign className="size-5 text-gray-400" />
						<h2 className="font-semibold text-gray-900">Cijena</h2>
					</div>
					<div className="p-6">{infoContent}</div>
				</div>

				{/* Mobile version */}
				<div className="lg:hidden bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
					<Accordion type="single" collapsible>
						<AccordionItem value="pricing" className="border-0">
							<AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50">
								<div className="flex items-center gap-2">
									<DollarSign className="size-5 text-gray-400" />
									<span className="font-semibold text-gray-900">Cijena</span>
								</div>
							</AccordionTrigger>
							<AccordionContent className="px-4 pb-4">
								{infoContent}
							</AccordionContent>
						</AccordionItem>
					</Accordion>
				</div>
			</>
		);
	}

	const content = (
		<div className="space-y-4">
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<div className="flex flex-col gap-2">
					<Label htmlFor="price" className="text-sm font-medium text-gray-700">
						Prodajna cijena <span className="text-red-500">*</span>
					</Label>
					<form.Field
						name="price"
						validators={{
							onChange: ({ value }: { value: string }) => {
								if (!value) return "Cijena je obavezna";
								const num = parseFloat(value);
								if (isNaN(num) || num < 0) return "Unesite ispravnu cijenu";
								return undefined;
							},
						}}
					>
						{(field: any) => (
							<>
								<PriceInput
									id="price"
									value={field.state.value}
									onChange={(value) => field.handleChange(value)}
									onBlur={field.handleBlur}
									placeholder="0.00"
								/>
								{field.state.meta.errors &&
									field.state.meta.errors.length > 0 && (
										<p className="text-xs text-red-500 mt-1">
											{field.state.meta.errors[0]}
										</p>
									)}
							</>
						)}
					</form.Field>
				</div>

				<div className="flex flex-col gap-2">
					<Label
						htmlFor="compareAtPrice"
						className="text-sm font-medium text-gray-700"
					>
						Stara cijena
					</Label>
					<form.Field name="compareAtPrice">
						{(field: any) => (
							<PriceInput
								id="compareAtPrice"
								value={field.state.value}
								onChange={(value) => field.handleChange(value)}
								onBlur={field.handleBlur}
								placeholder="0.00"
							/>
						)}
					</form.Field>
					<p className="text-xs text-gray-500">Prikazuje se precrtan</p>
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="cost" className="text-sm font-medium text-gray-700">
						Nabavna cijena
					</Label>
					<form.Field name="cost">
						{(field: any) => (
							<PriceInput
								id="cost"
								value={field.state.value}
								onChange={(value) => field.handleChange(value)}
								onBlur={field.handleBlur}
								placeholder="0.00"
							/>
						)}
					</form.Field>
					<p className="text-xs text-gray-500">Nije vidljivo kupcima</p>
				</div>
			</div>

			<div className="flex items-center gap-2 pt-2">
				<form.Field name="taxIncluded">
					{(field: any) => (
						<>
							<Checkbox
								id="taxIncluded"
								checked={field.state.value}
								onCheckedChange={(checked) => field.handleChange(checked)}
							/>
							<Label
								htmlFor="taxIncluded"
								className="text-sm font-medium text-gray-700 cursor-pointer"
							>
								PDV uračunat u cijenu
							</Label>
						</>
					)}
				</form.Field>
			</div>
		</div>
	);

	return (
		<>
			{/* Desktop version */}
			<div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
				<div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
					<DollarSign className="size-5 text-gray-400" />
					<h2 className="font-semibold text-gray-900">Cijena</h2>
				</div>
				<div className="p-6">{content}</div>
			</div>

			{/* Mobile version with accordion */}
			<div className="lg:hidden bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
				<Accordion
					type="single"
					collapsible
					defaultValue={defaultExpanded ? "pricing" : undefined}
				>
					<AccordionItem value="pricing" className="border-0">
						<AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50">
							<div className="flex items-center gap-2">
								<DollarSign className="size-5 text-gray-400" />
								<span className="font-semibold text-gray-900">Cijena</span>
							</div>
						</AccordionTrigger>
						<AccordionContent className="px-4 pb-4">{content}</AccordionContent>
					</AccordionItem>
				</Accordion>
			</div>
		</>
	);
}
