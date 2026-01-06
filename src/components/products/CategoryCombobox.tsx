import * as React from "react";
import { ChevronDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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
import { getAllCategoriesForSelectServerFn } from "@/queries/products";

interface CategoryComboboxProps {
  value?: string;
  onValueChange?: (value: string | undefined) => void;
}

export function CategoryCombobox({
  value,
  onValueChange,
}: CategoryComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories-for-select"],
    queryFn: async () => {
      const response = await getAllCategoriesForSelectServerFn({ data: {} });
      return response;
    },
  });

  const selectedCategory = categories.find((cat) => cat.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            "px-3 w-full text-muted-foreground justify-between",
            value && "text-primary"
          )}
          aria-expanded={open}
          disabled={isLoading}
        >
          {selectedCategory ? selectedCategory.name : "Odaberi kategoriju"}
          <ChevronDown className={"size-4 opacity-50"} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0">
        <Command>
          <CommandInput
            placeholder="Odaberi kategoriju"
            className="h-9"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>Nema rezultata.</CommandEmpty>
            <CommandGroup>
              {categories
                .filter((cat) =>
                  cat.name.toLowerCase().includes(search.toLowerCase())
                )
                .map((category) => (
                  <CommandItem
                    key={category.id}
                    value={category.id}
                    onSelect={(currentValue) => {
                      const newValue = currentValue === value ? undefined : currentValue;
                      onValueChange?.(newValue);
                      setOpen(false);
                    }}
                  >
                    {category.name}
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
