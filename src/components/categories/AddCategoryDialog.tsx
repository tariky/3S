import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "@tanstack/react-form";
import { Loader, TrashIcon } from "lucide-react";
import { useEffect, useState } from "react";
import {
  DialogHeader,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  Dialog,
} from "../ui/dialog";
import {
  CATEGORIES_QUERY_KEY,
  createCategoryServerFn,
  slugCheckServerFn,
} from "@/queries/categories";
import { useUploadFiles } from "@better-upload/client";
import { UploadDropzone } from "../upload-dropzone";
import { useQueryClient } from "@tanstack/react-query";
import { ProxyImage } from "@/components/ui/proxy-image";

function SimpleStringSlugify(value: string) {
  return value.toLowerCase().replace(/\s+/g, "-");
}

export function AddCategoryDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const { control } = useUploadFiles({
    route: "images",
    onUploadComplete(data) {
      setImageUrl((data.metadata.publicUrls as string[])[0]);
    },
  });
  const form = useForm({
    defaultValues: {
      name: "",
      slug: "",
      image: undefined,
    },
    onSubmit: async ({ value }) => {
      const checkSlugAvailable = await slugCheckServerFn({
        data: { slug: value.slug },
      });
      await createCategoryServerFn({
        data: {
          name: value.name,
          slug: checkSlugAvailable,
          image: imageUrl || undefined,
        },
      });
      queryClient.invalidateQueries({ queryKey: [CATEGORIES_QUERY_KEY] });
      form.reset();
      setImageUrl(null);
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
          <DialogTitle className="text-left">Dodaj novu kategoriju</DialogTitle>
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
            <Label htmlFor="image">Slika</Label>
            {imageUrl && (
              <div className="relative w-fit">
                <Button
                  variant="outline"
                  className="absolute top-2 right-2 text-destructive"
                  onClick={() => setImageUrl(null)}
                >
                  <TrashIcon className="w-4 h-4" />
                </Button>
                <ProxyImage
                  src={imageUrl}
                  alt="Slika kategorije"
                  width={192}
                  height={192}
                  resizingType="fill"
                  className="w-48 h-48 object-cover rounded-md object-center fit-contain"
                />
              </div>
            )}
            {!imageUrl && (
              <UploadDropzone
                control={control}
                accept="image/*"
                description={{
                  maxFiles: 1,
                  maxFileSize: "5MB",
                  fileTypes: "JPEG, PNG",
                }}
              />
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Naziv</Label>
            <form.Field
              name="name"
              validators={{
                onChange: ({ value }) => {
                  return value.length > 2 ? undefined : "Naziv je obavezan";
                },
              }}
              children={(field) => {
                const slug = SimpleStringSlugify(field.state.value);
                form.setFieldValue("slug", slug);
                return (
                  <Input
                    id="name"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                );
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="slug">Slug</Label>
            <form.Field
              name="slug"
              validators={{
                onChange: ({ value }) => {
                  return value.length > 2 ? undefined : "Slug je obavezan";
                },
              }}
              children={(field) => (
                <Input
                  id="slug"
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
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
