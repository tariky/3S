import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  createFileRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { useForm } from "@tanstack/react-form";
import {
  getVariantByIdServerFn,
  updateVariantServerFn,
  PRODUCTS_QUERY_KEY,
} from "@/queries/products";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PriceInput } from "@/components/ui/price-input";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/admin/products/variants/$variantId")({
  component: RouteComponent,
  errorComponent: ({ error }) => {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold mb-2">Error loading variant</h1>
        <p className="text-red-500">
          {error instanceof Error ? error.message : String(error)}
        </p>
      </div>
    );
  },
  loader: async ({ params }) => {
    const variant = await getVariantByIdServerFn({
      data: { variantId: params.variantId },
    });
    return { variant };
  },
});

function RouteComponent() {
  const navigate = useNavigate();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { variant: initialVariant } = Route.useLoaderData();
  const { variantId } = Route.useParams();
  const productId = initialVariant?.productId;

  const form = useForm({
    defaultValues: {
      sku: initialVariant?.sku || "",
      price: initialVariant?.price || "",
      compareAtPrice: initialVariant?.compareAtPrice || "",
      cost: initialVariant?.cost || "",
      weight: initialVariant?.weight || "",
      barcode: initialVariant?.barcode || "",
      position: initialVariant?.position || 0,
      isDefault: initialVariant?.isDefault || false,
    },
    onSubmit: async ({ value }) => {
      await updateVariantMutation.mutateAsync(value);
    },
  });

  const updateVariantMutation = useMutation({
    mutationFn: async (values: {
      sku: string;
      price: string;
      compareAtPrice: string;
      cost: string;
      weight: string;
      barcode: string;
      position: number;
      isDefault: boolean;
    }) => {
      return await updateVariantServerFn({
        data: {
          variantId,
          data: {
            sku: values.sku || null,
            price: values.price || null,
            compareAtPrice: values.compareAtPrice || null,
            cost: values.cost || null,
            weight: values.weight || null,
            barcode: values.barcode || null,
            position: values.position,
            isDefault: values.isDefault,
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
      if (productId) {
        navigate({
          to: "/admin/products/$productId",
          params: { productId },
        });
      } else {
        navigate({
          to: "/admin/products",
          search: {
            search: "",
            page: 1,
            limit: 25,
          },
        });
      }
    },
  });

  const handleSubmit = () => {
    form.handleSubmit();
  };

  if (!initialVariant) {
    return <div>Loading...</div>;
  }

  // Get variant combination display
  const combinationDisplay =
    initialVariant.variantOptions
      ?.map(
        (vo) =>
          `${vo.optionValue?.option?.name || ""}: ${vo.optionValue?.name || ""}`
      )
      .join(", ") || "Default Variant";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Uredi varijaciju</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {initialVariant.product?.name} - {combinationDisplay}
          </p>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={updateVariantMutation.isPending || !form.state.isValid}
        >
          {updateVariantMutation.isPending ? (
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
      <div className="max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="sku" className="text-xs font-medium">
              SKU
            </Label>
            <form.Field name="sku">
              {(field: any) => (
                <Input
                  id="sku"
                  type="text"
                  placeholder="SKU"
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
              )}
            </form.Field>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="barcode" className="text-xs font-medium">
              Barcode
            </Label>
            <form.Field name="barcode">
              {(field: any) => (
                <Input
                  id="barcode"
                  type="text"
                  placeholder="Barcode"
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
              )}
            </form.Field>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="price" className="text-xs font-medium">
              Cijena
            </Label>
            <form.Field name="price">
              {(field: any) => (
                <PriceInput
                  id="price"
                  type="text"
                  placeholder="0.00"
                  className="text-sm"
                  value={field.state.value}
                  onChange={(value) => field.handleChange(value)}
                  onBlur={field.handleBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                />
              )}
            </form.Field>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="compareAtPrice" className="text-xs font-medium">
              Snižena cijena
            </Label>
            <form.Field name="compareAtPrice">
              {(field: any) => (
                <PriceInput
                  id="compareAtPrice"
                  type="text"
                  placeholder="0.00"
                  className="text-sm"
                  value={field.state.value}
                  onChange={(value) => field.handleChange(value)}
                  onBlur={field.handleBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                />
              )}
            </form.Field>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="cost" className="text-xs font-medium">
              Nabavna cijena
            </Label>
            <form.Field name="cost">
              {(field: any) => (
                <PriceInput
                  id="cost"
                  type="text"
                  placeholder="0.00"
                  className="text-sm"
                  value={field.state.value}
                  onChange={(value) => field.handleChange(value)}
                  onBlur={field.handleBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                />
              )}
            </form.Field>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="weight" className="text-xs font-medium">
              Težina
            </Label>
            <form.Field name="weight">
              {(field: any) => (
                <Input
                  id="weight"
                  type="number"
                  step="0.01"
                  placeholder="0"
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
              )}
            </form.Field>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="position" className="text-xs font-medium">
              Pozicija
            </Label>
            <form.Field name="position">
              {(field: any) => (
                <Input
                  id="position"
                  type="number"
                  placeholder="0"
                  className="text-sm"
                  value={field.state.value}
                  onChange={(e) =>
                    field.handleChange(parseInt(e.target.value) || 0)
                  }
                  onBlur={field.handleBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                />
              )}
            </form.Field>
          </div>

          <div className="flex items-center gap-2 pt-6">
            <form.Field name="isDefault">
              {(field: any) => (
                <Checkbox
                  checked={field.state.value}
                  onCheckedChange={(checked) =>
                    field.handleChange(checked === true)
                  }
                />
              )}
            </form.Field>
            <Label className="text-xs font-medium">Zadana varijacija</Label>
          </div>
        </div>
      </div>
    </div>
  );
}
