"use client";

import { Button } from "@/components/ui/button";
import {
	ArrowLeft,
	Loader2,
	Save,
	Trash2,
	Clock,
	CheckCircle2,
	Archive,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProductPageLayoutProps {
	title: string;
	subtitle?: string;
	isEditing?: boolean;
	status?: "draft" | "active" | "archived";
	lastUpdated?: Date;
	onSubmit: () => void;
	isSubmitting: boolean;
	isValid: boolean;
	onBack: () => void;
	onDelete?: () => void;
	children: React.ReactNode;
	sidebarContent: React.ReactNode;
}

const statusConfig = {
	draft: {
		label: "Skica",
		color: "text-amber-700",
		bg: "bg-amber-50 border-amber-200",
		icon: Clock,
	},
	active: {
		label: "Aktivno",
		color: "text-emerald-700",
		bg: "bg-emerald-50 border-emerald-200",
		icon: CheckCircle2,
	},
	archived: {
		label: "Arhivirano",
		color: "text-gray-700",
		bg: "bg-gray-50 border-gray-200",
		icon: Archive,
	},
};

export function ProductPageLayout({
	title,
	subtitle,
	isEditing = false,
	status = "draft",
	lastUpdated,
	onSubmit,
	isSubmitting,
	isValid,
	onBack,
	onDelete,
	children,
	sidebarContent,
}: ProductPageLayoutProps) {
	const currentStatus = statusConfig[status];
	const StatusIcon = currentStatus.icon;

	const formatDate = (date: Date) => {
		const day = String(date.getDate()).padStart(2, "0");
		const month = String(date.getMonth() + 1).padStart(2, "0");
		const year = date.getFullYear();
		const hours = String(date.getHours()).padStart(2, "0");
		const minutes = String(date.getMinutes()).padStart(2, "0");
		return `${day}.${month}.${year} u ${hours}:${minutes}`;
	};

	return (
		<div className="flex flex-col gap-6 container mx-auto max-w-7xl pb-8">
			{/* Header */}
			<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
				<div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 sm:px-6 py-4">
					<div className="flex items-center justify-between gap-4">
						<div className="flex items-center gap-3 sm:gap-4 min-w-0">
							<Button
								type="button"
								variant="ghost"
								size="icon"
								onClick={onBack}
								className="text-white hover:bg-white/10 flex-shrink-0"
							>
								<ArrowLeft className="size-5" />
							</Button>
							<div className="min-w-0">
								<div className="flex items-center gap-2 sm:gap-3 flex-wrap">
									<h1 className="text-lg sm:text-xl font-semibold text-white truncate">
										{title}
									</h1>
									<span
										className={cn(
											"inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-xs font-medium border flex-shrink-0",
											currentStatus.bg,
											currentStatus.color
										)}
									>
										<StatusIcon className="size-3 sm:size-3.5" />
										<span className="hidden sm:inline">{currentStatus.label}</span>
									</span>
								</div>
								{subtitle && (
									<p className="text-sm text-slate-300 mt-0.5 truncate">
										{subtitle}
									</p>
								)}
								{isEditing && lastUpdated && (
									<p className="text-xs text-slate-400 mt-0.5 hidden sm:block">
										Zadnja izmjena: {formatDate(lastUpdated)}
									</p>
								)}
							</div>
						</div>
						<div className="flex items-center gap-2 flex-shrink-0">
							{isEditing && onDelete && (
								<Button
									type="button"
									variant="ghost"
									onClick={onDelete}
									className="text-red-300 hover:text-red-200 hover:bg-red-500/20 hidden sm:flex"
								>
									<Trash2 className="size-4 mr-2" />
									Obriši
								</Button>
							)}
							<Button
								type="button"
								onClick={onSubmit}
								disabled={isSubmitting || !isValid}
								className="bg-emerald-500 hover:bg-emerald-600 text-white"
							>
								{isSubmitting ? (
									<>
										<Loader2 className="size-4 animate-spin mr-2" />
										<span className="hidden sm:inline">Spremanje...</span>
									</>
								) : (
									<>
										<Save className="size-4 sm:mr-2" />
										<span className="hidden sm:inline">
											{isEditing ? "Spremi" : "Dodaj"}
										</span>
									</>
								)}
							</Button>
						</div>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Main Content */}
				<div className="lg:col-span-2 flex flex-col gap-6">{children}</div>

				{/* Sidebar */}
				<div className="lg:col-span-1">
					<div className="flex flex-col gap-6 lg:sticky lg:top-4">
						{sidebarContent}
					</div>
				</div>
			</div>
		</div>
	);
}
