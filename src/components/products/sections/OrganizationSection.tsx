"use client";

import { Label } from "@/components/ui/label";
import { FolderTree } from "lucide-react";
import { CategoryCombobox } from "../CategoryCombobox";
import { VendorCombobox } from "../VendorCombobox";
import { TagsCombobox } from "../TagsCombobox";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";

interface OrganizationSectionProps {
	form: any;
	defaultExpanded?: boolean;
}

export function OrganizationSection({
	form,
	defaultExpanded = false,
}: OrganizationSectionProps) {
	const content = (
		<div className="space-y-4">
			<div className="flex flex-col gap-2">
				<Label className="text-sm font-medium text-gray-700">Kategorija</Label>
				<form.Field name="categoryId">
					{(field: any) => (
						<CategoryCombobox
							value={field.state.value}
							onValueChange={(value) => field.handleChange(value)}
						/>
					)}
				</form.Field>
			</div>

			<div className="flex flex-col gap-2">
				<Label className="text-sm font-medium text-gray-700">Dobavljač</Label>
				<form.Field name="vendorId">
					{(field: any) => (
						<VendorCombobox
							value={field.state.value}
							onValueChange={(value) => field.handleChange(value)}
						/>
					)}
				</form.Field>
			</div>

			<div className="flex flex-col gap-2">
				<Label className="text-sm font-medium text-gray-700">Oznake</Label>
				<form.Field name="tagIds">
					{(field: any) => (
						<TagsCombobox
							value={field.state.value || []}
							onValueChange={(value) => field.handleChange(value)}
						/>
					)}
				</form.Field>
			</div>
		</div>
	);

	return (
		<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
			{/* Desktop version - always visible */}
			<div className="hidden lg:block">
				<div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
					<FolderTree className="size-5 text-gray-400" />
					<h2 className="font-semibold text-gray-900">Organizacija</h2>
				</div>
				<div className="p-6">{content}</div>
			</div>

			{/* Mobile version with accordion */}
			<div className="lg:hidden">
				<Accordion
					type="single"
					collapsible
					defaultValue={defaultExpanded ? "organization" : undefined}
				>
					<AccordionItem value="organization" className="border-0">
						<AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50">
							<div className="flex items-center gap-2">
								<FolderTree className="size-5 text-gray-400" />
								<span className="font-semibold text-gray-900">Organizacija</span>
							</div>
						</AccordionTrigger>
						<AccordionContent className="px-4 pb-4">{content}</AccordionContent>
					</AccordionItem>
				</Accordion>
			</div>
		</div>
	);
}
