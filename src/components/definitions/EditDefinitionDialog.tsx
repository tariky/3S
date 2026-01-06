import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DEFINITIONS_QUERY_KEY,
  updateDefinitionServerFn,
} from "@/queries/definitions";
import { useQueryClient } from "@tanstack/react-query";

interface EditDefinitionDialogProps {
  definitionId: string;
  defaultValues: {
    name: string;
    type: string;
    values: string[];
    position: number;
  };
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function EditDefinitionDialog({
  definitionId,
  defaultValues,
  trigger,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: EditDefinitionDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setIsOpen = controlledOnOpenChange || setInternalOpen;
  const queryClient = useQueryClient();
  const form = useForm({
    defaultValues: {
      name: defaultValues.name,
      type: defaultValues.type,
      values: Array.isArray(defaultValues.values)
        ? defaultValues.values.join(", ")
        : typeof defaultValues.values === "string"
          ? defaultValues.values
          : "",
      position: defaultValues.position,
    },
    onSubmit: async ({ value }) => {
      const valuesArray = value.values
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v.length > 0);

      await updateDefinitionServerFn({
        data: {
          id: definitionId,
          name: value.name,
          type: value.type,
          values: valuesArray,
          position: value.position,
        },
      });
      queryClient.invalidateQueries({ queryKey: [DEFINITIONS_QUERY_KEY] });
      setIsOpen(false);
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.setFieldValue("name", defaultValues.name);
      form.setFieldValue("type", defaultValues.type);
      const valuesString = Array.isArray(defaultValues.values)
        ? defaultValues.values.join(", ")
        : typeof defaultValues.values === "string"
          ? defaultValues.values
          : "";
      form.setFieldValue("values", valuesString);
      form.setFieldValue("position", defaultValues.position);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isOpen,
    defaultValues.name,
    defaultValues.type,
    defaultValues.values,
    defaultValues.position,
  ]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline">Uredi</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-left">Uredi definiciju</DialogTitle>
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

