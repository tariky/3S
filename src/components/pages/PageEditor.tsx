"use client";

import * as React from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RichTextEditor } from "./RichTextEditor";
import {
	createPageServerFn,
	updatePageServerFn,
	deletePageServerFn,
	getPageByIdQueryOptions,
	PAGES_QUERY_KEY,
} from "@/queries/pages";
import {
	ArrowLeft,
	Loader2,
	FileText,
	Settings,
	Search,
	Globe,
	Eye,
	Trash2,
	ExternalLink,
	Clock,
	CheckCircle2,
} from "lucide-react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PageEditorProps {
	pageId?: string;
}

const statusConfig = {
	draft: {
		label: "Skica",
		color: "text-amber-700",
		bg: "bg-amber-50",
		icon: Clock,
	},
	published: {
		label: "Objavljeno",
		color: "text-emerald-700",
		bg: "bg-emerald-50",
		icon: CheckCircle2,
	},
};

export function PageEditor({ pageId }: PageEditorProps) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const isEditing = !!pageId;

	const { data: existingPage, isLoading } = useQuery({
		...getPageByIdQueryOptions(pageId || ""),
		enabled: isEditing && !!pageId,
	});

	const form = useForm({
		defaultValues: {
			title: "",
			slug: "",
			content: "",
			excerpt: "",
			status: "draft" as "draft" | "published",
			seoTitle: "",
			seoDescription: "",
		},
		onSubmit: async ({ value }) => {
			if (isEditing && pageId) {
				await updateMutation.mutateAsync({
					id: pageId,
					...value,
				});
			} else {
				const result = await createMutation.mutateAsync(value);
				navigate({
					to: "/admin/pages/$pageId",
					params: { pageId: result.id },
				});
			}
		},
	});

	React.useEffect(() => {
		if (existingPage) {
			// Normalize status - treat "active" or any non-draft status as "published"
			const normalizedStatus =
				existingPage.status === "draft" ? "draft" : "published";
			form.reset({
				title: existingPage.title,
				slug: existingPage.slug,
				content: existingPage.content,
				excerpt: existingPage.excerpt || "",
				status: normalizedStatus,
				seoTitle: existingPage.seoTitle || "",
				seoDescription: existingPage.seoDescription || "",
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [existingPage]);

	const createMutation = useMutation({
		mutationFn: async (data: {
			title: string;
			slug: string;
			content: string;
			excerpt: string;
			status: "draft" | "published";
			seoTitle: string;
			seoDescription: string;
		}) => {
			return await createPageServerFn({ data });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [PAGES_QUERY_KEY] });
		},
	});

	const updateMutation = useMutation({
		mutationFn: async (data: {
			id: string;
			title: string;
			slug: string;
			content: string;
			excerpt: string;
			status: "draft" | "published";
			seoTitle: string;
			seoDescription: string;
		}) => {
			return await updatePageServerFn({ data });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [PAGES_QUERY_KEY] });
		},
	});

	const deleteMutation = useMutation({
		mutationFn: async () => {
			if (!pageId) throw new Error("Page ID required");
			return await deletePageServerFn({ data: { id: pageId } });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [PAGES_QUERY_KEY] });
			navigate({ to: "/admin/pages" });
		},
	});

	// Auto-generate slug from title
	const handleTitleChange = (title: string) => {
		form.setFieldValue("title", title);
		if (!isEditing || !existingPage?.slug) {
			const slug = title
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/(^-|-$)/g, "");
			form.setFieldValue("slug", slug);
		}
	};

	const handleDelete = () => {
		if (
			window.confirm(
				"Jeste li sigurni da želite obrisati ovu stranicu? Ova akcija se ne može poništiti."
			)
		) {
			deleteMutation.mutate();
		}
	};

	const isPending = createMutation.isPending || updateMutation.isPending;
	const currentStatus = form.state.values.status;
	// Fallback to draft config if status is not recognized
	const statusInfo = statusConfig[currentStatus] || statusConfig.draft;
	const StatusIcon = statusInfo.icon;

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="size-8 animate-spin text-gray-400" />
			</div>
		);
	}

	return (
		<div className="flex flex-col min-h-screen -m-4">
			{/* Sticky Header */}
			<header className="sticky top-0 z-20 bg-gradient-to-r from-slate-800 to-slate-700 text-white shadow-lg">
				<div className="px-4 lg:px-6 py-4">
					<div className="flex items-center justify-between gap-4">
						<div className="flex items-center gap-4">
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="text-white/80 hover:text-white hover:bg-white/10"
								onClick={() => navigate({ to: "/admin/pages" })}
							>
								<ArrowLeft className="size-5" />
							</Button>
							<div>
								<h1 className="text-xl font-semibold">
									{isEditing
										? form.state.values.title || "Uredi stranicu"
										: "Nova stranica"}
								</h1>
								{isEditing && existingPage && (
									<p className="text-sm text-white/60">
										/page/{existingPage.slug}
									</p>
								)}
							</div>
						</div>
						<div className="flex items-center gap-3">
							{/* Status Badge */}
							<Badge
								variant="secondary"
								className={cn(
									"gap-1.5 px-3 py-1",
									statusInfo.bg,
									statusInfo.color
								)}
							>
								<StatusIcon className="size-3.5" />
								{statusInfo.label}
							</Badge>

							{/* Preview Button */}
							{isEditing && existingPage?.status === "published" && (
								<Button
									type="button"
									variant="secondary"
									size="sm"
									className="hidden sm:flex"
									onClick={() =>
										window.open(`/page/${existingPage.slug}`, "_blank")
									}
								>
									<Eye className="size-4 mr-1.5" />
									Pregledaj
								</Button>
							)}

							{/* Delete Button */}
							{isEditing && (
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="text-white/80 hover:text-red-400 hover:bg-white/10"
									onClick={handleDelete}
									disabled={deleteMutation.isPending}
								>
									<Trash2 className="size-5" />
								</Button>
							)}

							{/* Save Button */}
							<Button
								type="button"
								onClick={() => form.handleSubmit()}
								disabled={isPending}
								className="bg-white text-slate-800 hover:bg-gray-100"
							>
								{isPending && <Loader2 className="size-4 animate-spin mr-2" />}
								{isEditing ? "Sačuvaj" : "Kreiraj"}
							</Button>
						</div>
					</div>
				</div>
			</header>

			{/* Main Content */}
			<div className="flex-1 p-4 lg:p-6 bg-gray-50/50">
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
				>
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
						{/* Main Content Column */}
						<div className="lg:col-span-2 flex flex-col gap-6">
							{/* Basic Info Card */}
							<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
								<div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
									<FileText className="size-5 text-gray-400" />
									<h2 className="font-semibold text-gray-900">
										Osnovne informacije
									</h2>
								</div>
								<div className="p-6 space-y-4">
									<form.Field name="title">
										{(field) => (
											<div className="flex flex-col gap-2">
												<Label htmlFor={field.name}>Naslov stranice *</Label>
												<Input
													id={field.name}
													value={field.state.value}
													onChange={(e) => handleTitleChange(e.target.value)}
													onBlur={field.handleBlur}
													placeholder="npr. O nama, Politika privatnosti..."
													className="text-lg"
													required
												/>
											</div>
										)}
									</form.Field>

									<form.Field name="slug">
										{(field) => (
											<div className="flex flex-col gap-2">
												<Label htmlFor={field.name}>URL slug *</Label>
												<div className="flex items-center gap-2">
													<span className="text-sm text-gray-500">/page/</span>
													<Input
														id={field.name}
														value={field.state.value}
														onChange={(e) => field.handleChange(e.target.value)}
														onBlur={field.handleBlur}
														placeholder="url-slug"
														required
													/>
												</div>
												<p className="text-xs text-gray-500">
													URL na kojem će stranica biti dostupna
												</p>
											</div>
										)}
									</form.Field>

									<form.Field name="excerpt">
										{(field) => (
											<div className="flex flex-col gap-2">
												<Label htmlFor={field.name}>Kratak opis</Label>
												<Textarea
													id={field.name}
													value={field.state.value}
													onChange={(e) => field.handleChange(e.target.value)}
													onBlur={field.handleBlur}
													rows={2}
													placeholder="Kratki opis koji se prikazuje u pregledu..."
												/>
											</div>
										)}
									</form.Field>
								</div>
							</div>

							{/* Content Card */}
							<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
								<div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
									<FileText className="size-5 text-gray-400" />
									<h2 className="font-semibold text-gray-900">Sadržaj</h2>
								</div>
								<div className="p-6">
									<form.Field name="content">
										{(field) => (
											<RichTextEditor
												content={field.state.value}
												onChange={field.handleChange}
												placeholder="Napišite sadržaj stranice..."
											/>
										)}
									</form.Field>
								</div>
							</div>
						</div>

						{/* Sidebar Column */}
						<div className="flex flex-col gap-6">
							{/* Status Card */}
							<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
								<div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
									<Settings className="size-5 text-gray-400" />
									<h2 className="font-semibold text-gray-900">Status</h2>
								</div>
								<div className="p-6">
									<form.Field name="status">
										{(field) => (
											<Select
												value={field.state.value}
												onValueChange={(value) =>
													field.handleChange(value as "draft" | "published")
												}
											>
												<SelectTrigger className="w-full">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="draft">
														<div className="flex items-center gap-2">
															<Clock className="size-4 text-amber-600" />
															<span>Skica</span>
														</div>
													</SelectItem>
													<SelectItem value="published">
														<div className="flex items-center gap-2">
															<CheckCircle2 className="size-4 text-emerald-600" />
															<span>Objavljeno</span>
														</div>
													</SelectItem>
												</SelectContent>
											</Select>
										)}
									</form.Field>

									{isEditing && existingPage && (
										<div className="mt-4 pt-4 border-t border-gray-100">
											<p className="text-xs text-gray-500">
												Kreirano:{" "}
												{new Date(existingPage.createdAt).toLocaleDateString(
													"hr-HR"
												)}
											</p>
											{existingPage.updatedAt && (
												<p className="text-xs text-gray-500">
													Ažurirano:{" "}
													{new Date(existingPage.updatedAt).toLocaleDateString(
														"hr-HR"
													)}
												</p>
											)}
										</div>
									)}
								</div>
							</div>

							{/* SEO Card */}
							<div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
								<div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
									<Search className="size-5 text-gray-400" />
									<h2 className="font-semibold text-gray-900">SEO</h2>
								</div>
								<div className="p-6 space-y-4">
									<form.Field name="seoTitle">
										{(field) => (
											<div className="flex flex-col gap-2">
												<Label htmlFor={field.name}>SEO Naslov</Label>
												<Input
													id={field.name}
													value={field.state.value}
													onChange={(e) => field.handleChange(e.target.value)}
													onBlur={field.handleBlur}
													placeholder="Naslov za pretraživače..."
												/>
												<p className="text-xs text-gray-500">
													{field.state.value.length}/60 karaktera
												</p>
											</div>
										)}
									</form.Field>

									<form.Field name="seoDescription">
										{(field) => (
											<div className="flex flex-col gap-2">
												<Label htmlFor={field.name}>SEO Opis</Label>
												<Textarea
													id={field.name}
													value={field.state.value}
													onChange={(e) => field.handleChange(e.target.value)}
													onBlur={field.handleBlur}
													rows={3}
													placeholder="Opis za pretraživače..."
												/>
												<p className="text-xs text-gray-500">
													{field.state.value.length}/160 karaktera
												</p>
											</div>
										)}
									</form.Field>

									{/* SEO Preview */}
									<div className="mt-4 p-4 bg-gray-50 rounded-lg">
										<p className="text-xs text-gray-500 mb-2">
											Pregled u pretraživaču:
										</p>
										<div className="space-y-1">
											<p className="text-blue-600 text-sm font-medium truncate">
												{form.state.values.seoTitle ||
													form.state.values.title ||
													"Naslov stranice"}
											</p>
											<p className="text-emerald-700 text-xs truncate">
												{typeof window !== "undefined"
													? window.location.origin
													: "https://example.com"}
												/page/{form.state.values.slug || "url-slug"}
											</p>
											<p className="text-gray-600 text-xs line-clamp-2">
												{form.state.values.seoDescription ||
													form.state.values.excerpt ||
													"Opis stranice će se prikazati ovdje..."}
											</p>
										</div>
									</div>
								</div>
							</div>

							{/* Quick Link */}
							{isEditing && existingPage?.status === "published" && (
								<a
									href={`/page/${existingPage.slug}`}
									target="_blank"
									rel="noopener noreferrer"
									className="flex items-center justify-center gap-2 p-4 bg-white rounded-xl shadow-sm border border-gray-100 text-primary hover:bg-gray-50 transition-colors"
								>
									<Globe className="size-5" />
									<span className="font-medium">Pogledaj stranicu</span>
									<ExternalLink className="size-4" />
								</a>
							)}
						</div>
					</div>
				</form>
			</div>
		</div>
	);
}
