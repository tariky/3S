import { db, serializeData } from "@/db/db";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const SHOP_PRODUCTS_QUERY_KEY = "shop-products";

// Type definitions for shop product
export interface ShopProductVariantOption {
	optionName: string;
	optionValue: string;
	optionValueId: string;
}

export interface ShopProductVariant {
	id: string;
	productId: string;
	sku: string | null;
	price: string | null;
	compareAtPrice: string | null;
	position: number;
	isDefault: boolean;
	createdAt: Date;
	updatedAt: Date;
	inventory: {
		id: string;
		variantId: string;
		available: number;
		reserved: number;
		createdAt: Date;
		updatedAt: Date;
	} | null;
	options: ShopProductVariantOption[];
}

export interface ShopProductOption {
	id: string;
	productId: string;
	name: string;
	position: number;
	createdAt: Date;
	updatedAt: Date;
	values: {
		id: string;
		optionId: string;
		name: string;
		position: number;
		createdAt: Date;
		updatedAt: Date;
	}[];
}

export interface ShopProductMedia {
	id: string;
	productId: string;
	mediaId: string;
	position: number;
	isPrimary: boolean;
	variantId: string | null;
	createdAt: Date;
	media: {
		id: string;
		url: string;
		alt: string | null;
		type: string;
		filename: string;
		mimeType: string | null;
		size: number | null;
		width: number | null;
		height: number | null;
		metadata: Record<string, unknown>;
		createdAt: Date;
		storage: string;
	} | null;
}

export interface ShopProduct {
	id: string;
	name: string;
	slug: string;
	description: string | null;
	sku: string | null;
	price: string;
	compareAtPrice: string | null;
	status: string;
	material: string | null;
	categoryId: string | null;
	createdAt: Date;
	updatedAt: Date;
	category: {
		id: string;
		name: string;
		slug: string;
		description: string | null;
		image: string | null;
		parentId: string | null;
		position: number;
		createdAt: Date;
		updatedAt: Date;
	} | null;
	media: ShopProductMedia[];
	options: ShopProductOption[];
	variants: ShopProductVariant[];
}

// Get products for shop with images and variants
export const getShopProductsServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			search: z.string().optional(),
			categoryId: z.string().optional(),
			categorySlug: z.string().optional(),
			tags: z.array(z.string()).optional(),
			minPrice: z.number().optional(),
			maxPrice: z.number().optional(),
			sizes: z.array(z.string()).optional(),
			colors: z.array(z.string()).optional(),
			page: z.number().optional().default(1),
			limit: z.number().optional().default(24),
		})
	)
	.handler(async ({ data }) => {
		const {
			search,
			categoryId,
			categorySlug,
			tags,
			minPrice,
			maxPrice,
			sizes,
			colors,
			page = 1,
			limit = 24,
		} = data;

		// Build where conditions
		const whereConditions: Record<string, unknown> = {
			status: "active",
		};

		if (search) {
			whereConditions.OR = [
				{ name: { contains: search } },
				{ sku: { contains: search } },
			];
		}

		// Handle category filter by ID or slug
		if (categoryId) {
			whereConditions.categoryId = categoryId;
		} else if (categorySlug) {
			// Get category ID from slug
			const category = await db.product_categories.findFirst({
				where: { slug: categorySlug },
				select: { id: true },
			});

			if (category) {
				whereConditions.categoryId = category.id;
			} else {
				// Category not found, return empty results
				return serializeData({
					data: [],
					total: 0,
					page,
					limit,
					availableSizes: [],
					availableColors: [],
				});
			}
		}

		// Handle tag filtering
		let productIdsWithTags: string[] | null = null;
		if (tags && tags.length > 0) {
			// Get tag IDs from slugs
			const tagRows = await db.product_tags.findMany({
				where: { slug: { in: tags } },
				select: { id: true },
			});

			if (tagRows.length > 0) {
				const tagIds = tagRows.map((t) => t.id);

				// Get product IDs that have these tags
				const productTagRows = await db.product_tagsToProduct.findMany({
					where: { tagId: { in: tagIds } },
					select: { productId: true },
				});

				productIdsWithTags = productTagRows.map((pt) => pt.productId);

				if (productIdsWithTags.length === 0) {
					// No products with these tags
					return serializeData({
						data: [],
						total: 0,
						page,
						limit,
						availableSizes: [],
						availableColors: [],
					});
				}
			} else {
				// Tags not found
				return serializeData({
					data: [],
					total: 0,
					page,
					limit,
					availableSizes: [],
					availableColors: [],
				});
			}
		}

		// Add tag filter to conditions if needed
		if (productIdsWithTags) {
			whereConditions.id = { in: productIdsWithTags };
		}

		// Get products (get all first, then filter and paginate)
		const productsList = await db.products.findMany({
			where: whereConditions,
			include: {
				category: true,
			},
			orderBy: { createdAt: "desc" },
		});

		// Get primary images and variants for each product
		const productsWithDetails = await Promise.all(
			productsList.map(async (row) => {
				// Get primary image
				const primaryMediaRow = await db.product_media.findFirst({
					where: {
						productId: row.id,
						isPrimary: true,
					},
					include: {
						media: true,
					},
				});

				// Get variants with options
				const variants = await db.product_variants.findMany({
					where: { productId: row.id },
					orderBy: { position: "asc" },
				});

				// Get options and values for variants
				const variantsWithOptions = await Promise.all(
					variants.map(async (v) => {
						const variantOptions = await db.product_variant_options.findMany({
							where: { variantId: v.id },
							include: {
								option: true,
								optionValue: true,
							},
						});

						// Get inventory
						const inventoryData = await db.inventory.findFirst({
							where: { variantId: v.id },
						});

						return {
							...v,
							options: variantOptions.map((vo) => ({
								optionName: vo.option?.name || "",
								optionValue: vo.optionValue?.name || "",
							})),
							inventory: inventoryData || null,
						};
					})
				);

				// Filter by price range
				const productPrice = parseFloat(row.price || "0");
				if (minPrice !== undefined && productPrice < minPrice) {
					return null;
				}
				if (maxPrice !== undefined && productPrice > maxPrice) {
					return null;
				}

				// Filter by size/color if provided
				if (sizes && sizes.length > 0) {
					const hasMatchingSize = variantsWithOptions.some((v) =>
						v.options.some(
							(o) =>
								(o.optionName.toLowerCase() === "size" ||
									o.optionName.toLowerCase() === "veličina" ||
									o.optionName.toLowerCase() === "velicina") &&
								sizes.includes(o.optionValue)
						)
					);
					if (!hasMatchingSize) return null;
				}

				if (colors && colors.length > 0) {
					const hasMatchingColor = variantsWithOptions.some((v) =>
						v.options.some(
							(o) =>
								(o.optionName.toLowerCase() === "color" ||
									o.optionName.toLowerCase() === "boja") &&
								colors.includes(o.optionValue)
						)
					);
					if (!hasMatchingColor) return null;
				}

				// Filter by tags if provided (already filtered at DB level, but double-check)
				if (productIdsWithTags && !productIdsWithTags.includes(row.id)) {
					return null;
				}

				return {
					...row,
					category: row.category,
					primaryImage: primaryMediaRow?.media?.url || null,
					variants: variantsWithOptions,
				};
			})
		);

		// Filter out nulls
		const filteredProducts = productsWithDetails.filter(
			(p): p is NonNullable<typeof p> => p !== null
		);

		// Extract available sizes and colors from all products (before filtering)
		const availableSizes = new Set<string>();
		const availableColors = new Set<string>();

		productsWithDetails.forEach((product) => {
			if (product && product.variants) {
				product.variants.forEach((variant) => {
					variant.options.forEach((option) => {
						const optionNameLower = option.optionName.toLowerCase();
						if (
							optionNameLower === "size" ||
							optionNameLower === "veličina" ||
							optionNameLower === "velicina"
						) {
							availableSizes.add(option.optionValue);
						}
						if (
							optionNameLower === "color" ||
							optionNameLower === "boja"
						) {
							availableColors.add(option.optionValue);
						}
					});
				});
			}
		});

		// Apply pagination after filtering
		const paginatedProducts = filteredProducts.slice(
			(page - 1) * limit,
			page * limit
		);

		return serializeData({
			data: paginatedProducts,
			total: filteredProducts.length,
			page,
			limit,
			availableSizes: Array.from(availableSizes).sort(),
			availableColors: Array.from(availableColors).sort(),
		});
	});

export const getShopProductsQueryOptions = (opts?: {
	search?: string;
	categoryId?: string;
	categorySlug?: string;
	tags?: string[];
	minPrice?: number;
	maxPrice?: number;
	sizes?: string[];
	colors?: string[];
	page?: number;
	limit?: number;
}) => {
	return queryOptions({
		queryKey: [SHOP_PRODUCTS_QUERY_KEY, opts],
		queryFn: async () => {
			return await getShopProductsServerFn({ data: opts || {} });
		},
	});
};

// Get all categories for filter
export const getShopCategoriesServerFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({}))
	.handler(async () => {
		const categories = await db.product_categories.findMany({
			orderBy: { name: "asc" },
		});

		return serializeData(categories);
	});

export const getShopCategoriesQueryOptions = () => {
	return queryOptions({
		queryKey: ["shop-categories"],
		queryFn: async () => {
			return await getShopCategoriesServerFn({ data: {} });
		},
	});
};

// Get product by slug with all details for product page
export const getShopProductBySlugServerFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ slug: z.string() }))
	.handler(async ({ data }): Promise<ShopProduct | null> => {
		// Fetch product with category and vendor
		const productRow = await db.products.findFirst({
			where: {
				slug: data.slug,
				status: "active",
			},
			include: {
				category: true,
			},
		});

		if (!productRow) {
			return null;
		}

		const product = productRow;

		// Fetch all media ordered by position
		const mediaRows = await db.product_media.findMany({
			where: { productId: product.id },
			include: {
				media: true,
			},
			orderBy: { position: "asc" },
		});

		// Fetch options with values
		const optionsRows = await db.product_options.findMany({
			where: { productId: product.id },
			orderBy: { position: "asc" },
		});

		const options = await Promise.all(
			optionsRows.map(async (optRow) => {
				const values = await db.product_option_values.findMany({
					where: { optionId: optRow.id },
					orderBy: { position: "asc" },
				});

				return {
					...optRow,
					values,
				};
			})
		);

		// Fetch variants with variant options and inventory
		const variantsRows = await db.product_variants.findMany({
			where: { productId: product.id },
			include: {
				inventory: true,
			},
			orderBy: { position: "asc" },
		});

		const variants = await Promise.all(
			variantsRows.map(async (row) => {
				const variant = row;
				const variantOptionsRows = await db.product_variant_options.findMany({
					where: { variantId: variant.id },
					include: {
						optionValue: {
							include: {
								option: true,
							},
						},
					},
				});

				const variantOptions = variantOptionsRows.map((voRow) => ({
					optionName: voRow.optionValue?.option?.name || "",
					optionValue: voRow.optionValue?.name || "",
					optionValueId: voRow.optionValue?.id || "",
				}));

				return {
					...variant,
					inventory: row.inventory || null,
					options: variantOptions,
				};
			})
		);

		// Transform media
		const mediaItems = mediaRows
			.map((row) => ({
				...row,
				media: row.media
					? {
							...row.media,
							metadata: (row.media.metadata as {}) || {},
						}
					: null,
			}))
			.filter((item) => item.media !== null);

		return serializeData({
			...product,
			category: productRow.category || null,
			media: mediaItems,
			options,
			variants,
		}) as ShopProduct;
	});

export const getShopProductBySlugQueryOptions = (slug: string) => {
	return queryOptions({
		queryKey: ["shop-product", slug],
		queryFn: async (): Promise<ShopProduct> => {
			return (await getShopProductBySlugServerFn({
				data: { slug },
			})) as ShopProduct;
		},
	});
};
