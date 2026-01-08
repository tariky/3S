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
import { ChevronDown, Trash2 } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import type { Customer } from "@/db/schema";
import {
  getAllCustomersQueryOptions,
  deleteCustomerMutationOptions,
  CUSTOMERS_QUERY_KEY,
} from "@/queries/customers";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Route } from "@/routes/admin/customers/index";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export function CustomersTable() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState(search.search || "");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(
    null
  );

  const columns: ColumnDef<Customer>[] = React.useMemo(
    () => [
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
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <div className="font-medium">{row.getValue("email")}</div>
        ),
        size: 200,
      },
      {
        accessorKey: "firstName",
        header: "Ime",
        cell: ({ row }) => (
          <div className="text-sm">{row.getValue("firstName") || "-"}</div>
        ),
        size: 150,
      },
      {
        accessorKey: "lastName",
        header: "Prezime",
        cell: ({ row }) => (
          <div className="text-sm">{row.getValue("lastName") || "-"}</div>
        ),
        size: 150,
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
        accessorKey: "totalSpent",
        header: "Ukupno potrošeno",
        cell: ({ row }) => {
          const total = row.getValue("totalSpent") as string;
          return (
            <div className="text-sm font-medium">
              {total ? `${parseFloat(total).toFixed(2)} BAM` : "0.00 BAM"}
            </div>
          );
        },
        size: 150,
      },
      {
        accessorKey: "ordersCount",
        header: "Broj narudžbi",
        cell: ({ row }) => (
          <div className="text-sm">{row.getValue("ordersCount") || 0}</div>
        ),
        size: 120,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.getValue("status") as string;
          const statusLabels: Record<string, string> = {
            active: "Aktivan",
            inactive: "Neaktivan",
            blocked: "Blokiran",
          };
          return (
            <div
              className={cn(
                "capitalize text-sm",
                status === "active"
                  ? "text-green-500"
                  : status === "inactive"
                    ? "text-gray-500"
                    : "text-red-500"
              )}
            >
              {statusLabels[status] || status}
            </div>
          );
        },
        size: 120,
      },
      {
        accessorKey: "createdAt",
        header: "Datum",
        cell: ({ row }) => {
          const date = row.getValue("createdAt") as Date | string | null;
          if (!date) return "-";
          const dateObj = typeof date === "string" ? new Date(date) : date;
          // Format date consistently to avoid hydration mismatch
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, "0");
          const day = String(dateObj.getDate()).padStart(2, "0");
          return (
            <div className="text-sm">
              {`${day}.${month}.${year}`}
            </div>
          );
        },
        size: 120,
      },
      {
        id: "actions",
        size: 100,
        enableHiding: false,
        cell: ({ row }) => {
          const customer = row.original;
          return (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setCustomerToDelete(customer);
                  setDeleteDialogOpen(true);
                }}
                disabled={customer.ordersCount > 0}
                title={
                  customer.ordersCount > 0
                    ? "Ne možete obrisati kupca koji ima narudžbe"
                    : "Obriši kupca"
                }
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    []
  );

  const { data, isLoading } = useQuery(
    getAllCustomersQueryOptions({
      search: search.search,
      page: search.page,
      limit: search.limit,
    })
  );

  const deleteCustomerMutation = useMutation(
    deleteCustomerMutationOptions({
      id: customerToDelete?.id || "",
    })
  );

  const handleDelete = () => {
    if (customerToDelete) {
      deleteCustomerMutation.mutate(undefined, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: [CUSTOMERS_QUERY_KEY] });
          setDeleteDialogOpen(false);
          setCustomerToDelete(null);
        },
        onError: (error: any) => {
          alert(error.message || "Došlo je do greške pri brisanju kupca.");
        },
      });
    }
  };

  const searchTimeoutRef = React.useRef<NodeJS.Timeout | undefined>(undefined);

  React.useEffect(() => {
    setSearchInput(search.search || "");
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
            placeholder="Pretraži po emailu, imenu, prezimenu ili telefonu"
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
        </div>
      </div>
      <div className="rounded-md border">
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
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Učitavanje...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
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
                  Nema rezultata.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between py-4">
        <div className="text-sm text-muted-foreground">
          {data?.total ? (
            <>
              Prikazano {data.data.length} od {data.total} kupaca
            </>
          ) : (
            "Nema kupaca"
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(search.page - 1)}
            disabled={!data?.hasPreviousPage || isLoading}
          >
            Prethodna
          </Button>
          <div className="text-sm">
            Stranica {search.page} od{" "}
            {data ? Math.ceil(data.total / search.limit) : 1}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(search.page + 1)}
            disabled={!data?.hasNextPage || isLoading}
          >
            Sljedeća
          </Button>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Obriši kupca</AlertDialogTitle>
            <AlertDialogDescription>
              Da li ste sigurni da želite obrisati ovog kupca? Ova akcija ne
              može biti poništena.
              {customerToDelete && (
                <div className="mt-2 p-2 bg-gray-100 rounded">
                  <p className="font-medium">{customerToDelete.email}</p>
                  {(customerToDelete.firstName || customerToDelete.lastName) && (
                    <p className="text-sm">
                      {customerToDelete.firstName} {customerToDelete.lastName}
                    </p>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Odustani</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteCustomerMutation.isPending}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteCustomerMutation.isPending && (
                <Loader2 className="size-4 animate-spin mr-2" />
              )}
              Obriši
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

