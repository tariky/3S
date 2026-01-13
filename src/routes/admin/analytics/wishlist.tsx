import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getWishlistAnalyticsServerFn } from "@/queries/wishlist";
import { Heart, TrendingUp } from "lucide-react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ProxyImage } from "@/components/ui/proxy-image";

export const Route = createFileRoute("/admin/analytics/wishlist")({
	component: WishlistAnalyticsPage,
});

function WishlistAnalyticsPage() {
	const { data, isLoading } = useQuery({
		queryKey: ["wishlist-analytics"],
		queryFn: () => getWishlistAnalyticsServerFn(),
	});

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center gap-3">
				<div className="flex items-center justify-center size-10 rounded-lg bg-red-100">
					<Heart className="size-5 text-red-500" />
				</div>
				<div>
					<h1 className="text-2xl font-bold">Lista Želja - Analitika</h1>
					<p className="text-sm text-gray-500">
						Najpopularniji proizvodi po broju dodavanja u listu želja
					</p>
				</div>
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="bg-white rounded-lg border p-4">
					<div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
						<TrendingUp className="size-4" />
						Ukupno proizvoda na listama
					</div>
					<div className="text-2xl font-bold">
						{isLoading ? (
							<Skeleton className="h-8 w-20" />
						) : (
							data?.length || 0
						)}
					</div>
				</div>
				<div className="bg-white rounded-lg border p-4">
					<div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
						<Heart className="size-4" />
						Ukupno dodavanja
					</div>
					<div className="text-2xl font-bold">
						{isLoading ? (
							<Skeleton className="h-8 w-20" />
						) : (
							data?.reduce((sum, item) => sum + (item.wishlistCount || 0), 0) || 0
						)}
					</div>
				</div>
				<div className="bg-white rounded-lg border p-4">
					<div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
						<Heart className="size-4 fill-current text-red-500" />
						Najpopularniji
					</div>
					<div className="text-lg font-bold truncate">
						{isLoading ? (
							<Skeleton className="h-6 w-32" />
						) : (
							data?.[0]?.product?.name || "-"
						)}
					</div>
				</div>
			</div>

			{/* Table */}
			<div className="bg-white rounded-lg border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-16">#</TableHead>
							<TableHead>Proizvod</TableHead>
							<TableHead>Kategorija</TableHead>
							<TableHead className="text-right">Broj u listama</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							// Loading skeletons
							Array.from({ length: 5 }).map((_, i) => (
								<TableRow key={i}>
									<TableCell>
										<Skeleton className="h-4 w-6" />
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-3">
											<Skeleton className="size-10 rounded" />
											<Skeleton className="h-4 w-32" />
										</div>
									</TableCell>
									<TableCell>
										<Skeleton className="h-4 w-24" />
									</TableCell>
									<TableCell className="text-right">
										<Skeleton className="h-4 w-8 ml-auto" />
									</TableCell>
								</TableRow>
							))
						) : data && data.length > 0 ? (
							data.map((item, index) => (
								<TableRow key={item.product?.id || index}>
									<TableCell className="font-medium text-gray-500">
										{index + 1}
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-3">
											{item.product?.media?.[0]?.media?.url ? (
												<ProxyImage
													src={item.product.media[0].media.url}
													alt={item.product?.name || ""}
													width={40}
													height={40}
													resizingType="fill"
													className="size-10 object-cover rounded"
												/>
											) : (
												<div className="size-10 bg-gray-100 rounded flex items-center justify-center">
													<Heart className="size-4 text-gray-400" />
												</div>
											)}
											<span className="font-medium">{item.product?.name || "-"}</span>
										</div>
									</TableCell>
									<TableCell className="text-gray-500">
										{item.product?.category?.name || "-"}
									</TableCell>
									<TableCell className="text-right">
										<span className="inline-flex items-center gap-1 font-semibold text-red-600">
											<Heart className="size-3 fill-current" />
											{item.wishlistCount}
										</span>
									</TableCell>
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell colSpan={4} className="text-center py-8 text-gray-500">
									Nema podataka o listama želja
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
