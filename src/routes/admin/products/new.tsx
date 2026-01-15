import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import {
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Variant } from "@/types/products";
import { type ProductFormValues } from "@/components/products/ProductForm";
import { ProductSidebar } from "@/components/products/ProductSidebar";
import { ProductPageLayout } from "@/components/products/ProductPageLayout";
import { BasicInfoSection } from "@/components/products/sections/BasicInfoSection";
import { MediaSection } from "@/components/products/sections/MediaSection";
import {
	AdsMediaSection,
	type AdsMediaItem,
} from "@/components/products/sections/AdsMediaSection";
import { PricingSection } from "@/components/products/sections/PricingSection";
import { VariantsSection } from "@/components/products/VariantsSection";
import { GeneratedVariantsSection } from "@/components/products/GeneratedVariantsSection";
import { StatusSection } from "@/components/products/sections/StatusSection";
import { OrganizationSection } from "@/components/products/sections/OrganizationSection";
import { ShippingSection } from "@/components/products/sections/ShippingSection";
import { InternalSection } from "@/components/products/sections/InternalSection";
import { useGeneratedVariants } from "../../../hooks/useGeneratedVariants";
import { useForm } from "@tanstack/react-form";
import { createProductServerFn } from "@/queries/products";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { PRODUCTS_QUERY_KEY } from "@/queries/products";
import type { MediaItem } from "@/components/products/MediaUploader";

export const Route = createFileRoute("/admin/products/new")({
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = useNavigate();
	const router = useRouter();
	const queryClient = useQueryClient();
	const [variants, setVariants] = useState<Variant[]>([]);
	const [adsMedia, setAdsMedia] = useState<AdsMediaItem[]>([]);

	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	);

	const form = useForm({
		defaultValues: {
			name: "",
			description: "",
			price: "",
			compareAtPrice: "",
			cost: "",
			taxIncluded: true,
			trackQuantity: true,
			availableQuantity: "0",
			media: [] as MediaItem[],
			categoryId: undefined as string | undefined,
			vendorId: undefined as string | undefined,
			tagIds: [] as string[],
			status: "draft" as const,
			featured: false,
			material: "",
			internalNote: "",
			weight: "1",
			weightUnit: "kg",
			requiresShipping: true,
		},
		onSubmit: async ({ value }) => {
			await createProductMutation.mutateAsync(value);
		},
	});

	const [generatedVariants, setGeneratedVariants] = useGeneratedVariants(
		variants,
		{
			productPrice: form.state.values.price,
			productCost: form.state.values.cost,
			productQuantity: form.state.values.availableQuantity,
		}
	);

	const createProductMutation = useMutation({
		mutationFn: async (values: ProductFormValues) => {
			// Prepare media data
			const mediaData = values.media.map((item, index) => ({
				mediaId: item.mediaId || "",
				position: index,
				isPrimary: item.isPrimary,
			}));

			// Prepare variant definitions (product options and option values)
			const variantDefinitionsData = variants.map((variant) => ({
				id: variant.id,
				name: variant.name,
				position: variant.position,
				options: variant.options.map((opt) => ({
					id: opt.id,
					name: opt.name,
					position: opt.position,
				})),
			}));

			// Prepare generated variants data
			const generatedVariantsData = generatedVariants.map((gv, index) => ({
				id: gv.id,
				sku: gv.sku || null,
				quantity: gv.quantity || null,
				price: gv.price || null,
				compareAtPrice: gv.compareAtPrice || null,
				cost: gv.cost || null,
				combination: gv.combination,
				position: index,
			}));

			// Prepare ads media data
			const adsMediaData = adsMedia.map((item) => ({
				variantId: item.variantId,
				mediaType: item.mediaType,
				mediaId: item.mediaId,
			}));

			return await createProductServerFn({
				data: {
					name: values.name,
					description: values.description || null,
					price: values.price,
					compareAtPrice: values.compareAtPrice || null,
					cost: values.cost || null,
					trackQuantity: values.trackQuantity,
					status: values.status,
					featured: values.featured,
					vendorId: values.vendorId || null,
					categoryId: values.categoryId || null,
					tagIds: values.tagIds || [],
					material: values.material || null,
					weight: values.weight,
					weightUnit: values.weightUnit,
					requiresShipping: values.requiresShipping,
					taxIncluded: values.taxIncluded,
					internalNote: values.internalNote || null,
					media: mediaData,
					variantDefinitions: variantDefinitionsData,
					generatedVariants: generatedVariantsData,
					availableQuantity: values.availableQuantity || null,
					adsMedia: adsMediaData,
				},
			});
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: [PRODUCTS_QUERY_KEY],
			});
			// Invalidate router cache to refresh loader data
			await router.invalidate();
			navigate({
				to: "/admin/products",
				search: { page: 1, limit: 25, search: "" },
			});
		},
	});

	const handleSubmit = () => {
		form.handleSubmit();
	};

	const handleBack = () => {
		navigate({
			to: "/admin/products",
			search: { page: 1, limit: 25, search: "" },
		});
	};

	const mediaCount = form.state.values.media?.length || 0;

	// Desktop sidebar content
	const sidebarContent = (
		<div className="hidden lg:flex flex-col gap-4">
			<StatusSection
				form={form}
				variantCount={generatedVariants.length}
				mediaCount={mediaCount}
			/>
			<OrganizationSection form={form} />
			<ShippingSection form={form} />
			<InternalSection form={form} />
		</div>
	);

	return (
		<ProductPageLayout
			title="Novi proizvod"
			status={form.state.values.status}
			onSubmit={handleSubmit}
			isSubmitting={createProductMutation.isPending}
			isValid={form.state.isValid}
			onBack={handleBack}
			sidebarContent={sidebarContent}
		>
			{/* Main Content */}
			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="flex flex-col gap-6"
			>
				<BasicInfoSection form={form} defaultExpanded />
				<MediaSection form={form} defaultExpanded />
				<AdsMediaSection
					generatedVariants={generatedVariants}
					adsMedia={adsMedia}
					onAdsMediaChange={setAdsMedia}
				/>
				<PricingSection
					form={form}
					hasVariants={generatedVariants.length > 0}
				/>
				<VariantsSection
					variants={variants}
					setVariants={setVariants}
					sensors={sensors}
					defaultExpanded
				/>
				{generatedVariants.length > 0 && (
					<GeneratedVariantsSection
						generatedVariants={generatedVariants}
						setGeneratedVariants={setGeneratedVariants}
						sensors={sensors}
						defaultExpanded
					/>
				)}

				{/* Mobile: Show sidebar sections as part of the scroll */}
				<div className="lg:hidden flex flex-col gap-6">
					<StatusSection
						form={form}
						variantCount={generatedVariants.length}
						mediaCount={mediaCount}
					/>
					<OrganizationSection form={form} />
					<ShippingSection form={form} />
					<InternalSection form={form} />
				</div>

				{/* Hidden submit button */}
				<button type="submit" className="hidden" />
			</form>
		</ProductPageLayout>
	);
}
