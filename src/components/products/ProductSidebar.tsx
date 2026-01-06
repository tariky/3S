import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
  SelectItem,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { X } from "lucide-react";
import { VendorCombobox } from "./VendorCombobox";
import { CategoryCombobox } from "./CategoryCombobox";
import { TagsCombobox } from "./TagsCombobox";
import type { ProductFormValues } from "./ProductForm";
import { Checkbox } from "@/components/ui/checkbox";
import type { FormApi } from "@tanstack/react-form";

interface ProductSidebarProps {
  form: any; // FormApi type is complex, using any for now
}

export function ProductSidebar({ form }: ProductSidebarProps) {
  return (
    <div className="col-span-5 flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="internalNote" className="text-xs font-medium">
          Interna napomena
        </Label>
        <form.Field name="internalNote">
          {(field) => (
            <Textarea
              id="internalNote"
              placeholder="Interna napomena"
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
        <Label htmlFor="status" className="text-xs font-medium">
          Status
        </Label>
        <form.Field name="status">
          {(field) => (
            <Select
              value={field.state.value}
              onValueChange={(value) =>
                field.handleChange(
                  value as "draft" | "active" | "archived"
                )
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Status" className="text-sm" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Skica</SelectItem>
                <SelectItem value="active">Aktivni</SelectItem>
                <SelectItem value="archived">Neaktivni</SelectItem>
              </SelectContent>
            </Select>
          )}
        </form.Field>
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-xs font-medium">Kategorija</Label>
        <form.Field name="categoryId">
          {(field) => (
            <CategoryCombobox
              value={field.state.value}
              onValueChange={(value) => field.handleChange(value)}
            />
          )}
        </form.Field>
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-xs font-medium">Dobavljač</Label>
        <form.Field name="vendorId">
          {(field) => (
            <VendorCombobox
              value={field.state.value}
              onValueChange={(value) => field.handleChange(value)}
            />
          )}
        </form.Field>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="material" className="text-xs font-medium">
          Material
        </Label>
        <form.Field name="material">
          {(field) => (
            <Textarea
              id="material"
              placeholder="Primjer: 100% pamuk"
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
        <Label htmlFor="weight" className="text-xs font-medium">
          Težina
        </Label>
        <div className="flex gap-2">
          <form.Field name="weight">
            {(field) => (
              <Input
                id="weight"
                type="number"
                step="0.01"
                placeholder="1"
                className="text-sm flex-1"
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
          <form.Field name="weightUnit">
            {(field) => (
              <Select
                value={field.state.value}
                onValueChange={(value) => field.handleChange(value)}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="g">g</SelectItem>
                  <SelectItem value="lb">lb</SelectItem>
                  <SelectItem value="oz">oz</SelectItem>
                </SelectContent>
              </Select>
            )}
          </form.Field>
        </div>
      </div>

      <div className="flex gap-2">
        <form.Field name="requiresShipping">
          {(field) => (
            <Checkbox
              checked={field.state.value}
              onCheckedChange={(checked) =>
                field.handleChange(checked === true)
              }
            />
          )}
        </form.Field>
        <Label className="text-xs font-medium">Zahtijeva dostavu</Label>
      </div>

      <div className="flex gap-2">
        <form.Field name="featured">
          {(field) => (
            <Checkbox
              checked={field.state.value}
              onCheckedChange={(checked) =>
                field.handleChange(checked === true)
              }
            />
          )}
        </form.Field>
        <Label className="text-xs font-medium">Istaknuto</Label>
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-xs font-medium">Oznake</Label>
        <form.Field name="tagIds">
          {(field) => (
            <TagsCombobox
              value={field.state.value || []}
              onChange={(value) => field.handleChange(value)}
              onBlur={field.handleBlur}
            />
          )}
        </form.Field>
      </div>
    </div>
  );
}
