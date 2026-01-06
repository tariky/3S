import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
import {
  ProductForm,
  type ProductFormValues,
} from "@/components/products/ProductForm";
import { ProductSidebar } from "@/components/products/ProductSidebar";
import { useGeneratedVariants } from "../../../hooks/useGeneratedVariants";
import { useForm } from "@tanstack/react-form";
import {
  getProductByIdServerFn,
  updateProductServerFn,
  PRODUCTS_QUERY_KEY,
} from "@/queries/products";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader } from "lucide-react";

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
    const mediaItems =
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

    // Transform variant definitions (product options)
    const variantDefs: Variant[] =
      initialProduct.options?.map((option, index) => ({
        id: option.id,
        name: option.name,
        position: option.position,
        options:
          option.values?.map((value, vIndex) => ({
            id: value.id,
            name: value.name,
            position: value.position,
          })) || [],
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
      availableQuantity: "0", // TODO: Calculate from variants
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
      // Only transform if we have variant definitions, otherwise use existing variants
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
            cost: pv.cost || "",
            combination,
            position: pv.position,
            reserved: pv.inventory?.reserved || 0,
          };
        });

        setGeneratedVariants(transformedVariants);
      } else if (initialProduct.variants.length > 0) {
        // If no variant definitions but we have variants, create default structure
        const transformedVariants = initialProduct.variants.map((pv) => ({
          id: pv.id,
          sku: pv.sku || "",
          quantity: pv.inventory?.onHand?.toString() || "0",
          price: pv.price || "",
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
        cost: gv.cost || null,
        combination: gv.combination,
        position: index,
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
          },
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
        search: {
          search: "",
          page: 1,
          limit: 25,
        },
      });
    },
  });

  const handleSubmit = () => {
    form.handleSubmit();
  };

  if (!initialProduct) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Uredi proizvod</h1>
        <Button
          onClick={handleSubmit}
          disabled={updateProductMutation.isPending || !form.state.isValid}
        >
          {updateProductMutation.isPending ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Spremanje...
            </>
          ) : (
            "Spremi promjene"
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
          productId={productId}
        />
        <ProductSidebar form={form} />
      </div>
    </div>
  );
}
