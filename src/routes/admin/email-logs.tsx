import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
	getEmailLogsQueryOptions,
	getEmailStatsQueryOptions,
} from "@/queries/email-logs";
import {
	Mail,
	Search,
	CheckCircle2,
	XCircle,
	Clock,
	RefreshCw,
	ChevronLeft,
	ChevronRight,
	Filter,
	MailCheck,
	MailX,
	MailWarning,
	User,
	Package,
	Truck,
	Ban,
	KeyRound,
	ShoppingCart,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/email-logs")({
	component: EmailLogsPage,
});

const emailTypeConfig: Record<
	string,
	{ label: string; icon: typeof Mail; color: string }
> = {
	welcome: {
		label: "Dobrodošlica",
		icon: User,
		color: "text-blue-600 bg-blue-50",
	},
	order_confirmation: {
		label: "Potvrda narudžbe",
		icon: Package,
		color: "text-emerald-600 bg-emerald-50",
	},
	order_fulfilled: {
		label: "Poslano",
		icon: Truck,
		color: "text-purple-600 bg-purple-50",
	},
	order_cancelled: {
		label: "Otkazano",
		icon: Ban,
		color: "text-red-600 bg-red-50",
	},
	password_reset: {
		label: "Reset lozinke",
		icon: KeyRound,
		color: "text-amber-600 bg-amber-50",
	},
	abandoned_checkout: {
		label: "Napuštena korpa",
		icon: ShoppingCart,
		color: "text-orange-600 bg-orange-50",
	},
};

const statusConfig: Record<
	string,
	{ label: string; icon: typeof CheckCircle2; color: string; bgColor: string }
> = {
	sent: {
		label: "Poslano",
		icon: CheckCircle2,
		color: "text-emerald-600",
		bgColor: "bg-emerald-50",
	},
	failed: {
		label: "Neuspješno",
		icon: XCircle,
		color: "text-red-600",
		bgColor: "bg-red-50",
	},
	pending: {
		label: "U tijeku",
		icon: Clock,
		color: "text-amber-600",
		bgColor: "bg-amber-50",
	},
};

function EmailLogsPage() {
	const [search, setSearch] = useState("");
	const [type, setType] = useState<string>("");
	const [status, setStatus] = useState<string>("");
	const [page, setPage] = useState(1);

	const { data: stats, isLoading: statsLoading } = useQuery(
		getEmailStatsQueryOptions()
	);

	const { data: emailLogs, isLoading, refetch } = useQuery(
		getEmailLogsQueryOptions({
			search: search || undefined,
			type: type || undefined,
			status: status || undefined,
			page,
			limit: 25,
		})
	);

	const formatDate = (date: string | Date) => {
		return new Date(date).toLocaleString("hr-HR", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const parseMetadata = (metadata: string | null): { customerName?: string; orderNumber?: string; trackingNumber?: string } => {
		if (!metadata) return {};
		try {
			return JSON.parse(metadata) as { customerName?: string; orderNumber?: string; trackingNumber?: string };
		} catch {
			return {};
		}
	};

	return (
		<div className="min-h-screen bg-gray-50/50">
			{/* Header */}
			<div className="sticky top-0 z-10 bg-gradient-to-r from-slate-800 to-slate-700 text-white">
				<div className="px-4 py-4 md:px-6 md:py-5">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10">
								<Mail className="h-5 w-5" />
							</div>
							<div>
								<h1 className="text-lg font-semibold md:text-xl">
									Email logovi
								</h1>
								<p className="text-sm text-slate-300 hidden sm:block">
									Pregled svih poslanih emailova
								</p>
							</div>
						</div>
						<Button
							variant="secondary"
							size="sm"
							onClick={() => refetch()}
							className="gap-2"
						>
							<RefreshCw className="h-4 w-4" />
							<span className="hidden sm:inline">Osvježi</span>
						</Button>
					</div>
				</div>
			</div>

			<div className="p-4 md:p-6 space-y-4 md:space-y-6">
				{/* Stats Cards */}
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
					<StatCard
						label="Ukupno"
						value={stats?.total ?? 0}
						icon={Mail}
						color="text-slate-600"
						bgColor="bg-slate-50"
						loading={statsLoading}
					/>
					<StatCard
						label="Poslano"
						value={stats?.sent ?? 0}
						icon={MailCheck}
						color="text-emerald-600"
						bgColor="bg-emerald-50"
						loading={statsLoading}
					/>
					<StatCard
						label="Neuspješno"
						value={stats?.failed ?? 0}
						icon={MailX}
						color="text-red-600"
						bgColor="bg-red-50"
						loading={statsLoading}
					/>
					<StatCard
						label="U tijeku"
						value={stats?.pending ?? 0}
						icon={MailWarning}
						color="text-amber-600"
						bgColor="bg-amber-50"
						loading={statsLoading}
					/>
				</div>

				{/* Filters */}
				<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
					<div className="flex flex-col sm:flex-row gap-3">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
							<Input
								placeholder="Pretraži po emailu ili naslovu..."
								value={search}
								onChange={(e) => {
									setSearch(e.target.value);
									setPage(1);
								}}
								className="pl-9"
							/>
						</div>
						<div className="flex gap-2">
							<Select
								value={type}
								onValueChange={(value) => {
									setType(value === "all" ? "" : value);
									setPage(1);
								}}
							>
								<SelectTrigger className="w-full sm:w-[160px]">
									<Filter className="h-4 w-4 mr-2 text-gray-400" />
									<SelectValue placeholder="Tip" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">Svi tipovi</SelectItem>
									<SelectItem value="welcome">Dobrodošlica</SelectItem>
									<SelectItem value="order_confirmation">
										Potvrda narudžbe
									</SelectItem>
									<SelectItem value="order_fulfilled">Poslano</SelectItem>
									<SelectItem value="order_cancelled">Otkazano</SelectItem>
									<SelectItem value="password_reset">Reset lozinke</SelectItem>
									<SelectItem value="abandoned_checkout">Napuštena korpa</SelectItem>
								</SelectContent>
							</Select>
							<Select
								value={status}
								onValueChange={(value) => {
									setStatus(value === "all" ? "" : value);
									setPage(1);
								}}
							>
								<SelectTrigger className="w-full sm:w-[140px]">
									<SelectValue placeholder="Status" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">Svi statusi</SelectItem>
									<SelectItem value="sent">Poslano</SelectItem>
									<SelectItem value="failed">Neuspješno</SelectItem>
									<SelectItem value="pending">U tijeku</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</div>

				{/* Email Logs List */}
				<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
					{isLoading ? (
						<div className="p-8 text-center text-gray-500">
							<RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
							Učitavanje...
						</div>
					) : emailLogs?.data?.length === 0 ? (
						<div className="p-8 text-center text-gray-500">
							<Mail className="h-12 w-12 mx-auto mb-3 text-gray-300" />
							<p className="font-medium">Nema email logova</p>
							<p className="text-sm mt-1">
								Emailovi će se pojaviti ovdje kada budu poslani
							</p>
						</div>
					) : (
						<>
							{/* Desktop Table */}
							<div className="hidden md:block overflow-x-auto">
								<table className="w-full">
									<thead>
										<tr className="border-b border-gray-100 bg-gray-50/50">
											<th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
												Primatelj
											</th>
											<th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
												Naslov
											</th>
											<th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
												Tip
											</th>
											<th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
												Status
											</th>
											<th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-4 py-3">
												Datum
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-gray-100">
										{emailLogs?.data?.map((log) => {
											const typeInfo = emailTypeConfig[log.type] || {
												label: log.type,
												icon: Mail,
												color: "text-gray-600 bg-gray-50",
											};
											const statusInfo = statusConfig[log.status] || {
												label: log.status,
												icon: Clock,
												color: "text-gray-600",
												bgColor: "bg-gray-50",
											};
											const TypeIcon = typeInfo.icon;
											const StatusIcon = statusInfo.icon;
											const metadata = parseMetadata(log.metadata);

											return (
												<tr
													key={log.id}
													className="hover:bg-gray-50/50 transition-colors"
												>
													<td className="px-4 py-3">
														<div className="font-medium text-gray-900 text-sm">
															{log.to}
														</div>
														{metadata.customerName && (
															<div className="text-xs text-gray-500">
																{metadata.customerName}
															</div>
														)}
													</td>
													<td className="px-4 py-3">
														<div className="text-sm text-gray-900 max-w-xs truncate">
															{log.subject}
														</div>
														{metadata.orderNumber && (
															<div className="text-xs text-gray-500">
																Narudžba #{metadata.orderNumber}
															</div>
														)}
													</td>
													<td className="px-4 py-3">
														<div
															className={cn(
																"inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
																typeInfo.color
															)}
														>
															<TypeIcon className="h-3 w-3" />
															{typeInfo.label}
														</div>
													</td>
													<td className="px-4 py-3">
														<div
															className={cn(
																"inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
																statusInfo.color,
																statusInfo.bgColor
															)}
														>
															<StatusIcon className="h-3 w-3" />
															{statusInfo.label}
														</div>
														{log.errorMessage && (
															<div className="text-xs text-red-500 mt-1 max-w-[200px] truncate">
																{log.errorMessage}
															</div>
														)}
													</td>
													<td className="px-4 py-3 text-sm text-gray-500">
														{formatDate(log.createdAt)}
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>

							{/* Mobile Cards */}
							<div className="md:hidden divide-y divide-gray-100">
								{emailLogs?.data?.map((log) => {
									const typeInfo = emailTypeConfig[log.type] || {
										label: log.type,
										icon: Mail,
										color: "text-gray-600 bg-gray-50",
									};
									const statusInfo = statusConfig[log.status] || {
										label: log.status,
										icon: Clock,
										color: "text-gray-600",
										bgColor: "bg-gray-50",
									};
									const TypeIcon = typeInfo.icon;
									const StatusIcon = statusInfo.icon;
									const metadata = parseMetadata(log.metadata);

									return (
										<div key={log.id} className="p-4 space-y-3">
											<div className="flex items-start justify-between gap-3">
												<div className="flex-1 min-w-0">
													<div className="font-medium text-gray-900 text-sm truncate">
														{log.to}
													</div>
													<div className="text-xs text-gray-500 mt-0.5 truncate">
														{log.subject}
													</div>
												</div>
												<div
													className={cn(
														"inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium shrink-0",
														statusInfo.color,
														statusInfo.bgColor
													)}
												>
													<StatusIcon className="h-3 w-3" />
													{statusInfo.label}
												</div>
											</div>
											<div className="flex items-center justify-between">
												<div
													className={cn(
														"inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
														typeInfo.color
													)}
												>
													<TypeIcon className="h-3 w-3" />
													{typeInfo.label}
												</div>
												<div className="text-xs text-gray-500">
													{formatDate(log.createdAt)}
												</div>
											</div>
											{log.errorMessage && (
												<div className="text-xs text-red-500 bg-red-50 rounded-lg p-2">
													{log.errorMessage}
												</div>
											)}
											{metadata.orderNumber && (
												<div className="text-xs text-gray-500">
													Narudžba #{metadata.orderNumber}
												</div>
											)}
										</div>
									);
								})}
							</div>

							{/* Pagination */}
							{emailLogs && emailLogs.total > 25 && (
								<div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between">
									<div className="text-sm text-gray-500">
										Prikazano {((page - 1) * 25) + 1}-
										{Math.min(page * 25, emailLogs.total)} od {emailLogs.total}
									</div>
									<div className="flex gap-2">
										<Button
											variant="outline"
											size="sm"
											onClick={() => setPage((p) => Math.max(1, p - 1))}
											disabled={!emailLogs.hasPreviousPage}
										>
											<ChevronLeft className="h-4 w-4" />
										</Button>
										<Button
											variant="outline"
											size="sm"
											onClick={() => setPage((p) => p + 1)}
											disabled={!emailLogs.hasNextPage}
										>
											<ChevronRight className="h-4 w-4" />
										</Button>
									</div>
								</div>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
}

function StatCard({
	label,
	value,
	icon: Icon,
	color,
	bgColor,
	loading,
}: {
	label: string;
	value: number;
	icon: typeof Mail;
	color: string;
	bgColor: string;
	loading?: boolean;
}) {
	return (
		<div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
			<div className="flex items-center gap-3">
				<div className={cn("p-2 rounded-lg", bgColor)}>
					<Icon className={cn("h-5 w-5", color)} />
				</div>
				<div>
					<div className="text-2xl font-bold text-gray-900">
						{loading ? "-" : value}
					</div>
					<div className="text-xs text-gray-500">{label}</div>
				</div>
			</div>
		</div>
	);
}
