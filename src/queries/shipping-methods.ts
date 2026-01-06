import { db } from "@/db/db";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { shippingMethods } from "@/db/schema";
import { count, eq, like, and, asc } from "drizzle-orm";
import { z } from "zod";
import { nanoid } from "nanoid";

export const SHIPPING_METHODS_QUERY_KEY = "shipping-methods";

export const getShippingMethodsServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      search: z.string().optional(),
      page: z.number().optional(),
      limit: z.number().optional(),
    })
  )
  .handler(async ({ data }) => {
    const { search = "", page = 1, limit = 25 } = data;
    const conditions = [];
    if (search) {
      conditions.push(like(shippingMethods.name, `%${search}%`));
    }
    const response = await db
      .select()
      .from(shippingMethods)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(shippingMethods.position))
      .limit(limit)
      .offset((page - 1) * limit);
    const totalQuery = db.select({ count: count() }).from(shippingMethods);
    const total = search
      ? await totalQuery.where(like(shippingMethods.name, `%${search}%`))
      : await totalQuery;
    const totalCount = total[0].count;
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

export const createShippingMethodServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string(),
      description: z.string().optional(),
      price: z.number().optional(),
      isFreeShipping: z.boolean().optional(),
      minimumOrderAmount: z.number().optional().nullable(),
      active: z.boolean().optional(),
      position: z.number().optional(),
    })
  )
  .handler(async ({ data }) => {
    const methodId = nanoid();
    await db.insert(shippingMethods).values({
      id: methodId,
      name: data.name,
      description: data.description || null,
      price: data.price?.toString() || "0",
      isFreeShipping: data.isFreeShipping ?? false,
      minimumOrderAmount: data.minimumOrderAmount?.toString() || null,
      active: data.active ?? true,
      position: data.position ?? 0,
    });

    const [method] = await db
      .select()
      .from(shippingMethods)
      .where(eq(shippingMethods.id, methodId));
    return method;
  });

export const updateShippingMethodServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional().nullable(),
      price: z.number().optional(),
      isFreeShipping: z.boolean().optional(),
      minimumOrderAmount: z.number().optional().nullable(),
      active: z.boolean().optional(),
      position: z.number().optional(),
    })
  )
  .handler(async ({ data }) => {
    await db
      .update(shippingMethods)
      .set({
        name: data.name,
        description: data.description ?? null,
        price: data.price?.toString() || "0",
        isFreeShipping: data.isFreeShipping ?? false,
        minimumOrderAmount: data.minimumOrderAmount?.toString() || null,
        active: data.active ?? true,
        position: data.position ?? 0,
      })
      .where(eq(shippingMethods.id, data.id));

    const [method] = await db
      .select()
      .from(shippingMethods)
      .where(eq(shippingMethods.id, data.id));
    return method;
  });

export const deleteShippingMethodServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
    })
  )
  .handler(async ({ data }) => {
    await db
      .delete(shippingMethods)
      .where(eq(shippingMethods.id, data.id));
    return {
      success: true,
      message: "Shipping method deleted successfully",
    };
  });

export const deleteShippingMethodsMutationOptions = (data: { ids: string[] }) => {
  return mutationOptions({
    mutationFn: async () => {
      return await deleteShippingMethodServerFn({ data: { id: data.ids[0] } });
    },
  });
};

export const getAllShippingMethodsQueryOptions = (data: {
  search: string;
  page: number;
  limit: number;
}) => {
  return queryOptions({
    queryKey: [SHIPPING_METHODS_QUERY_KEY, data.search, data.page, data.limit],
    queryFn: async () => {
      const response = await getShippingMethodsServerFn({
        data: { search: data.search, page: data.page, limit: data.limit },
      });
      return response;
    },
  });
};

// Get all active shipping methods for dropdown
export const getActiveShippingMethodsServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({}))
  .handler(async () => {
    const methods = await db
      .select()
      .from(shippingMethods)
      .where(eq(shippingMethods.active, true))
      .orderBy(asc(shippingMethods.position));
    return methods;
  });

export const getActiveShippingMethodsQueryOptions = () => {
  return queryOptions({
    queryKey: [SHIPPING_METHODS_QUERY_KEY, "active"],
    queryFn: async () => {
      return await getActiveShippingMethodsServerFn({ data: {} });
    },
  });
};

