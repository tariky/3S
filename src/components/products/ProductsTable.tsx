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
import { ChevronDown, TrashIcon, Pencil, Plus } from "lucide-react";
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

import { products } from "@/db/schema";
import { CategoryFilter } from "./CategoryFilter";
import { StatusFilter } from "./StatusFilter";
import {
	deleteProductServerFn,
	getAllProductsQueryOptions,
	PRODUCTS_QUERY_KEY,
} from "@/queries/products";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Route } from "@/routes/admin/products/index";
import { cn } from "@/lib/utils";

type Product = typeof products.$inferSelect & {
	category?: { id: string; name: string } | null;
	vendor?: { id: string; name: string } | null;
};

export function ProductsTable() {
	const queryClient = useQueryClient();
	const navigate = useNavigate({ from: Route.fullPath });
	const search = Route.useSearch();
	const [searchInput, setSearchInput] = useState(search.search);
	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [columnVisibility, setColumnVisibility] =
		React.useState<VisibilityState>({});
	const [rowSelection, setRowSelection] = React.useState({});

	const deleteProductMutation = useMutation({
		mutationFn: async (data: { id: string }) => {
			return await deleteProductServerFn({ data });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [PRODUCTS_QUERY_KEY] });
		},
	});

	const handleDeleteProduct = async (data: { id: string }) => {
		await deleteProductMutation.mutateAsync(data);
	};

	const columns: ColumnDef<Product>[] = React.useMemo(
		() => [
			{
				id: "select",
				header: ({ table }) => (
					<Checkbox
						checked={
							table.getIsAllPageRowsSelected() ||
							(table.getIsSomePageRowsSelected() && "indeterminate")
						}
						onCheckedChange={(value) =>
							table.toggleAllPageRowsSelected(!!value)
						}
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
				cell: ({ row }) => (
					<div className="font-medium">{row.getValue("name")}</div>
				),
				size: 250,
			},
			{
				accessorKey: "status",
				header: "Status",
				cell: ({ row }) => {
					const status = row.getValue("status") as string;
					const statusLabels: Record<string, string> = {
						draft: "Skica",
						active: "Aktivni",
						archived: "Neaktivni",
					};
					return (
						<div
							className={cn(
								"capitalize",
								status === "draft"
									? "text-gray-500"
									: status === "active"
										? "text-green-500"
										: "text-red-500"
							)}
						>
							{statusLabels[status] || status}
						</div>
					);
				},
				size: 100,
			},
			{
				accessorKey: "category",
				header: "Kategorija",
				cell: ({ row }) => {
					const category = row.original.category;
					return <div className="text-sm">{category?.name || "-"}</div>;
				},
				size: 150,
			},
			{
				accessorKey: "vendor",
				header: "Dobavljač",
				cell: ({ row }) => {
					const vendor = row.original.vendor;
					return <div className="text-sm">{vendor?.name || "-"}</div>;
				},
				size: 150,
			},
			{
				accessorKey: "price",
				header: "Cijena",
				cell: ({ row }) => {
					const price = row.getValue("price") as string;
					return (
						<div className="text-sm font-medium">
							{price ? `${parseFloat(price).toFixed(2)} KM` : "-"}
						</div>
					);
				},
				size: 100,
			},
			{
				accessorKey: "sku",
				header: "SKU",
				cell: ({ row }) => (
					<div className="text-sm">{row.getValue("sku") || "-"}</div>
				),
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
										to: "/admin/products/$productId",
										params: { productId: row.original.id },
									});
								}}
							>
								<Pencil className="size-4" />
							</Button>
							<Button
								variant="destructive"
								size="icon"
								onClick={async () => {
									await handleDeleteProduct({ id: row.original.id });
								}}
							>
								<TrashIcon className="size-4" />
							</Button>
						</div>
					);
				},
			},
		],
		[navigate]
	);

	const { data, isLoading } = useQuery(
		getAllProductsQueryOptions({
			search: search.search,
			status: search.status,
			categoryId: search.categoryId,
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
					<StatusFilter />
					<CategoryFilter />
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
						<Link to="/admin/products/new">
							<Plus className="size-4 mr-2" />
							Dodaj
						</Link>
					</Button>
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
									Nema rezultata.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
			<div className="flex items-center justify-end space-x-2 py-4">
				<div className="text-muted-foreground flex-1 text-sm">
					{table.getFilteredSelectedRowModel().rows.length} od{" "}
					{data?.total || 0} red(ova) odabrano.
				</div>
				<div className="space-x-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => handlePageChange(search.page - 1)}
						disabled={!data?.hasPreviousPage || isLoading}
					>
						Prethodno
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => handlePageChange(search.page + 1)}
						disabled={!data?.hasNextPage || isLoading}
					>
						Sljedeće
					</Button>
				</div>
			</div>
		</div>
	);
}
