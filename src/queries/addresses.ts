import { db } from "@/db/db";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { nanoid } from "nanoid";
import { authMiddleware } from "@/utils/auth-middleware";

export const ADDRESSES_QUERY_KEY = "addresses";

// Get addresses for current user
export const getUserAddressesServerFn = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userEmail = context.user.email;

    // Find customer by email
    const customer = await db.customer.findFirst({
      where: { email: userEmail },
    });

    if (!customer) {
      return [];
    }

    // Fetch addresses for this customer (not order addresses)
    const customerAddresses = await db.address.findMany({
      where: {
        customerId: customer.id,
        orderId: null, // Only customer addresses, not order addresses
      },
    });

    return customerAddresses;
  });

export const getUserAddressesQueryOptions = () => {
  return queryOptions({
    queryKey: [ADDRESSES_QUERY_KEY, "user"],
    queryFn: async () => {
      return await getUserAddressesServerFn();
    },
  });
};

// Create address for current user
export const createUserAddressServerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      type: z.enum(["billing", "shipping"]),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      company: z.string().optional(),
      address1: z.string(),
      address2: z.string().optional(),
      city: z.string(),
      state: z.string().optional(),
      zip: z.string().optional(),
      country: z.string(),
      phone: z.string().optional(),
      isDefault: z.boolean().optional(),
    })
  )
  .handler(async ({ data, context }) => {
    const userEmail = context.user.email;

    // Find customer by email
    const customer = await db.customer.findFirst({
      where: { email: userEmail },
    });

    if (!customer) {
      throw new Error("Customer not found");
    }

    // If this is set as default, unset other defaults of the same type
    if (data.isDefault) {
      await db.address.updateMany({
        where: {
          customerId: customer.id,
          type: data.type,
        },
        data: { isDefault: false },
      });
    }

    // Create new address
    const addressId = nanoid();
    const createdAddress = await db.address.create({
      data: {
        id: addressId,
        customerId: customer.id,
        type: data.type,
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        company: data.company || null,
        address1: data.address1,
        address2: data.address2 || null,
        city: data.city,
        state: data.state || null,
        zip: data.zip || null,
        country: data.country,
        phone: data.phone || null,
        isDefault: data.isDefault || false,
      },
    });

    return createdAddress;
  });

export const createUserAddressMutationOptions = (
  data: Parameters<typeof createUserAddressServerFn>[0]["data"]
) => {
  return mutationOptions({
    mutationFn: async () => {
      return await createUserAddressServerFn({ data });
    },
  });
};

// Update address for current user
export const updateUserAddressServerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(
    z.object({
      addressId: z.string(),
      type: z.enum(["billing", "shipping"]).optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      company: z.string().optional(),
      address1: z.string().optional(),
      address2: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zip: z.string().optional(),
      country: z.string().optional(),
      phone: z.string().optional(),
      isDefault: z.boolean().optional(),
    })
  )
  .handler(async ({ data, context }) => {
    const userEmail = context.user.email;
    const { addressId, ...updateData } = data;

    // Find customer by email
    const customer = await db.customer.findFirst({
      where: { email: userEmail },
    });

    if (!customer) {
      throw new Error("Customer not found");
    }

    // Verify address belongs to customer
    const existingAddress = await db.address.findFirst({
      where: {
        id: addressId,
        customerId: customer.id,
      },
    });

    if (!existingAddress) {
      throw new Error("Address not found");
    }

    // If setting as default, unset other defaults of the same type
    if (updateData.isDefault) {
      const addressType = updateData.type || existingAddress.type;
      await db.address.updateMany({
        where: {
          customerId: customer.id,
          type: addressType,
          NOT: { id: addressId },
        },
        data: { isDefault: false },
      });
    }

    // Update address
    const updatedAddress = await db.address.update({
      where: { id: addressId },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
    });

    return updatedAddress;
  });

export const updateUserAddressMutationOptions = (
  data: Parameters<typeof updateUserAddressServerFn>[0]["data"]
) => {
  return mutationOptions({
    mutationFn: async () => {
      return await updateUserAddressServerFn({ data });
    },
  });
};

// Delete address for current user
export const deleteUserAddressServerFn = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(z.object({ addressId: z.string() }))
  .handler(async ({ data, context }) => {
    const userEmail = context.user.email;

    // Find customer by email
    const customer = await db.customer.findFirst({
      where: { email: userEmail },
    });

    if (!customer) {
      throw new Error("Customer not found");
    }

    // Verify address belongs to customer
    const existingAddress = await db.address.findFirst({
      where: {
        id: data.addressId,
        customerId: customer.id,
      },
    });

    if (!existingAddress) {
      throw new Error("Address not found");
    }

    // Delete address
    await db.address.delete({
      where: { id: data.addressId },
    });

    return { success: true };
  });

export const deleteUserAddressMutationOptions = (addressId: string) => {
  return mutationOptions({
    mutationFn: async () => {
      return await deleteUserAddressServerFn({ data: { addressId } });
    },
  });
};
