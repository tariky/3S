"use client";

import * as React from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { ChevronDown, TrashIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { ShippingMethod } from "@/db/schema";
import { AddShippingMethodDialog } from "./AddShippingMethodDialog";
import { EditShippingMethodDialog } from "./EditShippingMethodDialog";
import {
  SHIPPING_METHODS_QUERY_KEY,
  deleteShippingMethodsMutationOptions,
  getAllShippingMethodsQueryOptions,
} from "@/queries/shipping-methods";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

export const columns: ColumnDef<ShippingMethod>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    size: 30,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: "Naziv",
    cell: ({ row }) => <div>{row.getValue("name")}</div>,
    size: 300,
  },
  {
    accessorKey: "description",
    header: "Opis",
    cell: ({ row }) => (
      <div className="max-w-[300px] truncate">
        {row.getValue("description") || "-"}
      </div>
    ),
    size: 400,
  },
  {
    accessorKey: "price",
    header: "Cijena / Tip",
    cell: ({ row }) => {
      const isFreeShipping = row.original.isFreeShipping;
      const price = parseFloat(row.getValue("price") || "0");
      const minimumOrderAmount = row.original.minimumOrderAmount
        ? parseFloat(row.original.minimumOrderAmount)
        : null;

      if (isFreeShipping) {
        return (
          <div className="flex flex-col">
            <div className="font-medium text-green-600">Besplatna dostava</div>
            {minimumOrderAmount && (
              <div className="text-xs text-muted-foreground">
                Preko {minimumOrderAmount.toFixed(2)} BAM
              </div>
            )}
          </div>
        );
      }
      return <div>{price.toFixed(2)} BAM</div>;
    },
    size: 200,
  },
  {
    accessorKey: "active",
    header: "Aktivan",
    cell: ({ row }) => (
      <div>{row.getValue("active") ? "Da" : "Ne"}</div>
    ),
    size: 100,
  },
  {
    id: "actions",
    size: 100,
    enableHiding: false,
    cell: ({ row }) => {
      const queryClient = useQueryClient();
      const deleteShippingMethodMutation = useMutation(
        deleteShippingMethodsMutationOptions({ ids: [row.original.id] })
      );
      return (
        <div className="flex items-center gap-2">
          <EditShippingMethodDialog
            methodId={row.original.id}
            defaultValues={{
              name: row.original.name,
              description: row.original.description || "",
              price: parseFloat(row.original.price || "0"),
              isFreeShipping: row.original.isFreeShipping || false,
              minimumOrderAmount: row.original.minimumOrderAmount
                ? parseFloat(row.original.minimumOrderAmount)
                : null,
              active: row.original.active,
            }}
          />
          <Button
            variant="destructive"
            size="icon"
            onClick={async () => {
              await deleteShippingMethodMutation.mutateAsync();
              queryClient.invalidateQueries({
                queryKey: [SHIPPING_METHODS_QUERY_KEY],
              });
            }}
          >
            <TrashIcon className="size-4" />
          </Button>
        </div>
      );
    },
  },
];

export function ShippingMethodsTable() {
  const [searchInput, setSearchInput] = useState("");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [page, setPage] = useState(1);
  const limit = 25;

  const { data, isLoading } = useQuery(
    getAllShippingMethodsQueryOptions({
      search: searchInput,
      page: page,
      limit: limit,
    })
  );

  const searchTimeoutRef = React.useRef<NodeJS.Timeout | undefined>(undefined);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      setPage(1);
    }, 300);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const table = useReactTable({
    data: data?.data || [],
    columns,
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    columnResizeMode: "onChange",
    manualPagination: true,
    pageCount: data ? Math.ceil(data.total / limit) : 0,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
    },
  });

  return (
    <div className="w-full">
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Filtriraj"
            className="w-64"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-auto">
                Kolone <ChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
          <AddShippingMethodDialog />
        </div>
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="text-muted-foreground flex-1 text-sm">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {data?.total || 0} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={!data?.hasPreviousPage || isLoading}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={!data?.hasNextPage || isLoading}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

