"use client";

import * as React from "react";
import {
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	useReactTable,
	type ColumnDef,
	type SortingState,
} from "@tanstack/react-table";
import { Pencil, TrashIcon, Plus, Eye } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { pages } from "@/db/schema";
import {
	deletePageServerFn,
	getAllPagesQueryOptions,
	PAGES_QUERY_KEY,
} from "@/queries/pages";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

type Page = typeof pages.$inferSelect;

export function PagesTable() {
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<"draft" | "published" | "all">("all");
	const [sorting, setSorting] = React.useState<SortingState>([]);

	const deletePageMutation = useMutation({
		mutationFn: async (data: { id: string }) => {
			return await deletePageServerFn({ data });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [PAGES_QUERY_KEY] });
		},
	});

	const handleDeletePage = async (data: { id: string }) => {
		if (confirm("Jeste li sigurni da želite obrisati ovu stranicu?")) {
			await deletePageMutation.mutateAsync(data);
		}
	};

	const columns: ColumnDef<Page>[] = React.useMemo(
		() => [
			{
				accessorKey: "title",
				header: "Naziv",
				cell: ({ row }) => (
					<div className="font-medium">{row.getValue("title")}</div>
				),
				size: 250,
			},
			{
				accessorKey: "slug",
				header: "Slug",
				cell: ({ row }) => (
					<div className="text-sm text-gray-500">{row.getValue("slug")}</div>
				),
				size: 200,
			},
			{
				accessorKey: "status",
				header: "Status",
				cell: ({ row }) => {
					const status = row.getValue("status") as string;
					return (
						<div
							className={cn(
								"capitalize text-sm",
								status === "draft"
									? "text-gray-500"
									: "text-green-500 font-medium"
							)}
						>
							{status === "draft" ? "Skica" : "Objavljeno"}
						</div>
					);
				},
				size: 100,
			},
			{
				accessorKey: "createdAt",
				header: "Kreirano",
				cell: ({ row }) => {
					const date = row.getValue("createdAt") as Date;
					return (
						<div className="text-sm text-gray-500">
							{new Date(date).toLocaleDateString("hr-HR")}
						</div>
					);
				},
				size: 120,
			},
			{
				id: "actions",
				size: 150,
				cell: ({ row }) => {
					return (
						<div className="flex items-center gap-2">
							<Button
								variant="outline"
								size="icon"
								asChild
							>
								<Link
									to="/admin/pages/$pageId"
									params={{ pageId: row.original.id }}
								>
									<Pencil className="size-4" />
								</Link>
							</Button>
							<Button
								variant="destructive"
								size="icon"
								onClick={async () => {
									await handleDeletePage({ id: row.original.id });
								}}
							>
								<TrashIcon className="size-4" />
							</Button>
						</div>
					);
				},
			},
		],
		[]
	);

	const { data, isLoading } = useQuery(
		getAllPagesQueryOptions({
			search: search || undefined,
			status: statusFilter !== "all" ? statusFilter : undefined,
		})
	);

	const table = useReactTable({
		data: data || [],
		columns,
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		state: {
			sorting,
		},
	});

	return (
		<div className="w-full">
			<div className="flex items-center justify-between pb-4">
				<div className="flex items-center gap-2">
					<Input
						type="text"
						placeholder="Pretraži stranice..."
						className="w-64"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
					<Select
						value={statusFilter}
						onValueChange={(value) =>
							setStatusFilter(value as "draft" | "published" | "all")
						}
					>
						<SelectTrigger className="w-40">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">Svi statusi</SelectItem>
							<SelectItem value="draft">Skica</SelectItem>
							<SelectItem value="published">Objavljeno</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<Button asChild>
					<Link to="/admin/pages/new">
						<Plus className="size-4 mr-2" />
						Dodaj stranicu
					</Link>
				</Button>
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
									Nema stranica.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}

