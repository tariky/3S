"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Package } from "lucide-react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";

interface BasicInfoSectionProps {
	form: any;
	defaultExpanded?: boolean;
}

export function BasicInfoSection({
	form,
	defaultExpanded = true,
}: BasicInfoSectionProps) {
	const content = (
		<div className="space-y-4">
			<div className="flex flex-col gap-2">
				<Label htmlFor="name" className="text-sm font-medium text-gray-700">
					Naziv proizvoda <span className="text-red-500">*</span>
				</Label>
				<form.Field
					name="name"
					validators={{
						onChange: ({ value }: { value: string }) => {
							return value.length < 2
								? "Naziv mora imati najmanje 2 karaktera"
								: undefined;
						},
					}}
				>
					{(field: any) => (
						<>
							<Input
								id="name"
								type="text"
								placeholder="Unesite naziv proizvoda"
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
							{field.state.meta.errors && field.state.meta.errors.length > 0 && (
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
					htmlFor="description"
					className="text-sm font-medium text-gray-700"
				>
					Opis
				</Label>
				<form.Field name="description">
					{(field: any) => (
						<Textarea
							id="description"
							placeholder="Unesite opis proizvoda"
							className="text-sm min-h-[120px] resize-y"
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
		<>
			{/* Desktop version */}
			<div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
				<div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
					<Package className="size-5 text-gray-400" />
					<h2 className="font-semibold text-gray-900">Osnovne informacije</h2>
				</div>
				<div className="p-6">{content}</div>
			</div>

			{/* Mobile version with accordion */}
			<div className="lg:hidden bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
				<Accordion
					type="single"
					collapsible
					defaultValue={defaultExpanded ? "basic-info" : undefined}
				>
					<AccordionItem value="basic-info" className="border-0">
						<AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50">
							<div className="flex items-center gap-2">
								<Package className="size-5 text-gray-400" />
								<span className="font-semibold text-gray-900">
									Osnovne informacije
								</span>
							</div>
						</AccordionTrigger>
						<AccordionContent className="px-4 pb-4">{content}</AccordionContent>
					</AccordionItem>
				</Accordion>
			</div>
		</>
	);
}
