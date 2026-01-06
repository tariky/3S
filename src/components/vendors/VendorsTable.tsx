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
import { useNavigate } from "@tanstack/react-router";

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

import { vendors } from "@/db/schema";
import { AddVendorDialog } from "./AddVendorDialog";
import { EditVendorDialog } from "./EditVendorDialog";
import {
  VENDORS_QUERY_KEY,
  deleteVendorsMutationOptions,
  getAllVendorsQueryOptions,
} from "@/queries/vendors";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Route } from "@/routes/admin/products/vendors";

type Vendor = typeof vendors.$inferSelect;

export const columns: ColumnDef<Vendor>[] = [
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
    cell: ({ row }) => <div className="capitalize">{row.getValue("name")}</div>,
    size: 200,
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <div className="text-sm">{row.getValue("email") || "-"}</div>
    ),
    size: 200,
  },
  {
    accessorKey: "phone",
    header: "Telefon",
    cell: ({ row }) => (
      <div className="text-sm">{row.getValue("phone") || "-"}</div>
    ),
    size: 150,
  },
  {
    accessorKey: "website",
    header: "Website",
    cell: ({ row }) => {
      const website = row.getValue("website") as string | null;
      return website ? (
        <a
          href={website}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline"
        >
          {website}
        </a>
      ) : (
        <div className="text-sm">-</div>
      );
    },
    size: 200,
  },
  {
    accessorKey: "address",
    header: "Adresa",
    cell: ({ row }) => (
      <div className="text-sm max-w-xs truncate">
        {row.getValue("address") || "-"}
      </div>
    ),
    size: 250,
  },
  {
    id: "actions",
    size: 50,
    enableHiding: false,
    cell: ({ row }) => {
      const queryClient = useQueryClient();
      const deleteVendorsMutation = useMutation(
        deleteVendorsMutationOptions({ ids: [row.original.id] })
      );
      return (
        <div className="flex items-center gap-2">
          <EditVendorDialog
            vendorId={row.original.id}
            defaultValues={{
              name: row.original.name,
              email: row.original.email,
              phone: row.original.phone,
              website: row.original.website,
              address: row.original.address,
              active: row.original.active,
            }}
          />
          <Button
            variant="destructive"
            size="icon"
            onClick={async () => {
              await deleteVendorsMutation.mutateAsync();
              queryClient.invalidateQueries({
                queryKey: [VENDORS_QUERY_KEY],
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

export function VendorsTable() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const [searchInput, setSearchInput] = useState(search.search);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const { data, isLoading } = useQuery(
    getAllVendorsQueryOptions({
      search: search.search,
      page: search.page,
      limit: search.limit,
    })
  );

  const searchTimeoutRef = React.useRef<NodeJS.Timeout | undefined>(undefined);

  React.useEffect(() => {
    setSearchInput(search.search);
  }, [search.search]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      navigate({
        to: ".",
        search: (prev) => ({
          ...prev,
          search: value,
          page: 1,
        }),
      });
    }, 300);
  };

  const handlePageChange = (newPage: number) => {
    navigate({
      to: ".",
      search: (prev) => ({
        ...prev,
        page: newPage,
      }),
    });
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
    pageCount: data ? Math.ceil(data.total / search.limit) : 0,
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
          <AddVendorDialog />
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
            onClick={() => handlePageChange(search.page - 1)}
            disabled={!data?.hasPreviousPage || isLoading}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(search.page + 1)}
            disabled={!data?.hasNextPage || isLoading}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

