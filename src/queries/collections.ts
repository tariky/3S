import { db, serializeData } from "@/db/db";
import { queryOptions, mutationOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { nanoid } from "nanoid";
import { adminMiddleware } from "@/utils/auth-middleware";

export const COLLECTIONS_QUERY_KEY = "collections";

// Rule types and operators
export const RULE_TYPES = {
  price: "Cijena",
  compare_at_price: "Cijena za usporedbu",
  inventory: "Zaliha",
  category: "Kategorija",
  vendor: "Dobavljač",
  tag: "Tag",
  status: "Status",
} as const;

export const RULE_OPERATORS = {
  equals: "jednako",
  not_equals: "nije jednako",
  greater_than: "veće od",
  less_than: "manje od",
  greater_than_or_equals: "veće ili jednako",
  less_than_or_equals: "manje ili jednako",
  contains: "sadrži",
  not_contains: "ne sadrži",
} as const;

// Validation schemas
const collectionRuleSchema = z.object({
  id: z.string().optional(),
  ruleType: z.enum(["price", "compare_at_price", "inventory", "category", "vendor", "tag", "status"]),
  operator: z.enum(["equals", "not_equals", "greater_than", "less_than", "greater_than_or_equals", "less_than_or_equals", "contains", "not_contains"]),
  value: z.string(),
  position: z.number().optional(),
});

const collectionSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  image: z.string().optional(),
  ruleMatch: z.enum(["all", "any"]).default("all"),
  sortOrder: z.enum(["manual", "best-selling", "alphabetical-asc", "alphabetical-desc", "price-asc", "price-desc", "created-asc", "created-desc"]).default("manual"),
  active: z.boolean().default(true),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  rules: z.array(collectionRuleSchema).optional(),
});

// Get all collections
export const getCollectionsServerFn = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .handler(async () => {
    const allCollections = await db.collection.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image: true,
        ruleMatch: true,
        sortOrder: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Get product counts for each collection
    const collectionsWithCounts = await Promise.all(
      allCollections.map(async (collection) => {
        const productCount = await db.collectionProduct.count({
          where: { collectionId: collection.id },
        });

        return {
          ...collection,
          productCount,
        };
      })
    );

    return serializeData(collectionsWithCounts);
  });

export const getCollectionsQueryOptions = () => {
  return queryOptions({
    queryKey: [COLLECTIONS_QUERY_KEY],
    queryFn: async () => {
      return await getCollectionsServerFn();
    },
  });
};

// Get collection by ID with rules
export const getCollectionByIdServerFn = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .inputValidator(z.object({ collectionId: z.string() }))
  .handler(async ({ data }) => {
    const collection = await db.collection.findFirst({
      where: { id: data.collectionId },
    });

    if (!collection) {
      throw new Error("Collection not found");
    }

    // Get rules
    const rules = await db.collectionRule.findMany({
      where: { collectionId: collection.id },
      orderBy: { position: "asc" },
    });

    return serializeData({
      ...collection,
      rules,
    });
  });

export const getCollectionByIdQueryOptions = (collectionId: string) => {
  return queryOptions({
    queryKey: [COLLECTIONS_QUERY_KEY, collectionId],
    queryFn: async () => {
      return await getCollectionByIdServerFn({ data: { collectionId } });
    },
    enabled: !!collectionId,
  });
};

// Create collection
export const createCollectionServerFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(collectionSchema)
  .handler(async ({ data }) => {
    const collectionId = nanoid();

    // Create collection
    await db.collection.create({
      data: {
        id: collectionId,
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        image: data.image || null,
        ruleMatch: data.ruleMatch,
        sortOrder: data.sortOrder,
        active: data.active,
        seoTitle: data.seoTitle || null,
        seoDescription: data.seoDescription || null,
      },
    });

    // Create rules
    if (data.rules && data.rules.length > 0) {
      await db.collectionRule.createMany({
        data: data.rules.map((rule, index) => ({
          id: nanoid(),
          collectionId,
          ruleType: rule.ruleType,
          operator: rule.operator,
          value: rule.value,
          position: index,
        })),
      });
    }

    // Generate products for collection based on rules
    await generateCollectionProducts(collectionId);

    return serializeData({ id: collectionId });
  });

// Update collection
export const updateCollectionServerFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(
    z.object({
      collectionId: z.string(),
      ...collectionSchema.shape,
    })
  )
  .handler(async ({ data }) => {
    const { collectionId, rules, ...updateData } = data;

    // Update collection
    await db.collection.update({
      where: { id: collectionId },
      data: {
        ...updateData,
        description: updateData.description || null,
        image: updateData.image || null,
        seoTitle: updateData.seoTitle || null,
        seoDescription: updateData.seoDescription || null,
        updatedAt: new Date(),
      },
    });

    // Delete existing rules and recreate
    await db.collectionRule.deleteMany({
      where: { collectionId },
    });

    if (rules && rules.length > 0) {
      await db.collectionRule.createMany({
        data: rules.map((rule, index) => ({
          id: rule.id || nanoid(),
          collectionId,
          ruleType: rule.ruleType,
          operator: rule.operator,
          value: rule.value,
          position: index,
        })),
      });
    }

    // Regenerate products for collection
    await generateCollectionProducts(collectionId);

    return serializeData({ id: collectionId });
  });

// Delete collection
export const deleteCollectionServerFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(z.object({ collectionId: z.string() }))
  .handler(async ({ data }) => {
    await db.collection.delete({
      where: { id: data.collectionId },
    });
    return serializeData({ success: true });
  });

// Get products for a collection (with sorting based on collection settings)
export const getCollectionProductsServerFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(z.object({ collectionId: z.string() }))
  .handler(async ({ data }) => {
    // Get collection
    const collection = await db.collection.findFirst({
      where: { id: data.collectionId },
    });

    if (!collection) {
      throw new Error("Collection not found");
    }

    // Determine order based on collection's sortOrder setting
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let orderBy: any;

    switch (collection.sortOrder) {
      case "price-asc":
        orderBy = { product: { price: "asc" } };
        break;
      case "price-desc":
        orderBy = { product: { price: "desc" } };
        break;
      case "alphabetical-asc":
        orderBy = { product: { name: "asc" } };
        break;
      case "alphabetical-desc":
        orderBy = { product: { name: "desc" } };
        break;
      case "created-asc":
        orderBy = { product: { createdAt: "asc" } };
        break;
      case "created-desc":
        orderBy = { product: { createdAt: "desc" } };
        break;
      case "manual":
      default:
        orderBy = { position: "asc" };
        break;
    }

    // Get products with positions
    const collectionProductsList = await db.collectionProduct.findMany({
      where: { collectionId: data.collectionId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            compareAtPrice: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy,
    });

    // Get primary images for each product
    const productsWithImages = await Promise.all(
      collectionProductsList.map(async (cp) => {
        const primaryMedia = await db.productMedia.findFirst({
          where: {
            productId: cp.productId,
            isPrimary: true,
          },
          include: {
            media: {
              select: { url: true },
            },
          },
        });

        return {
          id: cp.id,
          productId: cp.productId,
          position: cp.position,
          isManual: cp.isManual,
          product: {
            ...cp.product,
            image: primaryMedia?.media?.url || null,
          },
        };
      })
    );

    return serializeData(productsWithImages);
  });

export const getCollectionProductsQueryOptions = (collectionId: string) => {
  return queryOptions({
    queryKey: [COLLECTIONS_QUERY_KEY, collectionId, "products"],
    queryFn: async () => {
      return await getCollectionProductsServerFn({ data: { collectionId } });
    },
    enabled: !!collectionId,
  });
};

// Update product positions in collection
export const updateCollectionProductPositionsServerFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(
    z.object({
      collectionId: z.string(),
      products: z.array(
        z.object({
          id: z.string(),
          position: z.number(),
        })
      ),
    })
  )
  .handler(async ({ data }) => {
    // Update each product's position
    await Promise.all(
      data.products.map((product) =>
        db.collectionProduct.update({
          where: { id: product.id },
          data: { position: product.position, updatedAt: new Date() },
        })
      )
    );

    // Update collection sort order to manual
    await db.collection.update({
      where: { id: data.collectionId },
      data: { sortOrder: "manual", updatedAt: new Date() },
    });

    return serializeData({ success: true });
  });

// Manually add product to collection
export const addProductToCollectionServerFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(
    z.object({
      collectionId: z.string(),
      productId: z.string(),
    })
  )
  .handler(async ({ data }) => {
    // Check if product already in collection
    const existing = await db.collectionProduct.findFirst({
      where: {
        collectionId: data.collectionId,
        productId: data.productId,
      },
    });

    if (existing) {
      return serializeData({ id: existing.id });
    }

    // Get max position
    const maxPositionResult = await db.collectionProduct.aggregate({
      where: { collectionId: data.collectionId },
      _max: { position: true },
    });

    const id = nanoid();
    await db.collectionProduct.create({
      data: {
        id,
        collectionId: data.collectionId,
        productId: data.productId,
        position: (maxPositionResult._max.position || 0) + 1,
        isManual: true,
      },
    });

    return serializeData({ id });
  });

// Remove product from collection
export const removeProductFromCollectionServerFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(
    z.object({
      collectionId: z.string(),
      productId: z.string(),
    })
  )
  .handler(async ({ data }) => {
    await db.collectionProduct.deleteMany({
      where: {
        collectionId: data.collectionId,
        productId: data.productId,
      },
    });

    return serializeData({ success: true });
  });

// Regenerate collection products (apply rules)
export const regenerateCollectionProductsServerFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(z.object({ collectionId: z.string() }))
  .handler(async ({ data }) => {
    await generateCollectionProducts(data.collectionId);
    return serializeData({ success: true });
  });

// Helper function to generate collection products based on rules
async function generateCollectionProducts(collectionId: string) {
  // Get collection with rules
  const collection = await db.collection.findFirst({
    where: { id: collectionId },
  });

  if (!collection) return;

  const rules = await db.collectionRule.findMany({
    where: { collectionId },
    orderBy: { position: "asc" },
  });

  // Get manually added products to preserve them
  const manualProducts = await db.collectionProduct.findMany({
    where: {
      collectionId,
      isManual: true,
    },
  });

  const manualProductIds = new Set(manualProducts.map((p) => p.productId));

  // If no rules, keep only manual products
  if (rules.length === 0) {
    await db.collectionProduct.deleteMany({
      where: {
        collectionId,
        isManual: false,
      },
    });
    return;
  }

  // Get all active products with tags
  const allProducts = await db.product.findMany({
    where: { status: "active" },
    select: {
      id: true,
      price: true,
      compareAtPrice: true,
      categoryId: true,
      vendorId: true,
      status: true,
      tags: {
        select: {
          tagId: true,
        },
      },
    },
  });

  // Get inventory for products (need to check variants)
  const productInventory = new Map<string, number>();
  for (const product of allProducts) {
    const variants = await db.productVariant.findMany({
      where: { productId: product.id },
      select: { id: true },
    });

    let totalInventory = 0;
    for (const variant of variants) {
      const inv = await db.inventory.findFirst({
        where: { variantId: variant.id },
        select: { available: true },
      });
      totalInventory += inv?.available || 0;
    }
    productInventory.set(product.id, totalInventory);
  }

  // Apply rules to filter products
  const matchingProducts = allProducts.filter((product) => {
    const productTagIds = product.tags.map((t) => t.tagId);
    const ruleResults = rules.map((rule) => {
      return evaluateRule(rule, product, productInventory.get(product.id) || 0, productTagIds);
    });

    // Apply AND/OR logic
    if (collection.ruleMatch === "all") {
      return ruleResults.every((result) => result);
    } else {
      return ruleResults.some((result) => result);
    }
  });

  // Delete auto-generated products (keep manual)
  await db.collectionProduct.deleteMany({
    where: {
      collectionId,
      isManual: false,
    },
  });

  // Add matching products (except already manually added)
  const newProducts = matchingProducts.filter((p) => !manualProductIds.has(p.id));

  // Get max position from manual products
  let maxPosition = 0;
  if (manualProducts.length > 0) {
    maxPosition = Math.max(...manualProducts.map((p) => p.position)) + 1;
  }

  if (newProducts.length > 0) {
    await db.collectionProduct.createMany({
      data: newProducts.map((product, index) => ({
        id: nanoid(),
        collectionId,
        productId: product.id,
        position: maxPosition + index,
        isManual: false,
      })),
    });
  }
}

// Helper function to evaluate a single rule against a product
function evaluateRule(
  rule: {
    ruleType: string;
    operator: string;
    value: string;
  },
  product: {
    id: string;
    price: unknown; // Prisma Decimal
    compareAtPrice: unknown | null; // Prisma Decimal
    categoryId: string | null;
    vendorId: string | null;
    status: string;
  },
  inventoryCount: number,
  productTagIds: string[] = []
): boolean {
  const { ruleType, operator, value } = rule;

  switch (ruleType) {
    case "price": {
      const productPrice = parseFloat(String(product.price));
      const targetPrice = parseFloat(value);
      return compareNumbers(productPrice, targetPrice, operator);
    }

    case "compare_at_price": {
      if (!product.compareAtPrice) return false;
      const comparePrice = parseFloat(String(product.compareAtPrice));
      const targetPrice = parseFloat(value);
      return compareNumbers(comparePrice, targetPrice, operator);
    }

    case "inventory": {
      const targetInventory = parseInt(value, 10);
      return compareNumbers(inventoryCount, targetInventory, operator);
    }

    case "category": {
      if (!product.categoryId) return operator === "not_equals";
      if (operator === "equals") return product.categoryId === value;
      if (operator === "not_equals") return product.categoryId !== value;
      return false;
    }

    case "vendor": {
      if (!product.vendorId) return operator === "not_equals";
      if (operator === "equals") return product.vendorId === value;
      if (operator === "not_equals") return product.vendorId !== value;
      return false;
    }

    case "tag": {
      const hasTag = productTagIds.includes(value);
      if (operator === "equals") return hasTag;
      if (operator === "not_equals") return !hasTag;
      return false;
    }

    case "status": {
      if (operator === "equals") return product.status === value;
      if (operator === "not_equals") return product.status !== value;
      return false;
    }

    default:
      return false;
  }
}

// Helper function to compare numbers based on operator
function compareNumbers(actual: number, target: number, operator: string): boolean {
  switch (operator) {
    case "equals":
      return actual === target;
    case "not_equals":
      return actual !== target;
    case "greater_than":
      return actual > target;
    case "less_than":
      return actual < target;
    case "greater_than_or_equals":
      return actual >= target;
    case "less_than_or_equals":
      return actual <= target;
    default:
      return false;
  }
}

// ============================================================================
// AUTOMATIC REGENERATION SYSTEM
// ============================================================================

// Map rule types to the data changes that affect them
export const RULE_TYPE_TRIGGERS: Record<string, string[]> = {
  price: ["price"],
  compare_at_price: ["compareAtPrice"],
  inventory: ["inventory"],
  category: ["categoryId"],
  vendor: ["vendorId"],
  tag: ["tags"],
  status: ["status"],
};

/**
 * Mark collections for regeneration based on changed fields and entity type.
 * This function finds all active collections that have rules matching the changed data
 * and marks them for regeneration.
 *
 * @param changedFields - Array of field names that changed (e.g., ['price', 'categoryId'])
 * @param entityType - Type of entity that changed: 'product', 'category', 'vendor', 'tag'
 * @param entityId - Optional ID of the specific entity that changed (for targeted marking)
 */
export async function markCollectionsForRegeneration(
  changedFields: string[],
  entityType: "product" | "category" | "vendor" | "tag",
  entityId?: string
): Promise<{ markedCount: number }> {
  // Determine which rule types could be affected by these field changes
  const affectedRuleTypes: string[] = [];

  for (const [ruleType, triggerFields] of Object.entries(RULE_TYPE_TRIGGERS)) {
    if (changedFields.some((field) => triggerFields.includes(field))) {
      affectedRuleTypes.push(ruleType);
    }
  }

  // For entity type changes (category/vendor/tag deletions/updates), add that rule type
  if (entityType === "category" && !affectedRuleTypes.includes("category")) {
    affectedRuleTypes.push("category");
  }
  if (entityType === "vendor" && !affectedRuleTypes.includes("vendor")) {
    affectedRuleTypes.push("vendor");
  }
  if (entityType === "tag" && !affectedRuleTypes.includes("tag")) {
    affectedRuleTypes.push("tag");
  }

  if (affectedRuleTypes.length === 0) {
    return { markedCount: 0 };
  }

  // Build filter for collections that have matching rules
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ruleFilter: any = {
    ruleType: { in: affectedRuleTypes },
  };

  // If we have a specific entity ID for category/vendor/tag, filter by value too
  if (entityId && ["category", "vendor", "tag"].includes(entityType)) {
    ruleFilter.value = entityId;
  }

  // Find all active collections with rules that could be affected
  const collectionsToMark = await db.collection.findMany({
    where: {
      active: true,
      needsRegeneration: false, // Only mark if not already marked
      rules: {
        some: ruleFilter,
      },
    },
    select: { id: true },
  });

  if (collectionsToMark.length === 0) {
    return { markedCount: 0 };
  }

  // Mark them for regeneration
  await db.collection.updateMany({
    where: {
      id: { in: collectionsToMark.map((c) => c.id) },
    },
    data: {
      needsRegeneration: true,
      updatedAt: new Date(),
    },
  });

  return { markedCount: collectionsToMark.length };
}

/**
 * Mark all active collections that have any rules for regeneration.
 * Useful when a product is created, deleted, or has many field changes.
 */
export async function markAllRuleBasedCollectionsForRegeneration(): Promise<{ markedCount: number }> {
  const collectionsToMark = await db.collection.findMany({
    where: {
      active: true,
      needsRegeneration: false,
      rules: {
        some: {}, // Has at least one rule
      },
    },
    select: { id: true },
  });

  if (collectionsToMark.length === 0) {
    return { markedCount: 0 };
  }

  await db.collection.updateMany({
    where: {
      id: { in: collectionsToMark.map((c) => c.id) },
    },
    data: {
      needsRegeneration: true,
      updatedAt: new Date(),
    },
  });

  return { markedCount: collectionsToMark.length };
}

/**
 * Process pending collection regenerations.
 * Called by cron job to regenerate collections in batches.
 *
 * @param batchSize - Number of collections to process per call (default: 10)
 * @returns Object with processed count and remaining count
 */
export async function processPendingRegenerations(
  batchSize: number = 10
): Promise<{ processed: number; remaining: number; errors: string[] }> {
  const errors: string[] = [];

  // Get collections that need regeneration, ordered by when they were last regenerated
  const collectionsToProcess = await db.collection.findMany({
    where: {
      needsRegeneration: true,
      active: true,
    },
    select: { id: true, name: true },
    orderBy: { lastRegeneratedAt: { sort: "asc", nulls: "first" } },
    take: batchSize,
  });

  // Process each collection
  for (const collection of collectionsToProcess) {
    try {
      await generateCollectionProducts(collection.id);

      // Mark as regenerated
      await db.collection.update({
        where: { id: collection.id },
        data: {
          needsRegeneration: false,
          lastRegeneratedAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      const errorMsg = `Failed to regenerate collection ${collection.name} (${collection.id}): ${error}`;
      console.error(errorMsg);
      errors.push(errorMsg);
      // Collection stays marked for retry on next cron run
    }
  }

  // Count remaining collections
  const remainingCount = await db.collection.count({
    where: {
      needsRegeneration: true,
      active: true,
    },
  });

  return {
    processed: collectionsToProcess.length - errors.length,
    remaining: remainingCount,
    errors,
  };
}

// Mutation options
export const createCollectionMutationOptions = () => {
  return mutationOptions({
    mutationFn: async (data: z.infer<typeof collectionSchema>) => {
      return await createCollectionServerFn({ data });
    },
  });
};

export const updateCollectionMutationOptions = () => {
  return mutationOptions({
    mutationFn: async (
      data: z.infer<typeof collectionSchema> & { collectionId: string }
    ) => {
      return await updateCollectionServerFn({ data });
    },
  });
};

export const deleteCollectionMutationOptions = () => {
  return mutationOptions({
    mutationFn: async (collectionId: string) => {
      return await deleteCollectionServerFn({ data: { collectionId } });
    },
  });
};

export const updateCollectionProductPositionsMutationOptions = () => {
  return mutationOptions({
    mutationFn: async (data: {
      collectionId: string;
      products: { id: string; position: number }[];
    }) => {
      return await updateCollectionProductPositionsServerFn({ data });
    },
  });
};

export const addProductToCollectionMutationOptions = () => {
  return mutationOptions({
    mutationFn: async (data: { collectionId: string; productId: string }) => {
      return await addProductToCollectionServerFn({ data });
    },
  });
};

export const removeProductFromCollectionMutationOptions = () => {
  return mutationOptions({
    mutationFn: async (data: { collectionId: string; productId: string }) => {
      return await removeProductFromCollectionServerFn({ data });
    },
  });
};

export const regenerateCollectionProductsMutationOptions = () => {
  return mutationOptions({
    mutationFn: async (collectionId: string) => {
      return await regenerateCollectionProductsServerFn({
        data: { collectionId },
      });
    },
  });
};

// ============================================================================
// PUBLIC COLLECTION FUNCTIONS (FOR STOREFRONT)
// ============================================================================

export const PUBLIC_COLLECTION_QUERY_KEY = "public-collection";

export type PublicCollection = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

export type PublicCollectionProduct = {
  id: string;
  name: string;
  slug: string;
  price: string;
  compareAtPrice: string | null;
  primaryImage: string | null;
  variants: {
    id: string;
    price: string | null;
    compareAtPrice: string | null;
    options: { optionName: string; optionValue: string }[];
    inventory: { available: number } | null;
  }[];
};

// Get collection by slug (public, no auth)
export const getPublicCollectionBySlugServerFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string() }))
  .handler(async ({ data }): Promise<PublicCollection | null> => {
    const collection = await db.collection.findFirst({
      where: {
        slug: data.slug,
        active: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        image: true,
        seoTitle: true,
        seoDescription: true,
      },
    });

    if (!collection) {
      return null;
    }

    return collection;
  });

// Get collection products with cursor-based pagination (public, no auth)
export const getPublicCollectionProductsServerFn = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      collectionId: z.string(),
      cursor: z.string().optional(), // Last product ID from previous page
      limit: z.number().min(1).max(100).optional().default(24),
    })
  )
  .handler(async ({ data }) => {
    const { collectionId, cursor, limit = 24 } = data;

    // Get collection to check sort order
    const collection = await db.collection.findFirst({
      where: { id: collectionId, active: true },
      select: { sortOrder: true },
    });

    if (!collection) {
      return {
        products: [],
        nextCursor: null,
        hasMore: false,
      };
    }

    // Determine order based on collection's sortOrder setting
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let orderBy: any;

    switch (collection.sortOrder) {
      case "price-asc":
        orderBy = { product: { price: "asc" } };
        break;
      case "price-desc":
        orderBy = { product: { price: "desc" } };
        break;
      case "alphabetical-asc":
        orderBy = { product: { name: "asc" } };
        break;
      case "alphabetical-desc":
        orderBy = { product: { name: "desc" } };
        break;
      case "created-asc":
        orderBy = { product: { createdAt: "asc" } };
        break;
      case "created-desc":
        orderBy = { product: { createdAt: "desc" } };
        break;
      case "manual":
      default:
        orderBy = { position: "asc" };
        break;
    }

    // Build cursor condition if provided
    let cursorCondition = {};
    if (cursor) {
      // Find the cursor item's position to know where to start
      const cursorItem = await db.collectionProduct.findFirst({
        where: {
          collectionId,
          productId: cursor,
        },
        select: { position: true },
      });

      if (cursorItem) {
        cursorCondition = {
          position: { gt: cursorItem.position },
        };
      }
    }

    // Get products with positions - fetch one extra to check if there's more
    const collectionProductsList = await db.collectionProduct.findMany({
      where: {
        collectionId,
        product: { status: "active" },
        ...cursorCondition,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            compareAtPrice: true,
          },
        },
      },
      orderBy,
      take: limit + 1, // Fetch one extra to check if there's more
    });

    // Check if there are more results
    const hasMore = collectionProductsList.length > limit;
    const itemsToReturn = hasMore
      ? collectionProductsList.slice(0, limit)
      : collectionProductsList;

    // Get primary images and variants for each product
    const productsWithDetails = await Promise.all(
      itemsToReturn.map(async (cp) => {
        // Get primary image
        const primaryMedia = await db.productMedia.findFirst({
          where: {
            productId: cp.productId,
            isPrimary: true,
          },
          include: {
            media: {
              select: { url: true },
            },
          },
        });

        // Get variants with options and inventory
        const variants = await db.productVariant.findMany({
          where: { productId: cp.productId },
          orderBy: { position: "asc" },
          include: {
            inventory: true,
          },
          take: 10, // Limit variants for performance
        });

        const variantsWithOptions = await Promise.all(
          variants.map(async (v) => {
            const variantOptions = await db.productVariantOption.findMany({
              where: { variantId: v.id },
              include: {
                option: true,
                optionValue: true,
              },
            });

            return {
              id: v.id,
              price: v.price ? String(v.price) : null,
              compareAtPrice: v.compareAtPrice ? String(v.compareAtPrice) : null,
              options: variantOptions.map((vo) => ({
                optionName: vo.option?.name || "",
                optionValue: vo.optionValue?.name || "",
              })),
              inventory: v.inventory
                ? { available: v.inventory.available }
                : null,
            };
          })
        );

        // Find first in-stock variant to use its price
        const firstInStockVariant = variantsWithOptions.find(
          (v) => v.inventory && v.inventory.available > 0
        );

        // Use first in-stock variant's price, or fall back to first variant, then product price
        const displayPrice = firstInStockVariant?.price
          || variantsWithOptions[0]?.price
          || String(cp.product.price);
        const displayCompareAtPrice = firstInStockVariant?.compareAtPrice
          || variantsWithOptions[0]?.compareAtPrice
          || (cp.product.compareAtPrice ? String(cp.product.compareAtPrice) : null);

        return {
          id: cp.product.id,
          name: cp.product.name,
          slug: cp.product.slug,
          price: displayPrice,
          compareAtPrice: displayCompareAtPrice,
          primaryImage: primaryMedia?.media?.url || null,
          variants: variantsWithOptions,
        };
      })
    );

    // Next cursor is the last product's ID
    const nextCursor = hasMore
      ? itemsToReturn[itemsToReturn.length - 1].productId
      : null;

    return {
      products: productsWithDetails,
      nextCursor,
      hasMore,
    };
  });

// Query options for public collection
export const getPublicCollectionQueryOptions = (slug: string) => {
  return queryOptions({
    queryKey: [PUBLIC_COLLECTION_QUERY_KEY, slug],
    queryFn: async () => {
      return await getPublicCollectionBySlugServerFn({ data: { slug } });
    },
    enabled: !!slug,
  });
};
