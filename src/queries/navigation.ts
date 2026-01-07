import { db } from "@/db/db";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { navigation } from "@/db/schema";
import { eq, and, asc, isNull } from "drizzle-orm";
import { z } from "zod";
import { nanoid } from "nanoid";

export const NAVIGATION_QUERY_KEY = "navigation";

export type NavigationItem = {
	id: string;
	parentId: string | null;
	title: string;
	url: string;
	icon: string | null;
	position: number;
	children?: NavigationItem[];
};

// Get all navigation items (hierarchical)
export const getNavigationServerFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({}))
	.handler(async () => {
		const allItems = await db
			.select()
			.from(navigation)
			.orderBy(asc(navigation.position));

		// Build hierarchical structure
		const buildTree = (
			items: typeof allItems,
			parentId: string | null = null
		): NavigationItem[] => {
			return items
				.filter((item) => item.parentId === parentId)
				.map((item) => ({
					id: item.id,
					parentId: item.parentId,
					title: item.title,
					url: item.url,
					icon: item.icon,
					position: item.position,
					children: buildTree(items, item.id),
				}))
				.sort((a, b) => a.position - b.position);
		};

		return buildTree(allItems);
	});

export const getNavigationQueryOptions = () => {
	return queryOptions({
		queryKey: [NAVIGATION_QUERY_KEY],
		queryFn: async () => {
			return await getNavigationServerFn({ data: {} });
		},
	});
};

// Create navigation item
export const createNavigationItemServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			parentId: z.string().nullable().optional(),
			title: z.string().min(1),
			url: z.string().min(1),
			icon: z.string().nullable().optional(),
			position: z.number().optional(),
		})
	)
	.handler(async ({ data }) => {
		const itemId = nanoid();

		// If position not provided, get the next position for this parent
		let position = data.position;
		if (position === undefined) {
			const siblings = await db
				.select()
				.from(navigation)
				.where(
					data.parentId
						? eq(navigation.parentId, data.parentId)
						: isNull(navigation.parentId)
				)
				.orderBy(asc(navigation.position));

			position = siblings.length > 0 ? siblings[siblings.length - 1].position + 1 : 0;
		}

		await db.insert(navigation).values({
			id: itemId,
			parentId: data.parentId || null,
			title: data.title,
			url: data.url,
			icon: data.icon || null,
			position,
		});

		return { id: itemId };
	});

// Update navigation item
export const updateNavigationItemServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			id: z.string(),
			parentId: z.string().nullable().optional(),
			title: z.string().min(1).optional(),
			url: z.string().min(1).optional(),
			icon: z.string().nullable().optional(),
			position: z.number().optional(),
		})
	)
	.handler(async ({ data }) => {
		const { id, ...updateData } = data;

		await db
			.update(navigation)
			.set(updateData)
			.where(eq(navigation.id, id));

		return { success: true };
	});

// Delete navigation item (cascade deletes children)
export const deleteNavigationItemServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			id: z.string(),
		})
	)
	.handler(async ({ data }) => {
		// Delete item (cascade will handle children)
		await db.delete(navigation).where(eq(navigation.id, data.id));

		return { success: true };
	});

// Reorder navigation items
export const reorderNavigationItemsServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			items: z.array(
				z.object({
					id: z.string(),
					position: z.number(),
				})
			),
		})
	)
	.handler(async ({ data }) => {
		// Update positions in a transaction
		for (const item of data.items) {
			await db
				.update(navigation)
				.set({ position: item.position })
				.where(eq(navigation.id, item.id));
		}

		return { success: true };
	});

