import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
	createFileRoute,
	useNavigate,
	useRouter,
} from "@tanstack/react-router";
import { useState } from "react";
import {
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Variant } from "@/types/products";
import {
	ProductForm,
	type ProductFormValues,
} from "@/components/products/ProductForm";
import { ProductSidebar } from "@/components/products/ProductSidebar";
import { useGeneratedVariants } from "../../../hooks/useGeneratedVariants";
import { useForm } from "@tanstack/react-form";
import { createProductServerFn } from "@/queries/products";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader } from "lucide-react";
import { PRODUCTS_QUERY_KEY } from "@/queries/products";

export const Route = createFileRoute("/admin/products/new")({
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = useNavigate();
	const router = useRouter();
	const queryClient = useQueryClient();
	const [variants, setVariants] = useState<Variant[]>([]);

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

	return (
		<div className="flex flex-col gap-4">
			<div className="flex justify-between items-center">
				<h1 className="text-2xl font-bold">Novi proizvod</h1>
				<Button
					onClick={handleSubmit}
					disabled={createProductMutation.isPending || !form.state.isValid}
				>
					{createProductMutation.isPending ? (
						<>
							<Loader className="w-4 h-4 mr-2 animate-spin" />
							Spremanje...
						</>
					) : (
						"Dodaj"
					)}
				</Button>
			</div>
			<Separator />
			<div className="grid grid-cols-12 gap-4">
				<ProductForm
					variants={variants}
					setVariants={setVariants}
					generatedVariants={generatedVariants}
					setGeneratedVariants={setGeneratedVariants}
					sensors={sensors}
					form={form}
				/>
				<ProductSidebar form={form} />
			</div>
		</div>
	);
}
