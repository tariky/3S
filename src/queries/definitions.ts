import { db } from "@/db/db";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { definitions } from "@/db/schema";
import { count, eq, like } from "drizzle-orm";
import { z } from "zod";
import { nanoid } from "nanoid";

export const DEFINITIONS_QUERY_KEY = "definitions";

export const getDefinitionsServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      search: z.string().optional(),
      page: z.number().optional(),
      limit: z.number().optional(),
    })
  )
  .handler(async ({ data }) => {
    const { search = "", page = 1, limit = 25 } = data;
    const response = await db.query.definitions.findMany({
      where: (definitions, { like }) => {
        if (search) {
          return like(definitions.name, `%${search}%`);
        }
        return undefined;
      },
      limit: limit,
      offset: (page - 1) * limit,
      orderBy: (definitions, { asc }) => [asc(definitions.position)],
    });
    const totalQuery = db.select({ count: count() }).from(definitions);
    const total = search
      ? await totalQuery.where(like(definitions.name, `%${search}%`))
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

export const createDefinitionServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string(),
      type: z.string(),
      values: z.array(z.string()),
      position: z.number().optional().default(0),
    })
  )
  .handler(async ({ data }) => {
    const definitionId = nanoid();
    await db.insert(definitions).values({
      id: definitionId,
      name: data.name,
      type: data.type,
      values: data.values,
      position: data.position ?? 0,
    });

    const [definition] = await db
      .select()
      .from(definitions)
      .where(eq(definitions.id, definitionId));
    return definition;
  });

export const updateDefinitionServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      values: z.array(z.string()),
      position: z.number().optional().default(0),
    })
  )
  .handler(async ({ data }) => {
    await db
      .update(definitions)
      .set({
        name: data.name,
        type: data.type,
        values: data.values,
        position: data.position ?? 0,
      })
      .where(eq(definitions.id, data.id));

    const [definition] = await db
      .select()
      .from(definitions)
      .where(eq(definitions.id, data.id));
    return definition;
  });

export const deleteDefinitionServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
    })
  )
  .handler(async ({ data }) => {
    await db.delete(definitions).where(eq(definitions.id, data.id));
    return {
      success: true,
      message: "Definition deleted successfully",
    };
  });

export const deleteDefinitionsMutationOptions = (data: { ids: string[] }) => {
  return mutationOptions({
    mutationFn: async () => {
      return await deleteDefinitionServerFn({ data: { id: data.ids[0] } });
    },
  });
};

export const getAllDefinitionsQueryOptions = (data: {
  search: string;
  page: number;
  limit: number;
}) => {
  return queryOptions({
    queryKey: [DEFINITIONS_QUERY_KEY, data.search, data.page, data.limit],
    queryFn: async () => {
      const response = await getDefinitionsServerFn({
        data: { search: data.search, page: data.page, limit: data.limit },
      });
      return response;
    },
  });
};

