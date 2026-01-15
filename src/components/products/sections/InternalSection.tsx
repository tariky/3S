"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote } from "lucide-react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";

interface InternalSectionProps {
	form: any;
	defaultExpanded?: boolean;
}

export function InternalSection({
	form,
	defaultExpanded = false,
}: InternalSectionProps) {
	const content = (
		<div className="flex flex-col gap-2">
			<Label
				htmlFor="internalNote"
				className="text-sm font-medium text-gray-700"
			>
				Interna napomena
			</Label>
			<form.Field name="internalNote">
				{(field: any) => (
					<Textarea
						id="internalNote"
						placeholder="Napomena za internu upotrebu (nije vidljivo kupcima)"
						className="text-sm min-h-[100px] resize-y"
						value={field.state.value}
						onChange={(e) => field.handleChange(e.target.value)}
						onBlur={field.handleBlur}
					/>
				)}
			</form.Field>
			<p className="text-xs text-gray-500">
				Ova napomena je vidljiva samo administratorima.
			</p>
		</div>
	);

	return (
		<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
			{/* Desktop version */}
			<div className="hidden lg:block">
				<div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
					<StickyNote className="size-5 text-gray-400" />
					<h2 className="font-semibold text-gray-900">Interna napomena</h2>
				</div>
				<div className="p-6">{content}</div>
			</div>

			{/* Mobile version with accordion */}
			<div className="lg:hidden">
				<Accordion
					type="single"
					collapsible
					defaultValue={defaultExpanded ? "internal" : undefined}
				>
					<AccordionItem value="internal" className="border-0">
						<AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50">
							<div className="flex items-center gap-2">
								<StickyNote className="size-5 text-gray-400" />
								<span className="font-semibold text-gray-900">
									Interna napomena
								</span>
							</div>
						</AccordionTrigger>
						<AccordionContent className="px-4 pb-4">{content}</AccordionContent>
					</AccordionItem>
				</Accordion>
			</div>
		</div>
	);
}
