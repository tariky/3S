"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Select,
	SelectContent,
	SelectTrigger,
	SelectValue,
	SelectItem,
} from "@/components/ui/select";
import { Truck } from "lucide-react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";

interface ShippingSectionProps {
	form: any;
	defaultExpanded?: boolean;
}

export function ShippingSection({
	form,
	defaultExpanded = false,
}: ShippingSectionProps) {
	const content = (
		<div className="space-y-4">
			<div className="flex items-center gap-2">
				<form.Field name="requiresShipping">
					{(field: any) => (
						<>
							<Checkbox
								id="requiresShipping"
								checked={field.state.value}
								onCheckedChange={(checked) => field.handleChange(checked)}
							/>
							<Label
								htmlFor="requiresShipping"
								className="text-sm font-medium text-gray-700 cursor-pointer"
							>
								Zahtijeva dostavu
							</Label>
						</>
					)}
				</form.Field>
			</div>

			<div className="grid grid-cols-2 gap-3">
				<div className="flex flex-col gap-2">
					<Label htmlFor="weight" className="text-sm font-medium text-gray-700">
						Težina
					</Label>
					<form.Field name="weight">
						{(field: any) => (
							<Input
								id="weight"
								type="number"
								step="0.01"
								min="0"
								placeholder="0.00"
								className="text-sm"
								value={field.state.value}
								onChange={(e) => field.handleChange(e.target.value)}
								onBlur={field.handleBlur}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										e.stopPropagation();
									}
								}}
							/>
						)}
					</form.Field>
				</div>

				<div className="flex flex-col gap-2">
					<Label
						htmlFor="weightUnit"
						className="text-sm font-medium text-gray-700"
					>
						Jedinica
					</Label>
					<form.Field name="weightUnit">
						{(field: any) => (
							<Select
								value={field.state.value}
								onValueChange={(value) => field.handleChange(value)}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Jedinica" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="kg">kg</SelectItem>
									<SelectItem value="g">g</SelectItem>
									<SelectItem value="lb">lb</SelectItem>
									<SelectItem value="oz">oz</SelectItem>
								</SelectContent>
							</Select>
						)}
					</form.Field>
				</div>
			</div>

			<div className="flex flex-col gap-2">
				<Label
					htmlFor="material"
					className="text-sm font-medium text-gray-700"
				>
					Materijal
				</Label>
				<form.Field name="material">
					{(field: any) => (
						<Textarea
							id="material"
							placeholder="npr. 100% pamuk"
							className="text-sm min-h-[80px] resize-y"
							value={field.state.value}
							onChange={(e) => field.handleChange(e.target.value)}
							onBlur={field.handleBlur}
						/>
					)}
				</form.Field>
			</div>
		</div>
	);

	return (
		<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
			{/* Desktop version */}
			<div className="hidden lg:block">
				<div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
					<Truck className="size-5 text-gray-400" />
					<h2 className="font-semibold text-gray-900">Dostava</h2>
				</div>
				<div className="p-6">{content}</div>
			</div>

			{/* Mobile version with accordion */}
			<div className="lg:hidden">
				<Accordion
					type="single"
					collapsible
					defaultValue={defaultExpanded ? "shipping" : undefined}
				>
					<AccordionItem value="shipping" className="border-0">
						<AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50">
							<div className="flex items-center gap-2">
								<Truck className="size-5 text-gray-400" />
								<span className="font-semibold text-gray-900">Dostava</span>
							</div>
						</AccordionTrigger>
						<AccordionContent className="px-4 pb-4">{content}</AccordionContent>
					</AccordionItem>
				</Accordion>
			</div>
		</div>
	);
}
