import { db } from "@/db/db";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { adminMiddleware } from "@/utils/auth-middleware";
import {
  isGorseConfigured,
  getGorseUrl,
  checkHealth,
  upsertItem,
  upsertItems,
  deleteItem,
  insertFeedback,
  getRecommendations,
  getSimilarItems,
  getPopularItems,
  getLatestItems,
  type GorseItem,
  type GorseFeedback,
} from "@/lib/gorse";

// Transform a product to Gorse item format
async function transformProductToGorseItem(productId: string): Promise<GorseItem | null> {
  const product = await db.product.findUnique({
    where: { id: productId },
    include: {
      category: true,
      vendor: true,
      tags: {
        include: {
          tag: true,
        },
      },
      collectionProducts: {
        include: {
          collection: true,
        },
      },
      variants: {
        include: {
          inventory: true,
        },
      },
    },
  });

  if (!product) return null;

  // Calculate total available inventory
  const totalAvailable = product.variants.reduce(
    (sum, v) => sum + (v.inventory?.available || 0),
    0
  );

  // Hidden if inactive OR out of stock
  const isHidden = product.status !== "active" || totalAvailable <= 0;

  // Build categories array
  const categories: string[] = [];
  if (product.category?.slug) {
    categories.push(product.category.slug);
  }
  product.collectionProducts.forEach((cp) => {
    if (cp.collection?.slug) {
      categories.push(cp.collection.slug);
    }
  });

  // Build labels array
  const labels: string[] = [];
  product.tags.forEach((t) => {
    if (t.tag?.name) {
      labels.push(t.tag.name);
    }
  });
  if (product.vendor?.name) {
    labels.push(product.vendor.name);
  }

  return {
    ItemId: product.id,
    IsHidden: isHidden,
    Categories: categories,
    Labels: labels,
    Timestamp: product.createdAt.toISOString(),
    Comment: product.name,
  };
}

// ==================== Admin Sync Functions ====================

// Check Gorse connection status
export const checkGorseStatusServerFn = createServerFn({ method: "GET" }).handler(
  async () => {
    if (!isGorseConfigured()) {
      return {
        configured: false,
        connected: false,
        url: null,
        message: "Gorse is not configured. Set GORSE_URL and GORSE_TOKEN.",
      };
    }

    try {
      const isHealthy = await checkHealth();
      return {
        configured: true,
        connected: isHealthy,
        url: getGorseUrl(),
        message: isHealthy ? "Connected to Gorse" : "Gorse health check failed",
      };
    } catch (error) {
      return {
        configured: true,
        connected: false,
        url: getGorseUrl(),
        message: `Connection failed: ${error}`,
      };
    }
  }
);

// Sync all products to Gorse
export const syncAllItemsToGorseServerFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .handler(async () => {
    if (!isGorseConfigured()) {
      throw new Error("Gorse is not configured");
    }

    // Get all products (including inactive ones to update their hidden status)
    const products = await db.product.findMany({
      select: { id: true },
    });

    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process in batches
    const batchSize = 100;
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      const items: GorseItem[] = [];

      for (const product of batch) {
        try {
          const item = await transformProductToGorseItem(product.id);
          if (item) {
            items.push(item);
          }
        } catch (error) {
          failed++;
          errors.push(`Failed to transform product ${product.id}: ${error}`);
        }
      }

      if (items.length > 0) {
        try {
          await upsertItems(items);
          synced += items.length;
        } catch (error) {
          failed += items.length;
          errors.push(`Failed to sync batch: ${error}`);
        }
      }
    }

    return {
      success: true,
      synced,
      failed,
      total: products.length,
      errors: errors.slice(0, 10),
    };
  });

// Sync single product to Gorse
export const syncItemToGorseServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ productId: z.string() }))
  .handler(async ({ data }) => {
    if (!isGorseConfigured()) {
      return { success: false, message: "Gorse not configured" };
    }

    try {
      const item = await transformProductToGorseItem(data.productId);
      if (item) {
        await upsertItem(item);
        return { success: true, isHidden: item.IsHidden };
      }
      return { success: false, message: "Product not found" };
    } catch (error) {
      console.error("Failed to sync item to Gorse:", error);
      return { success: false, message: String(error) };
    }
  });

// Delete product from Gorse
export const deleteItemFromGorseServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ productId: z.string() }))
  .handler(async ({ data }) => {
    if (!isGorseConfigured()) {
      return { success: false, message: "Gorse not configured" };
    }

    try {
      await deleteItem(data.productId);
      return { success: true };
    } catch {
      // Item might not exist
      return { success: true };
    }
  });

// ==================== Feedback Functions ====================

// Track product view
export const trackProductViewServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ itemId: z.string(), userId: z.string() }))
  .handler(async ({ data }) => {
    if (!isGorseConfigured()) return { success: false };

    try {
      const feedback: GorseFeedback[] = [
        {
          FeedbackType: "view",
          UserId: data.userId,
          ItemId: data.itemId,
          Timestamp: new Date().toISOString(),
        },
      ];
      await insertFeedback(feedback);
      return { success: true };
    } catch (error) {
      console.error("Failed to track view:", error);
      return { success: false };
    }
  });

// Track search click
export const trackSearchClickServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ itemId: z.string(), userId: z.string() }))
  .handler(async ({ data }) => {
    if (!isGorseConfigured()) return { success: false };

    try {
      const feedback: GorseFeedback[] = [
        {
          FeedbackType: "search_click",
          UserId: data.userId,
          ItemId: data.itemId,
          Timestamp: new Date().toISOString(),
        },
      ];
      await insertFeedback(feedback);
      return { success: true };
    } catch (error) {
      console.error("Failed to track search click:", error);
      return { success: false };
    }
  });

// Track recommendation click
export const trackRecommendationClickServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ itemId: z.string(), userId: z.string() }))
  .handler(async ({ data }) => {
    if (!isGorseConfigured()) return { success: false };

    try {
      const feedback: GorseFeedback[] = [
        {
          FeedbackType: "click",
          UserId: data.userId,
          ItemId: data.itemId,
          Timestamp: new Date().toISOString(),
        },
      ];
      await insertFeedback(feedback);
      return { success: true };
    } catch (error) {
      console.error("Failed to track recommendation click:", error);
      return { success: false };
    }
  });

// Track add to cart
export const trackAddToCartServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ itemId: z.string(), userId: z.string() }))
  .handler(async ({ data }) => {
    if (!isGorseConfigured()) return { success: false };

    try {
      const feedback: GorseFeedback[] = [
        {
          FeedbackType: "cart",
          UserId: data.userId,
          ItemId: data.itemId,
          Timestamp: new Date().toISOString(),
        },
      ];
      await insertFeedback(feedback);
      return { success: true };
    } catch (error) {
      console.error("Failed to track add to cart:", error);
      return { success: false };
    }
  });

// Track purchase
export const trackPurchaseServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ itemId: z.string(), userId: z.string() }))
  .handler(async ({ data }) => {
    if (!isGorseConfigured()) return { success: false };

    try {
      const feedback: GorseFeedback[] = [
        {
          FeedbackType: "purchase",
          UserId: data.userId,
          ItemId: data.itemId,
          Timestamp: new Date().toISOString(),
        },
      ];
      await insertFeedback(feedback);
      return { success: true };
    } catch (error) {
      console.error("Failed to track purchase:", error);
      return { success: false };
    }
  });

// ==================== Recommendation Functions ====================

// Helper to format products for response
function formatProductsForResponse(products: Awaited<ReturnType<typeof db.product.findMany>>) {
  return products.map((p) => {
    const media = (p as { media?: { media?: { url?: string } }[] }).media;
    const variants = (p as { variants?: { id: string; price?: unknown; compareAtPrice?: unknown; variantOptions?: { option?: { name?: string }; optionValue?: { name?: string } }[]; inventory?: { available?: number } | null }[] }).variants || [];

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: String(p.price),
      compareAtPrice: p.compareAtPrice ? String(p.compareAtPrice) : null,
      primaryImage: media?.[0]?.media?.url || null,
      variants: variants.map((v) => ({
        id: v.id,
        price: v.price ? String(v.price) : null,
        compareAtPrice: v.compareAtPrice ? String(v.compareAtPrice) : null,
        options: (v.variantOptions || []).map((vo) => ({
          optionName: vo.option?.name || "",
          optionValue: vo.optionValue?.name || "",
        })),
        inventory: v.inventory ? { available: v.inventory.available || 0 } : null,
      })),
    };
  });
}

// Database fallback: Get popular products (random selection of in-stock products)
async function getPopularProductsFromDb(count: number, categorySlug?: string) {
  const whereConditions: Record<string, unknown> = {
    status: "active",
    variants: {
      some: {
        inventory: {
          available: { gt: 0 },
        },
      },
    },
  };

  if (categorySlug) {
    whereConditions.category = { slug: categorySlug };
  }

  const products = await db.product.findMany({
    where: whereConditions,
    take: count,
    orderBy: { createdAt: "desc" }, // Use newest as proxy for "popular" when no data
    include: {
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
        include: { media: true },
        take: 1,
      },
    },
  });

  return formatProductsForResponse(products);
}

// Database fallback: Get similar products (same category, excluding current item)
async function getSimilarProductsFromDb(itemId: string, count: number) {
  // First, get the current product to find its category
  const currentProduct = await db.product.findUnique({
    where: { id: itemId },
    select: { categoryId: true },
  });

  if (!currentProduct?.categoryId) {
    // No category, return random products
    return getLatestProductsFromDb(count);
  }

  const products = await db.product.findMany({
    where: {
      status: "active",
      categoryId: currentProduct.categoryId,
      id: { not: itemId }, // Exclude current product
      variants: {
        some: {
          inventory: {
            available: { gt: 0 },
          },
        },
      },
    },
    take: count,
    orderBy: { createdAt: "desc" },
    include: {
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
        include: { media: true },
        take: 1,
      },
    },
  });

  // If not enough products from same category, fill with latest
  if (products.length < count) {
    const remaining = count - products.length;
    const existingIds = [itemId, ...products.map((p) => p.id)];

    const moreProducts = await db.product.findMany({
      where: {
        status: "active",
        id: { notIn: existingIds },
        variants: {
          some: {
            inventory: {
              available: { gt: 0 },
            },
          },
        },
      },
      take: remaining,
      orderBy: { createdAt: "desc" },
      include: {
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
          include: { media: true },
          take: 1,
        },
      },
    });

    return formatProductsForResponse([...products, ...moreProducts]);
  }

  return formatProductsForResponse(products);
}

// Database fallback: Get latest products
async function getLatestProductsFromDb(count: number, categorySlug?: string) {
  const whereConditions: Record<string, unknown> = {
    status: "active",
    variants: {
      some: {
        inventory: {
          available: { gt: 0 },
        },
      },
    },
  };

  if (categorySlug) {
    whereConditions.category = { slug: categorySlug };
  }

  const products = await db.product.findMany({
    where: whereConditions,
    take: count,
    orderBy: { createdAt: "desc" },
    include: {
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
        include: { media: true },
        take: 1,
      },
    },
  });

  return formatProductsForResponse(products);
}

// Helper to fetch product details for recommendation IDs
async function getProductsFromIds(productIds: (string | undefined)[]) {
  // Filter out undefined/null values
  const validIds = productIds.filter((id): id is string => !!id);
  if (validIds.length === 0) return [];

  const products = await db.product.findMany({
    where: {
      id: { in: validIds },
      status: "active",
    },
    include: {
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
        include: { media: true },
        take: 1,
      },
    },
  });

  // Filter to only in-stock products (safety check)
  const inStockProducts = products.filter((p) => {
    const totalAvailable = p.variants.reduce(
      (sum, v) => sum + (v.inventory?.available || 0),
      0
    );
    return totalAvailable > 0;
  });

  // Maintain order from recommendation list
  const productMap = new Map(inStockProducts.map((p) => [p.id, p]));
  const orderedProducts = validIds
    .map((id) => productMap.get(id))
    .filter((p): p is NonNullable<typeof p> => p !== undefined);

  return orderedProducts.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: String(p.price),
    compareAtPrice: p.compareAtPrice ? String(p.compareAtPrice) : null,
    primaryImage: p.media[0]?.media?.url || null,
    variants: p.variants.map((v) => ({
      id: v.id,
      price: v.price ? String(v.price) : null,
      compareAtPrice: v.compareAtPrice ? String(v.compareAtPrice) : null,
      options: v.variantOptions.map((vo) => ({
        optionName: vo.option?.name || "",
        optionValue: vo.optionValue?.name || "",
      })),
      inventory: v.inventory ? { available: v.inventory.available } : null,
    })),
  }));
}

// Get personalized recommendations for user (with database fallback)
export const getRecommendationsServerFn = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      userId: z.string(),
      count: z.number().optional().default(10),
      category: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    // Try Gorse first
    if (isGorseConfigured()) {
      try {
        const categories = data.category ? [data.category] : undefined;
        const recommendations = await getRecommendations(
          data.userId,
          data.count,
          categories
        );
        const productIds = recommendations.map((r) => r.Id);
        const products = await getProductsFromIds(productIds);
        if (products.length > 0) {
          return { products, source: "personalized" };
        }
      } catch (error) {
        console.error("Failed to get recommendations from Gorse:", error);
      }
    }

    // Fallback: Get latest products from database
    try {
      const products = await getLatestProductsFromDb(data.count, data.category);
      return { products, source: "database" };
    } catch (error) {
      console.error("Failed to get recommendations from database:", error);
      return { products: [], source: "none" };
    }
  });

// Get similar items for a product (with database fallback)
export const getSimilarItemsServerFn = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      itemId: z.string(),
      count: z.number().optional().default(10),
      category: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    // Try Gorse first
    if (isGorseConfigured()) {
      try {
        const categories = data.category ? [data.category] : undefined;
        const similar = await getSimilarItems(data.itemId, data.count, categories);
        const productIds = similar.map((r) => r.Id);
        const products = await getProductsFromIds(productIds);
        if (products.length > 0) {
          return { products, source: "gorse" };
        }
      } catch (error) {
        console.error("Failed to get similar items from Gorse:", error);
      }
    }

    // Fallback: Get products from same category (excluding current item)
    try {
      const products = await getSimilarProductsFromDb(data.itemId, data.count);
      return { products, source: "database" };
    } catch (error) {
      console.error("Failed to get similar items from database:", error);
      return { products: [], source: "none" };
    }
  });

// Get popular items (with database fallback)
export const getPopularItemsServerFn = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      count: z.number().optional().default(10),
      category: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    // Try Gorse first
    if (isGorseConfigured()) {
      try {
        const categories = data.category ? [data.category] : undefined;
        const popular = await getPopularItems(data.count, categories);
        const productIds = popular.map((r) => r.Id);
        const products = await getProductsFromIds(productIds);
        if (products.length > 0) {
          return { products, source: "gorse" };
        }
      } catch (error) {
        console.error("Failed to get popular items from Gorse:", error);
      }
    }

    // Fallback: Get products from database ordered by number of orders (popularity)
    try {
      const products = await getPopularProductsFromDb(data.count, data.category);
      return { products, source: "database" };
    } catch (error) {
      console.error("Failed to get popular items from database:", error);
      return { products: [], source: "none" };
    }
  });

// Get latest items (with database fallback)
export const getLatestItemsServerFn = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      count: z.number().optional().default(10),
      category: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    // Try Gorse first
    if (isGorseConfigured()) {
      try {
        const categories = data.category ? [data.category] : undefined;
        const latest = await getLatestItems(data.count, categories);
        const productIds = latest.map((r) => r.Id);
        const products = await getProductsFromIds(productIds);
        if (products.length > 0) {
          return { products, source: "gorse" };
        }
      } catch (error) {
        console.error("Failed to get latest items from Gorse:", error);
      }
    }

    // Fallback: Get latest products from database
    try {
      const products = await getLatestProductsFromDb(data.count, data.category);
      return { products, source: "database" };
    } catch (error) {
      console.error("Failed to get latest items from database:", error);
      return { products: [], source: "none" };
    }
  });
