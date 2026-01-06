import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllCustomersQueryOptions } from "@/queries/customers";
import { Loader2 } from "lucide-react";

interface CustomerSearchProps {
  onSelectCustomer: (customer: any) => void;
}

export function CustomerSearch({ onSelectCustomer }: CustomerSearchProps) {
  const [search, setSearch] = useState("");
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  const { data, isLoading } = useQuery(
    getAllCustomersQueryOptions({
      search,
      page: 1,
      limit: 10,
    })
  );

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      // Query will refetch automatically
    }, 300);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [search]);

  return (
    <div className="flex flex-col gap-2">
      <Input
        placeholder="Pretraga"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="h-36 bg-gray-100 border rounded-md p-2 overflow-y-auto flex flex-col gap-2">
        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="size-4 animate-spin" />
          </div>
        )}
        {!isLoading && data?.data && data.data.length === 0 && search && (
          <div className="text-center py-4 text-gray-500 text-sm">
            Nema pronađenih kupaca
          </div>
        )}
        {!isLoading &&
          data?.data &&
          data.data.map((customer: any) => (
            <span
              key={customer.id}
              className="text-sm font-medium bg-white rounded-md p-2 hover:bg-gray-200 cursor-pointer"
              onClick={() => onSelectCustomer(customer)}
            >
              {customer.firstName || customer.lastName
                ? `${customer.firstName || ""} ${customer.lastName || ""}`.trim()
                : customer.email}
            </span>
          ))}
      </div>
    </div>
  );
}

