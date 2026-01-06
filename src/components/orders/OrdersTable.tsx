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
import { ChevronDown, Eye } from "lucide-react";
import { useNavigate, Link } from "@tanstack/react-router";

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

import { orders } from "@/db/schema";
import { getAllOrdersQueryOptions } from "@/queries/orders";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Route } from "@/routes/admin/orders/index";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Order = typeof orders.$inferSelect & {
  customer?: { id: string; firstName: string | null; lastName: string | null; email: string | null } | null;
};

export function OrdersTable() {
  const navigate = useNavigate({ from: Route.fullPath });
  const search = Route.useSearch();
  const [searchInput, setSearchInput] = useState(search.search || "");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const columns: ColumnDef<Order>[] = React.useMemo(
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
        accessorKey: "orderNumber",
        header: "Broj narudžbe",
        cell: ({ row }) => (
          <div className="font-medium">{row.getValue("orderNumber")}</div>
        ),
        size: 150,
      },
      {
        accessorKey: "customer",
        header: "Kupac",
        cell: ({ row }) => {
          const customer = row.original.customer;
          if (customer) {
            const name = [customer.firstName, customer.lastName]
              .filter(Boolean)
              .join(" ");
            return <div className="text-sm">{name || customer.email || "-"}</div>;
          }
          return <div className="text-sm text-gray-400">{row.original.email || "-"}</div>;
        },
        size: 200,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.getValue("status") as string;
          const statusLabels: Record<string, string> = {
            pending: "Na čekanju",
            paid: "Plaćeno",
            fulfilled: "Isporučeno",
            cancelled: "Otkazano",
            refunded: "Refundirano",
          };
          return (
            <div
              className={cn(
                "capitalize",
                status === "pending"
                  ? "text-yellow-500"
                  : status === "paid"
                    ? "text-blue-500"
                    : status === "fulfilled"
                      ? "text-green-500"
                      : status === "cancelled"
                        ? "text-red-500"
                        : "text-gray-500"
              )}
            >
              {statusLabels[status] || status}
            </div>
          );
        },
        size: 120,
      },
      {
        accessorKey: "financialStatus",
        header: "Finansijski status",
        cell: ({ row }) => {
          const status = row.getValue("financialStatus") as string;
          const statusLabels: Record<string, string> = {
            pending: "Na čekanju",
            paid: "Plaćeno",
            refunded: "Refundirano",
          };
          return (
            <div
              className={cn(
                "capitalize text-sm",
                status === "pending"
                  ? "text-yellow-500"
                  : status === "paid"
                    ? "text-green-500"
                    : "text-red-500"
              )}
            >
              {statusLabels[status] || status || "-"}
            </div>
          );
        },
        size: 150,
      },
      {
        accessorKey: "fulfillmentStatus",
        header: "Status isporuke",
        cell: ({ row }) => {
          const status = row.getValue("fulfillmentStatus") as string;
          const statusLabels: Record<string, string> = {
            unfulfilled: "Neisporučeno",
            fulfilled: "Isporučeno",
            partial: "Djelomično",
          };
          return (
            <div
              className={cn(
                "capitalize text-sm",
                status === "unfulfilled"
                  ? "text-yellow-500"
                  : status === "fulfilled"
                    ? "text-green-500"
                    : "text-blue-500"
              )}
            >
              {statusLabels[status] || status || "-"}
            </div>
          );
        },
        size: 150,
      },
      {
        accessorKey: "total",
        header: "Ukupno",
        cell: ({ row }) => {
          const total = row.getValue("total") as string;
          return (
            <div className="text-sm font-medium">
              {total ? `${parseFloat(total).toFixed(2)} ${row.original.currency || "BAM"}` : "-"}
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
          return (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  navigate({
                    to: "/admin/orders/$orderId",
                    params: { orderId: row.original.id },
                  });
                }}
              >
                <Eye className="size-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    [navigate]
  );

  const { data, isLoading } = useQuery(
    getAllOrdersQueryOptions({
      search: search.search,
      status: search.status,
      page: search.page,
      limit: search.limit,
    })
  );

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

  const handleStatusChange = (value: string) => {
    navigate({
      to: ".",
      search: (prev) => ({
        ...prev,
        status: value === "all" ? undefined : value,
        page: 1,
      }),
    });
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
            placeholder="Pretraži po broju narudžbe, emailu ili imenu kupca"
            className="w-64"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          <Select
            value={search.status || "all"}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Svi statusi</SelectItem>
              <SelectItem value="pending">Na čekanju</SelectItem>
              <SelectItem value="paid">Plaćeno</SelectItem>
              <SelectItem value="fulfilled">Isporučeno</SelectItem>
              <SelectItem value="cancelled">Otkazano</SelectItem>
              <SelectItem value="refunded">Refundirano</SelectItem>
            </SelectContent>
          </Select>
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
          <Button asChild>
            <Link to="/admin/orders/new">
              Dodaj narudžbu
            </Link>
          </Button>
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
              Prikazano {data.data.length} od {data.total} narudžbi
            </>
          ) : (
            "Nema narudžbi"
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
    </div>
  );
}

