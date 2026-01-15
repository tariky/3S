import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "@tanstack/react-form";
import { Loader, Pencil } from "lucide-react";
import { useState } from "react";
import {
  DialogHeader,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  Dialog,
} from "../ui/dialog";
import {
  SHIPPING_METHODS_QUERY_KEY,
  updateShippingMethodServerFn,
} from "@/queries/shipping-methods";
import { useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";

interface EditShippingMethodDialogProps {
  methodId: string;
  defaultValues: {
    name: string;
    description: string;
    price: number;
    isFreeShipping: boolean;
    isLocalPickup: boolean;
    minimumOrderAmount: number | null;
    active: boolean;
  };
}

export function EditShippingMethodDialog({
  methodId,
  defaultValues,
}: EditShippingMethodDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const form = useForm({
    defaultValues: {
      name: defaultValues.name,
      description: defaultValues.description,
      price: defaultValues.price,
      isFreeShipping: defaultValues.isFreeShipping,
      isLocalPickup: defaultValues.isLocalPickup,
      minimumOrderAmount: defaultValues.minimumOrderAmount,
      active: defaultValues.active,
    },
    onSubmit: async ({ value }) => {
      await updateShippingMethodServerFn({
        data: {
          id: methodId,
          name: value.name,
          description: value.description || null,
          price: value.price,
          isFreeShipping: value.isFreeShipping,
          isLocalPickup: value.isLocalPickup,
          minimumOrderAmount: value.isFreeShipping ? value.minimumOrderAmount : null,
          active: value.active,
        },
      });
      queryClient.invalidateQueries({ queryKey: [SHIPPING_METHODS_QUERY_KEY] });
      setIsOpen(false);
    },
  });
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <Pencil className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-left">Uredi način dostave</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Naziv</Label>
            <form.Field
              name="name"
              validators={{
                onChange: ({ value }) => {
                  return value.length > 0 ? undefined : "Naziv je obavezan";
                },
              }}
              children={(field) => (
                <Input
                  id="name"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              )}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="description">Opis</Label>
            <form.Field
              name="description"
              children={(field) => (
                <Textarea
                  id="description"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  rows={3}
                />
              )}
            />
          </div>
          <div className="flex items-center gap-2">
            <form.Field
              name="isFreeShipping"
              children={(field) => (
                <>
                  <Switch
                    checked={field.state.value}
                    onCheckedChange={(checked) => {
                      field.handleChange(checked);
                      if (!checked) {
                        form.setFieldValue("minimumOrderAmount", null);
                      }
                    }}
                  />
                  <Label htmlFor="isFreeShipping">Besplatna dostava</Label>
                </>
              )}
            />
          </div>
          <div className="flex items-center gap-2">
            <form.Field
              name="isLocalPickup"
              children={(field) => (
                <>
                  <Switch
                    checked={field.state.value}
                    onCheckedChange={field.handleChange}
                  />
                  <Label htmlFor="isLocalPickup">Osobno preuzimanje</Label>
                </>
              )}
            />
          </div>
          <form.Subscribe
            selector={(state) => [state.values.isFreeShipping]}
            children={([isFreeShipping]) => {
              if (isFreeShipping) {
                return (
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="minimumOrderAmount">
                      Minimalni iznos narudžbe za besplatnu dostavu (BAM)
                    </Label>
                    <form.Field
                      name="minimumOrderAmount"
                      validators={{
                        onChange: ({ value }) => {
                          if (isFreeShipping && (!value || value <= 0)) {
                            return "Minimalni iznos je obavezan za besplatnu dostavu";
                          }
                          return undefined;
                        },
                      }}
                      children={(field) => (
                        <Input
                          id="minimumOrderAmount"
                          type="number"
                          step="0.01"
                          min="0"
                          value={field.state.value || ""}
                          onChange={(e) =>
                            field.handleChange(
                              e.target.value ? parseFloat(e.target.value) : null
                            )
                          }
                          placeholder="Npr. 100.00"
                        />
                      )}
                    />
                  </div>
                );
              }
              return (
                <div className="flex flex-col gap-2">
                  <Label htmlFor="price">Cijena (BAM)</Label>
                  <form.Field
                    name="price"
                    validators={{
                      onChange: ({ value }) => {
                        return value >= 0 ? undefined : "Cijena mora biti pozitivna";
                      },
                    }}
                    children={(field) => (
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(parseFloat(e.target.value) || 0)}
                      />
                    )}
                  />
                </div>
              );
            }}
          />
          <div className="flex items-center gap-2">
            <form.Field
              name="active"
              children={(field) => (
                <>
                  <Switch
                    checked={field.state.value}
                    onCheckedChange={field.handleChange}
                  />
                  <Label htmlFor="active">Aktivan</Label>
                </>
              )}
            />
          </div>
          <form.Subscribe
            selector={(state) => [
              state.isSubmitting,
              state.isValid,
              state.isDirty,
            ]}
            children={([isSubmitting, isValid, isDirty]) => {
              return (
                <Button
                  type="submit"
                  disabled={!isValid || isSubmitting || !isDirty}
                  className="w-fit ml-auto"
                >
                  {isSubmitting ? (
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    "Spremi"
                  )}
                </Button>
              );
            }}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}

