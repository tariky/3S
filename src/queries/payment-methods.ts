import { db } from "@/db/db";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { paymentMethods } from "@/db/schema";
import { count, eq, like, and, asc } from "drizzle-orm";
import { z } from "zod";
import { nanoid } from "nanoid";

export const PAYMENT_METHODS_QUERY_KEY = "payment-methods";

export const getPaymentMethodsServerFn = createServerFn({ method: "POST" })
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
      conditions.push(like(paymentMethods.name, `%${search}%`));
    }
    const response = await db
      .select()
      .from(paymentMethods)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(paymentMethods.position))
      .limit(limit)
      .offset((page - 1) * limit);
    const totalQuery = db.select({ count: count() }).from(paymentMethods);
    const total = search
      ? await totalQuery.where(like(paymentMethods.name, `%${search}%`))
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

export const createPaymentMethodServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string(),
      description: z.string().optional(),
      active: z.boolean().optional(),
      position: z.number().optional(),
    })
  )
  .handler(async ({ data }) => {
    const methodId = nanoid();
    await db.insert(paymentMethods).values({
      id: methodId,
      name: data.name,
      description: data.description || null,
      active: data.active ?? true,
      position: data.position ?? 0,
    });

    const [method] = await db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.id, methodId));
    return method;
  });

export const updatePaymentMethodServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional().nullable(),
      active: z.boolean().optional(),
      position: z.number().optional(),
    })
  )
  .handler(async ({ data }) => {
    await db
      .update(paymentMethods)
      .set({
        name: data.name,
        description: data.description ?? null,
        active: data.active ?? true,
        position: data.position ?? 0,
      })
      .where(eq(paymentMethods.id, data.id));

    const [method] = await db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.id, data.id));
    return method;
  });

export const deletePaymentMethodServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
    })
  )
  .handler(async ({ data }) => {
    await db
      .delete(paymentMethods)
      .where(eq(paymentMethods.id, data.id));
    return {
      success: true,
      message: "Payment method deleted successfully",
    };
  });

export const deletePaymentMethodsMutationOptions = (data: { ids: string[] }) => {
  return mutationOptions({
    mutationFn: async () => {
      return await deletePaymentMethodServerFn({ data: { id: data.ids[0] } });
    },
  });
};

export const getAllPaymentMethodsQueryOptions = (data: {
  search: string;
  page: number;
  limit: number;
}) => {
  return queryOptions({
    queryKey: [PAYMENT_METHODS_QUERY_KEY, data.search, data.page, data.limit],
    queryFn: async () => {
      const response = await getPaymentMethodsServerFn({
        data: { search: data.search, page: data.page, limit: data.limit },
      });
      return response;
    },
  });
};

// Get all active payment methods for dropdown
export const getActivePaymentMethodsServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(z.object({}))
  .handler(async () => {
    const methods = await db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.active, true))
      .orderBy(asc(paymentMethods.position));
    return methods;
  });

export const getActivePaymentMethodsQueryOptions = () => {
  return queryOptions({
    queryKey: [PAYMENT_METHODS_QUERY_KEY, "active"],
    queryFn: async () => {
      return await getActivePaymentMethodsServerFn({ data: {} });
    },
  });
};

