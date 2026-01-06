import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "@tanstack/react-form";
import { Loader } from "lucide-react";
import { useEffect, useState } from "react";
import {
  DialogHeader,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  Dialog,
} from "../ui/dialog";
import {
  VENDORS_QUERY_KEY,
  updateVendorServerFn,
} from "@/queries/vendors";
import { useQueryClient } from "@tanstack/react-query";

interface EditVendorDialogProps {
  vendorId: string;
  defaultValues: {
    name: string;
    email: string | null;
    phone: string | null;
    website: string | null;
    address: string | null;
    active: boolean;
  };
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EditVendorDialog({
  vendorId,
  defaultValues,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: EditVendorDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = controlledOnOpenChange || setInternalOpen;
  const queryClient = useQueryClient();
  const form = useForm({
    defaultValues: {
      name: defaultValues.name,
      email: defaultValues.email || "",
      phone: defaultValues.phone || "",
      website: defaultValues.website || "",
      address: defaultValues.address || "",
      active: defaultValues.active,
    },
    onSubmit: async ({ value }) => {
      await updateVendorServerFn({
        data: {
          id: vendorId,
          name: value.name,
          email: value.email || null,
          phone: value.phone || null,
          website: value.website || null,
          address: value.address || null,
          active: value.active,
        },
      });
      queryClient.invalidateQueries({ queryKey: [VENDORS_QUERY_KEY] });
      setIsOpen(false);
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.setFieldValue("name", defaultValues.name);
      form.setFieldValue("email", defaultValues.email || "");
      form.setFieldValue("phone", defaultValues.phone || "");
      form.setFieldValue("website", defaultValues.website || "");
      form.setFieldValue("address", defaultValues.address || "");
      form.setFieldValue("active", defaultValues.active);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, defaultValues.name, defaultValues.email, defaultValues.phone, defaultValues.website, defaultValues.address, defaultValues.active]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Uredi</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-left">Uredi dobavljača</DialogTitle>
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
                    "Sačuvaj"
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

