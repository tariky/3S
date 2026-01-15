import { db } from "@/db/db";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminMiddleware } from "@/utils/auth-middleware";
import {
  typesenseClient,
  PRODUCTS_COLLECTION,
  productsSchema,
  isTypesenseConfigured,
  type TypesenseProduct,
} from "@/lib/typesense";

// Initialize or recreate Typesense collection
export const initTypesenseCollectionServerFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .handler(async () => {
    if (!isTypesenseConfigured()) {
      throw new Error("Typesense is not configured. Please set TYPESENSE_URL and TYPESENSE_TOKEN environment variables.");
    }

    try {
      // Try to delete existing collection
      await typesenseClient.collections(PRODUCTS_COLLECTION).delete();
    } catch {
      // Collection doesn't exist, that's fine
    }

    // Create new collection with schema
    await typesenseClient.collections().create(productsSchema);

    return { success: true, message: "Typesense collection initialized" };
  });

// Transform a product from database to Typesense document
async function transformProductToTypesense(productId: string): Promise<TypesenseProduct | null> {
  const product = await db.products.findUnique({
    where: { id: productId },
    include: {
      category: true,
      vendor: true,
      tags: {
        include: {
          tag: true,
        },
      },
      collections: {
        include: {
          collection: true,
        },
      },
      variants: {
        include: {
          inventory: true,
          variantOptions: {
            include: {
              option: true,
              optionValue: true,
            },
          },
        },
        orderBy: { position: "asc" },
      },
      media: {
        where: { isPrimary: true },
        include: {
          media: true,
        },
        take: 1,
      },
    },
  });

  if (!product) return null;

  // Calculate inventory and prices from variants
  let totalInventory = 0;
  let minPrice = Number(product.price) || 0;
  let maxPrice = Number(product.price) || 0;
  const optionValuesSet = new Set<string>();
  const optionNamesSet = new Set<string>();

  const variants = product.variants.map((variant) => {
    const inventory = variant.inventory?.available || 0;
    totalInventory += inventory;

    const variantPrice = variant.price ? Number(variant.price) : null;
    if (variantPrice !== null) {
      if (variantPrice < minPrice || minPrice === 0) minPrice = variantPrice;
      if (variantPrice > maxPrice) maxPrice = variantPrice;
    }

    const options = variant.variantOptions.map((vo) => {
      const optionName = vo.option?.name || "";
      const optionValue = vo.optionValue?.name || "";
      if (optionName) optionNamesSet.add(optionName);
      if (optionValue) optionValuesSet.add(optionValue);
      return { name: optionName, value: optionValue };
    });

    return {
      id: variant.id,
      sku: variant.sku || "",
      price: variantPrice ?? Number(product.price) ?? 0,
      compareAtPrice: variant.compareAtPrice ? Number(variant.compareAtPrice) : 0,
      inventory,
      inStock: inventory > 0,
      options,
    };
  });

  // If no variants, use product-level inventory
  if (product.variants.length === 0) {
    // Check if there's a default variant
    const defaultVariant = await db.product_variants.findFirst({
      where: { productId: product.id, isDefault: true },
      include: { inventory: true },
    });
    totalInventory = defaultVariant?.inventory?.available || 0;
  }

  const primaryImage = product.media[0]?.media?.url || null;

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description || "",
    status: product.status,
    price: Number(product.price) || 0,
    compareAtPrice: product.compareAtPrice ? Number(product.compareAtPrice) : null,
    minPrice,
    maxPrice,
    primaryImage,
    categoryId: product.categoryId,
    categoryName: product.category?.name || null,
    categorySlug: product.category?.slug || null,
    vendorId: product.vendorId,
    vendorName: product.vendor?.name || null,
    tagIds: product.tags.map((t) => t.tagId),
    tagNames: product.tags.map((t) => t.tag.name),
    collectionIds: product.collections.map((c) => c.collectionId),
    featured: product.featured,
    totalInventory,
    inStock: totalInventory > 0,
    createdAt: product.createdAt.getTime(),
    updatedAt: product.updatedAt.getTime(),
    variants,
    optionValues: Array.from(optionValuesSet),
    optionNames: Array.from(optionNamesSet),
  };
}

// Sync all products to Typesense
export const syncAllProductsToTypesenseServerFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .handler(async () => {
    if (!isTypesenseConfigured()) {
      throw new Error("Typesense is not configured. Please set TYPESENSE_URL and TYPESENSE_TOKEN environment variables.");
    }

    // Get all active products
    const products = await db.products.findMany({
      where: { status: "active" },
      select: { id: true },
    });

    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process in batches
    const batchSize = 100;
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      const documents: TypesenseProduct[] = [];

      for (const product of batch) {
        try {
          const doc = await transformProductToTypesense(product.id);
          if (doc) {
            documents.push(doc);
          }
        } catch (error) {
          failed++;
          errors.push(`Failed to transform product ${product.id}: ${error}`);
        }
      }

      if (documents.length > 0) {
        try {
          const importResults = await typesenseClient
            .collections(PRODUCTS_COLLECTION)
            .documents()
            .import(documents, { action: "upsert" });

          // Check for partial failures in import results
          for (let j = 0; j < importResults.length; j++) {
            const result = importResults[j];
            if (result.success) {
              synced++;
            } else {
              failed++;
              errors.push(`Product ${documents[j]?.id || j}: ${result.error || "Unknown error"}`);
            }
          }
        } catch (error: unknown) {
          // Handle ImportError with partial failures
          const importError = error as { importResults?: Array<{ success: boolean; error?: string; document?: string }> };
          if (importError.importResults) {
            for (let j = 0; j < importError.importResults.length; j++) {
              const result = importError.importResults[j];
              if (result.success) {
                synced++;
              } else {
                failed++;
                const docId = documents[j]?.id || j;
                errors.push(`Product ${docId}: ${result.error || "Unknown error"}`);
              }
            }
          } else {
            failed += documents.length;
            errors.push(`Failed to import batch: ${error}`);
          }
        }
      }
    }

    return {
      success: true,
      synced,
      failed,
      total: products.length,
      errors: errors.slice(0, 10), // Return first 10 errors
    };
  });

// Sync single product to Typesense
export const syncProductToTypesenseServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ productId: z.string() }))
  .handler(async ({ data }) => {
    if (!isTypesenseConfigured()) {
      return { success: false, message: "Typesense not configured" };
    }

    try {
      const product = await db.products.findUnique({
        where: { id: data.productId },
        select: { status: true },
      });

      if (!product || product.status !== "active") {
        // Delete from Typesense if not active
        try {
          await typesenseClient
            .collections(PRODUCTS_COLLECTION)
            .documents(data.productId)
            .delete();
        } catch {
          // Document might not exist
        }
        return { success: true, action: "deleted" };
      }

      const doc = await transformProductToTypesense(data.productId);
      if (doc) {
        await typesenseClient
          .collections(PRODUCTS_COLLECTION)
          .documents()
          .upsert(doc);
        return { success: true, action: "upserted" };
      }

      return { success: false, message: "Failed to transform product" };
    } catch (error) {
      console.error("Failed to sync product to Typesense:", error);
      return { success: false, message: String(error) };
    }
  });

// Delete product from Typesense
export const deleteProductFromTypesenseServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ productId: z.string() }))
  .handler(async ({ data }) => {
    if (!isTypesenseConfigured()) {
      return { success: false, message: "Typesense not configured" };
    }

    try {
      await typesenseClient
        .collections(PRODUCTS_COLLECTION)
        .documents(data.productId)
        .delete();
      return { success: true };
    } catch {
      // Document might not exist
      return { success: true };
    }
  });

// Search products in Typesense (for public use)
export const searchTypesenseProductsServerFn = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      query: z.string().optional().default("*"),
      collectionId: z.string().optional(),
      categoryId: z.string().optional(),
      categorySlug: z.string().optional(),
      vendorId: z.string().optional(),
      tagIds: z.array(z.string()).optional(),
      minPrice: z.number().optional(),
      maxPrice: z.number().optional(),
      inStock: z.boolean().optional(),
      optionValues: z.array(z.string()).optional(),
      sortBy: z.enum(["relevance", "price_asc", "price_desc", "newest", "oldest"]).optional().default("relevance"),
      page: z.number().optional().default(1),
      perPage: z.number().optional().default(24),
    })
  )
  .handler(async ({ data }) => {
    if (!isTypesenseConfigured()) {
      return {
        products: [],
        totalHits: 0,
        page: data.page,
        totalPages: 0,
        facets: {},
      };
    }

    // Build filter string
    const filters: string[] = ["status:=active"];

    if (data.collectionId) {
      filters.push(`collectionIds:=[${data.collectionId}]`);
    }

    if (data.categoryId) {
      filters.push(`categoryId:=${data.categoryId}`);
    }

    if (data.categorySlug) {
      filters.push(`categorySlug:=${data.categorySlug}`);
    }

    if (data.vendorId) {
      filters.push(`vendorId:=${data.vendorId}`);
    }

    if (data.tagIds && data.tagIds.length > 0) {
      filters.push(`tagIds:=[${data.tagIds.join(",")}]`);
    }

    if (data.minPrice !== undefined) {
      filters.push(`minPrice:>=${data.minPrice}`);
    }

    if (data.maxPrice !== undefined) {
      filters.push(`maxPrice:<=${data.maxPrice}`);
    }

    if (data.inStock === true) {
      filters.push("inStock:=true");
    }

    if (data.optionValues && data.optionValues.length > 0) {
      filters.push(`optionValues:=[${data.optionValues.join(",")}]`);
    }

    // Build sort string
    let sortBy = "_text_match:desc";
    switch (data.sortBy) {
      case "price_asc":
        sortBy = "minPrice:asc";
        break;
      case "price_desc":
        sortBy = "maxPrice:desc";
        break;
      case "newest":
        sortBy = "createdAt:desc";
        break;
      case "oldest":
        sortBy = "createdAt:asc";
        break;
    }

    try {
      const searchResult = await typesenseClient
        .collections(PRODUCTS_COLLECTION)
        .documents()
        .search({
          q: data.query || "*",
          query_by: "name,description,categoryName,vendorName,tagNames,optionValues",
          filter_by: filters.join(" && "),
          sort_by: sortBy,
          page: data.page,
          per_page: data.perPage,
          facet_by: "categoryName,vendorName,tagNames,optionValues,optionNames,inStock",
          max_facet_values: 100,
        });

      // Transform results
      const products = (searchResult.hits || []).map((hit) => {
        const doc = hit.document as TypesenseProduct;

        // Find first in-stock variant for price display
        const firstInStockVariant = doc.variants?.find((v) => v.inStock);
        const displayPrice = firstInStockVariant?.price ?? doc.price;
        const displayCompareAtPrice = firstInStockVariant?.compareAtPrice ?? doc.compareAtPrice;

        return {
          id: doc.id,
          name: doc.name,
          slug: doc.slug,
          price: String(displayPrice),
          compareAtPrice: displayCompareAtPrice && displayCompareAtPrice > 0 ? String(displayCompareAtPrice) : null,
          primaryImage: doc.primaryImage,
          inStock: doc.inStock,
          variants: doc.variants?.map((v) => ({
            id: v.id,
            price: String(v.price),
            compareAtPrice: v.compareAtPrice > 0 ? String(v.compareAtPrice) : null,
            options: v.options.map((o) => ({
              optionName: o.name,
              optionValue: o.value,
            })),
            inventory: v.inStock ? { available: v.inventory } : null,
          })) || [],
        };
      });

      // Transform facets
      const facets: Record<string, { value: string; count: number }[]> = {};
      if (searchResult.facet_counts) {
        for (const facet of searchResult.facet_counts) {
          facets[facet.field_name] = facet.counts.map((c) => ({
            value: String(c.value),
            count: c.count,
          }));
        }
      }

      return {
        products,
        totalHits: searchResult.found || 0,
        page: data.page,
        totalPages: Math.ceil((searchResult.found || 0) / data.perPage),
        facets,
      };
    } catch (error) {
      // Check if it's a 404 (collection not found) - this is expected before first sync
      const isNotFound = error instanceof Error &&
        (error.message.includes("404") || error.message.includes("Not found"));

      if (!isNotFound) {
        console.error("Typesense search error:", error);
      }

      return {
        products: [],
        totalHits: 0,
        page: data.page,
        totalPages: 0,
        facets: {},
      };
    }
  });

// Full sync: Initialize collection and sync all products
export const fullTypesenseSyncServerFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .handler(async () => {
    if (!isTypesenseConfigured()) {
      throw new Error("Typesense is not configured. Please set TYPESENSE_URL and TYPESENSE_TOKEN environment variables.");
    }

    // Step 1: Initialize collection
    try {
      await typesenseClient.collections(PRODUCTS_COLLECTION).delete();
    } catch {
      // Collection doesn't exist
    }

    await typesenseClient.collections().create(productsSchema);

    // Step 2: Get all active products
    const products = await db.products.findMany({
      where: { status: "active" },
      select: { id: true },
    });

    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process in batches
    const batchSize = 100;
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      const documents: TypesenseProduct[] = [];

      for (const product of batch) {
        try {
          const doc = await transformProductToTypesense(product.id);
          if (doc) {
            documents.push(doc);
          }
        } catch (error) {
          failed++;
          errors.push(`Failed to transform product ${product.id}: ${error}`);
        }
      }

      if (documents.length > 0) {
        try {
          const importResults = await typesenseClient
            .collections(PRODUCTS_COLLECTION)
            .documents()
            .import(documents, { action: "upsert" });

          // Check for partial failures in import results
          for (let j = 0; j < importResults.length; j++) {
            const result = importResults[j];
            if (result.success) {
              synced++;
            } else {
              failed++;
              errors.push(`Product ${documents[j]?.id || j}: ${result.error || "Unknown error"}`);
            }
          }
        } catch (error: unknown) {
          // Handle ImportError with partial failures
          const importError = error as { importResults?: Array<{ success: boolean; error?: string; document?: string }> };
          if (importError.importResults) {
            for (let j = 0; j < importError.importResults.length; j++) {
              const result = importError.importResults[j];
              if (result.success) {
                synced++;
              } else {
                failed++;
                const docId = documents[j]?.id || j;
                errors.push(`Product ${docId}: ${result.error || "Unknown error"}`);
              }
            }
          } else {
            failed += documents.length;
            errors.push(`Failed to import batch: ${error}`);
          }
        }
      }
    }

    return {
      success: true,
      message: `Synced ${synced} products to Typesense`,
      synced,
      failed,
      total: products.length,
      errors: errors.slice(0, 10),
    };
  });

// Check Typesense connection status
export const checkTypesenseStatusServerFn = createServerFn({ method: "GET" })
  .handler(async () => {
    if (!isTypesenseConfigured()) {
      return {
        configured: false,
        connected: false,
        message: "Typesense is not configured",
      };
    }

    try {
      const health = await typesenseClient.health.retrieve();

      // Try to get collection info
      let documentCount = 0;
      try {
        const collection = await typesenseClient.collections(PRODUCTS_COLLECTION).retrieve();
        documentCount = collection.num_documents || 0;
      } catch {
        // Collection might not exist
      }

      return {
        configured: true,
        connected: health.ok,
        documentCount,
        message: health.ok ? "Connected to Typesense" : "Typesense health check failed",
      };
    } catch (error) {
      return {
        configured: true,
        connected: false,
        message: `Connection failed: ${error}`,
      };
    }
  });
