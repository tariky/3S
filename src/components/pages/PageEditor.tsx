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
	getPageByIdQueryOptions,
	PAGES_QUERY_KEY,
} from "@/queries/pages";
import { Loader2 } from "lucide-react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface PageEditorProps {
	pageId?: string;
}

export function PageEditor({ pageId }: PageEditorProps) {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const isEditing = !!pageId;

	const { data: existingPage, isLoading } = useQuery(
		isEditing && pageId
			? getPageByIdQueryOptions(pageId)
			: {
					queryKey: [PAGES_QUERY_KEY, "new"],
					queryFn: async () => null,
					enabled: false,
				}
	);

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
			form.setFieldValue("title", existingPage.title);
			form.setFieldValue("slug", existingPage.slug);
			form.setFieldValue("content", existingPage.content);
			form.setFieldValue("excerpt", existingPage.excerpt || "");
			form.setFieldValue("status", existingPage.status as "draft" | "published");
			form.setFieldValue("seoTitle", existingPage.seoTitle || "");
			form.setFieldValue("seoDescription", existingPage.seoDescription || "");
		}
	}, [existingPage, form]);

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

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-8">
				<Loader2 className="size-6 animate-spin" />
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">
					{isEditing ? "Uredi stranicu" : "Nova stranica"}
				</h1>
			</div>

			<form
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="flex flex-col gap-6"
			>
				<div className="grid grid-cols-2 gap-4">
					<form.Field name="title">
						{(field) => (
							<div className="flex flex-col gap-2">
								<Label htmlFor={field.name}>Naziv *</Label>
								<Input
									id={field.name}
									value={field.state.value}
									onChange={(e) => handleTitleChange(e.target.value)}
									onBlur={field.handleBlur}
									required
								/>
								{field.state.meta.errors && (
									<span className="text-sm text-red-500">
										{field.state.meta.errors[0]}
									</span>
								)}
							</div>
						)}
					</form.Field>

					<form.Field name="slug">
						{(field) => (
							<div className="flex flex-col gap-2">
								<Label htmlFor={field.name}>Slug *</Label>
								<Input
									id={field.name}
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									required
								/>
								{field.state.meta.errors && (
									<span className="text-sm text-red-500">
										{field.state.meta.errors[0]}
									</span>
								)}
							</div>
						)}
					</form.Field>
				</div>

				<form.Field name="status">
					{(field) => (
						<div className="flex flex-col gap-2">
							<Label htmlFor={field.name}>Status</Label>
							<Select
								value={field.state.value}
								onValueChange={(value) =>
									field.handleChange(value as "draft" | "published")
								}
							>
								<SelectTrigger className="w-48">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="draft">Skica</SelectItem>
									<SelectItem value="published">Objavljeno</SelectItem>
								</SelectContent>
							</Select>
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
								rows={3}
								placeholder="Kratak opis stranice..."
							/>
						</div>
					)}
				</form.Field>

				<form.Field name="content">
					{(field) => (
						<div className="flex flex-col gap-2">
							<Label htmlFor={field.name}>Sadržaj *</Label>
							<RichTextEditor
								content={field.state.value}
								onChange={field.handleChange}
								placeholder="Napišite sadržaj stranice..."
							/>
							{field.state.meta.errors && (
								<span className="text-sm text-red-500">
									{field.state.meta.errors[0]}
								</span>
							)}
						</div>
					)}
				</form.Field>

				<div className="grid grid-cols-2 gap-4">
					<form.Field name="seoTitle">
						{(field) => (
							<div className="flex flex-col gap-2">
								<Label htmlFor={field.name}>SEO Naslov</Label>
								<Input
									id={field.name}
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									placeholder="SEO naslov..."
								/>
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
									rows={2}
									placeholder="SEO opis..."
								/>
							</div>
						)}
					</form.Field>
				</div>

				<div className="flex items-center gap-2">
					<Button
						type="submit"
						disabled={
							createMutation.isPending || updateMutation.isPending
						}
					>
						{(createMutation.isPending || updateMutation.isPending) && (
							<Loader2 className="size-4 animate-spin mr-2" />
						)}
						{isEditing ? "Sačuvaj promjene" : "Kreiraj stranicu"}
					</Button>
					<Button
						type="button"
						variant="outline"
						onClick={() => navigate({ to: "/admin/pages" })}
					>
						Otkaži
					</Button>
				</div>
			</form>
		</div>
	);
}

