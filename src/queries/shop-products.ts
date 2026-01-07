import { db } from "@/db/db";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import {
	products,
	productMedia,
	media,
	productVariants,
	productVariantOptions,
	productOptionValues,
	productOptions,
	productCategories,
	inventory,
	productTags,
	productTagsToProducts,
} from "@/db/schema";
import { eq, and, like, or, gte, lte, inArray, desc, asc } from "drizzle-orm";
import { z } from "zod";

export const SHOP_PRODUCTS_QUERY_KEY = "shop-products";

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
		const conditions = [eq(products.status, "active")];

		if (search) {
			conditions.push(
				or(
					like(products.name, `%${search}%`),
					like(products.sku, `%${search}%`)
				)!
			);
		}

		// Handle category filter by ID or slug
		if (categoryId) {
			conditions.push(eq(products.categoryId, categoryId));
		} else if (categorySlug) {
			// Get category ID from slug
			const [category] = await db
				.select({ id: productCategories.id })
				.from(productCategories)
				.where(eq(productCategories.slug, categorySlug))
				.limit(1);
			
			if (category) {
				conditions.push(eq(products.categoryId, category.id));
			} else {
				// Category not found, return empty results
				return {
					data: [],
					total: 0,
					page,
					limit,
					availableSizes: [],
					availableColors: [],
				};
			}
		}

		// Handle tag filtering
		let productIdsWithTags: string[] | null = null;
		if (tags && tags.length > 0) {
			// Get tag IDs from slugs
			const tagRows = await db
				.select({ id: productTags.id })
				.from(productTags)
				.where(inArray(productTags.slug, tags));

			if (tagRows.length > 0) {
				const tagIds = tagRows.map((t) => t.id);
				
				// Get product IDs that have these tags
				const productTagRows = await db
					.select({ productId: productTagsToProducts.productId })
					.from(productTagsToProducts)
					.where(inArray(productTagsToProducts.tagId, tagIds));

				productIdsWithTags = productTagRows.map((pt) => pt.productId);
				
				if (productIdsWithTags.length === 0) {
					// No products with these tags
					return {
						data: [],
						total: 0,
						page,
						limit,
						availableSizes: [],
						availableColors: [],
					};
				}
			} else {
				// Tags not found
				return {
					data: [],
					total: 0,
					page,
					limit,
					availableSizes: [],
					availableColors: [],
				};
			}
		}

		// Add tag filter to conditions if needed
		if (productIdsWithTags) {
			conditions.push(inArray(products.id, productIdsWithTags));
		}

		// Get products (get all first, then filter and paginate)
		const productsList = await db
			.select({
				product: products,
				category: productCategories,
			})
			.from(products)
			.leftJoin(
				productCategories,
				eq(products.categoryId, productCategories.id)
			)
			.where(and(...conditions))
			.orderBy(desc(products.createdAt));

		// Get primary images and variants for each product
		const productsWithDetails = await Promise.all(
			productsList.map(async (row) => {
				// Get primary image
				const primaryMediaRow = await db
					.select({
						media: media,
					})
					.from(productMedia)
					.leftJoin(media, eq(productMedia.mediaId, media.id))
					.where(
						and(
							eq(productMedia.productId, row.product.id),
							eq(productMedia.isPrimary, true)
						)
					)
					.limit(1);

				// Get variants with options
				const variants = await db
					.select({
						variant: productVariants,
					})
					.from(productVariants)
					.where(eq(productVariants.productId, row.product.id))
					.orderBy(productVariants.position);

				// Get options and values for variants
				const variantsWithOptions = await Promise.all(
					variants.map(async (v) => {
						const variantOptions = await db
							.select({
								option: productOptions,
								optionValue: productOptionValues,
							})
							.from(productVariantOptions)
							.leftJoin(
								productOptions,
								eq(productVariantOptions.optionId, productOptions.id)
							)
							.leftJoin(
								productOptionValues,
								eq(
									productVariantOptions.optionValueId,
									productOptionValues.id
								)
							)
							.where(eq(productVariantOptions.variantId, v.variant.id));

						// Get inventory
						const [inventoryData] = await db
							.select()
							.from(inventory)
							.where(eq(inventory.variantId, v.variant.id))
							.limit(1);

						return {
							...v.variant,
							options: variantOptions.map((vo) => ({
								optionName: vo.option?.name || "",
								optionValue: vo.optionValue?.name || "",
							})),
							inventory: inventoryData || null,
						};
					})
				);

				// Filter by price range
				const productPrice = parseFloat(row.product.price || "0");
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
				if (productIdsWithTags && !productIdsWithTags.includes(row.product.id)) {
					return null;
				}

				return {
					...row.product,
					category: row.category,
					primaryImage: primaryMediaRow[0]?.media?.url || null,
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

		return {
			data: paginatedProducts,
			total: filteredProducts.length,
			page,
			limit,
			availableSizes: Array.from(availableSizes).sort(),
			availableColors: Array.from(availableColors).sort(),
		};
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
		const categories = await db
			.select()
			.from(productCategories)
			.orderBy(productCategories.name);

		return categories;
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
	.handler(async ({ data }) => {
		// Fetch product with category and vendor
		const [productRow] = await db
			.select({
				product: products,
				category: productCategories,
			})
			.from(products)
			.leftJoin(
				productCategories,
				eq(products.categoryId, productCategories.id)
			)
			.where(and(eq(products.slug, data.slug), eq(products.status, "active")))
			.limit(1);

		if (!productRow?.product) {
			throw new Error("Product not found");
		}

		const product = productRow.product;

		// Fetch all media ordered by position
		const mediaRows = await db
			.select({
				productMedia: productMedia,
				media: media,
			})
			.from(productMedia)
			.leftJoin(media, eq(productMedia.mediaId, media.id))
			.where(eq(productMedia.productId, product.id))
			.orderBy(asc(productMedia.position));

		// Fetch options with values
		const optionsRows = await db
			.select({
				option: productOptions,
			})
			.from(productOptions)
			.where(eq(productOptions.productId, product.id))
			.orderBy(asc(productOptions.position));

		const options = await Promise.all(
			optionsRows.map(async (optRow) => {
				const values = await db
					.select()
					.from(productOptionValues)
					.where(eq(productOptionValues.optionId, optRow.option.id))
					.orderBy(asc(productOptionValues.position));

				return {
					...optRow.option,
					values,
				};
			})
		);

		// Fetch variants with variant options and inventory
		const variantsRows = await db
			.select({
				variant: productVariants,
				inventory: inventory,
			})
			.from(productVariants)
			.leftJoin(inventory, eq(productVariants.id, inventory.variantId))
			.where(eq(productVariants.productId, product.id))
			.orderBy(asc(productVariants.position));

		const variants = await Promise.all(
			variantsRows.map(async (row) => {
				const variant = row.variant;
				const variantOptionsRows = await db
					.select({
						variantOption: productVariantOptions,
						optionValue: productOptionValues,
						option: productOptions,
					})
					.from(productVariantOptions)
					.leftJoin(
						productOptionValues,
						eq(
							productVariantOptions.optionValueId,
							productOptionValues.id
						)
					)
					.leftJoin(
						productOptions,
						eq(productOptionValues.optionId, productOptions.id)
					)
					.where(eq(productVariantOptions.variantId, variant.id));

				const variantOptions = variantOptionsRows.map((voRow) => ({
					optionName: voRow.option?.name || "",
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
				...row.productMedia,
				media: row.media
					? {
							...row.media,
							metadata: (row.media.metadata as {}) || {},
						}
					: null,
			}))
			.filter((item) => item.media !== null);

		return {
			...product,
			category: productRow.category || null,
			media: mediaItems,
			options,
			variants,
		};
	});

export const getShopProductBySlugQueryOptions = (slug: string) => {
	return queryOptions({
		queryKey: ["shop-product", slug],
		queryFn: async () => {
			return await getShopProductBySlugServerFn({ data: { slug } });
		},
	});
};

