import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	getCollectionsQueryOptions,
	deleteCollectionServerFn,
	COLLECTIONS_QUERY_KEY,
} from "@/queries/collections";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Plus, MoreHorizontal, Pencil, Trash2, Loader2, FolderKanban } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ProxyImage } from "@/components/ui/proxy-image";

export const Route = createFileRoute("/admin/collections/")({
	component: CollectionsPage,
});

function CollectionsPage() {
	const queryClient = useQueryClient();
	const { data: collections = [], isLoading } = useQuery(getCollectionsQueryOptions());
	const [deleteId, setDeleteId] = useState<string | null>(null);

	const deleteMutation = useMutation({
		mutationFn: async (collectionId: string) => {
			return await deleteCollectionServerFn({ data: { collectionId } });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [COLLECTIONS_QUERY_KEY] });
			setDeleteId(null);
		},
	});

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-64">
				<Loader2 className="size-8 animate-spin text-primary" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">Kolekcije</h1>
					<p className="text-gray-600 mt-1">
						Upravljajte kolekcijama proizvoda sa automatskim pravilima
					</p>
				</div>
				<Button asChild>
					<Link to="/admin/collections/new">
						<Plus className="size-4 mr-2" />
						Nova kolekcija
					</Link>
				</Button>
			</div>

			{collections.length === 0 ? (
				<div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
					<FolderKanban className="size-12 text-gray-400 mx-auto mb-4" />
					<h3 className="text-lg font-semibold text-gray-900 mb-2">
						Nema kolekcija
					</h3>
					<p className="text-gray-600 mb-6">
						Kreirajte prvu kolekciju da organizujete proizvode
					</p>
					<Button asChild>
						<Link to="/admin/collections/new">
							<Plus className="size-4 mr-2" />
							Kreiraj kolekciju
						</Link>
					</Button>
				</div>
			) : (
				<div className="bg-white rounded-lg border border-gray-200">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Naziv</TableHead>
								<TableHead>Proizvoda</TableHead>
								<TableHead>Pravila</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="w-[80px]"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{collections.map((collection) => (
								<TableRow key={collection.id}>
									<TableCell>
										<div className="flex items-center gap-3">
											{collection.image ? (
												<ProxyImage
													src={collection.image}
													alt={collection.name}
													width={40}
													height={40}
													resizingType="fill"
													className="w-10 h-10 rounded object-cover"
												/>
											) : (
												<div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
													<FolderKanban className="size-5 text-gray-400" />
												</div>
											)}
											<div>
												<Link
													to="/admin/collections/$collectionId"
													params={{ collectionId: collection.id }}
													className="font-medium text-gray-900 hover:text-primary"
												>
													{collection.name}
												</Link>
												<p className="text-sm text-gray-500">/{collection.slug}</p>
											</div>
										</div>
									</TableCell>
									<TableCell>
										<Badge variant="secondary">
											{collection.productCount} proizvoda
										</Badge>
									</TableCell>
									<TableCell>
										<span className="text-sm text-gray-600">
											{collection.ruleMatch === "all" ? "Sva pravila (I)" : "Bilo koje pravilo (ILI)"}
										</span>
									</TableCell>
									<TableCell>
										{collection.active ? (
											<Badge className="bg-green-100 text-green-800">
												Aktivna
											</Badge>
										) : (
											<Badge variant="secondary">Neaktivna</Badge>
										)}
									</TableCell>
									<TableCell>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button variant="ghost" size="icon">
													<MoreHorizontal className="size-4" />
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem asChild>
													<Link
														to="/admin/collections/$collectionId"
														params={{ collectionId: collection.id }}
														className="flex items-center gap-2"
													>
														<Pencil className="size-4" />
														Uredi
													</Link>
												</DropdownMenuItem>
												<DropdownMenuItem
													onClick={() => setDeleteId(collection.id)}
													className="text-red-600"
												>
													<Trash2 className="size-4 mr-2" />
													Obriši
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}

			<AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Obriši kolekciju</AlertDialogTitle>
						<AlertDialogDescription>
							Da li ste sigurni da želite obrisati ovu kolekciju? Ova akcija se
							ne može poništiti.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Odustani</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => deleteId && deleteMutation.mutate(deleteId)}
							className="bg-red-600 hover:bg-red-700"
						>
							{deleteMutation.isPending ? (
								<Loader2 className="size-4 mr-2 animate-spin" />
							) : null}
							Obriši
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
