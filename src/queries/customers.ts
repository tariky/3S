import { db } from "@/db/db";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { customers, addresses, orders } from "@/db/schema";
import { count, eq, like, and, or, asc } from "drizzle-orm";
import { z } from "zod";
import { nanoid } from "nanoid";

export const CUSTOMERS_QUERY_KEY = "customers";

export const getCustomersServerFn = createServerFn({ method: "POST" })
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
      conditions.push(
        or(
          like(customers.email, `%${search}%`),
          like(customers.firstName, `%${search}%`),
          like(customers.lastName, `%${search}%`),
          like(customers.phone, `%${search}%`)
        )!
      );
    }
    const response = await db
      .select()
      .from(customers)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(customers.firstName), asc(customers.lastName))
      .limit(limit)
      .offset((page - 1) * limit);
    const totalQuery = db.select({ count: count() }).from(customers);
    const total = conditions.length > 0
      ? await totalQuery.where(and(...conditions))
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

export const createCustomerServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      phone: z.string().optional(),
      acceptsMarketing: z.boolean().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      zip: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const customerId = nanoid();
    
    // Validate and generate email
    let customerEmail = data.email?.trim() || "";
    let hasEmail = false;
    
    // If email is provided, validate it
    if (customerEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(customerEmail)) {
        throw new Error("Nevažeći email format");
      }
      hasEmail = true;
    } else {
      // Generate a unique placeholder email if none is provided
      customerEmail = `customer-${customerId}@placeholder.local`;
      hasEmail = false;
    }
    
    await db.insert(customers).values({
      id: customerId,
      email: customerEmail,
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      phone: data.phone || null,
      acceptsMarketing: data.acceptsMarketing ?? false,
      hasEmail: hasEmail,
    });

    // Create address if address fields are provided
    if (data.address && data.city) {
      const addressId = nanoid();
      await db.insert(addresses).values({
        id: addressId,
        customerId,
        type: "shipping",
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        address1: data.address,
        city: data.city,
        zip: data.zip || null,
        country: "Bosnia and Herzegovina", // Default country
        phone: data.phone || null,
        isDefault: true,
      });
    }

    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId));
    return customer;
  });

export const getCustomerByIdServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const [customer] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, data.id))
      .limit(1);
    
    if (!customer) {
      throw new Error("Customer not found");
    }

    // Get customer addresses
    const customerAddresses = await db
      .select()
      .from(addresses)
      .where(eq(addresses.customerId, data.id));

    return {
      ...customer,
      addresses: customerAddresses,
    };
  });

export const getAllCustomersQueryOptions = (data: {
  search: string;
  page: number;
  limit: number;
}) => {
  return queryOptions({
    queryKey: [CUSTOMERS_QUERY_KEY, data.search, data.page, data.limit],
    queryFn: async () => {
      const response = await getCustomersServerFn({
        data: { search: data.search, page: data.page, limit: data.limit },
      });
      return response;
    },
  });
};

export const deleteCustomerServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string(),
    })
  )
  .handler(async ({ data }) => {
    // Check if customer has orders
    const customerOrders = await db
      .select({ count: count() })
      .from(orders)
      .where(eq(orders.customerId, data.id));

    if (customerOrders[0]?.count > 0) {
      throw new Error(
        "Ne možete obrisati kupca koji ima narudžbe. Prvo obrišite sve narudžbe."
      );
    }

    // Delete customer addresses first (due to foreign key constraint)
    await db.delete(addresses).where(eq(addresses.customerId, data.id));

    // Delete customer
    await db.delete(customers).where(eq(customers.id, data.id));

    return {
      success: true,
      message: "Kupac je uspješno obrisan",
    };
  });

export const deleteCustomerMutationOptions = (data: {
  id: string;
}) => {
  return mutationOptions({
    mutationFn: async () => {
      return await deleteCustomerServerFn({ data });
    },
  });
};

