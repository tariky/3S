import { db } from "@/db/db";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
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

    const whereCondition = search
      ? { name: { contains: search } }
      : undefined;

    const response = await db.payment_methods.findMany({
      where: whereCondition,
      orderBy: { position: "asc" },
      take: limit,
      skip: (page - 1) * limit,
    });

    const totalCount = await db.payment_methods.count({
      where: whereCondition,
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

export const createPaymentMethodServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string(),
      description: z.string().optional(),
      type: z.string().optional(),
      active: z.boolean().optional(),
      position: z.number().optional(),
    })
  )
  .handler(async ({ data }) => {
    const methodId = nanoid();

    const method = await db.payment_methods.create({
      data: {
        id: methodId,
        name: data.name,
        description: data.description || null,
        type: data.type || "cod",
        active: data.active ?? true,
        position: data.position ?? 0,
      },
    });

    return method;
  });

export const updatePaymentMethodServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
      name: z.string(),
      description: z.string().optional().nullable(),
      type: z.string().optional(),
      active: z.boolean().optional(),
      position: z.number().optional(),
    })
  )
  .handler(async ({ data }) => {
    const method = await db.payment_methods.update({
      where: { id: data.id },
      data: {
        name: data.name,
        description: data.description ?? null,
        type: data.type || "cod",
        active: data.active ?? true,
        position: data.position ?? 0,
      },
    });

    return method;
  });

export const deletePaymentMethodServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
    })
  )
  .handler(async ({ data }) => {
    await db.payment_methods.delete({
      where: { id: data.id },
    });
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
    const methods = await db.payment_methods.findMany({
      where: { active: true },
      orderBy: { position: "asc" },
    });
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
