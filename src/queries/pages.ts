import { db } from "@/db/db";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { pages } from "@/db/schema";
import { eq, like, desc, and } from "drizzle-orm";
import { z } from "zod";
import { nanoid } from "nanoid";

export const PAGES_QUERY_KEY = "pages";

// Get all pages
export const getAllPagesServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			search: z.string().optional(),
			status: z.enum(["draft", "published"]).optional(),
		})
	)
	.handler(async ({ data }) => {
		const { search, status } = data;

		const conditions = [];
		if (search) {
			conditions.push(like(pages.title, `%${search}%`));
		}
		if (status) {
			conditions.push(eq(pages.status, status));
		}

		const allPages = await db
			.select()
			.from(pages)
			.where(conditions.length > 0 ? and(...conditions) : undefined)
			.orderBy(desc(pages.createdAt));

		return allPages;
	});

export const getAllPagesQueryOptions = (opts?: {
	search?: string;
	status?: "draft" | "published";
}) => {
	return queryOptions({
		queryKey: [PAGES_QUERY_KEY, opts],
		queryFn: async () => {
			return await getAllPagesServerFn({ data: opts || {} });
		},
	});
};

// Get single page by ID
export const getPageByIdServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			id: z.string(),
		})
	)
	.handler(async ({ data }) => {
		const [page] = await db
			.select()
			.from(pages)
			.where(eq(pages.id, data.id))
			.limit(1);

		if (!page) {
			throw new Error("Page not found");
		}

		return page;
	});

export const getPageByIdQueryOptions = (id: string) => {
	return queryOptions({
		queryKey: [PAGES_QUERY_KEY, id],
		queryFn: async () => {
			return await getPageByIdServerFn({ data: { id } });
		},
	});
};

// Get page by slug
export const getPageBySlugServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			slug: z.string(),
		})
	)
	.handler(async ({ data }) => {
		const [page] = await db
			.select()
			.from(pages)
			.where(eq(pages.slug, data.slug))
			.limit(1);

		return page || null;
	});

// Create page
export const createPageServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			title: z.string().min(1),
			slug: z.string().min(1),
			content: z.string().min(1),
			excerpt: z.string().optional(),
			status: z.enum(["draft", "published"]).optional(),
			template: z.string().optional(),
			seoTitle: z.string().optional(),
			seoDescription: z.string().optional(),
		})
	)
	.handler(async ({ data }) => {
		const pageId = nanoid();

		// Generate unique slug if needed
		const baseSlug = data.slug
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/(^-|-$)/g, "");

		let slug = baseSlug;
		let counter = 1;

		while (true) {
			const [existing] = await db
				.select({ id: pages.id })
				.from(pages)
				.where(eq(pages.slug, slug))
				.limit(1);

			if (!existing) {
				break;
			}

			slug = `${baseSlug}-${counter}`;
			counter++;

			if (counter > 1000) {
				slug = `${baseSlug}-${Date.now()}`;
				break;
			}
		}

		await db.insert(pages).values({
			id: pageId,
			title: data.title,
			slug,
			content: data.content,
			excerpt: data.excerpt || null,
			status: data.status || "draft",
			template: data.template || null,
			seoTitle: data.seoTitle || null,
			seoDescription: data.seoDescription || null,
		});

		return { id: pageId };
	});

// Update page
export const updatePageServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			id: z.string(),
			title: z.string().min(1).optional(),
			slug: z.string().min(1).optional(),
			content: z.string().min(1).optional(),
			excerpt: z.string().optional().nullable(),
			status: z.enum(["draft", "published"]).optional(),
			template: z.string().optional().nullable(),
			seoTitle: z.string().optional().nullable(),
			seoDescription: z.string().optional().nullable(),
		})
	)
	.handler(async ({ data }) => {
		const { id, ...updateData } = data;

		// Handle slug uniqueness if slug is being updated
		if (updateData.slug) {
			const baseSlug = updateData.slug
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/(^-|-$)/g, "");

			let slug = baseSlug;
			let counter = 1;

			while (true) {
				const [existing] = await db
					.select({ id: pages.id })
					.from(pages)
					.where(eq(pages.slug, slug))
					.limit(1);

				if (!existing || existing.id === id) {
					break;
				}

				slug = `${baseSlug}-${counter}`;
				counter++;

				if (counter > 1000) {
					slug = `${baseSlug}-${Date.now()}`;
					break;
				}
			}

			updateData.slug = slug;
		}

		await db.update(pages).set(updateData).where(eq(pages.id, id));

		return { success: true };
	});

// Delete page
export const deletePageServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			id: z.string(),
		})
	)
	.handler(async ({ data }) => {
		await db.delete(pages).where(eq(pages.id, data.id));

		return { success: true };
	});

