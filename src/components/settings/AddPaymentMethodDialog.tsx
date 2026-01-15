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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  PAYMENT_METHODS_QUERY_KEY,
  createPaymentMethodServerFn,
} from "@/queries/payment-methods";
import { useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";

const PAYMENT_TYPES = [
  { value: "cod", label: "Pouzeće (COD)" },
  { value: "card", label: "Kartica" },
  { value: "bank_transfer", label: "Bankovna transakcija" },
] as const;

export function AddPaymentMethodDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      type: "cod" as string,
      active: true,
    },
    onSubmit: async ({ value }) => {
      await createPaymentMethodServerFn({
        data: {
          name: value.name,
          description: value.description || undefined,
          type: value.type,
          active: value.active,
        },
      });
      queryClient.invalidateQueries({ queryKey: [PAYMENT_METHODS_QUERY_KEY] });
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
          <DialogTitle className="text-left">Dodaj novi način plaćanja</DialogTitle>
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
          <div className="flex flex-col gap-2">
            <Label htmlFor="type">Tip plaćanja</Label>
            <form.Field
              name="type"
              children={(field) => (
                <Select
                  value={field.state.value}
                  onValueChange={field.handleChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Odaberi tip" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
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

