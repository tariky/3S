import { db } from "@/db/db";
import { queryOptions, mutationOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import {
  collections,
  collectionRules,
  collectionProducts,
  products,
  productCategories,
  vendors,
  inventory,
  productVariants,
  productMedia,
  media,
} from "@/db/schema";
import { eq, and, or, like, desc, asc, count, sql, inArray, gte, lte, gt, lt, ne } from "drizzle-orm";
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
    const allCollections = await db
      .select({
        id: collections.id,
        name: collections.name,
        slug: collections.slug,
        description: collections.description,
        image: collections.image,
        ruleMatch: collections.ruleMatch,
        sortOrder: collections.sortOrder,
        active: collections.active,
        createdAt: collections.createdAt,
        updatedAt: collections.updatedAt,
      })
      .from(collections)
      .orderBy(desc(collections.createdAt));

    // Get product counts for each collection
    const collectionsWithCounts = await Promise.all(
      allCollections.map(async (collection) => {
        const [productCount] = await db
          .select({ count: count() })
          .from(collectionProducts)
          .where(eq(collectionProducts.collectionId, collection.id));

        return {
          ...collection,
          productCount: productCount?.count || 0,
        };
      })
    );

    return collectionsWithCounts;
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
    const [collection] = await db
      .select()
      .from(collections)
      .where(eq(collections.id, data.collectionId))
      .limit(1);

    if (!collection) {
      throw new Error("Collection not found");
    }

    // Get rules
    const rules = await db
      .select()
      .from(collectionRules)
      .where(eq(collectionRules.collectionId, collection.id))
      .orderBy(asc(collectionRules.position));

    return {
      ...collection,
      rules,
    };
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
    await db.insert(collections).values({
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
    });

    // Create rules
    if (data.rules && data.rules.length > 0) {
      await db.insert(collectionRules).values(
        data.rules.map((rule, index) => ({
          id: nanoid(),
          collectionId,
          ruleType: rule.ruleType,
          operator: rule.operator,
          value: rule.value,
          position: index,
        }))
      );
    }

    // Generate products for collection based on rules
    await generateCollectionProducts(collectionId);

    return { id: collectionId };
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
    await db
      .update(collections)
      .set({
        ...updateData,
        description: updateData.description || null,
        image: updateData.image || null,
        seoTitle: updateData.seoTitle || null,
        seoDescription: updateData.seoDescription || null,
        updatedAt: new Date(),
      })
      .where(eq(collections.id, collectionId));

    // Delete existing rules and recreate
    await db.delete(collectionRules).where(eq(collectionRules.collectionId, collectionId));

    if (rules && rules.length > 0) {
      await db.insert(collectionRules).values(
        rules.map((rule, index) => ({
          id: rule.id || nanoid(),
          collectionId,
          ruleType: rule.ruleType,
          operator: rule.operator,
          value: rule.value,
          position: index,
        }))
      );
    }

    // Regenerate products for collection
    await generateCollectionProducts(collectionId);

    return { id: collectionId };
  });

// Delete collection
export const deleteCollectionServerFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(z.object({ collectionId: z.string() }))
  .handler(async ({ data }) => {
    await db.delete(collections).where(eq(collections.id, data.collectionId));
    return { success: true };
  });

// Get products for a collection (with manual ordering)
export const getCollectionProductsServerFn = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .inputValidator(z.object({ collectionId: z.string() }))
  .handler(async ({ data }) => {
    // Get collection
    const [collection] = await db
      .select()
      .from(collections)
      .where(eq(collections.id, data.collectionId))
      .limit(1);

    if (!collection) {
      throw new Error("Collection not found");
    }

    // Get products with positions
    const collectionProductsList = await db
      .select({
        id: collectionProducts.id,
        productId: collectionProducts.productId,
        position: collectionProducts.position,
        isManual: collectionProducts.isManual,
        product: {
          id: products.id,
          name: products.name,
          slug: products.slug,
          price: products.price,
          compareAtPrice: products.compareAtPrice,
          status: products.status,
        },
      })
      .from(collectionProducts)
      .leftJoin(products, eq(collectionProducts.productId, products.id))
      .where(eq(collectionProducts.collectionId, data.collectionId))
      .orderBy(asc(collectionProducts.position));

    // Get primary images for each product
    const productsWithImages = await Promise.all(
      collectionProductsList.map(async (cp) => {
        const [primaryMedia] = await db
          .select({
            url: media.url,
          })
          .from(productMedia)
          .leftJoin(media, eq(productMedia.mediaId, media.id))
          .where(
            and(
              eq(productMedia.productId, cp.productId),
              eq(productMedia.isPrimary, true)
            )
          )
          .limit(1);

        return {
          ...cp,
          product: {
            ...cp.product,
            image: primaryMedia?.url || null,
          },
        };
      })
    );

    return productsWithImages;
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
        db
          .update(collectionProducts)
          .set({ position: product.position, updatedAt: new Date() })
          .where(eq(collectionProducts.id, product.id))
      )
    );

    // Update collection sort order to manual
    await db
      .update(collections)
      .set({ sortOrder: "manual", updatedAt: new Date() })
      .where(eq(collections.id, data.collectionId));

    return { success: true };
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
    const [existing] = await db
      .select()
      .from(collectionProducts)
      .where(
        and(
          eq(collectionProducts.collectionId, data.collectionId),
          eq(collectionProducts.productId, data.productId)
        )
      )
      .limit(1);

    if (existing) {
      return { id: existing.id };
    }

    // Get max position
    const [maxPosition] = await db
      .select({ maxPos: sql<number>`COALESCE(MAX(${collectionProducts.position}), -1)` })
      .from(collectionProducts)
      .where(eq(collectionProducts.collectionId, data.collectionId));

    const id = nanoid();
    await db.insert(collectionProducts).values({
      id,
      collectionId: data.collectionId,
      productId: data.productId,
      position: (maxPosition?.maxPos || 0) + 1,
      isManual: true,
    });

    return { id };
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
    await db
      .delete(collectionProducts)
      .where(
        and(
          eq(collectionProducts.collectionId, data.collectionId),
          eq(collectionProducts.productId, data.productId)
        )
      );

    return { success: true };
  });

// Regenerate collection products (apply rules)
export const regenerateCollectionProductsServerFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(z.object({ collectionId: z.string() }))
  .handler(async ({ data }) => {
    await generateCollectionProducts(data.collectionId);
    return { success: true };
  });

// Helper function to generate collection products based on rules
async function generateCollectionProducts(collectionId: string) {
  // Get collection with rules
  const [collection] = await db
    .select()
    .from(collections)
    .where(eq(collections.id, collectionId))
    .limit(1);

  if (!collection) return;

  const rules = await db
    .select()
    .from(collectionRules)
    .where(eq(collectionRules.collectionId, collectionId))
    .orderBy(asc(collectionRules.position));

  // Get manually added products to preserve them
  const manualProducts = await db
    .select()
    .from(collectionProducts)
    .where(
      and(
        eq(collectionProducts.collectionId, collectionId),
        eq(collectionProducts.isManual, true)
      )
    );

  const manualProductIds = new Set(manualProducts.map((p) => p.productId));

  // If no rules, keep only manual products
  if (rules.length === 0) {
    await db
      .delete(collectionProducts)
      .where(
        and(
          eq(collectionProducts.collectionId, collectionId),
          eq(collectionProducts.isManual, false)
        )
      );
    return;
  }

  // Get all active products
  const allProducts = await db
    .select({
      id: products.id,
      price: products.price,
      compareAtPrice: products.compareAtPrice,
      categoryId: products.categoryId,
      vendorId: products.vendorId,
      status: products.status,
    })
    .from(products)
    .where(eq(products.status, "active"));

  // Get inventory for products (need to check variants)
  const productInventory = new Map<string, number>();
  for (const product of allProducts) {
    const variants = await db
      .select({ variantId: productVariants.id })
      .from(productVariants)
      .where(eq(productVariants.productId, product.id));

    let totalInventory = 0;
    for (const variant of variants) {
      const [inv] = await db
        .select({ available: inventory.available })
        .from(inventory)
        .where(eq(inventory.variantId, variant.variantId))
        .limit(1);
      totalInventory += inv?.available || 0;
    }
    productInventory.set(product.id, totalInventory);
  }

  // Apply rules to filter products
  const matchingProducts = allProducts.filter((product) => {
    const ruleResults = rules.map((rule) => {
      return evaluateRule(rule, product, productInventory.get(product.id) || 0);
    });

    // Apply AND/OR logic
    if (collection.ruleMatch === "all") {
      return ruleResults.every((result) => result);
    } else {
      return ruleResults.some((result) => result);
    }
  });

  // Delete auto-generated products (keep manual)
  await db
    .delete(collectionProducts)
    .where(
      and(
        eq(collectionProducts.collectionId, collectionId),
        eq(collectionProducts.isManual, false)
      )
    );

  // Add matching products (except already manually added)
  const newProducts = matchingProducts.filter((p) => !manualProductIds.has(p.id));

  // Get max position from manual products
  let maxPosition = 0;
  if (manualProducts.length > 0) {
    maxPosition = Math.max(...manualProducts.map((p) => p.position)) + 1;
  }

  if (newProducts.length > 0) {
    await db.insert(collectionProducts).values(
      newProducts.map((product, index) => ({
        id: nanoid(),
        collectionId,
        productId: product.id,
        position: maxPosition + index,
        isManual: false,
      }))
    );
  }
}

// Helper function to evaluate a single rule against a product
function evaluateRule(
  rule: typeof collectionRules.$inferSelect,
  product: {
    id: string;
    price: string;
    compareAtPrice: string | null;
    categoryId: string | null;
    vendorId: string | null;
    status: string;
  },
  inventoryCount: number
): boolean {
  const { ruleType, operator, value } = rule;

  switch (ruleType) {
    case "price": {
      const productPrice = parseFloat(product.price);
      const targetPrice = parseFloat(value);
      return compareNumbers(productPrice, targetPrice, operator);
    }

    case "compare_at_price": {
      if (!product.compareAtPrice) return false;
      const comparePrice = parseFloat(product.compareAtPrice);
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

