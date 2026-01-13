import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	getAllDiscountsServerFn,
	deleteDiscountServerFn,
	DISCOUNTS_QUERY_KEY,
} from "@/queries/discounts";
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
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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
import {
	Plus,
	MoreHorizontal,
	Pencil,
	Trash2,
	Loader2,
	Percent,
	Search,
	Infinity,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/admin/discounts/")({
	component: DiscountsPage,
});

function DiscountsPage() {
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [typeFilter, setTypeFilter] = useState<string>("all");
	const [deleteId, setDeleteId] = useState<string | null>(null);

	const { data: discounts = [], isLoading } = useQuery({
		queryKey: [DISCOUNTS_QUERY_KEY, { search, status: statusFilter, type: typeFilter }],
		queryFn: () =>
			getAllDiscountsServerFn({
				data: {
					search: search || undefined,
					status: statusFilter as any,
					type: typeFilter as any,
				},
			}),
	});

	const deleteMutation = useMutation({
		mutationFn: async (discountId: string) => {
			return await deleteDiscountServerFn({ data: { id: discountId } });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [DISCOUNTS_QUERY_KEY] });
			setDeleteId(null);
		},
	});

	const getStatus = (discount: any) => {
		const now = new Date();

		if (!discount.active) {
			return { label: "Neaktivan", variant: "secondary" as const };
		}

		if (discount.endsAt && new Date(discount.endsAt) < now) {
			return { label: "Istekao", variant: "destructive" as const };
		}

		if (discount.usageLimit !== null && discount.usageCount >= discount.usageLimit) {
			return { label: "Iskorišten", variant: "secondary" as const };
		}

		if (discount.startsAt && new Date(discount.startsAt) > now) {
			return { label: "Zakazan", variant: "outline" as const };
		}

		return { label: "Aktivan", variant: "default" as const };
	};

	const formatDate = (date: string | null) => {
		if (!date) return "-";
		return new Date(date).toLocaleDateString("hr-HR", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
		});
	};

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
					<h1 className="text-2xl font-bold text-gray-900">Popusti</h1>
					<p className="text-gray-600 mt-1">
						Upravljajte kodovima za popust
					</p>
				</div>
				<Button asChild>
					<Link to="/admin/discounts/new">
						<Plus className="size-4 mr-2" />
						Novi popust
					</Link>
				</Button>
			</div>

			{/* Filters */}
			<div className="flex flex-wrap gap-4">
				<div className="relative flex-1 min-w-[200px] max-w-sm">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
					<Input
						placeholder="Pretraži po kodu..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-10"
					/>
				</div>
				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="w-[160px]">
						<SelectValue placeholder="Status" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Svi statusi</SelectItem>
						<SelectItem value="active">Aktivni</SelectItem>
						<SelectItem value="inactive">Neaktivni</SelectItem>
						<SelectItem value="expired">Istekli</SelectItem>
					</SelectContent>
				</Select>
				<Select value={typeFilter} onValueChange={setTypeFilter}>
					<SelectTrigger className="w-[160px]">
						<SelectValue placeholder="Tip" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Svi tipovi</SelectItem>
						<SelectItem value="percentage">Postotak</SelectItem>
						<SelectItem value="fixed">Fiksni iznos</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{discounts.length === 0 ? (
				<div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
					<Percent className="size-12 text-gray-400 mx-auto mb-4" />
					<h3 className="text-lg font-semibold text-gray-900 mb-2">
						Nema popusta
					</h3>
					<p className="text-gray-600 mb-6">
						Kreirajte prvi kod za popust
					</p>
					<Button asChild>
						<Link to="/admin/discounts/new">
							<Plus className="size-4 mr-2" />
							Kreiraj popust
						</Link>
					</Button>
				</div>
			) : (
				<div className="bg-white rounded-lg border border-gray-200">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Kod</TableHead>
								<TableHead>Tip</TableHead>
								<TableHead>Vrijednost</TableHead>
								<TableHead>Min. kupnja</TableHead>
								<TableHead>Korištenje</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Period</TableHead>
								<TableHead className="w-[80px]"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{discounts.map((discount: any) => {
								const status = getStatus(discount);
								return (
									<TableRow key={discount.id}>
										<TableCell>
											<Link
												to="/admin/discounts/$discountId"
												params={{ discountId: discount.id }}
												className="font-mono font-medium text-gray-900 hover:text-primary"
											>
												{discount.code}
											</Link>
										</TableCell>
										<TableCell>
											<Badge variant="outline">
												{discount.type === "percentage" ? "%" : "KM"}
											</Badge>
										</TableCell>
										<TableCell>
											<span className="font-medium">
												{Number(discount.value).toFixed(discount.type === "percentage" ? 0 : 2)}
												{discount.type === "percentage" ? "%" : " KM"}
											</span>
										</TableCell>
										<TableCell>
											{discount.minimumPurchase
												? `${Number(discount.minimumPurchase).toFixed(2)} KM`
												: "-"}
										</TableCell>
										<TableCell>
											<span className="flex items-center gap-1">
												{discount.usageCount}
												<span className="text-gray-400">/</span>
												{discount.usageLimit !== null ? (
													discount.usageLimit
												) : (
													<Infinity className="size-4 text-gray-400" />
												)}
											</span>
										</TableCell>
										<TableCell>
											<Badge
												variant={status.variant}
												className={
													status.label === "Aktivan"
														? "bg-green-100 text-green-800"
														: status.label === "Istekao"
														? "bg-red-100 text-red-800"
														: ""
												}
											>
												{status.label}
											</Badge>
										</TableCell>
										<TableCell className="text-sm text-gray-500">
											{discount.startsAt || discount.endsAt
												? `${formatDate(discount.startsAt)} - ${formatDate(discount.endsAt)}`
												: "Bez ograničenja"}
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
															to="/admin/discounts/$discountId"
															params={{ discountId: discount.id }}
															className="flex items-center gap-2"
														>
															<Pencil className="size-4" />
															Uredi
														</Link>
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={() => setDeleteId(discount.id)}
														className="text-red-600"
													>
														<Trash2 className="size-4 mr-2" />
														Obriši
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				</div>
			)}

			<AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Obriši popust</AlertDialogTitle>
						<AlertDialogDescription>
							Da li ste sigurni da želite obrisati ovaj popust? Ova akcija se
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
