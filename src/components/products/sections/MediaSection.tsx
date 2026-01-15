"use client";

import { Image as ImageIcon } from "lucide-react";
import { MediaUploader, type MediaItem } from "../MediaUploader";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";

interface MediaSectionProps {
	form: any;
	defaultExpanded?: boolean;
}

export function MediaSection({
	form,
	defaultExpanded = true,
}: MediaSectionProps) {
	const mediaCount = form.state.values.media?.length || 0;

	const content = (
		<form.Field name="media">
			{(field: any) => (
				<MediaUploader
					value={field.state.value}
					onChange={(media: MediaItem[]) => field.handleChange(media)}
					maxFiles={12}
				/>
			)}
		</form.Field>
	);

	return (
		<>
			{/* Desktop version */}
			<div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
				<div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<ImageIcon className="size-5 text-gray-400" />
						<h2 className="font-semibold text-gray-900">Slike proizvoda</h2>
					</div>
					{mediaCount > 0 && (
						<Badge variant="secondary" className="text-xs">
							{mediaCount} {mediaCount === 1 ? "slika" : "slika"}
						</Badge>
					)}
				</div>
				<div className="p-6">{content}</div>
			</div>

			{/* Mobile version with accordion */}
			<div className="lg:hidden bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
				<Accordion
					type="single"
					collapsible
					defaultValue={defaultExpanded ? "media" : undefined}
				>
					<AccordionItem value="media" className="border-0">
						<AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50">
							<div className="flex items-center gap-2">
								<ImageIcon className="size-5 text-gray-400" />
								<span className="font-semibold text-gray-900">
									Slike proizvoda
								</span>
								{mediaCount > 0 && (
									<Badge variant="secondary" className="text-xs ml-2">
										{mediaCount}
									</Badge>
								)}
							</div>
						</AccordionTrigger>
						<AccordionContent className="px-4 pb-4">{content}</AccordionContent>
					</AccordionItem>
				</Accordion>
			</div>
		</>
	);
}
