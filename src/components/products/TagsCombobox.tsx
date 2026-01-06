import * as React from "react";
import { X, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  getAllTagsForSelectServerFn,
  createOrGetTagServerFn,
} from "@/queries/products";

interface TagsComboboxProps {
  value?: string[];
  onChange?: (value: string[]) => void;
  onBlur?: () => void;
}

export function TagsCombobox({
  value = [],
  onChange,
}: TagsComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [inputValue, setInputValue] = React.useState("");
  const queryClient = useQueryClient();

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ["tags-for-select"],
    queryFn: async () => {
      const response = await getAllTagsForSelectServerFn({ data: {} });
      return response;
    },
  });

  const createTagMutation = useMutation({
    mutationFn: async (name: string) => {
      return await createOrGetTagServerFn({ data: { name } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tags-for-select"] });
    },
  });

  const selectedTags = tags.filter((tag) => value.includes(tag.id));

  const handleAddTag = (tagId: string) => {
    if (!value.includes(tagId)) {
      onChange?.([...value, tagId]);
      setSearch("");
      setInputValue("");
    }
  };

  const handleCreateTag = async () => {
    if (!inputValue.trim()) return;

    const tag = await createTagMutation.mutateAsync(inputValue.trim());
    if (tag && !value.includes(tag.id)) {
      onChange?.([...value, tag.id]);
    }
    setInputValue("");
    setSearch("");
  };

  const handleRemoveTag = (tagId: string) => {
    onChange?.(value.filter((id) => id !== tagId));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      e.stopPropagation();
      handleCreateTag();
    }
  };

  const filteredTags = tags.filter(
    (tag) =>
      tag.name.toLowerCase().includes(search.toLowerCase()) &&
      !value.includes(tag.id)
  );

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            className={cn(
              "px-3 w-full text-muted-foreground justify-between min-h-[2.5rem] h-auto",
              value.length > 0 && "text-primary"
            )}
            aria-expanded={open}
            disabled={isLoading}
          >
            <div className="flex items-center gap-2 flex-wrap flex-1">
              {selectedTags.length > 0 ? (
                selectedTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary flex items-center gap-1"
                  >
                    {tag.name}
                    <X
                      className="size-3 cursor-pointer hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveTag(tag.id);
                      }}
                    />
                  </span>
                ))
              ) : (
                <span>Odaberi oznake</span>
              )}
            </div>
            <Plus className="size-4 opacity-50 ml-2" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-0" align="start">
          <Command>
            <CommandInput
              placeholder="Dodaj oznaku..."
              className="h-9"
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <div className="p-2 border-b">
                <Input
                  placeholder="Nova oznaka (Enter za dodavanje)"
                  className="h-8 text-sm"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
              {filteredTags.length === 0 && search === "" && (
                <CommandEmpty>Nema dostupnih oznaka.</CommandEmpty>
              )}
              {filteredTags.length > 0 && (
                <CommandGroup>
                  {filteredTags.map((tag) => (
                    <CommandItem
                      key={tag.id}
                      value={tag.id}
                      onSelect={() => {
                        handleAddTag(tag.id);
                        setOpen(false);
                      }}
                    >
                      {tag.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedTags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {selectedTags.map((tag) => (
            <div
              key={tag.id}
              className="text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-600 flex items-center gap-2"
            >
              <span>{tag.name}</span>
              <X
                className="size-4 cursor-pointer text-destructive"
                onClick={() => handleRemoveTag(tag.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

