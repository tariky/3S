"use client";

import { useState, useId, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { Megaphone, Upload, X, Video, ImageIcon, Check, ChevronsUpDown } from "lucide-react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { GeneratedVariant } from "@/types/products";
import { useUploadFiles } from "@better-upload/client";
import { UploadDropzone } from "@/components/upload-dropzone";
import { createMediaServerFn } from "@/queries/products";
import { ProxyImage } from "@/components/ui/proxy-image";

export interface AdsMediaItem {
	id: string;
	variantId: string | null; // null = all variants
	mediaType: "video" | "image_1x1" | "image_4x5" | "image_9x16";
	mediaId: string;
	url: string;
	filename?: string;
}

interface AdsMediaSectionProps {
	generatedVariants: GeneratedVariant[];
	adsMedia: AdsMediaItem[];
	onAdsMediaChange: (media: AdsMediaItem[]) => void;
	defaultExpanded?: boolean;
}

const aspectRatioConfig = {
	image_1x1: { label: "1:1", subLabel: "Kvadrat", width: "aspect-square" },
	image_4x5: { label: "4:5", subLabel: "Instagram", width: "aspect-[4/5]" },
	image_9x16: { label: "9:16", subLabel: "Story", width: "aspect-[9/16]" },
};

interface OptionGroup {
	optionName: string;
	values: {
		optionId: string;
		optionName: string;
		valueName: string;
		variantIds: string[]; // All variant IDs that have this option value
	}[];
}

export function AdsMediaSection({
	generatedVariants,
	adsMedia,
	onAdsMediaChange,
	defaultExpanded = false,
}: AdsMediaSectionProps) {
	// Selection can be:
	// - "all" = all variants
	// - "variant:{id}" = specific variant combination
	// - "option:{optionId}" = all variants with this option value
	const [selectedVariant, setSelectedVariant] = useState<string>("all");
	const [open, setOpen] = useState(false);
	const baseId = useId();

	// Build display name for a variant combination
	const getVariantDisplayName = (variant: GeneratedVariant): string => {
		if (variant.combination.length === 0) {
			return variant.sku || variant.id;
		}
		return variant.combination
			.map((c) => `${c.variantName}: ${c.optionName}`)
			.join(", ");
	};

	// Extract unique option groups from generated variants
	const optionGroups = useMemo((): OptionGroup[] => {
		const groupsMap = new Map<
			string,
			Map<string, { optionId: string; optionName: string; valueName: string; variantIds: string[] }>
		>();

		generatedVariants.forEach((gv) => {
			gv.combination.forEach((combo) => {
				if (!groupsMap.has(combo.variantName)) {
					groupsMap.set(combo.variantName, new Map());
				}
				const optionMap = groupsMap.get(combo.variantName)!;

				if (!optionMap.has(combo.optionId)) {
					optionMap.set(combo.optionId, {
						optionId: combo.optionId,
						optionName: combo.variantName,
						valueName: combo.optionName,
						variantIds: [],
					});
				}
				optionMap.get(combo.optionId)!.variantIds.push(gv.id);
			});
		});

		return Array.from(groupsMap.entries()).map(([optionName, valuesMap]) => ({
			optionName,
			values: Array.from(valuesMap.values()),
		}));
	}, [generatedVariants]);

	// Check if we should show option groups (only if there are multiple options or multiple values)
	const showOptionGroups = useMemo(() => {
		// Show if there are multiple option types (e.g., Color AND Size)
		if (optionGroups.length > 1) return true;
		// Or if single option type has multiple values AND there are multiple variants
		if (optionGroups.length === 1 && optionGroups[0].values.length > 1 && generatedVariants.length > 1) {
			// Only show if selecting by option value would select multiple variants
			return optionGroups[0].values.some((v) => v.variantIds.length > 1);
		}
		return false;
	}, [optionGroups, generatedVariants]);

	// Get variant IDs for current selection
	const getSelectedVariantIds = (): string[] | null => {
		if (selectedVariant === "all") {
			return null; // null means all
		}
		if (selectedVariant.startsWith("option:")) {
			const optionId = selectedVariant.replace("option:", "");
			for (const group of optionGroups) {
				const option = group.values.find((v) => v.optionId === optionId);
				if (option) {
					return option.variantIds;
				}
			}
			return [];
		}
		if (selectedVariant.startsWith("variant:")) {
			return [selectedVariant.replace("variant:", "")];
		}
		// Legacy: direct variant ID
		return [selectedVariant];
	};

	// Get media for currently selected variant(s)
	const getMediaForSelection = (
		type: AdsMediaItem["mediaType"]
	): AdsMediaItem | undefined => {
		const variantIds = getSelectedVariantIds();

		if (variantIds === null) {
			// All variants - look for null variantId
			return adsMedia.find((m) => m.mediaType === type && m.variantId === null);
		}

		if (variantIds.length === 0) return undefined;

		// For option selection, check if ALL selected variants have the same media
		// Return the first match (they should all be the same if set via group selection)
		return adsMedia.find(
			(m) => m.mediaType === type && variantIds.includes(m.variantId || "")
		);
	};

	// Handle upload complete for a specific media type
	const handleUploadComplete = async (
		type: AdsMediaItem["mediaType"],
		data: {
			files: Array<{
				name: string;
				size: number;
				type: string;
				objectInfo: { key: string };
			}>;
			metadata?: { publicUrls?: string[] };
		}
	) => {
		const file = data.files[0];
		const url = data.metadata?.publicUrls?.[0] || "";

		try {
			// Create media record in database
			const mediaRecord = await createMediaServerFn({
				data: {
					filename: file.objectInfo.key,
					originalFilename: file.name,
					mimeType: file.type,
					size: file.size,
					url,
					type: type === "video" ? "video" : "image",
					storage: "s3",
				},
			});

			const variantIds = getSelectedVariantIds();
			const newItems: AdsMediaItem[] = [];

			if (variantIds === null) {
				// All variants - single record with null variantId
				newItems.push({
					id: `${baseId}-${type}-${Date.now()}`,
					variantId: null,
					mediaType: type,
					mediaId: mediaRecord.id,
					url,
					filename: file.name,
				});
			} else {
				// Create a record for each selected variant
				variantIds.forEach((variantId, index) => {
					newItems.push({
						id: `${baseId}-${type}-${Date.now()}-${index}`,
						variantId,
						mediaType: type,
						mediaId: mediaRecord.id,
						url,
						filename: file.name,
					});
				});
			}

			// Remove existing media of same type for selected variants
			const filteredMedia = adsMedia.filter((m) => {
				if (m.mediaType !== type) return true;
				if (variantIds === null) {
					return m.variantId !== null;
				}
				return !variantIds.includes(m.variantId || "");
			});

			onAdsMediaChange([...filteredMedia, ...newItems]);
		} catch (error) {
			console.error("Error creating ads media record:", error);
		}
	};

	// Handle remove media
	const handleRemove = (type: AdsMediaItem["mediaType"]) => {
		const variantIds = getSelectedVariantIds();

		onAdsMediaChange(
			adsMedia.filter((m) => {
				if (m.mediaType !== type) return true;
				if (variantIds === null) {
					return m.variantId !== null;
				}
				return !variantIds.includes(m.variantId || "");
			})
		);
	};

	// Get selection display text
	const getSelectionDisplayText = (): string => {
		if (selectedVariant === "all") {
			return "Sve varijante";
		}
		if (selectedVariant.startsWith("option:")) {
			const optionId = selectedVariant.replace("option:", "");
			for (const group of optionGroups) {
				const option = group.values.find((v) => v.optionId === optionId);
				if (option) {
					return `Sve sa ${option.optionName}: ${option.valueName}`;
				}
			}
		}
		if (selectedVariant.startsWith("variant:")) {
			const variantId = selectedVariant.replace("variant:", "");
			const variant = generatedVariants.find((v) => v.id === variantId);
			if (variant) {
				return getVariantDisplayName(variant);
			}
		}
		return selectedVariant;
	};

	// Upload hooks for each type
	const { control: videoControl } = useUploadFiles({
		route: "videos",
		onUploadComplete: (data) => handleUploadComplete("video", data),
	});

	const { control: image1x1Control } = useUploadFiles({
		route: "images",
		onUploadComplete: (data) => handleUploadComplete("image_1x1", data),
	});

	const { control: image4x5Control } = useUploadFiles({
		route: "images",
		onUploadComplete: (data) => handleUploadComplete("image_4x5", data),
	});

	const { control: image9x16Control } = useUploadFiles({
		route: "images",
		onUploadComplete: (data) => handleUploadComplete("image_9x16", data),
	});

	const videoMedia = getMediaForSelection("video");

	// Get helper text based on selection
	const getHelperText = (): string => {
		const variantIds = getSelectedVariantIds();
		if (variantIds === null) {
			return "Mediji će se primijeniti na sve varijante proizvoda";
		}
		if (variantIds.length === 1) {
			return "Mediji će se primijeniti samo na odabranu varijantu";
		}
		return `Mediji će se primijeniti na ${variantIds.length} varijante`;
	};

	const content = (
		<div className="space-y-6">
			{/* Variant Selector */}
			{generatedVariants.length > 0 && (
				<div className="flex flex-col gap-2">
					<Label className="text-sm font-medium text-gray-700">
						Izaberi varijantu
					</Label>
					<Popover open={open} onOpenChange={setOpen}>
						<PopoverTrigger asChild>
							<Button
								variant="outline"
								role="combobox"
								aria-expanded={open}
								className="w-full justify-between font-normal"
							>
								{getSelectionDisplayText()}
								<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
							<Command>
								<CommandInput placeholder="Pretraži varijante..." />
								<CommandList>
									<CommandEmpty>Nema rezultata.</CommandEmpty>

									{/* All variants option */}
									<CommandGroup>
										<CommandItem
											value="all-variants"
											onSelect={() => {
												setSelectedVariant("all");
												setOpen(false);
											}}
										>
											<Check
												className={cn(
													"mr-2 h-4 w-4",
													selectedVariant === "all" ? "opacity-100" : "opacity-0"
												)}
											/>
											Sve varijante
										</CommandItem>
									</CommandGroup>

									{/* Option-based groups (e.g., "All with Color: Red") */}
									{showOptionGroups &&
										optionGroups.map((group) => (
											<CommandGroup key={group.optionName} heading={`Sve sa ${group.optionName}`}>
												{group.values.map((value) => (
													<CommandItem
														key={`option:${value.optionId}`}
														value={`option-${group.optionName}-${value.valueName}`}
														onSelect={() => {
															setSelectedVariant(`option:${value.optionId}`);
															setOpen(false);
														}}
													>
														<Check
															className={cn(
																"mr-2 h-4 w-4",
																selectedVariant === `option:${value.optionId}` ? "opacity-100" : "opacity-0"
															)}
														/>
														<span className="flex items-center gap-2">
															{value.valueName}
															<span className="text-xs text-muted-foreground">
																({value.variantIds.length} var.)
															</span>
														</span>
													</CommandItem>
												))}
											</CommandGroup>
										))}

									{/* Individual variant combinations */}
									<CommandGroup heading="Pojedinačne kombinacije">
										{generatedVariants.map((variant) => {
											const displayName = getVariantDisplayName(variant);
											return (
												<CommandItem
													key={`variant:${variant.id}`}
													value={`variant-${displayName}`}
													onSelect={() => {
														setSelectedVariant(`variant:${variant.id}`);
														setOpen(false);
													}}
												>
													<Check
														className={cn(
															"mr-2 h-4 w-4",
															selectedVariant === `variant:${variant.id}` ? "opacity-100" : "opacity-0"
														)}
													/>
													{displayName}
												</CommandItem>
											);
										})}
									</CommandGroup>
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>
					<p className="text-xs text-gray-500">{getHelperText()}</p>
				</div>
			)}

			{/* Video Upload */}
			<div className="space-y-3">
				<div className="flex items-center gap-2">
					<Video className="size-4 text-gray-500" />
					<Label className="text-sm font-medium text-gray-700">
						Video za oglase
					</Label>
				</div>
				{videoMedia ? (
					<div className="relative rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
						<div className="aspect-video flex items-center justify-center">
							<video
								src={videoMedia.url}
								controls
								className="w-full h-full object-contain"
							/>
						</div>
						<Button
							type="button"
							variant="destructive"
							size="icon"
							className="absolute top-2 right-2 h-8 w-8"
							onClick={() => handleRemove("video")}
						>
							<X className="size-4" />
						</Button>
					</div>
				) : (
					<UploadDropzone
						control={videoControl}
						accept="video/*"
						description={{
							maxFiles: 1,
							maxFileSize: "100MB",
							fileTypes: "MP4, MOV, WEBM",
						}}
					/>
				)}
			</div>

			{/* Images by Aspect Ratio */}
			<div className="space-y-3">
				<div className="flex items-center gap-2">
					<ImageIcon className="size-4 text-gray-500" />
					<Label className="text-sm font-medium text-gray-700">
						Slike za oglase
					</Label>
				</div>

				<div className="grid grid-cols-3 gap-4">
					{(
						Object.entries(aspectRatioConfig) as [
							keyof typeof aspectRatioConfig,
							(typeof aspectRatioConfig)[keyof typeof aspectRatioConfig]
						][]
					).map(([type, config]) => {
						const media = getMediaForSelection(type as AdsMediaItem["mediaType"]);
						const controlMap = {
							image_1x1: image1x1Control,
							image_4x5: image4x5Control,
							image_9x16: image9x16Control,
						};

						return (
							<div key={type} className="flex flex-col gap-2">
								<div className="text-center">
									<p className="text-sm font-medium text-gray-700">
										{config.label}
									</p>
									<p className="text-xs text-gray-500">{config.subLabel}</p>
								</div>
								{media ? (
									<div
										className={cn(
											"relative rounded-lg border border-gray-200 overflow-hidden group",
											config.width
										)}
									>
										<ProxyImage
											src={media.url}
											alt={`${config.label} image`}
											width={200}
											height={200}
											resizingType="fill"
											className="w-full h-full object-cover"
										/>
										<div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
											<Button
												type="button"
												variant="destructive"
												size="icon"
												className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
												onClick={() =>
													handleRemove(type as AdsMediaItem["mediaType"])
												}
											>
												<X className="size-4" />
											</Button>
										</div>
									</div>
								) : (
									<div
										className={cn(
											"border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-gray-50 transition-colors",
											config.width
										)}
									>
										<label className="flex flex-col items-center justify-center w-full h-full cursor-pointer p-4">
											<Upload className="size-6 text-gray-400 mb-2" />
											<span className="text-xs text-gray-500 text-center">
												Prebaci {config.label}
											</span>
											<input
												type="file"
												accept="image/*"
												className="hidden"
												onChange={(e) => {
													const file = e.target.files?.[0];
													if (file) {
														controlMap[
															type as keyof typeof controlMap
														].upload([file]);
													}
												}}
											/>
										</label>
									</div>
								)}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);

	return (
		<>
			{/* Desktop version */}
			<div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
				<div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
					<Megaphone className="size-5 text-gray-400" />
					<h2 className="font-semibold text-gray-900">Mediji za oglase</h2>
				</div>
				<div className="p-6">{content}</div>
			</div>

			{/* Mobile version with accordion */}
			<div className="lg:hidden bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
				<Accordion
					type="single"
					collapsible
					defaultValue={defaultExpanded ? "ads-media" : undefined}
				>
					<AccordionItem value="ads-media" className="border-0">
						<AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-gray-50">
							<div className="flex items-center gap-2">
								<Megaphone className="size-5 text-gray-400" />
								<span className="font-semibold text-gray-900">
									Mediji za oglase
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
