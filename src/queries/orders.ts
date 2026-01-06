import { db } from "@/db/db";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import {
  orders,
  orderItems,
  addresses,
  customers,
  productMedia,
  productVariantMedia,
  media,
  inventory,
  inventoryTracking,
} from "@/db/schema";
import { eq, and, like, count, desc, or, asc } from "drizzle-orm";
import { z } from "zod";
import { nanoid } from "nanoid";

export const ORDERS_QUERY_KEY = "orders";

export const createOrderServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      customerId: z.string().optional().nullable(),
      email: z.string().email().optional(),
      items: z.array(
        z.object({
          productId: z.string().optional().nullable(),
          variantId: z.string().optional().nullable(),
          title: z.string(),
          sku: z.string().optional().nullable(),
          quantity: z.number(),
          price: z.number(),
          variantTitle: z.string().optional().nullable(),
        })
      ),
      shippingMethodId: z.string().optional().nullable(),
      paymentMethodId: z.string().optional().nullable(),
      discountType: z.enum(["percentage", "fixed"]).optional(),
      discountValue: z.number().optional(),
      subtotal: z.number(),
      tax: z.number().optional().default(0),
      shipping: z.number().optional().default(0),
      discount: z.number().optional().default(0),
      total: z.number(),
      note: z.string().optional(),
      billingAddress: z
        .object({
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
        })
        .optional(),
      shippingAddress: z
        .object({
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
        })
        .optional(),
    })
  )
  .handler(async ({ data }) => {
    const orderId = nanoid();
    
    // Generate order number (simple incrementing number for now)
    const orderNumber = `ORD-${Date.now()}`;

    // Create order
    await db.insert(orders).values({
      id: orderId,
      orderNumber,
      customerId: data.customerId || null,
      email: data.email || null,
      status: "pending",
      financialStatus: "pending",
      fulfillmentStatus: "unfulfilled",
      subtotal: data.subtotal.toString(),
      tax: (data.tax || 0).toString(),
      shipping: (data.shipping || 0).toString(),
      discount: (data.discount || 0).toString(),
      total: data.total.toString(),
      note: data.note || null,
    });

    // Create order items and reserve inventory
    if (data.items.length > 0) {
      const itemsToInsert = data.items.map((item) => ({
        id: nanoid(),
        orderId,
        productId: item.productId || null,
        variantId: item.variantId || null,
        title: item.title,
        sku: item.sku || null,
        quantity: item.quantity,
        price: item.price.toString(),
        total: (item.price * item.quantity).toString(),
        variantTitle: item.variantTitle || null,
      }));
      await db.insert(orderItems).values(itemsToInsert);

      // Reserve inventory for items with variants
      for (const item of data.items) {
        if (item.variantId) {
          // Get current inventory
          const [currentInventory] = await db
            .select()
            .from(inventory)
            .where(eq(inventory.variantId, item.variantId))
            .limit(1);

          if (currentInventory) {
            // Check if we have enough available inventory
            const available = currentInventory.onHand - currentInventory.reserved - currentInventory.committed;
            if (available < item.quantity) {
              throw new Error(
                `Insufficient inventory for ${item.title}. Available: ${available}, Required: ${item.quantity}`
              );
            }

            // Calculate new values
            const newReserved = currentInventory.reserved + item.quantity;
            const newCommitted = currentInventory.committed + item.quantity;
            const newAvailable = currentInventory.onHand - newReserved - newCommitted;

            // Update inventory
            await db
              .update(inventory)
              .set({
                reserved: newReserved,
                committed: newCommitted,
                available: newAvailable,
                updatedAt: new Date(),
              })
              .where(eq(inventory.variantId, item.variantId));

            // Create inventory tracking record
            await db.insert(inventoryTracking).values({
              id: nanoid(),
              variantId: item.variantId,
              productId: item.productId || "",
              type: "reservation",
              quantity: item.quantity, // Positive because we're reserving
              previousAvailable: currentInventory.available,
              previousReserved: currentInventory.reserved,
              newAvailable: newAvailable,
              newReserved: newReserved,
              reason: `Order created: ${orderNumber}`,
              referenceType: "order",
              referenceId: orderId,
              userId: null, // You can add user tracking later
            });
          }
        }
      }
    }

    // Create addresses if provided
    if (data.billingAddress) {
      await db.insert(addresses).values({
        id: nanoid(),
        orderId,
        customerId: data.customerId || null,
        type: "billing",
        firstName: data.billingAddress.firstName || null,
        lastName: data.billingAddress.lastName || null,
        company: data.billingAddress.company || null,
        address1: data.billingAddress.address1,
        address2: data.billingAddress.address2 || null,
        city: data.billingAddress.city,
        state: data.billingAddress.state || null,
        zip: data.billingAddress.zip || null,
        country: data.billingAddress.country,
        phone: data.billingAddress.phone || null,
        isDefault: false,
      });
    }

    if (data.shippingAddress) {
      await db.insert(addresses).values({
        id: nanoid(),
        orderId,
        customerId: data.customerId || null,
        type: "shipping",
        firstName: data.shippingAddress.firstName || null,
        lastName: data.shippingAddress.lastName || null,
        company: data.shippingAddress.company || null,
        address1: data.shippingAddress.address1,
        address2: data.shippingAddress.address2 || null,
        city: data.shippingAddress.city,
        state: data.shippingAddress.state || null,
        zip: data.shippingAddress.zip || null,
        country: data.shippingAddress.country,
        phone: data.shippingAddress.phone || null,
        isDefault: false,
      });
    }

    // Fetch and return the created order
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId));
    
    return order;
  });

export const createOrderMutationOptions = (data: Parameters<typeof createOrderServerFn>[0]["data"]) => {
  return mutationOptions({
    mutationFn: async () => {
      return await createOrderServerFn({ data });
    },
  });
};

// Get orders with filtering and pagination
export const getOrdersServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      search: z.string().optional(),
      status: z.string().optional(),
      page: z.number().optional(),
      limit: z.number().optional(),
    })
  )
  .handler(async ({ data }) => {
    const { search = "", status, page = 1, limit = 25 } = data;

    // Build where conditions
    const conditions = [];
    if (search) {
      // Search in order number, email, and customer name/lastname
      conditions.push(
        or(
          like(orders.orderNumber, `%${search}%`),
          like(orders.email, `%${search}%`),
          like(customers.firstName, `%${search}%`),
          like(customers.lastName, `%${search}%`)
        )!
      );
    }
    if (status) {
      conditions.push(eq(orders.status, status));
    }

    // Fetch orders with customer
    const ordersQuery = db
      .select({
        order: orders,
        customer: customers,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(orders.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);

    const response = await ordersQuery;

    // Transform the response to match expected format
    const transformedResponse = response.map((row) => ({
      ...row.order,
      customer: row.customer || null,
    }));

    // Build total count query with same conditions
    const totalConditions = [];
    if (search) {
      // Need to join with customers for search in name/lastname
      totalConditions.push(
        or(
          like(orders.orderNumber, `%${search}%`),
          like(orders.email, `%${search}%`),
          like(customers.firstName, `%${search}%`),
          like(customers.lastName, `%${search}%`)
        )!
      );
    }
    if (status) {
      totalConditions.push(eq(orders.status, status));
    }

    const totalQuery = db
      .select({ count: count() })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(
        totalConditions.length > 0 ? and(...totalConditions) : undefined
      );

    const total = await totalQuery;
    const totalCount = total[0].count;
    const hasNextPage = page * limit < totalCount;
    const hasPreviousPage = page > 1;
    const nextCursor = page + 1;
    const previousCursor = page - 1;

    return {
      data: transformedResponse,
      total: totalCount,
      hasNextPage,
      hasPreviousPage,
      nextCursor,
      previousCursor,
    };
  });

export const getAllOrdersQueryOptions = (opts: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}) => {
  return queryOptions({
    queryKey: [ORDERS_QUERY_KEY, opts],
    queryFn: async () => {
      return await getOrdersServerFn({ data: opts });
    },
  });
};

// Get order by ID with all relations
export const getOrderByIdServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ orderId: z.string() }))
  .handler(async ({ data }) => {
    // Fetch order with customer
    const [orderRow] = await db
      .select({
        order: orders,
        customer: customers,
      })
      .from(orders)
      .leftJoin(customers, eq(orders.customerId, customers.id))
      .where(eq(orders.id, data.orderId))
      .limit(1);

    if (!orderRow?.order) {
      throw new Error("Order not found");
    }

    const order = orderRow.order;

    // Fetch order items with product images
    const itemsRows = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, data.orderId))
      .orderBy(asc(orderItems.createdAt));

    // Fetch images and inventory for each item
    const items = await Promise.all(
      itemsRows.map(async (item) => {
        let imageUrl: string | null = null;
        let inventoryData: typeof inventory.$inferSelect | null = null;

        // Try to get variant image first, then product image
        if (item.variantId) {
          const variantMediaRow = await db
            .select({
              media: media,
            })
            .from(productVariantMedia)
            .leftJoin(media, eq(productVariantMedia.mediaId, media.id))
            .where(
              and(
                eq(productVariantMedia.variantId, item.variantId),
                eq(productVariantMedia.isPrimary, true)
              )
            )
            .limit(1);

          imageUrl = variantMediaRow[0]?.media?.url || null;

          // Fetch inventory for variant
          const [inventoryRow] = await db
            .select()
            .from(inventory)
            .where(eq(inventory.variantId, item.variantId))
            .limit(1);

          inventoryData = inventoryRow || null;
        }

        // Fallback to product image if variant image not found
        if (!imageUrl && item.productId) {
          const productMediaRow = await db
            .select({
              media: media,
            })
            .from(productMedia)
            .leftJoin(media, eq(productMedia.mediaId, media.id))
            .where(
              and(
                eq(productMedia.productId, item.productId),
                eq(productMedia.isPrimary, true)
              )
            )
            .limit(1);

          imageUrl = productMediaRow[0]?.media?.url || null;
        }

        return {
          ...item,
          imageUrl,
          inventory: inventoryData,
        };
      })
    );

    // Fetch addresses
    const orderAddresses = await db
      .select()
      .from(addresses)
      .where(eq(addresses.orderId, data.orderId));

    const billingAddress = orderAddresses.find((a) => a.type === "billing") || null;
    const shippingAddress = orderAddresses.find((a) => a.type === "shipping") || null;

    return {
      ...order,
      customer: orderRow.customer || null,
      items,
      billingAddress,
      shippingAddress,
    };
  });

export const getOrderByIdQueryOptions = (orderId: string) => {
  return queryOptions({
    queryKey: [ORDERS_QUERY_KEY, "detail", orderId],
    queryFn: async () => {
      return await getOrderByIdServerFn({ data: { orderId } });
    },
  });
};

// Update order (add/remove items, update quantities)
export const updateOrderServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      orderId: z.string(),
      items: z.array(
        z.object({
          id: z.string().optional(), // existing item ID
          productId: z.string().optional().nullable(),
          variantId: z.string().optional().nullable(),
          title: z.string(),
          sku: z.string().optional().nullable(),
          quantity: z.number(),
          price: z.number(),
          variantTitle: z.string().optional().nullable(),
        })
      ),
      subtotal: z.number(),
      tax: z.number().optional().default(0),
      shipping: z.number().optional().default(0),
      discount: z.number().optional().default(0),
      total: z.number(),
      note: z.string().optional().nullable(),
    })
  )
  .handler(async ({ data }) => {
    // Get existing order items to calculate inventory changes
    const existingItems = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, data.orderId));

    // Create maps for comparison
    const existingItemsMap = new Map(
      existingItems.map((item) => [
        item.variantId || item.productId || item.id,
        item,
      ])
    );
    const newItemsMap = new Map(
      data.items.map((item) => [
        item.variantId || item.productId || item.id,
        item,
      ])
    );

    // Release inventory for removed items or decreased quantities
    for (const existingItem of existingItems) {
      const key = existingItem.variantId || existingItem.productId || existingItem.id;
      const newItem = newItemsMap.get(key);

      if (existingItem.variantId) {
        if (!newItem) {
          // Item was removed - release all reserved inventory
          const [currentInventory] = await db
            .select()
            .from(inventory)
            .where(eq(inventory.variantId, existingItem.variantId))
            .limit(1);

          if (currentInventory) {
            const newReserved = Math.max(
              0,
              currentInventory.reserved - existingItem.quantity
            );
            const newCommitted = Math.max(
              0,
              currentInventory.committed - existingItem.quantity
            );
            const newAvailable =
              currentInventory.onHand - newReserved - newCommitted;

            await db
              .update(inventory)
              .set({
                reserved: newReserved,
                committed: newCommitted,
                available: newAvailable,
                updatedAt: new Date(),
              })
              .where(eq(inventory.variantId, existingItem.variantId));

            await db.insert(inventoryTracking).values({
              id: nanoid(),
              variantId: existingItem.variantId,
              productId: existingItem.productId || "",
              type: "cancellation",
              quantity: -existingItem.quantity,
              previousAvailable: currentInventory.available,
              previousReserved: currentInventory.reserved,
              newAvailable: newAvailable,
              newReserved: newReserved,
              reason: `Order item removed: Order ${data.orderId}`,
              referenceType: "order",
              referenceId: data.orderId,
              userId: null,
            });
          }
        } else if (newItem.quantity !== existingItem.quantity) {
          // Quantity changed - adjust reserved inventory
          const quantityDiff = newItem.quantity - existingItem.quantity;
          const [currentInventory] = await db
            .select()
            .from(inventory)
            .where(eq(inventory.variantId, existingItem.variantId))
            .limit(1);

          if (currentInventory) {
            if (quantityDiff > 0) {
              // Quantity increased - need to reserve more
              const available =
                currentInventory.onHand -
                currentInventory.reserved -
                currentInventory.committed;
              if (available < quantityDiff) {
                throw new Error(
                  `Insufficient inventory for ${newItem.title}. Available: ${available}, Required: ${quantityDiff}`
                );
              }
            }

            const newReserved = Math.max(
              0,
              currentInventory.reserved + quantityDiff
            );
            const newCommitted = Math.max(
              0,
              currentInventory.committed + quantityDiff
            );
            const newAvailable =
              currentInventory.onHand - newReserved - newCommitted;

            await db
              .update(inventory)
              .set({
                reserved: newReserved,
                committed: newCommitted,
                available: newAvailable,
                updatedAt: new Date(),
              })
              .where(eq(inventory.variantId, existingItem.variantId));

            await db.insert(inventoryTracking).values({
              id: nanoid(),
              variantId: existingItem.variantId,
              productId: existingItem.productId || "",
              type: quantityDiff > 0 ? "reservation" : "cancellation",
              quantity: quantityDiff,
              previousAvailable: currentInventory.available,
              previousReserved: currentInventory.reserved,
              newAvailable: newAvailable,
              newReserved: newReserved,
              reason: `Order item quantity changed: Order ${data.orderId}`,
              referenceType: "order",
              referenceId: data.orderId,
              userId: null,
            });
          }
        }
      }
    }

    // Reserve inventory for new items or increased quantities
    for (const newItem of data.items) {
      if (newItem.variantId) {
        const key = newItem.variantId || newItem.productId || newItem.id;
        const existingItem = existingItemsMap.get(key);

        if (!existingItem) {
          // New item - reserve inventory
          const [currentInventory] = await db
            .select()
            .from(inventory)
            .where(eq(inventory.variantId, newItem.variantId))
            .limit(1);

          if (currentInventory) {
            const available =
              currentInventory.onHand -
              currentInventory.reserved -
              currentInventory.committed;
            if (available < newItem.quantity) {
              throw new Error(
                `Insufficient inventory for ${newItem.title}. Available: ${available}, Required: ${newItem.quantity}`
              );
            }

            const newReserved = currentInventory.reserved + newItem.quantity;
            const newCommitted = currentInventory.committed + newItem.quantity;
            const newAvailable =
              currentInventory.onHand - newReserved - newCommitted;

            await db
              .update(inventory)
              .set({
                reserved: newReserved,
                committed: newCommitted,
                available: newAvailable,
                updatedAt: new Date(),
              })
              .where(eq(inventory.variantId, newItem.variantId));

            await db.insert(inventoryTracking).values({
              id: nanoid(),
              variantId: newItem.variantId,
              productId: newItem.productId || "",
              type: "reservation",
              quantity: newItem.quantity,
              previousAvailable: currentInventory.available,
              previousReserved: currentInventory.reserved,
              newAvailable: newAvailable,
              newReserved: newReserved,
              reason: `Order item added: Order ${data.orderId}`,
              referenceType: "order",
              referenceId: data.orderId,
              userId: null,
            });
          }
        }
        // If item exists, quantity changes were handled above
      }
    }

    // Delete all existing items
    await db.delete(orderItems).where(eq(orderItems.orderId, data.orderId));

    // Insert new items
    if (data.items.length > 0) {
      const itemsToInsert = data.items.map((item) => ({
        id: item.id || nanoid(),
        orderId: data.orderId,
        productId: item.productId || null,
        variantId: item.variantId || null,
        title: item.title,
        sku: item.sku || null,
        quantity: item.quantity,
        price: item.price.toString(),
        total: (item.price * item.quantity).toString(),
        variantTitle: item.variantTitle || null,
      }));
      await db.insert(orderItems).values(itemsToInsert);
    }

    // Update order totals
    await db
      .update(orders)
      .set({
        subtotal: data.subtotal.toString(),
        tax: (data.tax || 0).toString(),
        shipping: (data.shipping || 0).toString(),
        discount: (data.discount || 0).toString(),
        total: data.total.toString(),
        note: data.note || null,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, data.orderId));

    // Fetch and return updated order
    return await getOrderByIdServerFn({ data: { orderId: data.orderId } });
  });

// Cancel order
export const cancelOrderServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      orderId: z.string(),
      reason: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    // Fetch order items before cancelling
    const orderData = await getOrderByIdServerFn({
      data: { orderId: data.orderId },
    });

    // Release reserved inventory for items with variants
    if (orderData.items) {
      for (const item of orderData.items) {
        if (item.variantId) {
          // Get current inventory
          const [currentInventory] = await db
            .select()
            .from(inventory)
            .where(eq(inventory.variantId, item.variantId))
            .limit(1);

          if (currentInventory) {
            // Calculate new values - release reserved and committed
            const newReserved = Math.max(0, currentInventory.reserved - item.quantity);
            const newCommitted = Math.max(0, currentInventory.committed - item.quantity);
            const newAvailable = currentInventory.onHand - newReserved - newCommitted;

            // Update inventory
            await db
              .update(inventory)
              .set({
                reserved: newReserved,
                committed: newCommitted,
                available: newAvailable,
                updatedAt: new Date(),
              })
              .where(eq(inventory.variantId, item.variantId));

            // Create inventory tracking record
            await db.insert(inventoryTracking).values({
              id: nanoid(),
              variantId: item.variantId,
              productId: item.productId || "",
              type: "cancellation",
              quantity: -item.quantity, // Negative because we're releasing
              previousAvailable: currentInventory.available,
              previousReserved: currentInventory.reserved,
              newAvailable: newAvailable,
              newReserved: newReserved,
              reason: `Order cancelled: ${orderData.orderNumber}`,
              referenceType: "order",
              referenceId: data.orderId,
              userId: null,
            });
          }
        }
      }
    }

    await db
      .update(orders)
      .set({
        status: "cancelled",
        financialStatus: "refunded", // Assuming refunded on cancellation
        fulfillmentStatus: "unfulfilled", // Reset fulfillment status
        cancelledAt: new Date(),
        cancelledReason: data.reason || null,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, data.orderId));

    // Fetch and return updated order
    return await getOrderByIdServerFn({ data: { orderId: data.orderId } });
  });

// Get inventory for variants
export const getInventoryForVariantsServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      variantIds: z.array(z.string()),
    })
  )
  .handler(async ({ data }) => {
    if (data.variantIds.length === 0) {
      return {};
    }

    const inventoryRecords = await db
      .select()
      .from(inventory)
      .where(
        or(...data.variantIds.map((id) => eq(inventory.variantId, id)))!
      );

    const inventoryMap: Record<string, typeof inventoryRecords[0]> = {};
    inventoryRecords.forEach((inv) => {
      inventoryMap[inv.variantId] = inv;
    });

    return inventoryMap;
  });

// Fulfill order - decrease inventory
export const fulfillOrderServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      orderId: z.string(),
    })
  )
  .handler(async ({ data }) => {
    // Fetch order with items
    const orderData = await getOrderByIdServerFn({
      data: { orderId: data.orderId },
    });

    if (!orderData) {
      throw new Error("Order not found");
    }

    if (orderData.fulfillmentStatus === "fulfilled") {
      throw new Error("Order is already fulfilled");
    }

    if (orderData.status === "cancelled") {
      throw new Error("Cannot fulfill a cancelled order");
    }

    // Process each order item
    for (const item of orderData.items) {
      if (!item.variantId) continue; // Skip items without variants

      // Get current inventory
      const [currentInventory] = await db
        .select()
        .from(inventory)
        .where(eq(inventory.variantId, item.variantId))
        .limit(1);

      if (!currentInventory) {
        throw new Error(
          `Inventory not found for variant ${item.variantId} (${item.title})`
        );
      }

      // Check if we have enough inventory
      if (currentInventory.onHand < item.quantity) {
        throw new Error(
          `Insufficient inventory for ${item.title}. Available: ${currentInventory.onHand}, Required: ${item.quantity}`
        );
      }

      // Calculate new values
      const newOnHand = currentInventory.onHand - item.quantity;
      const newReserved = Math.max(0, currentInventory.reserved - item.quantity);
      const newCommitted = Math.max(0, currentInventory.committed - item.quantity);
      const newAvailable = newOnHand - newReserved - newCommitted;

      // Update inventory
      await db
        .update(inventory)
        .set({
          onHand: newOnHand,
          reserved: newReserved,
          committed: newCommitted,
          available: newAvailable,
          updatedAt: new Date(),
        })
        .where(eq(inventory.variantId, item.variantId));

      // Create inventory tracking record
      await db.insert(inventoryTracking).values({
        id: nanoid(),
        variantId: item.variantId,
        productId: item.productId || "",
        type: "fulfillment",
        quantity: -item.quantity, // Negative because we're decreasing
        previousAvailable: currentInventory.available,
        previousReserved: currentInventory.reserved,
        newAvailable: newAvailable,
        newReserved: newReserved,
        reason: `Order fulfillment: ${orderData.orderNumber}`,
        referenceType: "order",
        referenceId: data.orderId,
        userId: null, // You can add user tracking later
      });
    }

    // Update order fulfillment status, payment status, and order status
    await db
      .update(orders)
      .set({
        status: "fulfilled",
        financialStatus: "paid",
        fulfillmentStatus: "fulfilled",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, data.orderId));

    // Update customer orders count and total spent if customer exists
    if (orderData.customerId) {
      const orderTotal = parseFloat(orderData.total);
      
      // Get current customer data
      const [currentCustomer] = await db
        .select()
        .from(customers)
        .where(eq(customers.id, orderData.customerId))
        .limit(1);

      if (currentCustomer) {
        const currentOrdersCount = currentCustomer.ordersCount || 0;
        const currentTotalSpent = parseFloat(currentCustomer.totalSpent || "0");
        
        // Increment orders count and add to total spent
        await db
          .update(customers)
          .set({
            ordersCount: currentOrdersCount + 1,
            totalSpent: (currentTotalSpent + orderTotal).toFixed(2),
            updatedAt: new Date(),
          })
          .where(eq(customers.id, orderData.customerId));
      }
    }

    // Fetch and return updated order
    return await getOrderByIdServerFn({ data: { orderId: data.orderId } });
  });

