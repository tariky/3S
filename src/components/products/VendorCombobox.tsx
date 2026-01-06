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
import { getAllVendorsForSelectServerFn } from "@/queries/products";

interface VendorComboboxProps {
  value?: string;
  onValueChange?: (value: string | undefined) => void;
}

export function VendorCombobox({ value, onValueChange }: VendorComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ["vendors-for-select"],
    queryFn: async () => {
      const response = await getAllVendorsForSelectServerFn({ data: {} });
      return response;
    },
  });

  const selectedVendor = vendors.find((vendor) => vendor.id === value);

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
          {selectedVendor ? selectedVendor.name : "Odaberi dobavljača"}
          <ChevronDown className={"size-4 opacity-50"} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0">
        <Command>
          <CommandInput
            placeholder="Odaberi dobavljača"
            className="h-9"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>Nema rezultata.</CommandEmpty>
            <CommandGroup>
              {vendors
                .filter((vendor) =>
                  vendor.name.toLowerCase().includes(search.toLowerCase())
                )
                .map((vendor) => (
                  <CommandItem
                    key={vendor.id}
                    value={vendor.id}
                    onSelect={(currentValue) => {
                      const newValue = currentValue === value ? undefined : currentValue;
                      onValueChange?.(newValue);
                      setOpen(false);
                    }}
                  >
                    {vendor.name}
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
