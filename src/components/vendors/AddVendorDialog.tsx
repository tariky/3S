import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "@tanstack/react-form";
import { Loader } from "lucide-react";
import { useState } from "react";
import {
  DialogHeader,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  Dialog,
} from "../ui/dialog";
import {
  VENDORS_QUERY_KEY,
  createVendorServerFn,
} from "@/queries/vendors";
import { useQueryClient } from "@tanstack/react-query";

export function AddVendorDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      website: "",
      address: "",
      active: true,
    },
    onSubmit: async ({ value }) => {
      await createVendorServerFn({
        data: {
          name: value.name,
          email: value.email || null,
          phone: value.phone || null,
          website: value.website || null,
          address: value.address || null,
          active: value.active,
        },
      });
      queryClient.invalidateQueries({ queryKey: [VENDORS_QUERY_KEY] });
      form.reset();
      setIsOpen(false);
    },
  });
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Dodaj</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-left">Dodaj novog dobavljača</DialogTitle>
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
                  return value.length > 2 ? undefined : "Naziv je obavezan";
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
            <Label htmlFor="email">Email</Label>
            <form.Field
              name="email"
              children={(field) => (
                <Input
                  id="email"
                  type="email"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              )}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="phone">Telefon</Label>
            <form.Field
              name="phone"
              children={(field) => (
                <Input
                  id="phone"
                  type="tel"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              )}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="website">Website</Label>
            <form.Field
              name="website"
              children={(field) => (
                <Input
                  id="website"
                  type="url"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              )}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="address">Adresa</Label>
            <form.Field
              name="address"
              children={(field) => (
                <Textarea
                  id="address"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  rows={3}
                />
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
                    "Dodaj"
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

