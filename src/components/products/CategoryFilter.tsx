import * as React from "react";
import { PlusCircle } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
import { Checkbox } from "../ui/checkbox";
import { Route } from "@/routes/admin/products/index";
import { getAllCategoriesForSelectServerFn } from "@/queries/products";

export function CategoryFilter() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const [open, setOpen] = React.useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories-for-select"],
    queryFn: async () => {
      const response = await getAllCategoriesForSelectServerFn({ data: {} });
      return response;
    },
  });

  const selectedCategoryId = search.categoryId;
  const selectedCategory = categories.find(
    (cat) => cat.id === selectedCategoryId
  );

  const handleCategoryChange = (categoryId: string | undefined) => {
    navigate({
      to: ".",
      search: (prev) => ({
        ...prev,
        categoryId,
        page: 1,
      }),
    });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between border-dashed"
        >
          <PlusCircle className="size-4" />
          {selectedCategory ? (
            <div className="flex items-center gap-2">
              <span>Kategorija</span>
              <div className="flex items-center gap-2 border-l pl-2">
                <div className="text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-600">
                  {selectedCategory.name}
                </div>
              </div>
            </div>
          ) : (
            "Kategorija"
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Odaberi kategoriju" className="h-9" />
          <CommandList>
            <CommandEmpty>Nema rezultata.</CommandEmpty>
            <CommandGroup>
              <CommandItem onSelect={() => handleCategoryChange(undefined)}>
                <Checkbox
                  checked={!selectedCategoryId}
                  onCheckedChange={() => handleCategoryChange(undefined)}
                />
                Sve kategorije
              </CommandItem>
              {categories.map((category) => (
                <CommandItem
                  key={category.id}
                  value={category.id}
                  onSelect={() => handleCategoryChange(category.id)}
                >
                  <Checkbox
                    checked={selectedCategoryId === category.id}
                    onCheckedChange={(checked) => {
                      handleCategoryChange(checked ? category.id : undefined);
                    }}
                  />
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
