import { useState, useEffect } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import {
  getSkuGeneratorSettingsServerFn,
  updateSkuGeneratorSettingsServerFn,
  SETTINGS_QUERY_KEY,
} from "@/queries/settings";

export function SkuGeneratorSettings() {
  const queryClient = useQueryClient();
  const [previewSku, setPreviewSku] = useState("");

  const { data: settings, isLoading } = useQuery({
    queryKey: [SETTINGS_QUERY_KEY, "sku"],
    queryFn: async () => {
      return await getSkuGeneratorSettingsServerFn();
    },
  });

  const form = useForm({
    defaultValues: {
      prefix: "SKU",
      digits: 5,
    },
    onSubmit: async ({ value }) => {
      await updateMutation.mutateAsync(value);
    },
  });

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      form.setFieldValue("prefix", settings.prefix);
      form.setFieldValue("digits", settings.digits);
      updatePreview(settings.prefix, settings.digits, settings.counter);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data: { prefix: string; digits: number }) => {
      return await updateSkuGeneratorSettingsServerFn({ data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SETTINGS_QUERY_KEY] });
      if (form.state.values.prefix && form.state.values.digits) {
        updatePreview(
          form.state.values.prefix,
          form.state.values.digits,
          settings?.counter || 1
        );
      }
    },
  });

  const updatePreview = (prefix: string, digits: number, counter: number = 1) => {
    const paddedNumber = String(counter).padStart(digits, "0");
    setPreviewSku(`${prefix}${paddedNumber}`);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SKU Generator</CardTitle>
          <CardDescription>
            Konfigurišite automatsko generisanje SKU kodova za proizvode
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>SKU Generator</CardTitle>
        <CardDescription>
          Konfigurišite automatsko generisanje SKU kodova za proizvode. Novi
          proizvodi će automatski dobiti SKU kod prema ovim postavkama.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="flex flex-col gap-4"
        >
          <form.Field
            name="prefix"
            validators={{
              onChange: ({ value }) => {
                if (!value || value.trim() === "") {
                  return "Prefiks je obavezan";
                }
                if (value.length > 10) {
                  return "Prefiks ne može biti duži od 10 karaktera";
                }
                if (!/^[A-Z0-9]+$/i.test(value)) {
                  return "Prefiks može sadržavati samo slova i brojeve";
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>SKU Prefiks</Label>
                <Input
                  id={field.name}
                  value={field.state.value}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase();
                    field.handleChange(value);
                    if (form.state.values.digits) {
                      updatePreview(
                        value,
                        form.state.values.digits,
                        settings?.counter || 1
                      );
                    }
                  }}
                  onBlur={field.handleBlur}
                  placeholder="npr. LU"
                  maxLength={10}
                />
                {field.state.meta.errors && (
                  <span className="text-sm text-red-500">
                    {field.state.meta.errors[0]}
                  </span>
                )}
              </div>
            )}
          </form.Field>

          <form.Field
            name="digits"
            validators={{
              onChange: ({ value }) => {
                if (value < 1 || value > 10) {
                  return "Broj cifara mora biti između 1 i 10";
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <div className="flex flex-col gap-2">
                <Label htmlFor={field.name}>Broj cifara</Label>
                <Input
                  id={field.name}
                  type="number"
                  min="1"
                  max="10"
                  value={field.state.value}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 5;
                    field.handleChange(value);
                    if (form.state.values.prefix) {
                      updatePreview(
                        form.state.values.prefix,
                        value,
                        settings?.counter || 1
                      );
                    }
                  }}
                  onBlur={field.handleBlur}
                />
                {field.state.meta.errors && (
                  <span className="text-sm text-red-500">
                    {field.state.meta.errors[0]}
                  </span>
                )}
              </div>
            )}
          </form.Field>

          {previewSku && (
            <div className="flex flex-col gap-2 p-4 bg-gray-50 rounded-md">
              <Label className="text-sm font-medium">Pregled SKU formata:</Label>
              <div className="flex flex-col gap-1">
                <p className="text-sm text-gray-600">
                  Prvi proizvod: <span className="font-mono font-semibold">{previewSku}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Drugi proizvod:{" "}
                  <span className="font-mono font-semibold">
                    {form.state.values.prefix}
                    {String((settings?.counter || 1) + 1).padStart(
                      form.state.values.digits,
                      "0"
                    )}
                  </span>
                </p>
                <p className="text-sm text-gray-600">
                  Varijanta (prva):{" "}
                  <span className="font-mono font-semibold">
                    {previewSku}-1
                  </span>
                </p>
                <p className="text-sm text-gray-600">
                  Varijanta (druga):{" "}
                  <span className="font-mono font-semibold">
                    {previewSku}-2
                  </span>
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              type="submit"
              disabled={updateMutation.isPending || !form.state.isValid}
            >
              {updateMutation.isPending && (
                <Loader2 className="size-4 animate-spin mr-2" />
              )}
              Sačuvaj postavke
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

