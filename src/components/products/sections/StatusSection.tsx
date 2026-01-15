"use client";

import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Select,
	SelectContent,
	SelectTrigger,
	SelectValue,
	SelectItem,
} from "@/components/ui/select";
import { Settings, Star, Clock, CheckCircle2, Archive } from "lucide-react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface StatusSectionProps {
	form: any;
	variantCount?: number;
	mediaCount?: number;
	defaultExpanded?: boolean;
}

const statusConfig = {
	draft: {
		label: "Skica",
		description: "Proizvod nije vidljiv kupcima",
		color: "text-amber-700",
		bg: "bg-amber-50",
		icon: Clock,
	},
	active: {
		label: "Aktivno",
		description: "Proizvod je vidljiv i dostupan",
		color: "text-emerald-700",
		bg: "bg-emerald-50",
		icon: CheckCircle2,
	},
	archived: {
		label: "Arhivirano",
		description: "Proizvod je sakriven",
		color: "text-gray-700",
		bg: "bg-gray-50",
		icon: Archive,
	},
};

export function StatusSection({
	form,
	variantCount = 0,
	mediaCount = 0,
	defaultExpanded = false,
}: StatusSectionProps) {
	const currentStatus = form.state.values.status as keyof typeof statusConfig;
	const StatusIcon = statusConfig[currentStatus]?.icon || Clock;

	const content = (
		<div className="space-y-4">
			<div className="flex flex-col gap-2">
				<Label htmlFor="status" className="text-sm font-medium text-gray-700">
					Status proizvoda
				</Label>
				<form.Field name="status">
					{(field: any) => (
						<Select
							value={field.state.value}
							onValueChange={(value) =>
								field.handleChange(value as "draft" | "active" | "archived")
							}
						>
							<SelectTrigger className="w-full">
								<SelectValue placeholder="Status" />
							</SelectTrigger>
							<SelectContent>
								{Object.entries(statusConfig).map(([key, config]) => {
									const Icon = config.icon;
									return (
										<SelectItem key={key} value={key}>
											<div className="flex items-center gap-2">
												<Icon className={cn("size-4", config.color)} />
												<span>{config.label}</span>
											</div>
										</SelectItem>
									);
								})}
							</SelectContent>
						</Select>
					)}
				</form.Field>
				<p className="text-xs text-gray-500">
					{statusConfig[currentStatus]?.description}
				</p>
			</div>

			<div className="flex items-center gap-2 pt-2 pb-1">
				<form.Field name="featured">
					{(field: any) => (
						<>
							<Checkbox
								id="featured"
								checked={field.state.value}
								onCheckedChange={(checked) => field.handleChange(checked)}
							/>
							<Label
								htmlFor="featured"
								className="text-sm font-medium text-gray-700 cursor-pointer flex items-center gap-1.5"
							>
								<Star
									className={cn(
										"size-4",
										field.state.value
											? "text-amber-500 fill-amber-500"
											: "text-gray-400"
									)}
								/>
								Istaknuti proizvod
							</Label>
						</>
					)}
				</form.Field>
			</div>

			{/* Quick Stats */}
			{(variantCount > 0 || mediaCount > 0) && (
				<div className="border-t border-gray-100 pt-4 mt-4">
					<p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
						Statistika
					</p>
					<div className="grid grid-cols-2 gap-3">
						{mediaCount > 0 && (
							<div className="bg-gray-50 rounded-lg p-3">
								<p className="text-2xl font-bold text-gray-900">{mediaCount}</p>
								<p className="text-xs text-gray-500">Slika</p>
							</div>
						)}
						{variantCount > 0 && (
							<div className="bg-gray-50 rounded-lg p-3">
								<p className="text-2xl font-bold text-gray-900">
									{variantCount}
								</p>
								<p className="text-xs text-gray-500">Varijanti</p>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);

	return (
		<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
			{/* Desktop version */}
			<div className="hidden lg:block">
				<div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
					<Settings className="size-5 text-gray-400" />
					<h2 className="font-semibold text-gray-900">Status</h2>
				</div>
				<div className="p-6">{content}</div>
			</div>

			{/* Mobile version with accordion */}
			<div className="lg:hidden">
				<Accordion
					type="single"
					collapsible
					defaultValue={defaultExpanded ? "status" : undefined}
				>
					<AccordionItem value="status" className="border-0">
						<AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50">
							<div className="flex items-center gap-2">
								<StatusIcon
									className={cn(
										"size-5",
										statusConfig[currentStatus]?.color || "text-gray-400"
									)}
								/>
								<span className="font-semibold text-gray-900">
									Status & Postavke
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
