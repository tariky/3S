import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PriceInput } from "@/components/ui/price-input";
import { Textarea } from "@/components/ui/textarea";
import { VariantsSection } from "./VariantsSection";
import { GeneratedVariantsSection } from "./GeneratedVariantsSection";
import { Variant, GeneratedVariant } from "@/types/products";
import { MediaUploader, type MediaItem } from "./MediaUploader";

interface ProductFormProps {
  variants: Variant[];
  setVariants: React.Dispatch<React.SetStateAction<Variant[]>>;
  generatedVariants: GeneratedVariant[];
  setGeneratedVariants: React.Dispatch<
    React.SetStateAction<GeneratedVariant[]>
  >;
  sensors: ReturnType<typeof import("@dnd-kit/core").useSensors>;
  form: any; // FormApi requires 11-12 type arguments, using any for simplicity
  productId?: string; // Optional productId for edit mode
}

export interface ProductFormValues {
  name: string;
  description: string;
  price: string;
  compareAtPrice: string;
  cost: string;
  taxIncluded: boolean;
  trackQuantity: boolean;
  availableQuantity: string;
  media: MediaItem[];
  categoryId?: string;
  vendorId?: string;
  tagIds?: string[];
  status: "draft" | "active" | "archived";
  featured: boolean;
  material: string;
  internalNote: string;
  weight: string;
  weightUnit: string;
  requiresShipping: boolean;
}

export function ProductForm({
  variants,
  setVariants,
  generatedVariants,
  setGeneratedVariants,
  sensors,
  form,
  productId,
}: ProductFormProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="col-span-7 flex flex-col gap-4"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="name" className="text-xs font-medium">
          Naziv
        </Label>
        <form.Field
          name="name"
          validators={{
            onChange: ({ value }: { value: string }) => {
              return value.length < 2
                ? "Naziv mora imati najmanje 2 karaktera"
                : undefined;
            },
          }}
        >
          {(field: any) => (
            <>
              <Input
                id="name"
                type="text"
                placeholder="Naziv proizvoda"
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
              {field.state.meta.errors && (
                <p className="text-xs text-destructive">
                  {field.state.meta.errors[0]}
                </p>
              )}
            </>
          )}
        </form.Field>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="description" className="text-xs font-medium">
          Opis
        </Label>
        <form.Field name="description">
          {(field: any) => (
            <Textarea
              id="description"
              placeholder="Opis proizvoda"
              className="text-sm"
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  // Allow Ctrl+Enter or Cmd+Enter for new lines
                  return;
                }
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
        <Label className="text-xs font-medium">Mediji</Label>
        <form.Field name="media">
          {(field: any) => (
            <MediaUploader
              value={field.state.value}
              onChange={(media) => field.handleChange(media)}
              maxFiles={12}
            />
          )}
        </form.Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-2 col-span-1">
          <Label htmlFor="price" className="text-xs font-medium">
            Prodajna cijena
          </Label>
          <form.Field
            name="price"
            validators={{
              onChange: ({ value }: { value: string }) => {
                const numValue = parseFloat(value);
                if (isNaN(numValue) || numValue < 0) {
                  return "Cijena mora biti validan pozitivan broj";
                }
                return undefined;
              },
            }}
          >
            {(field: any) => (
              <>
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
                {field.state.meta.errors && (
                  <p className="text-xs text-destructive">
                    {field.state.meta.errors[0]}
                  </p>
                )}
              </>
            )}
          </form.Field>
        </div>

        <div className="flex flex-col gap-2 col-span-1">
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

        <div className="flex flex-col gap-2 col-span-1">
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
      </div>

      <div className="flex gap-2">
        <form.Field name="taxIncluded">
          {(field: any) => (
            <Checkbox
              checked={field.state.value}
              onCheckedChange={(checked) =>
                field.handleChange(checked === true)
              }
            />
          )}
        </form.Field>
        <Label className="text-xs font-medium">PDV uračunat u cijenu</Label>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="availableQuantity" className="text-xs font-medium">
          Dostupno komada
        </Label>
        <form.Field name="availableQuantity">
          {(field: any) => (
            <Input
              id="availableQuantity"
              type="number"
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
        <VariantsSection
          variants={variants}
          setVariants={setVariants}
          sensors={sensors}
        />
        <GeneratedVariantsSection
          generatedVariants={generatedVariants}
          setGeneratedVariants={setGeneratedVariants}
          sensors={sensors}
        />
      </div>

      {/* Hidden submit button - form will be submitted from parent */}
      <button type="submit" className="hidden" />
    </form>
  );
}
