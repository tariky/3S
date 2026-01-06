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

import { definitions } from "@/db/schema";
import { AddDefinitionDialog } from "./AddDefinitionDialog";
import { EditDefinitionDialog } from "./EditDefinitionDialog";
import {
  DEFINITIONS_QUERY_KEY,
  deleteDefinitionsMutationOptions,
  getAllDefinitionsQueryOptions,
} from "@/queries/definitions";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Route } from "@/routes/admin/products/definitions";

type Definition = typeof definitions.$inferSelect;

export const columns: ColumnDef<Definition>[] = [
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
    accessorKey: "type",
    header: "Tip",
    cell: ({ row }) => (
      <div className="text-sm capitalize">{row.getValue("type")}</div>
    ),
    size: 150,
  },
  {
    accessorKey: "values",
    header: "Vrijednosti",
    cell: ({ row }) => {
      const values = row.getValue("values");
      let valuesArray: string[] = [];
      if (Array.isArray(values)) {
        valuesArray = values;
      } else if (typeof values === "string") {
        try {
          valuesArray = JSON.parse(values);
        } catch {
          valuesArray = [];
        }
      }
      return (
        <div className="text-sm">
          {valuesArray.length > 0 ? valuesArray.join(", ") : "-"}
        </div>
      );
    },
    size: 300,
  },
  {
    accessorKey: "position",
    header: "Pozicija",
    cell: ({ row }) => (
      <div className="text-sm">{row.getValue("position")}</div>
    ),
    size: 100,
  },
  {
    id: "actions",
    size: 50,
    enableHiding: false,
    cell: ({ row }) => {
      const queryClient = useQueryClient();
      const deleteDefinitionsMutation = useMutation(
        deleteDefinitionsMutationOptions({ ids: [row.original.id] })
      );
      return (
        <div className="flex items-center gap-2">
          <EditDefinitionDialog
            definitionId={row.original.id}
            defaultValues={{
              name: row.original.name,
              type: row.original.type,
              values: Array.isArray(row.original.values)
                ? row.original.values
                : typeof row.original.values === "string"
                  ? JSON.parse(row.original.values)
                  : [],
              position: row.original.position,
            }}
          />
          <Button
            variant="destructive"
            size="icon"
            onClick={async () => {
              await deleteDefinitionsMutation.mutateAsync();
              queryClient.invalidateQueries({
                queryKey: [DEFINITIONS_QUERY_KEY],
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

export function DefinitionsTable() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const [searchInput, setSearchInput] = useState(search.search);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const { data, isLoading } = useQuery(
    getAllDefinitionsQueryOptions({
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
          <AddDefinitionDialog />
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

