import { db, serializeData } from "@/db/db";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { nanoid } from "nanoid";
import { getNextSkuNumberServerFn } from "@/queries/settings";
import type { Inventory } from "@prisma/client";
import {
	markCollectionsForRegeneration,
	markAllRuleBasedCollectionsForRegeneration,
} from "@/queries/collections";

export const PRODUCTS_QUERY_KEY = "products";

// Helper function to generate a unique slug
async function generateUniqueSlug(
	baseSlug: string,
	excludeProductId?: string
): Promise<string> {
	let slug = baseSlug;
	let counter = 1;

	while (true) {
		// Check if slug exists
		const existingProduct = await db.product.findFirst({
			where: {
				slug,
				...(excludeProductId ? { NOT: { id: excludeProductId } } : {}),
			},
			select: { id: true },
		});

		// If no conflicting products found, slug is unique
		if (!existingProduct) {
			return slug;
		}

		// Slug exists, try with counter
		slug = `${baseSlug}-${counter}`;
		counter++;

		// Safety check to prevent infinite loop
		if (counter > 1000) {
			// Fallback: append timestamp
			slug = `${baseSlug}-${Date.now()}`;
			break;
		}
	}

	return slug;
}

// Get all categories for dropdown (no pagination)
export const getAllCategoriesForSelectServerFn = createServerFn({
	method: "POST",
})
	.inputValidator(z.object({}))
	.handler(async () => {
		const categories = await db.productCategory.findMany({
			orderBy: { name: "asc" },
		});
		return categories;
	});

// Get all vendors for dropdown (no pagination)
export const getAllVendorsForSelectServerFn = createServerFn({
	method: "POST",
})
	.inputValidator(z.object({}))
	.handler(async () => {
		const vendors = await db.vendor.findMany({
			where: { active: true },
			orderBy: { name: "asc" },
		});
		return vendors;
	});

// Get all tags for dropdown (no pagination)
export const getAllTagsForSelectServerFn = createServerFn({
	method: "POST",
})
	.inputValidator(z.object({}))
	.handler(async () => {
		const tags = await db.productTag.findMany({
			orderBy: { name: "asc" },
		});
		return tags;
	});

// Create or get tag by name
export const createOrGetTagServerFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ name: z.string().min(1) }))
	.handler(async ({ data }) => {
		const slug = data.name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/(^-|-$)/g, "");

		// Check if tag exists
		const existingTag = await db.productTag.findFirst({
			where: { slug },
		});

		if (existingTag) {
			return existingTag;
		}

		// Create new tag
		const newTag = await db.productTag.create({
			data: {
				id: nanoid(),
				name: data.name,
				slug,
			},
		});

		return newTag;
	});

// Create media record from uploaded file
export const createMediaServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			filename: z.string(),
			originalFilename: z.string(),
			mimeType: z.string(),
			size: z.number(),
			url: z.string(),
			alt: z.string().optional(),
			type: z.string().default("image"),
			storage: z.string().default("s3"),
			metadata: z.record(z.string(), z.unknown()).optional(),
		})
	)
	.handler(async ({ data }) => {
		const createdMedia = await db.media.create({
			data: {
				id: nanoid(),
				filename: data.filename,
				originalFilename: data.originalFilename,
				mimeType: data.mimeType,
				size: data.size,
				url: data.url,
				alt: data.alt || null,
				type: data.type,
				storage: data.storage,
				metadata: data.metadata || null,
			},
		});

		return {
			...createdMedia,
			metadata: (createdMedia.metadata as object) || {},
		};
	});

// Create product with media
export const createProductServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			name: z.string().min(1),
			slug: z.string().optional(),
			description: z.string().optional().nullable(),
			sku: z.string().optional().nullable(),
			price: z.string().or(z.number()),
			compareAtPrice: z.string().or(z.number()).optional().nullable(),
			cost: z.string().or(z.number()).optional().nullable(),
			trackQuantity: z.boolean().default(true),
			status: z.enum(["draft", "active", "archived"]).default("draft"),
			featured: z.boolean().default(false),
			vendorId: z.string().optional().nullable(),
			categoryId: z.string().optional().nullable(),
			material: z.string().optional().nullable(),
			weight: z.string().or(z.number()).optional().default("1"),
			weightUnit: z.string().optional().default("kg"),
			requiresShipping: z.boolean().default(true),
			taxIncluded: z.boolean().default(false),
			internalNote: z.string().optional().nullable(),
			tagIds: z.array(z.string()).optional().default([]),
			availableQuantity: z.string().optional().nullable(),
			media: z
				.array(
					z.object({
						mediaId: z.string(),
						position: z.number(),
						isPrimary: z.boolean().default(false),
					})
				)
				.optional()
				.default([]),
			variantDefinitions: z
				.array(
					z.object({
						id: z.string(),
						name: z.string(),
						position: z.number(),
						options: z.array(
							z.object({
								id: z.string(),
								name: z.string(),
								position: z.number(),
							})
						),
					})
				)
				.optional()
				.default([]),
			generatedVariants: z
				.array(
					z.object({
						id: z.string(),
						sku: z.string().optional().nullable(),
						quantity: z.string().optional().nullable(),
						price: z.string().optional().nullable(),
						cost: z.string().optional().nullable(),
						combination: z.array(
							z.object({
								variantName: z.string(),
								optionName: z.string(),
								optionId: z.string(),
							})
						),
						position: z.number().default(0),
					})
				)
				.optional()
				.default([]),
		})
	)
	.handler(async ({ data }) => {
		const productId = nanoid();
		const baseSlug =
			data.slug ||
			data.name
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/(^-|-$)/g, "");

		// Generate unique slug
		const slug = await generateUniqueSlug(baseSlug);

		// Generate SKU if not provided
		let productSku = data.sku;
		if (!productSku || productSku.trim() === "") {
			try {
				productSku = await getNextSkuNumberServerFn({ data: {} });
			} catch (error) {
				console.error("Error generating SKU:", error);
				productSku = `SKU-${productId.slice(0, 8).toUpperCase()}`;
			}
		}

		// Insert product
		await db.product.create({
			data: {
				id: productId,
				name: data.name,
				slug,
				description: data.description || null,
				sku: productSku,
				price: Number(data.price),
				compareAtPrice: data.compareAtPrice && Number(data.compareAtPrice) > 0 ? Number(data.compareAtPrice) : null,
				cost: data.cost && Number(data.cost) > 0 ? Number(data.cost) : null,
				trackQuantity: data.trackQuantity,
				status: data.status,
				featured: data.featured,
				vendorId: data.vendorId || null,
				categoryId: data.categoryId || null,
				material: data.material || null,
				weight: Number(data.weight),
				weightUnit: data.weightUnit || "kg",
				requiresShipping: data.requiresShipping,
				taxIncluded: data.taxIncluded,
				internalNote: data.internalNote || null,
			},
		});

		// Insert product media
		if (data.media && data.media.length > 0) {
			await db.productMedia.createMany({
				data: data.media.map((m) => ({
					id: nanoid(),
					productId,
					mediaId: m.mediaId,
					position: m.position,
					isPrimary: m.isPrimary,
				})),
			});
		}

		// Create product options and option values if variant definitions exist
		const optionIdMap = new Map<string, string>();
		const optionValueIdMap = new Map<string, string>();

		if (data.variantDefinitions && data.variantDefinitions.length > 0) {
			for (const variantDef of data.variantDefinitions) {
				const optionId = nanoid();
				optionIdMap.set(variantDef.id, optionId);

				await db.productOption.create({
					data: {
						id: optionId,
						productId,
						name: variantDef.name,
						position: variantDef.position,
					},
				});

				for (const optionValue of variantDef.options) {
					const optionValueId = nanoid();
					optionValueIdMap.set(optionValue.id, optionValueId);

					await db.productOptionValue.create({
						data: {
							id: optionValueId,
							optionId,
							name: optionValue.name,
							position: optionValue.position,
						},
					});
				}
			}
		}

		// Insert product variants
		if (data.generatedVariants && data.generatedVariants.length > 0) {
			for (let index = 0; index < data.generatedVariants.length; index++) {
				const generatedVariant = data.generatedVariants[index];
				const variantId = nanoid();

				let variantSku = generatedVariant.sku;
				if (!variantSku || variantSku.trim() === "") {
					variantSku = `${productSku}-${index + 1}`;
				}

				await db.productVariant.create({
					data: {
						id: variantId,
						productId,
						sku: variantSku,
						price: generatedVariant.price ? Number(generatedVariant.price) : null,
						cost: generatedVariant.cost ? Number(generatedVariant.cost) : null,
						position: generatedVariant.position,
						isDefault: generatedVariant.position === 0,
					},
				});

				// Create product variant options
				if (data.variantDefinitions && data.variantDefinitions.length > 0) {
					for (const combo of generatedVariant.combination) {
						const variantDef = data.variantDefinitions.find(
							(vd) => vd.name === combo.variantName
						);
						if (!variantDef) continue;

						const dbOptionId = optionIdMap.get(variantDef.id);
						const dbOptionValueId = optionValueIdMap.get(combo.optionId);

						if (dbOptionId && dbOptionValueId) {
							await db.productVariantOption.create({
								data: {
									id: nanoid(),
									variantId,
									optionId: dbOptionId,
									optionValueId: dbOptionValueId,
								},
							});
						}
					}
				}

				// Create inventory record if quantity is provided
				if (generatedVariant.quantity !== null && generatedVariant.quantity !== undefined) {
					const quantityValue = parseInt(generatedVariant.quantity) || 0;
					await db.inventory.create({
						data: {
							id: nanoid(),
							variantId,
							onHand: quantityValue,
							available: quantityValue,
							reserved: 0,
							committed: 0,
						},
					});
				}
			}
		} else {
			// No variants - create a single default variant
			const defaultVariantId = nanoid();
			await db.productVariant.create({
				data: {
					id: defaultVariantId,
					productId,
					sku: productSku,
					price: Number(data.price),
					compareAtPrice: data.compareAtPrice && Number(data.compareAtPrice) > 0 ? Number(data.compareAtPrice) : null,
					cost: data.cost && Number(data.cost) > 0 ? Number(data.cost) : null,
					weight: Number(data.weight),
					position: 0,
					isDefault: true,
				},
			});

			if (data.availableQuantity !== null && data.availableQuantity !== undefined) {
				await db.inventory.create({
					data: {
						id: nanoid(),
						variantId: defaultVariantId,
						available: data.availableQuantity ? parseInt(data.availableQuantity) : 0,
						onHand: data.availableQuantity ? parseInt(data.availableQuantity) : 0,
						reserved: 0,
						committed: 0,
					},
				});
			}
		}

		// Insert product tags
		if (data.tagIds && data.tagIds.length > 0) {
			await db.productTagsToProduct.createMany({
				data: data.tagIds.map((tagId) => ({
					productId,
					tagId,
				})),
			});
		}

		const createdProduct = await db.product.findUnique({
			where: { id: productId },
		});

		// Mark collections for regeneration if product is active
		if (data.status === "active") {
			// New active product could match any rule-based collection
			await markAllRuleBasedCollectionsForRegeneration();
		}

		return serializeData(createdProduct);
	});

export const createProductMutationOptions = () => {
	return mutationOptions({
		mutationFn: async (
			data: Parameters<typeof createProductServerFn>[0]["data"]
		) => {
			return await createProductServerFn({ data });
		},
	});
};

// Get products with filtering and pagination
export const getProductsServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			search: z.string().optional(),
			status: z.enum(["draft", "active", "archived"]).optional(),
			categoryId: z.string().optional(),
			page: z.number().optional(),
			limit: z.number().optional(),
		})
	)
	.handler(async ({ data }) => {
		const { search = "", status, categoryId, page = 1, limit = 25 } = data;

		const where: any = {};

		if (search) {
			where.OR = [
				{ name: { contains: search } },
				{ sku: { contains: search } },
			];
		}
		if (status) {
			where.status = status;
		}
		if (categoryId) {
			where.categoryId = categoryId;
		}

		const [products, totalCount] = await Promise.all([
			db.product.findMany({
				where,
				include: {
					category: true,
					vendor: true,
				},
				orderBy: { createdAt: "desc" },
				take: limit,
				skip: (page - 1) * limit,
			}),
			db.product.count({ where }),
		]);

		const hasNextPage = page * limit < totalCount;
		const hasPreviousPage = page > 1;

		return serializeData({
			data: products,
			total: totalCount,
			hasNextPage,
			hasPreviousPage,
			nextCursor: page + 1,
			previousCursor: page - 1,
		});
	});

export const getAllProductsQueryOptions = (opts: {
	search?: string;
	status?: "draft" | "active" | "archived";
	categoryId?: string;
	page?: number;
	limit?: number;
}) => {
	return queryOptions({
		queryKey: [PRODUCTS_QUERY_KEY, opts],
		queryFn: async () => {
			return await getProductsServerFn({ data: opts });
		},
	});
};

// Search products for order creation
export const searchProductsForOrderServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			search: z.string().optional(),
			limit: z.number().optional().default(20),
		})
	)
	.handler(async ({ data }) => {
		const { search, limit = 20 } = data;

		const where: any = { status: "active" };
		if (search && search.trim().length > 0) {
			where.OR = [
				{ name: { contains: search } },
				{ sku: { contains: search } },
			];
		}

		const products = await db.product.findMany({
			where,
			orderBy: { createdAt: "desc" },
			take: limit,
		});

		// Get primary images and variants for each product
		const productsWithDetails = await Promise.all(
			products.map(async (product) => {
				const primaryMedia = await db.productMedia.findFirst({
					where: {
						productId: product.id,
						isPrimary: true,
					},
					include: { media: true },
				});

				const variants = await db.productVariant.findMany({
					where: { productId: product.id },
					include: {
						inventory: true,
						variantOptions: {
							include: {
								optionValue: {
									include: { option: true },
								},
							},
						},
					},
					orderBy: { position: "asc" },
				});

				return {
					...product,
					primaryImage: primaryMedia?.media?.url || null,
					variants: variants.map((v) => ({
						...v,
						inventory: v.inventory || {
							available: 0,
							reserved: 0,
							onHand: 0,
							committed: 0,
						},
						variantOptions: v.variantOptions.map((vo) => ({
							...vo,
							optionValue: vo.optionValue
								? {
										...vo.optionValue,
										option: vo.optionValue.option || null,
									}
								: null,
						})),
					})),
				};
			})
		);

		return serializeData(productsWithDetails);
	});

// Get product by ID with all relations
export const getProductByIdServerFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ productId: z.string() }))
	.handler(async ({ data }) => {
		const product = await db.product.findUnique({
			where: { id: data.productId },
			include: {
				category: true,
				vendor: true,
				media: {
					include: { media: true },
					orderBy: { position: "asc" },
				},
				options: {
					include: { values: { orderBy: { position: "asc" } } },
					orderBy: { position: "asc" },
				},
				variants: {
					include: {
						inventory: true,
						variantOptions: {
							include: {
								optionValue: {
									include: { option: true },
								},
							},
						},
					},
					orderBy: { position: "asc" },
				},
				tags: {
					include: { tag: true },
				},
			},
		});

		if (!product) {
			throw new Error("Product not found");
		}

		// Transform to match expected format
		return serializeData({
			...product,
			media: product.media.map((pm) => ({
				...pm,
				media: pm.media
					? {
							...pm.media,
							metadata: (pm.media.metadata as object) || {},
						}
					: null,
			})),
			variants: product.variants.map((v) => ({
				...v,
				variantOptions: v.variantOptions.map((vo) => ({
					...vo,
					optionValue: vo.optionValue
						? {
								...vo.optionValue,
								option: vo.optionValue.option || null,
							}
						: null,
				})),
			})),
			tags: product.tags.map((t) => ({
				productId: t.productId,
				tagId: t.tagId,
				tag: t.tag,
			})),
		});
	});

// Update product
export const updateProductServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			productId: z.string(),
			data: z.object({
				name: z.string().min(1),
				slug: z.string().optional(),
				description: z.string().optional().nullable(),
				sku: z.string().optional().nullable(),
				price: z.string().or(z.number()),
				compareAtPrice: z.string().or(z.number()).optional().nullable(),
				cost: z.string().or(z.number()).optional().nullable(),
				trackQuantity: z.boolean().default(true),
				status: z.enum(["draft", "active", "archived"]).default("draft"),
				featured: z.boolean().default(false),
				vendorId: z.string().optional().nullable(),
				categoryId: z.string().optional().nullable(),
				material: z.string().optional().nullable(),
				weight: z.string().or(z.number()).optional().default("1"),
				weightUnit: z.string().optional().default("kg"),
				requiresShipping: z.boolean().default(true),
				taxIncluded: z.boolean().default(false),
				internalNote: z.string().optional().nullable(),
				tagIds: z.array(z.string()).optional().default([]),
				media: z
					.array(
						z.object({
							mediaId: z.string(),
							position: z.number(),
							isPrimary: z.boolean().default(false),
						})
					)
					.optional()
					.default([]),
				variantDefinitions: z
					.array(
						z.object({
							id: z.string().optional(),
							name: z.string(),
							position: z.number(),
							options: z.array(
								z.object({
									id: z.string().optional(),
									name: z.string(),
									position: z.number(),
								})
							),
						})
					)
					.optional()
					.default([]),
				generatedVariants: z
					.array(
						z.object({
							id: z.string().optional(),
							sku: z.string().optional().nullable(),
							quantity: z.string().optional().nullable(),
							price: z.string().optional().nullable(),
							cost: z.string().optional().nullable(),
							combination: z.array(
								z.object({
									variantName: z.string(),
									optionName: z.string(),
									optionId: z.string(),
								})
							),
							position: z.number().default(0),
						})
					)
					.optional()
					.default([]),
			}),
		})
	)
	.handler(async ({ data: inputData }) => {
		const { productId, data: updateData } = inputData;
		const baseSlug =
			updateData.slug ||
			updateData.name
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/(^-|-$)/g, "");

		const slug = await generateUniqueSlug(baseSlug, productId);

		const currentProduct = await db.product.findUnique({
			where: { id: productId },
			include: {
				tags: { select: { tagId: true } },
			},
		});

		// Track old values for collection regeneration comparison
		const oldValues = {
			price: currentProduct?.price,
			compareAtPrice: currentProduct?.compareAtPrice,
			status: currentProduct?.status,
			categoryId: currentProduct?.categoryId,
			vendorId: currentProduct?.vendorId,
			tagIds: currentProduct?.tags?.map((t) => t.tagId) || [],
		};

		let productSku = updateData.sku;
		if (
			(!productSku || productSku.trim() === "") &&
			(!currentProduct?.sku || currentProduct.sku.trim() === "")
		) {
			try {
				productSku = await getNextSkuNumberServerFn({ data: {} });
			} catch (error) {
				console.error("Error generating SKU:", error);
				productSku = currentProduct?.sku || `SKU-${productId.slice(0, 8).toUpperCase()}`;
			}
		} else if (!productSku || productSku.trim() === "") {
			productSku = currentProduct?.sku || null;
		}

		// Update product
		await db.product.update({
			where: { id: productId },
			data: {
				name: updateData.name,
				slug,
				description: updateData.description || null,
				sku: productSku,
				price: Number(updateData.price),
				compareAtPrice: updateData.compareAtPrice && Number(updateData.compareAtPrice) > 0 ? Number(updateData.compareAtPrice) : null,
				cost: updateData.cost && Number(updateData.cost) > 0 ? Number(updateData.cost) : null,
				trackQuantity: updateData.trackQuantity,
				status: updateData.status,
				featured: updateData.featured,
				vendorId: updateData.vendorId || null,
				categoryId: updateData.categoryId || null,
				material: updateData.material || null,
				weight: Number(updateData.weight),
				weightUnit: updateData.weightUnit || "kg",
				requiresShipping: updateData.requiresShipping,
				taxIncluded: updateData.taxIncluded,
				internalNote: updateData.internalNote || null,
			},
		});

		// Update product media
		await db.productMedia.deleteMany({ where: { productId } });
		if (updateData.media && updateData.media.length > 0) {
			await db.productMedia.createMany({
				data: updateData.media.map((m) => ({
					id: nanoid(),
					productId,
					mediaId: m.mediaId,
					position: m.position,
					isPrimary: m.isPrimary,
				})),
			});
		}

		// Update product tags
		await db.productTagsToProduct.deleteMany({ where: { productId } });
		if (updateData.tagIds && updateData.tagIds.length > 0) {
			await db.productTagsToProduct.createMany({
				data: updateData.tagIds.map((tagId) => ({
					productId,
					tagId,
				})),
			});
		}

		// Get existing variants for SKU preservation
		const existingVariants = await db.productVariant.findMany({
			where: { productId },
		});
		const existingVariantSkuMap = new Map<string, string>();
		for (const variant of existingVariants) {
			if (variant.sku) {
				existingVariantSkuMap.set(variant.id, variant.sku);
			}
		}

		// Delete existing variant options, variants, option values, and options
		for (const variant of existingVariants) {
			await db.productVariantOption.deleteMany({ where: { variantId: variant.id } });
		}
		await db.productVariant.deleteMany({ where: { productId } });

		const existingOptions = await db.productOption.findMany({ where: { productId } });
		for (const option of existingOptions) {
			await db.productOptionValue.deleteMany({ where: { optionId: option.id } });
		}
		await db.productOption.deleteMany({ where: { productId } });

		// Recreate variant definitions and variants
		const optionIdMap = new Map<string, string>();
		const optionValueIdMap = new Map<string, string>();

		if (updateData.variantDefinitions && updateData.variantDefinitions.length > 0) {
			for (const variantDef of updateData.variantDefinitions) {
				const optionId = variantDef.id || nanoid();
				optionIdMap.set(variantDef.id || optionId, optionId);

				await db.productOption.create({
					data: {
						id: optionId,
						productId,
						name: variantDef.name,
						position: variantDef.position,
					},
				});

				for (const optionValue of variantDef.options) {
					const optionValueId = optionValue.id || nanoid();
					optionValueIdMap.set(optionValue.id || optionValueId, optionValueId);

					await db.productOptionValue.create({
						data: {
							id: optionValueId,
							optionId,
							name: optionValue.name,
							position: optionValue.position,
						},
					});
				}
			}
		}

		if (updateData.generatedVariants && updateData.generatedVariants.length > 0) {
			const finalProductSku = productSku || currentProduct?.sku || "";

			for (let index = 0; index < updateData.generatedVariants.length; index++) {
				const generatedVariant = updateData.generatedVariants[index];
				const variantId = generatedVariant.id || nanoid();

				let variantSku = generatedVariant.sku;
				if (!variantSku || variantSku.trim() === "") {
					if (generatedVariant.id && existingVariantSkuMap.has(generatedVariant.id)) {
						variantSku = existingVariantSkuMap.get(generatedVariant.id)!;
					} else if (finalProductSku) {
						variantSku = `${finalProductSku}-${index + 1}`;
					}
				}

				await db.productVariant.create({
					data: {
						id: variantId,
						productId,
						sku: variantSku,
						price: generatedVariant.price ? Number(generatedVariant.price) : null,
						cost: generatedVariant.cost ? Number(generatedVariant.cost) : null,
						position: generatedVariant.position,
						isDefault: generatedVariant.position === 0,
					},
				});

				if (updateData.variantDefinitions && updateData.variantDefinitions.length > 0) {
					for (const combo of generatedVariant.combination) {
						const variantDef = updateData.variantDefinitions.find(
							(vd) => vd.name === combo.variantName
						);
						if (variantDef) {
							const optionId = optionIdMap.get(variantDef.id || "");
							if (optionId) {
								const optionValue = variantDef.options.find(
									(ov) => ov.name === combo.optionName
								);
								if (optionValue) {
									const optionValueId = optionValueIdMap.get(optionValue.id || "");
									if (optionValueId && optionId) {
										await db.productVariantOption.create({
											data: {
												id: nanoid(),
												variantId,
												optionId,
												optionValueId,
											},
										});
									}
								}
							}
						}
					}
				}

				// Update or create inventory
				if (generatedVariant.quantity !== null && generatedVariant.quantity !== undefined) {
					const quantityValue = parseInt(generatedVariant.quantity) || 0;

					const existingInventory = await db.inventory.findUnique({
						where: { variantId },
					});

					if (existingInventory) {
						await db.inventory.update({
							where: { variantId },
							data: {
								onHand: quantityValue,
								available: quantityValue - existingInventory.reserved - existingInventory.committed,
							},
						});
					} else {
						await db.inventory.create({
							data: {
								id: nanoid(),
								variantId,
								onHand: quantityValue,
								available: quantityValue,
								reserved: 0,
								committed: 0,
							},
						});
					}
				}
			}
		} else {
			// Create default variant if no variants provided
			const defaultVariantId = nanoid();
			await db.productVariant.create({
				data: {
					id: defaultVariantId,
					productId,
					sku: null,
					price: null,
					cost: null,
					position: 0,
					isDefault: true,
				},
			});
		}

		// Mark collections for regeneration based on changed fields
		const changedFields: string[] = [];
		const newPrice = Number(updateData.price);
		const newCompareAtPrice = updateData.compareAtPrice && Number(updateData.compareAtPrice) > 0
			? Number(updateData.compareAtPrice)
			: null;

		// Check price changes
		if (oldValues.price !== undefined && Number(oldValues.price) !== newPrice) {
			changedFields.push("price");
		}

		// Check compareAtPrice changes
		const oldCompare = oldValues.compareAtPrice ? Number(oldValues.compareAtPrice) : null;
		if (oldCompare !== newCompareAtPrice) {
			changedFields.push("compareAtPrice");
		}

		// Check status changes
		if (oldValues.status !== updateData.status) {
			changedFields.push("status");
		}

		// Check category changes
		if (oldValues.categoryId !== (updateData.categoryId || null)) {
			changedFields.push("categoryId");
		}

		// Check vendor changes
		if (oldValues.vendorId !== (updateData.vendorId || null)) {
			changedFields.push("vendorId");
		}

		// Check tag changes (compare arrays)
		const oldTagIds = new Set(oldValues.tagIds);
		const newTagIds = new Set(updateData.tagIds || []);
		const tagsChanged = oldTagIds.size !== newTagIds.size ||
			[...oldTagIds].some(id => !newTagIds.has(id));
		if (tagsChanged) {
			changedFields.push("tags");
		}

		// Mark collections if any relevant fields changed
		// Only mark if product is/was active (status change also triggers)
		if (changedFields.length > 0 && (updateData.status === "active" || oldValues.status === "active")) {
			await markCollectionsForRegeneration(changedFields, "product");
		}

		const updatedProduct = await getProductByIdServerFn({
			data: { productId },
		});
		return updatedProduct;
	});

// Get variant by ID
export const getVariantByIdServerFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ variantId: z.string() }))
	.handler(async ({ data }) => {
		const variant = await db.productVariant.findUnique({
			where: { id: data.variantId },
			include: {
				product: {
					include: {
						category: true,
						vendor: true,
					},
				},
				variantOptions: {
					include: {
						optionValue: {
							include: { option: true },
						},
					},
				},
			},
		});

		if (!variant) {
			throw new Error("Variant not found");
		}

		return serializeData({
			...variant,
			variantOptions: variant.variantOptions.map((vo) => ({
				...vo,
				optionValue: vo.optionValue
					? {
							...vo.optionValue,
							option: vo.optionValue.option || null,
						}
					: null,
			})),
		});
	});

// Update variant
export const updateVariantServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			variantId: z.string(),
			data: z.object({
				sku: z.string().optional().nullable(),
				price: z.string().or(z.number()).optional().nullable(),
				compareAtPrice: z.string().or(z.number()).optional().nullable(),
				cost: z.string().or(z.number()).optional().nullable(),
				weight: z.string().or(z.number()).optional().nullable(),
				barcode: z.string().optional().nullable(),
				position: z.number().optional(),
				isDefault: z.boolean().optional(),
			}),
		})
	)
	.handler(async ({ data }) => {
		const { variantId, data: updateData } = data;

		const updateFields: any = {};
		if (updateData.sku !== undefined) updateFields.sku = updateData.sku;
		if (updateData.price !== undefined)
			updateFields.price = updateData.price ? Number(updateData.price) : null;
		if (updateData.compareAtPrice !== undefined)
			updateFields.compareAtPrice = updateData.compareAtPrice
				? Number(updateData.compareAtPrice)
				: null;
		if (updateData.cost !== undefined)
			updateFields.cost = updateData.cost ? Number(updateData.cost) : null;
		if (updateData.weight !== undefined)
			updateFields.weight = updateData.weight ? Number(updateData.weight) : null;
		if (updateData.barcode !== undefined) updateFields.barcode = updateData.barcode;
		if (updateData.position !== undefined) updateFields.position = updateData.position;
		if (updateData.isDefault !== undefined) updateFields.isDefault = updateData.isDefault;

		await db.productVariant.update({
			where: { id: variantId },
			data: updateFields,
		});

		const updatedVariant = await getVariantByIdServerFn({
			data: { variantId },
		});
		return updatedVariant;
	});

// Delete product
export const deleteProductServerFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ id: z.string() }))
	.handler(async ({ data }) => {
		// Check if product was active before deleting
		const product = await db.product.findUnique({
			where: { id: data.id },
			select: { status: true },
		});

		await db.product.delete({ where: { id: data.id } });

		// Mark all rule-based collections for regeneration if product was active
		if (product?.status === "active") {
			await markAllRuleBasedCollectionsForRegeneration();
		}

		return {
			success: true,
			message: "Product deleted successfully",
		};
	});
