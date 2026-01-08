import { db } from "@/db/db";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { nanoid } from "nanoid";
import { markCollectionsForRegeneration } from "@/queries/collections";

export const VENDORS_QUERY_KEY = "vendors";

export const getVendorsServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      search: z.string().optional(),
      page: z.number().optional(),
      limit: z.number().optional(),
    })
  )
  .handler(async ({ data }) => {
    const { search = "", page = 1, limit = 25 } = data;

    const response = await db.vendor.findMany({
      where: search
        ? { name: { contains: search } }
        : undefined,
      take: limit,
      skip: (page - 1) * limit,
    });

    const totalCount = await db.vendor.count({
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

export const createVendorServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string(),
      email: z.string().optional().nullable(),
      phone: z.string().optional().nullable(),
      website: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      active: z.boolean().optional().default(true),
    })
  )
  .handler(async ({ data }) => {
    const vendorId = nanoid();

    const vendor = await db.vendor.create({
      data: {
        id: vendorId,
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
        website: data.website || null,
        address: data.address || null,
        active: data.active ?? true,
      },
    });

    return vendor;
  });

export const updateVendorServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
      name: z.string(),
      email: z.string().optional().nullable(),
      phone: z.string().optional().nullable(),
      website: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      active: z.boolean().optional().default(true),
    })
  )
  .handler(async ({ data }) => {
    const vendor = await db.vendor.update({
      where: { id: data.id },
      data: {
        name: data.name,
        email: data.email ?? null,
        phone: data.phone ?? null,
        website: data.website ?? null,
        address: data.address ?? null,
        active: data.active ?? true,
      },
    });

    // Mark collections with vendor rules for this specific vendor
    await markCollectionsForRegeneration(["vendorId"], "vendor", data.id);

    return vendor;
  });

export const deleteVendorServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
    })
  )
  .handler(async ({ data }) => {
    // Mark collections before deleting (so we have the vendor ID)
    await markCollectionsForRegeneration(["vendorId"], "vendor", data.id);

    await db.vendor.delete({
      where: { id: data.id },
    });
    return {
      success: true,
      message: "Vendor deleted successfully",
    };
  });

export const deleteVendorsMutationOptions = (data: { ids: string[] }) => {
  return mutationOptions({
    mutationFn: async () => {
      return await deleteVendorServerFn({ data: { id: data.ids[0] } });
    },
  });
};

export const getAllVendorsQueryOptions = (data: {
  search: string;
  page: number;
  limit: number;
}) => {
  return queryOptions({
    queryKey: [VENDORS_QUERY_KEY, data.search, data.page, data.limit],
    queryFn: async () => {
      const response = await getVendorsServerFn({
        data: { search: data.search, page: data.page, limit: data.limit },
      });
      return response;
    },
  });
};

// Simple query options to get all vendors without pagination
export const getVendorsQueryOptions = () => {
  return queryOptions({
    queryKey: [VENDORS_QUERY_KEY, "all"],
    queryFn: async () => {
      const response = await getVendorsServerFn({
        data: { search: "", page: 1, limit: 1000 },
      });
      return response.data;
    },
  });
};
