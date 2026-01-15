import { useUploadFiles } from "@better-upload/client";
import { cn } from "@/lib/utils";
import { Loader2, Upload, X } from "lucide-react";
import { useId, useState } from "react";
import { useDropzone } from "react-dropzone";
import { createMediaServerFn } from "@/queries/products";
import { ProxyImage } from "@/components/ui/proxy-image";
import { Button } from "@/components/ui/button";

interface SingleImageUploaderProps {
  value?: string | null;
  onChange?: (url: string | null) => void;
  className?: string;
  aspectRatio?: "square" | "video" | "auto";
  placeholder?: string;
}

export function SingleImageUploader({
  value,
  onChange,
  className,
  aspectRatio = "auto",
  placeholder = "Prebaci sliku ovdje ili klikni za upload",
}: SingleImageUploaderProps) {
  const id = useId();
  const [isUploading, setIsUploading] = useState(false);

  const handleUploadComplete = async (data: {
    files: Array<{
      name: string;
      size: number;
      type: string;
      objectInfo: { key: string };
    }>;
    metadata?: { publicUrls?: string[] };
  }) => {
    setIsUploading(true);
    try {
      const file = data.files[0];
      const url = data.metadata?.publicUrls?.[0] || "";

      // Create media record in database
      await createMediaServerFn({
        data: {
          filename: file.objectInfo.key,
          originalFilename: file.name,
          mimeType: file.type,
          size: file.size,
          url,
          type: "image",
          storage: "s3",
        },
      });

      onChange?.(url);
    } catch (error) {
      console.error("Error uploading image:", error);
    } finally {
      setIsUploading(false);
    }
  };

  const { control } = useUploadFiles({
    route: "images",
    onUploadComplete: handleUploadComplete,
  });

  const { getRootProps, getInputProps, isDragActive, inputRef } = useDropzone({
    onDrop: (files) => {
      if (files.length > 0 && !control.isPending) {
        control.upload(files.slice(0, 1), {});
      }
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    },
    noClick: true,
    maxFiles: 1,
  });

  const handleRemove = () => {
    onChange?.(null);
  };

  const aspectRatioClass = {
    square: "aspect-square",
    video: "aspect-video",
    auto: "",
  }[aspectRatio];

  if (value) {
    return (
      <div className={cn("relative group", aspectRatioClass, className)}>
        <ProxyImage
          src={value}
          alt="Uploaded image"
          width={400}
          height={aspectRatio === "square" ? 400 : 225}
          resizingType="fit"
          className="w-full h-full object-contain rounded-lg border bg-muted"
        />
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 size-8 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={handleRemove}
        >
          <X className="size-4" />
        </Button>
      </div>
    );
  }

  const isPending = control.isPending || isUploading;

  return (
    <div
      className={cn(
        "border-input text-foreground relative rounded-lg border border-dashed transition-colors",
        isDragActive && "border-primary/80",
        className
      )}
    >
      <label
        {...getRootProps()}
        className={cn(
          "dark:bg-input/10 flex w-full cursor-pointer flex-col items-center justify-center rounded-lg bg-transparent px-4 py-8 transition-colors",
          isPending && "text-muted-foreground cursor-not-allowed",
          !isPending && "hover:bg-accent dark:hover:bg-accent/40",
          isDragActive && "opacity-0",
          aspectRatioClass
        )}
        htmlFor={id}
      >
        <div className="mb-3">
          {isPending ? (
            <Loader2 className="size-6 animate-spin" />
          ) : (
            <Upload className="size-6" />
          )}
        </div>

        <p className="text-sm text-center text-muted-foreground">
          {placeholder}
        </p>

        <input
          {...getInputProps()}
          type="file"
          id={id}
          accept="image/*"
          disabled={isPending}
        />
      </label>

      {isDragActive && (
        <div className="pointer-events-none absolute inset-0 rounded-lg">
          <div className="dark:bg-accent/40 bg-accent flex size-full flex-col items-center justify-center rounded-lg">
            <Upload className="size-6 mb-2" />
            <p className="text-sm font-medium">Pusti sliku ovdje</p>
          </div>
        </div>
      )}
    </div>
  );
}
