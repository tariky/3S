import { db } from "@/db/db";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import {
  products,
  productMedia,
  media,
  productVariants,
  productVariantOptions,
  productOptionValues,
  productOptions,
  productTags,
  productTagsToProducts,
  productCategories,
  vendors,
  inventory,
} from "@/db/schema";
import { eq, and, like, count, desc, asc, or } from "drizzle-orm";
import { z } from "zod";
import { nanoid } from "nanoid";

export const PRODUCTS_QUERY_KEY = "products";

// Get all categories for dropdown (no pagination)
export const getAllCategoriesForSelectServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({}))
  .handler(async () => {
    const categories = await db.query.productCategories.findMany({
      orderBy: (categories, { asc }) => [asc(categories.name)],
    });
    return categories;
  });

// Get all vendors for dropdown (no pagination)
export const getAllVendorsForSelectServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({}))
  .handler(async () => {
    const vendors = await db.query.vendors.findMany({
      where: (vendors, { eq }) => eq(vendors.active, true),
      orderBy: (vendors, { asc }) => [asc(vendors.name)],
    });
    return vendors;
  });

// Get all tags for dropdown (no pagination)
export const getAllTagsForSelectServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({}))
  .handler(async () => {
    const tags = await db.query.productTags.findMany({
      orderBy: (tags, { asc }) => [asc(tags.name)],
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
    const existingTag = await db.query.productTags.findFirst({
      where: (tags, { eq }) => eq(tags.slug, slug),
    });

    if (existingTag) {
      return existingTag;
    }

    // Create new tag
    const tagId = nanoid();
    await db.insert(productTags).values({
      id: tagId,
      name: data.name,
      slug,
    });

    const [newTag] = await db
      .select()
      .from(productTags)
      .where(eq(productTags.id, tagId));

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
    const mediaId = nanoid();
    await db.insert(media).values({
      id: mediaId,
      filename: data.filename,
      originalFilename: data.originalFilename,
      mimeType: data.mimeType,
      size: data.size,
      url: data.url,
      alt: data.alt || null,
      type: data.type,
      storage: data.storage,
      metadata: data.metadata || null,
    });

    const [createdMedia] = await db
      .select()
      .from(media)
      .where(eq(media.id, mediaId));
    return {
      ...createdMedia,
      metadata: (createdMedia.metadata as {}) || {},
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
            id: z.string(), // Temporary ID from form
            name: z.string(),
            position: z.number(),
            options: z.array(
              z.object({
                id: z.string(), // Temporary ID from form
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
                optionId: z.string(), // Temporary ID from form
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
    const slug =
      data.slug ||
      data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    // Insert product
    await db.insert(products).values({
      id: productId,
      name: data.name,
      slug,
      description: data.description || null,
      sku: data.sku || null,
      price: String(data.price),
      compareAtPrice: data.compareAtPrice ? String(data.compareAtPrice) : null,
      cost: data.cost ? String(data.cost) : null,
      trackQuantity: data.trackQuantity,
      status: data.status,
      featured: data.featured,
      vendorId: data.vendorId || null,
      categoryId: data.categoryId || null,
      material: data.material || null,
      weight: String(data.weight),
      weightUnit: data.weightUnit || "kg",
      requiresShipping: data.requiresShipping,
      taxIncluded: data.taxIncluded,
      internalNote: data.internalNote || null,
    });

    // Insert product media
    if (data.media && data.media.length > 0) {
      const mediaRecords = data.media.map((m) => ({
        id: nanoid(),
        productId,
        mediaId: m.mediaId,
        position: m.position,
        isPrimary: m.isPrimary,
      }));
      await db.insert(productMedia).values(mediaRecords);
    }

    // Create product options and option values if variant definitions exist
    const optionIdMap = new Map<string, string>(); // Maps temporary option IDs to database option IDs
    const optionValueIdMap = new Map<string, string>(); // Maps temporary option value IDs to database optionValueIds

    if (data.variantDefinitions && data.variantDefinitions.length > 0) {
      // Create product options (variant definitions like "Size", "Color")
      for (const variantDef of data.variantDefinitions) {
        const optionId = nanoid();
        optionIdMap.set(variantDef.id, optionId);

        await db.insert(productOptions).values({
          id: optionId,
          productId,
          name: variantDef.name,
          position: variantDef.position,
        });

        // Create product option values (like "S", "M", "L" for Size)
        for (const optionValue of variantDef.options) {
          const optionValueId = nanoid();
          optionValueIdMap.set(optionValue.id, optionValueId);

          await db.insert(productOptionValues).values({
            id: optionValueId,
            optionId,
            name: optionValue.name,
            position: optionValue.position,
          });
        }
      }
    }

    // Insert product variants
    if (data.generatedVariants && data.generatedVariants.length > 0) {
      // Create variants from generated variants
      for (const generatedVariant of data.generatedVariants) {
        const variantId = nanoid();
        await db.insert(productVariants).values({
          id: variantId,
          productId,
          sku: generatedVariant.sku || null,
          price: generatedVariant.price ? String(generatedVariant.price) : null,
          cost: generatedVariant.cost ? String(generatedVariant.cost) : null,
          position: generatedVariant.position,
          isDefault: generatedVariant.position === 0, // First variant is default
        });

        // Create product variant options (link variant to its option values)
        if (data.variantDefinitions && data.variantDefinitions.length > 0) {
          for (const combo of generatedVariant.combination) {
            // Find the option ID for this variant name
            const variantDef = data.variantDefinitions.find(
              (vd) => vd.name === combo.variantName
            );
            if (!variantDef) continue;

            const dbOptionId = optionIdMap.get(variantDef.id);
            const dbOptionValueId = optionValueIdMap.get(combo.optionId);

            if (dbOptionId && dbOptionValueId) {
              await db.insert(productVariantOptions).values({
                id: nanoid(),
                variantId,
                optionId: dbOptionId,
                optionValueId: dbOptionValueId,
              });
            }
          }
        }

        // Create inventory record if quantity is provided
        if (
          generatedVariant.quantity !== null &&
          generatedVariant.quantity !== undefined
        ) {
          const quantityValue = parseInt(generatedVariant.quantity) || 0;
          await db.insert(inventory).values({
            id: nanoid(),
            variantId,
            onHand: quantityValue,
            available: quantityValue,
            reserved: 0,
            committed: 0,
          });
        }
      }
    } else {
      // No variants - create a single default variant with product's base price/cost
      const defaultVariantId = nanoid();
      await db.insert(productVariants).values({
        id: defaultVariantId,
        productId,
        sku: data.sku || null,
        price: String(data.price),
        compareAtPrice: data.compareAtPrice
          ? String(data.compareAtPrice)
          : null,
        cost: data.cost ? String(data.cost) : null,
        weight: String(data.weight),
        position: 0,
        isDefault: true,
      });
    }

    // Insert product tags
    if (data.tagIds && data.tagIds.length > 0) {
      const tagRecords = data.tagIds.map((tagId) => ({
        productId,
        tagId,
      }));
      await db.insert(productTagsToProducts).values(tagRecords);
    }

    // Fetch and return the created product with relations
    const [createdProduct] = await db
      .select()
      .from(products)
      .where(eq(products.id, productId));

    return createdProduct;
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

    // Build where conditions
    const conditions = [];
    if (search) {
      conditions.push(like(products.name, `%${search}%`));
    }
    if (status) {
      conditions.push(eq(products.status, status));
    }
    if (categoryId) {
      conditions.push(eq(products.categoryId, categoryId));
    }

    // Fetch products with manual joins
    const productsQuery = db
      .select({
        product: products,
        category: productCategories,
        vendor: vendors,
      })
      .from(products)
      .leftJoin(
        productCategories,
        eq(products.categoryId, productCategories.id)
      )
      .leftJoin(vendors, eq(products.vendorId, vendors.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const response = await productsQuery;

    // Transform the response to match expected format
    const transformedResponse = response.map((row) => ({
      ...row.product,
      category: row.category || null,
      vendor: row.vendor || null,
    }));

    // Build total count query with same conditions
    const totalConditions = [];
    if (search) {
      totalConditions.push(like(products.name, `%${search}%`));
    }
    if (status) {
      totalConditions.push(eq(products.status, status));
    }
    if (categoryId) {
      totalConditions.push(eq(products.categoryId, categoryId));
    }

    const totalQuery = db
      .select({ count: count() })
      .from(products)
      .where(totalConditions.length > 0 ? and(...totalConditions) : undefined);

    const total = await totalQuery;
    const totalCount = total[0].count;
    const hasNextPage = page * limit < totalCount;
    const hasPreviousPage = page > 1;
    const nextCursor = page + 1;
    const previousCursor = page - 1;

    return {
      data: transformedResponse,
      total: totalCount,
      hasNextPage,
      hasPreviousPage,
      nextCursor,
      previousCursor,
    };
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

// Search products for order creation (simplified with variants and inventory)
export const searchProductsForOrderServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      search: z.string().optional(),
      limit: z.number().optional().default(20),
    })
  )
  .handler(async ({ data }) => {
    const { search, limit = 20 } = data;
    const conditions = [eq(products.status, "active")];

    if (search && search.trim().length > 0) {
      conditions.push(
        or(
          like(products.name, `%${search}%`),
          like(products.sku, `%${search}%`)
        )!
      );
    }

    // Get products
    const productsList = await db
      .select({
        product: products,
      })
      .from(products)
      .where(and(...conditions))
      .orderBy(desc(products.createdAt))
      .limit(limit);

    // Get primary images for each product
    const productsWithImages = await Promise.all(
      productsList.map(async (row) => {
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

        return {
          ...row.product,
          primaryImage: primaryMediaRow[0]?.media?.url || null,
        };
      })
    );

    // Get variants and inventory for each product
    const productsWithVariants = await Promise.all(
      productsWithImages.map(async (product) => {
        const variantsRows = await db
          .select({
            variant: productVariants,
            inventory: inventory,
          })
          .from(productVariants)
          .leftJoin(inventory, eq(productVariants.id, inventory.variantId))
          .where(eq(productVariants.productId, product.id))
          .orderBy(asc(productVariants.position));

        // Get variant options for each variant
        const variants = await Promise.all(
          variantsRows.map(async (v) => {
            const variantOptionsRows = await db
              .select({
                variantOption: productVariantOptions,
                optionValue: productOptionValues,
                option: productOptions,
              })
              .from(productVariantOptions)
              .leftJoin(
                productOptionValues,
                eq(productVariantOptions.optionValueId, productOptionValues.id)
              )
              .leftJoin(
                productOptions,
                eq(productOptionValues.optionId, productOptions.id)
              )
              .where(eq(productVariantOptions.variantId, v.variant.id));

            const variantOptions = variantOptionsRows.map((row) => ({
              ...row.variantOption,
              optionValue: row.optionValue
                ? {
                    ...row.optionValue,
                    option: row.option || null,
                  }
                : null,
            }));

            return {
              ...v.variant,
              inventory: v.inventory || {
                available: 0,
                reserved: 0,
                onHand: 0,
                committed: 0,
              },
              variantOptions,
            };
          })
        );

        return {
          ...product,
          variants,
        };
      })
    );

    return productsWithVariants;
  });

// Get product by ID with all relations
export const getProductByIdServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ productId: z.string() }))
  .handler(async ({ data }) => {
    // Fetch product with category and vendor
    const [productRow] = await db
      .select({
        product: products,
        category: productCategories,
        vendor: vendors,
      })
      .from(products)
      .leftJoin(
        productCategories,
        eq(products.categoryId, productCategories.id)
      )
      .leftJoin(vendors, eq(products.vendorId, vendors.id))
      .where(eq(products.id, data.productId))
      .limit(1);

    if (!productRow?.product) {
      throw new Error("Product not found");
    }

    const product = productRow.product;

    // Fetch media
    const mediaRows = await db
      .select({
        productMedia: productMedia,
        media: media,
      })
      .from(productMedia)
      .leftJoin(media, eq(productMedia.mediaId, media.id))
      .where(eq(productMedia.productId, data.productId))
      .orderBy(asc(productMedia.position));

    // Fetch options with values
    const optionsRows = await db
      .select({
        option: productOptions,
      })
      .from(productOptions)
      .where(eq(productOptions.productId, data.productId))
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
      .where(eq(productVariants.productId, data.productId))
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
            eq(productVariantOptions.optionValueId, productOptionValues.id)
          )
          .leftJoin(
            productOptions,
            eq(productOptionValues.optionId, productOptions.id)
          )
          .where(eq(productVariantOptions.variantId, variant.id));

        const variantOptions = variantOptionsRows.map((voRow) => ({
          ...voRow.variantOption,
          optionValue: voRow.optionValue
            ? {
                ...voRow.optionValue,
                option: voRow.option || null,
              }
            : null,
        }));

        return {
          ...variant,
          inventory: row.inventory || null,
          variantOptions,
        };
      })
    );

    // Fetch tags
    const tagsRows = await db
      .select({
        productTag: productTagsToProducts,
        tag: productTags,
      })
      .from(productTagsToProducts)
      .leftJoin(productTags, eq(productTagsToProducts.tagId, productTags.id))
      .where(eq(productTagsToProducts.productId, data.productId));

    const tags = tagsRows.map((row) => ({
      productId: row.productTag.productId,
      tagId: row.productTag.tagId,
      tag: row.tag,
    }));

    // Transform media
    const mediaItems = mediaRows.map((row) => ({
      ...row.productMedia,
      media: row.media
        ? {
            ...row.media,
            metadata: (row.media.metadata as {}) || {},
          }
        : null,
    }));

    return {
      ...product,
      category: productRow.category || null,
      vendor: productRow.vendor || null,
      media: mediaItems,
      options,
      variants,
      tags,
    };
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
              id: z.string().optional(), // Optional for existing options
              name: z.string(),
              position: z.number(),
              options: z.array(
                z.object({
                  id: z.string().optional(), // Optional for existing values
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
              id: z.string().optional(), // Optional for existing variants
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
    const slug =
      updateData.slug ||
      updateData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    // Update product
    await db
      .update(products)
      .set({
        name: updateData.name,
        slug,
        description: updateData.description || null,
        sku: updateData.sku || null,
        price: String(updateData.price),
        compareAtPrice: updateData.compareAtPrice
          ? String(updateData.compareAtPrice)
          : null,
        cost: updateData.cost ? String(updateData.cost) : null,
        trackQuantity: updateData.trackQuantity,
        status: updateData.status,
        featured: updateData.featured,
        vendorId: updateData.vendorId || null,
        categoryId: updateData.categoryId || null,
        material: updateData.material || null,
        weight: String(updateData.weight),
        weightUnit: updateData.weightUnit || "kg",
        requiresShipping: updateData.requiresShipping,
        taxIncluded: updateData.taxIncluded,
        internalNote: updateData.internalNote || null,
      })
      .where(eq(products.id, productId));

    // Update product media (delete old, insert new)
    await db.delete(productMedia).where(eq(productMedia.productId, productId));

    if (updateData.media && updateData.media.length > 0) {
      const mediaRecords = updateData.media.map((m) => ({
        id: nanoid(),
        productId,
        mediaId: m.mediaId,
        position: m.position,
        isPrimary: m.isPrimary,
      }));
      await db.insert(productMedia).values(mediaRecords);
    }

    // Update product tags
    await db
      .delete(productTagsToProducts)
      .where(eq(productTagsToProducts.productId, productId));

    if (updateData.tagIds && updateData.tagIds.length > 0) {
      const productTagRelations = updateData.tagIds.map((tagId) => ({
        productId,
        tagId,
      }));
      await db.insert(productTagsToProducts).values(productTagRelations);
    }

    // Handle variant definitions and variants (simplified - delete and recreate)
    // Delete existing variants and options
    const existingVariants = await db.query.productVariants.findMany({
      where: (variants, { eq }) => eq(variants.productId, productId),
    });

    for (const variant of existingVariants) {
      await db
        .delete(productVariantOptions)
        .where(eq(productVariantOptions.variantId, variant.id));
    }

    await db
      .delete(productVariants)
      .where(eq(productVariants.productId, productId));

    const existingOptions = await db.query.productOptions.findMany({
      where: (options, { eq }) => eq(options.productId, productId),
    });

    for (const option of existingOptions) {
      await db
        .delete(productOptionValues)
        .where(eq(productOptionValues.optionId, option.id));
    }

    await db
      .delete(productOptions)
      .where(eq(productOptions.productId, productId));

    // Recreate variant definitions and variants (same logic as create)
    const optionIdMap = new Map<string, string>();
    const optionValueIdMap = new Map<string, string>();

    if (
      updateData.variantDefinitions &&
      updateData.variantDefinitions.length > 0
    ) {
      for (const variantDef of updateData.variantDefinitions) {
        const optionId = variantDef.id || nanoid();
        optionIdMap.set(variantDef.id || optionId, optionId);

        await db.insert(productOptions).values({
          id: optionId,
          productId,
          name: variantDef.name,
          position: variantDef.position,
        });

        for (const optionValue of variantDef.options) {
          const optionValueId = optionValue.id || nanoid();
          optionValueIdMap.set(optionValue.id || optionValueId, optionValueId);

          await db.insert(productOptionValues).values({
            id: optionValueId,
            optionId,
            name: optionValue.name,
            position: optionValue.position,
          });
        }
      }
    }

    if (
      updateData.generatedVariants &&
      updateData.generatedVariants.length > 0
    ) {
      for (const generatedVariant of updateData.generatedVariants) {
        const variantId = generatedVariant.id || nanoid();
        await db.insert(productVariants).values({
          id: variantId,
          productId,
          sku: generatedVariant.sku || null,
          price: generatedVariant.price ? String(generatedVariant.price) : null,
          cost: generatedVariant.cost ? String(generatedVariant.cost) : null,
          position: generatedVariant.position,
          isDefault: generatedVariant.position === 0,
        });

        if (
          updateData.variantDefinitions &&
          updateData.variantDefinitions.length > 0
        ) {
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
                  const optionValueId = optionValueIdMap.get(
                    optionValue.id || ""
                  );
                  if (optionValueId && optionId) {
                    await db.insert(productVariantOptions).values({
                      id: nanoid(),
                      variantId,
                      optionId,
                      optionValueId,
                    });
                  }
                }
              }
            }
          }
        }

        // Update or create inventory record if quantity is provided
        if (
          generatedVariant.quantity !== null &&
          generatedVariant.quantity !== undefined
        ) {
          const quantityValue = parseInt(generatedVariant.quantity) || 0;

          // Check if inventory record exists
          const existingInventory = await db.query.inventory.findFirst({
            where: (inv, { eq }) => eq(inv.variantId, variantId),
          });

          if (existingInventory) {
            // Update existing inventory
            await db
              .update(inventory)
              .set({
                onHand: quantityValue,
                available:
                  quantityValue -
                  existingInventory.reserved -
                  existingInventory.committed,
                updatedAt: new Date(),
              })
              .where(eq(inventory.variantId, variantId));
          } else {
            // Create new inventory record
            await db.insert(inventory).values({
              id: nanoid(),
              variantId,
              onHand: quantityValue,
              available: quantityValue,
              reserved: 0,
              committed: 0,
            });
          }
        }
      }
    } else {
      // Create default variant if no variants provided
      const defaultVariantId = nanoid();
      await db.insert(productVariants).values({
        id: defaultVariantId,
        productId,
        sku: null,
        price: null,
        cost: null,
        position: 0,
        isDefault: true,
      });
    }

    // Fetch updated product
    const updatedProduct = await getProductByIdServerFn({
      data: { productId },
    });
    return updatedProduct;
  });

// Get variant by ID
export const getVariantByIdServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ variantId: z.string() }))
  .handler(async ({ data }) => {
    // Fetch variant with product
    const [variantRow] = await db
      .select({
        variant: productVariants,
        product: products,
      })
      .from(productVariants)
      .leftJoin(products, eq(productVariants.productId, products.id))
      .where(eq(productVariants.id, data.variantId))
      .limit(1);

    if (!variantRow?.variant) {
      throw new Error("Variant not found");
    }

    const variant = variantRow.variant;

    // Fetch product category and vendor if product exists
    let category = null;
    let vendor = null;
    if (variantRow.product) {
      if (variantRow.product.categoryId) {
        const [catRow] = await db
          .select()
          .from(productCategories)
          .where(eq(productCategories.id, variantRow.product.categoryId))
          .limit(1);
        category = catRow || null;
      }
      if (variantRow.product.vendorId) {
        const [vendRow] = await db
          .select()
          .from(vendors)
          .where(eq(vendors.id, variantRow.product.vendorId))
          .limit(1);
        vendor = vendRow || null;
      }
    }

    // Fetch variant options
    const variantOptionsRows = await db
      .select({
        variantOption: productVariantOptions,
        optionValue: productOptionValues,
        option: productOptions,
      })
      .from(productVariantOptions)
      .leftJoin(
        productOptionValues,
        eq(productVariantOptions.optionValueId, productOptionValues.id)
      )
      .leftJoin(
        productOptions,
        eq(productOptionValues.optionId, productOptions.id)
      )
      .where(eq(productVariantOptions.variantId, data.variantId));

    const variantOptions = variantOptionsRows.map((row) => ({
      ...row.variantOption,
      optionValue: row.optionValue
        ? {
            ...row.optionValue,
            option: row.option || null,
          }
        : null,
    }));

    return {
      ...variant,
      product: variantRow.product
        ? {
            ...variantRow.product,
            category,
            vendor,
          }
        : null,
      variantOptions,
    };
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
      updateFields.price = updateData.price ? String(updateData.price) : null;
    if (updateData.compareAtPrice !== undefined)
      updateFields.compareAtPrice = updateData.compareAtPrice
        ? String(updateData.compareAtPrice)
        : null;
    if (updateData.cost !== undefined)
      updateFields.cost = updateData.cost ? String(updateData.cost) : null;
    if (updateData.weight !== undefined)
      updateFields.weight = updateData.weight
        ? String(updateData.weight)
        : null;
    if (updateData.barcode !== undefined)
      updateFields.barcode = updateData.barcode;
    if (updateData.position !== undefined)
      updateFields.position = updateData.position;
    if (updateData.isDefault !== undefined)
      updateFields.isDefault = updateData.isDefault;

    await db
      .update(productVariants)
      .set(updateFields)
      .where(eq(productVariants.id, variantId));

    const updatedVariant = await getVariantByIdServerFn({
      data: { variantId },
    });
    return updatedVariant;
  });
