import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCustomerServerFn, CUSTOMERS_QUERY_KEY } from "@/queries/customers";
import { useState } from "react";
import { Loader2 } from "lucide-react";

interface AddCustomerDialogProps {
  onCustomerAdded: (customer: any) => void;
  trigger?: React.ReactNode;
}

export function AddCustomerDialog({
  onCustomerAdded,
  trigger,
}: AddCustomerDialogProps) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm({
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      phone: "",
      acceptsMarketing: false,
      address: "",
      city: "",
      zip: "",
    },
    onSubmit: async ({ value }) => {
      await createMutation.mutateAsync(value);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: {
      email?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      acceptsMarketing?: boolean;
      address?: string;
      city?: string;
      zip?: string;
    }) => {
      return await createCustomerServerFn({ data });
    },
    onSuccess: (customer) => {
      queryClient.invalidateQueries({ queryKey: [CUSTOMERS_QUERY_KEY] });
      onCustomerAdded(customer);
      setOpen(false);
      form.reset();
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="icon">
            <span className="text-xs">+</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dodaj novog kupca</DialogTitle>
          <DialogDescription>
            Unesi podatke o novom kupcu.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="flex flex-col gap-4"
        >
          <form.Field
            name="email"
            validators={{
              onChangeAsyncDebounceMs: 500,
              onChangeAsync: async ({ value }) => {
                if (!value || value.trim() === "") return undefined;
                // Basic email validation only if email is provided
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) {
                  return "Nevažeći email format";
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Email</Label>
                <Input
                  id={field.name}
                  type="email"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  placeholder="opciono"
                />
                {field.state.meta.errors && (
                  <span className="text-sm text-red-500">
                    {field.state.meta.errors[0]}
                  </span>
                )}
              </div>
            )}
          </form.Field>

          <form.Field name="firstName">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Ime</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="lastName">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Prezime</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="phone">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Telefon</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="address">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Adresa</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="city">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Grad</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="zip">
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Poštanski broj</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                />
              </div>
            )}
          </form.Field>

          <form.Field name="acceptsMarketing">
            {(field) => (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id={field.name}
                  checked={field.state.value}
                  onChange={(e) => field.handleChange(e.target.checked)}
                  onBlur={field.handleBlur}
                  className="rounded"
                />
                <Label htmlFor={field.name}>Prihvata marketing</Label>
              </div>
            )}
          </form.Field>

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Otkaži
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending && (
                <Loader2 className="size-4 animate-spin mr-2" />
              )}
              Dodaj kupca
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

