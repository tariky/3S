import * as React from "react";
import { PlusCircle } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
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

const statusOptions = [
  {
    value: "active",
    label: "Aktivni",
  },
  {
    value: "draft",
    label: "Skica",
  },
  {
    value: "archived",
    label: "Neaktivni",
  },
];

export function StatusFilter() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const [open, setOpen] = React.useState(false);
  
  const selectedStatus = search.status;

  const handleStatusChange = (status: "draft" | "active" | "archived" | undefined) => {
    navigate({
      to: ".",
      search: (prev) => ({
        ...prev,
        status,
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
          {selectedStatus ? (
            <div className="flex items-center gap-2">
              <span>Status</span>
              <div className="flex items-center gap-2 border-l pl-2">
                <div className="text-xs px-2 py-1 rounded-md bg-gray-100 text-gray-600">
                  {statusOptions.find((opt) => opt.value === selectedStatus)?.label || selectedStatus}
                </div>
              </div>
            </div>
          ) : (
            "Status"
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Odaberi status" className="h-9" />
          <CommandList>
            <CommandEmpty>Nema rezultata.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                onSelect={() => handleStatusChange(undefined)}
              >
                <Checkbox
                  checked={!selectedStatus}
                  onCheckedChange={() => handleStatusChange(undefined)}
                />
                Svi
              </CommandItem>
              {statusOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => handleStatusChange(option.value as "draft" | "active" | "archived")}
                >
                  <Checkbox
                    checked={selectedStatus === option.value}
                    onCheckedChange={(checked) => {
                      handleStatusChange(
                        checked
                          ? (option.value as "draft" | "active" | "archived")
                          : undefined
                      );
                    }}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
