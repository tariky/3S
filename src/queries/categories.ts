import { db } from "@/db/db";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { nanoid } from "nanoid";
import { markCollectionsForRegeneration } from "@/queries/collections";

export const CATEGORIES_QUERY_KEY = "categories";

export const slugCheckServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      slug: z.string(),
      counter: z.number().optional().default(1),
      excludeId: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const { slug, counter, excludeId } = data;

    const checkSlug = async (
      currentSlug: string,
      currentCounter: number
    ): Promise<string> => {
      const categories = await db.product_categories.findMany({
        where: {
          slug: currentSlug,
          ...(excludeId ? { NOT: { id: excludeId } } : {}),
        },
      });

      if (categories.length > 0) {
        // Slug is occupied, try with incremented number
        const newSlug = `${slug}-${currentCounter}`;
        return checkSlug(newSlug, currentCounter + 1);
      }

      // Slug is available
      return currentSlug;
    };

    return await checkSlug(slug, counter);
  });

export const getCategoriesServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      search: z.string().optional(),
      page: z.number().optional(),
      limit: z.number().optional(),
    })
  )
  .handler(async ({ data }) => {
    const { search = "", page = 1, limit = 25 } = data;

    const response = await db.product_categories.findMany({
      where: search
        ? { name: { contains: search } }
        : undefined,
      take: limit,
      skip: (page - 1) * limit,
    });

    // return total, hasNextPage, hasPreviousPage, nextCursor, previousCursor
    const totalCount = await db.product_categories.count({
      where: search
        ? { name: { contains: search } }
        : undefined,
    });

    const hasNextPage = page * limit < totalCount;
    const hasPreviousPage = page > 1;
    const nextCursor = page + 1;
    const previousCursor = page - 1;
    return {
      data: response,
      total: totalCount,
      hasNextPage,
      hasPreviousPage,
      nextCursor,
      previousCursor,
    };
  });

export const createCategoryServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string(),
      slug: z.string().optional(),
      description: z.string().optional(),
      image: z.string().optional(),
      parentId: z.string().optional().nullable(),
    })
  )
  .handler(async ({ data }) => {
    // Generate unique slug if not provided or if provided slug is occupied
    const baseSlug = data.slug || data.name.toLowerCase().replace(/\s+/g, "-");
    const uniqueSlug = await slugCheckServerFn({ data: { slug: baseSlug } });
    // Insert category with generated ID and unique slug
    const categoryId = nanoid();

    const category = await db.product_categories.create({
      data: {
        id: categoryId,
        name: data.name,
        slug: uniqueSlug,
        description: data.description || null,
        image: data.image || null,
        parentId: data.parentId || null,
      },
    });

    return category;
  });

export const updateCategoryServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      description: z.string().optional().nullable(),
      image: z.string().optional().nullable(),
      parentId: z.string().optional().nullable(),
    })
  )
  .handler(async ({ data }) => {
    // Check if slug is available (excluding current category)
    const uniqueSlug = await slugCheckServerFn({
      data: { slug: data.slug, excludeId: data.id },
    });

    // Update category with unique slug
    const category = await db.product_categories.update({
      where: { id: data.id },
      data: {
        name: data.name,
        slug: uniqueSlug,
        description: data.description ?? null,
        image: data.image ?? null,
        parentId: data.parentId ?? null,
      },
    });

    // Mark collections with category rules for this specific category
    await markCollectionsForRegeneration(["categoryId"], "category", data.id);

    return category;
  });

export const deleteCategoryServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
    })
  )
  .handler(async ({ data }) => {
    // Mark collections before deleting (so we have the category ID)
    await markCollectionsForRegeneration(["categoryId"], "category", data.id);

    const category = await db.product_categories.delete({
      where: { id: data.id },
    });

    if (category) {
      return {
        success: true,
        message: "Category deleted successfully",
      };
    } else {
      return {
        success: false,
        message: "Category not found",
      };
    }
  });

// delete categories mutation options
export const deleteCategoriesMutationOptions = (data: { ids: string[] }) => {
  return mutationOptions({
    mutationFn: async () => {
      return await deleteCategoryServerFn({ data: { id: data.ids[0] } });
    },
  });
};

// query option for get all categories
export const getAllCategoriesQueryOptions = (data: {
  search: string;
  page: number;
  limit: number;
}) => {
  return queryOptions({
    queryKey: [CATEGORIES_QUERY_KEY, data.search, data.page, data.limit],
    queryFn: async () => {
      const response = await getCategoriesServerFn({
        data: { search: data.search, page: data.page, limit: data.limit },
      });
      return response;
    },
  });
};

// Simple query options to get all categories without pagination
export const getCategoriesQueryOptions = () => {
  return queryOptions({
    queryKey: [CATEGORIES_QUERY_KEY, "all"],
    queryFn: async () => {
      const response = await getCategoriesServerFn({
        data: { search: "", page: 1, limit: 1000 },
      });
      return response.data;
    },
  });
};
