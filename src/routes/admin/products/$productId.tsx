import {
	createFileRoute,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Variant } from "@/types/products";
import { type ProductFormValues } from "@/components/products/ProductForm";
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
import {
	getProductByIdServerFn,
	updateProductServerFn,
	deleteProductServerFn,
	PRODUCTS_QUERY_KEY,
} from "@/queries/products";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { MediaItem } from "@/components/products/MediaUploader";

export const Route = createFileRoute("/admin/products/$productId")({
	component: RouteComponent,
	loader: async ({ params }) => {
		const product = await getProductByIdServerFn({
			data: { productId: params.productId },
		});
		return { product };
	},
});

function RouteComponent() {
	const navigate = useNavigate();
	const router = useRouter();
	const queryClient = useQueryClient();
	const { product: initialProduct } = Route.useLoaderData();
	const { productId } = Route.useParams();
	const [variants, setVariants] = useState<Variant[]>([]);
	const [adsMedia, setAdsMedia] = useState<AdsMediaItem[]>([]);

	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	);

	// Transform product data to form values
	const getFormDefaultValues = (): ProductFormValues => {
		if (!initialProduct) {
			return {
				name: "",
				description: "",
				price: "",
				compareAtPrice: "",
				cost: "",
				taxIncluded: false,
				trackQuantity: true,
				availableQuantity: "0",
				media: [],
				categoryId: undefined,
				vendorId: undefined,
				tagIds: [],
				status: "draft" as const,
				featured: false,
				material: "",
				internalNote: "",
				weight: "1",
				weightUnit: "kg",
				requiresShipping: true,
			};
		}

		// Transform media
		const mediaItems: MediaItem[] =
			initialProduct.media?.map((pm, index) => ({
				id: pm.media?.id || crypto.randomUUID(),
				mediaId: pm.mediaId,
				url: pm.media?.url || "",
				filename: pm.media?.filename || "",
				originalFilename: pm.media?.originalFilename || "",
				mimeType: pm.media?.mimeType || "",
				size: pm.media?.size || 0,
				position: pm.position,
				isPrimary: pm.isPrimary || index === 0,
			})) || [];

		// Transform tags
		const tagIds = initialProduct.tags?.map((pt) => pt.tagId) || [];

		return {
			name: initialProduct.name || "",
			description: initialProduct.description || "",
			price: initialProduct.price || "0",
			compareAtPrice: initialProduct.compareAtPrice || "",
			cost: initialProduct.cost || "",
			taxIncluded: initialProduct.taxIncluded || false,
			trackQuantity: initialProduct.trackQuantity ?? true,
			availableQuantity: "0",
			media: mediaItems,
			categoryId: initialProduct.categoryId || undefined,
			vendorId: initialProduct.vendorId || undefined,
			tagIds,
			status:
				(initialProduct.status as "draft" | "active" | "archived") || "draft",
			featured: initialProduct.featured || false,
			material: initialProduct.material || "",
			internalNote: initialProduct.internalNote || "",
			weight: initialProduct.weight || "1",
			weightUnit: initialProduct.weightUnit || "kg",
			requiresShipping: initialProduct.requiresShipping ?? true,
		};
	};

	const form = useForm({
		defaultValues: getFormDefaultValues(),
		onSubmit: async ({ value }) => {
			await updateProductMutation.mutateAsync(value);
		},
	});

	// Initialize variants from product options
	useEffect(() => {
		if (initialProduct?.options) {
			const variantDefs: Variant[] = initialProduct.options.map((option) => ({
				id: option.id,
				name: option.name,
				position: option.position,
				options:
					option.values?.map((value) => ({
						id: value.id,
						name: value.name,
						position: value.position,
					})) || [],
			}));
			setVariants(variantDefs);
		}
	}, [initialProduct]);

	// Initialize ads media from product
	useEffect(() => {
		if (initialProduct?.adsMedia) {
			const transformedAdsMedia: AdsMediaItem[] = initialProduct.adsMedia.map(
				(am: any) => ({
					id: am.id,
					variantId: am.variantId,
					mediaType: am.mediaType as AdsMediaItem["mediaType"],
					mediaId: am.mediaId,
					url: am.media?.url || "",
					filename: am.media?.originalFilename || "",
				})
			);
			setAdsMedia(transformedAdsMedia);
		}
	}, [initialProduct]);

	const [generatedVariants, setGeneratedVariants] = useGeneratedVariants(
		variants,
		{
			productPrice: form.state.values.price,
			productCost: form.state.values.cost,
		}
	);

	// Transform generated variants from product variants
	useEffect(() => {
		if (initialProduct?.variants) {
			if (variants.length > 0) {
				const transformedVariants = initialProduct.variants.map((pv) => {
					const combination =
						pv.variantOptions?.map((vo) => ({
							variantName: vo.optionValue?.option?.name || "",
							optionName: vo.optionValue?.name || "",
							optionId: vo.optionValueId || "",
						})) || [];

					return {
						id: pv.id,
						sku: pv.sku || "",
						quantity: pv.inventory?.onHand?.toString() || "0",
						price: pv.price || "",
						compareAtPrice: pv.compareAtPrice || "",
						cost: pv.cost || "",
						combination,
						position: pv.position,
						reserved: pv.inventory?.reserved || 0,
					};
				});

				setGeneratedVariants(transformedVariants);
			} else if (initialProduct.variants.length > 0) {
				const transformedVariants = initialProduct.variants.map((pv) => ({
					id: pv.id,
					sku: pv.sku || "",
					quantity: pv.inventory?.onHand?.toString() || "0",
					price: pv.price || "",
					compareAtPrice: pv.compareAtPrice || "",
					cost: pv.cost || "",
					combination: [],
					position: pv.position,
					reserved: pv.inventory?.reserved || 0,
				}));
				setGeneratedVariants(transformedVariants);
			}
		}
	}, [initialProduct, variants, setGeneratedVariants]);

	const updateProductMutation = useMutation({
		mutationFn: async (values: ProductFormValues) => {
			if (!productId) {
				throw new Error("Product ID is required");
			}

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

			return await updateProductServerFn({
				data: {
					productId,
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
						adsMedia: adsMediaData,
					},
				},
			});
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: [PRODUCTS_QUERY_KEY],
			});
			await router.invalidate();
			navigate({
				to: "/admin/products",
				search: { search: "", page: 1, limit: 25 },
			});
		},
	});

	const deleteProductMutation = useMutation({
		mutationFn: async () => {
			if (!productId) {
				throw new Error("Product ID is required");
			}
			return await deleteProductServerFn({ data: { id: productId } });
		},
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: [PRODUCTS_QUERY_KEY],
			});
			await router.invalidate();
			navigate({
				to: "/admin/products",
				search: { search: "", page: 1, limit: 25 },
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

	const handleDelete = () => {
		if (
			window.confirm(
				"Jeste li sigurni da želite obrisati ovaj proizvod? Ova akcija se ne može poništiti."
			)
		) {
			deleteProductMutation.mutate();
		}
	};

	if (!initialProduct) {
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="text-gray-500">Učitavanje...</div>
			</div>
		);
	}

	const mediaCount = form.state.values.media?.length || 0;
	const lastUpdated = initialProduct.updatedAt
		? new Date(initialProduct.updatedAt)
		: undefined;

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
			title={form.state.values.name || "Uredi proizvod"}
			subtitle={`ID: ${productId}`}
			isEditing
			status={form.state.values.status}
			lastUpdated={lastUpdated}
			onSubmit={handleSubmit}
			isSubmitting={updateProductMutation.isPending}
			isValid={form.state.isValid}
			onBack={handleBack}
			onDelete={handleDelete}
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
