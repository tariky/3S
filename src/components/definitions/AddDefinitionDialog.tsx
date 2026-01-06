import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DEFINITIONS_QUERY_KEY,
  createDefinitionServerFn,
} from "@/queries/definitions";
import { useQueryClient } from "@tanstack/react-query";

export function AddDefinitionDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const form = useForm({
    defaultValues: {
      name: "",
      type: "",
      values: "",
      position: 0,
    },
    onSubmit: async ({ value }) => {
      const valuesArray = value.values
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v.length > 0);
      
      await createDefinitionServerFn({
        data: {
          name: value.name,
          type: value.type,
          values: valuesArray,
          position: value.position,
        },
      });
      queryClient.invalidateQueries({ queryKey: [DEFINITIONS_QUERY_KEY] });
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
          <DialogTitle className="text-left">Dodaj novu definiciju</DialogTitle>
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
                  placeholder="npr. Veličina"
                />
              )}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="type">Tip</Label>
            <form.Field
              name="type"
              validators={{
                onChange: ({ value }) => {
                  return value.length > 0 ? undefined : "Tip je obavezan";
                },
              }}
              children={(field) => (
                <Input
                  id="type"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="npr. size, color, material"
                />
              )}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="values">Vrijednosti (odvojene zarezom)</Label>
            <form.Field
              name="values"
              validators={{
                onChange: ({ value }) => {
                  const valuesArray = value
                    .split(",")
                    .map((v) => v.trim())
                    .filter((v) => v.length > 0);
                  return valuesArray.length > 0
                    ? undefined
                    : "Potrebna je barem jedna vrijednost";
                },
              }}
              children={(field) => (
                <Input
                  id="values"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  placeholder="npr. S, M, L, XL"
                />
              )}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="position">Pozicija</Label>
            <form.Field
              name="position"
              children={(field) => (
                <Input
                  id="position"
                  type="number"
                  value={field.state.value}
                  onChange={(e) =>
                    field.handleChange(parseInt(e.target.value) || 0)
                  }
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

