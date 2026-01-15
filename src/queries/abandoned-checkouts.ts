import { db, serializeData } from "@/db/db";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { nanoid } from "nanoid";
import { sendAbandonedCheckoutEmail } from "@/server/email.server";

export const ABANDONED_CHECKOUTS_QUERY_KEY = "abandoned_checkouts";

// Cart item schema for abandoned checkout
const cartItemSchema = z.object({
  productId: z.string().nullable().optional(),
  variantId: z.string().nullable().optional(),
  title: z.string(),
  sku: z.string().nullable().optional(),
  quantity: z.number(),
  price: z.number(),
  variantTitle: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
});

// Address schema
const addressSchema = z.object({
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
});

export type AbandonedCartItem = z.infer<typeof cartItemSchema>;

// Capture abandoned checkout on email blur
export const captureAbandonedCheckoutServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().email(),
      cartData: z.array(cartItemSchema),
      customerName: z.string().nullable().optional(),
      phone: z.string().nullable().optional(),
      shippingAddress: addressSchema.nullable().optional(),
      billingAddress: addressSchema.nullable().optional(),
      subtotal: z.number(),
      checkoutUrl: z.string().nullable().optional(),
    })
  )
  .handler(async ({ data }) => {
    const normalizedEmail = data.email.toLowerCase().trim();

    // Check if there's already a pending abandoned checkout for this email
    const existing = await db.abandoned_checkouts.findFirst({
      where: {
        email: normalizedEmail,
        status: { in: ["pending", "email_sent"] },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Calculate first email time (1 hour from now)
    const nextEmailAt = new Date();
    nextEmailAt.setHours(nextEmailAt.getHours() + 1);

    if (existing) {
      // Update existing abandoned checkout with latest data
      // Only reset nextEmailAt if no email has been sent yet
      await db.abandoned_checkouts.update({
        where: { id: existing.id },
        data: {
          cartData: data.cartData,
          customerName: data.customerName || existing.customerName,
          phone: data.phone || existing.phone,
          shippingAddress: data.shippingAddress || undefined,
          billingAddress: data.billingAddress || undefined,
          subtotal: data.subtotal.toString(),
          checkoutUrl: data.checkoutUrl || existing.checkoutUrl,
          // Reset the timer if they're still browsing (only if no email sent yet)
          nextEmailAt: existing.emailSentCount === 0 ? nextEmailAt : existing.nextEmailAt,
          updatedAt: new Date(),
        },
      });

      return { success: true, id: existing.id, updated: true };
    }

    // Create new abandoned checkout
    const id = nanoid();
    await db.abandoned_checkouts.create({
      data: {
        id,
        email: normalizedEmail,
        cartData: data.cartData,
        customerName: data.customerName || null,
        phone: data.phone || null,
        shippingAddress: data.shippingAddress || undefined,
        billingAddress: data.billingAddress || undefined,
        subtotal: data.subtotal.toString(),
        checkoutUrl: data.checkoutUrl || null,
        status: "pending",
        emailSentCount: 0,
        nextEmailAt, // First email in 1 hour
        expiresAt,
      },
    });

    return { success: true, id, updated: false };
  });

// Mark abandoned checkout as recovered when order is created
export const markCheckoutRecoveredServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().email(),
      orderId: z.string(),
    })
  )
  .handler(async ({ data }) => {
    const normalizedEmail = data.email.toLowerCase().trim();

    // Find pending/email_sent abandoned checkout for this email
    const abandoned = await db.abandoned_checkouts.findFirst({
      where: {
        email: normalizedEmail,
        status: { in: ["pending", "email_sent"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (abandoned) {
      await db.abandoned_checkouts.update({
        where: { id: abandoned.id },
        data: {
          status: "recovered",
          recoveredAt: new Date(),
          recoveredOrderId: data.orderId,
          nextEmailAt: null, // Clear scheduled email
          updatedAt: new Date(),
        },
      });

      return { success: true, recoveredId: abandoned.id };
    }

    return { success: true, recoveredId: null };
  });

// Get abandoned checkouts for admin panel
export const getAbandonedCheckoutsServerFn = createServerFn({ method: "POST" })
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
    type WhereConditions = {
      OR?: Array<{ email?: { contains: string }; customerName?: { contains: string } }>;
      status?: string;
    };
    const whereConditions: WhereConditions = {};

    if (search) {
      whereConditions.OR = [
        { email: { contains: search } },
        { customerName: { contains: search } },
      ];
    }

    if (status) {
      whereConditions.status = status;
    }

    const checkouts = await db.abandoned_checkouts.findMany({
      where: Object.keys(whereConditions).length > 0 ? whereConditions : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
      include: {
        recoveredOrder: true,
      },
    });

    const totalCount = await db.abandoned_checkouts.count({
      where: Object.keys(whereConditions).length > 0 ? whereConditions : undefined,
    });

    const hasNextPage = page * limit < totalCount;
    const hasPreviousPage = page > 1;

    return serializeData({
      data: checkouts,
      total: totalCount,
      hasNextPage,
      hasPreviousPage,
      nextCursor: hasNextPage ? page + 1 : null,
      previousCursor: hasPreviousPage ? page - 1 : null,
    });
  });

export const getAbandonedCheckoutsQueryOptions = (opts: {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}) => {
  return queryOptions({
    queryKey: [ABANDONED_CHECKOUTS_QUERY_KEY, opts],
    queryFn: async () => {
      return await getAbandonedCheckoutsServerFn({ data: opts });
    },
  });
};

// Get abandoned checkout statistics
export const getAbandonedCheckoutStatsServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({}).optional())
  .handler(async () => {
    // Total abandoned checkouts
    const totalAbandoned = await db.abandoned_checkouts.count();

    // Checkouts with at least one email sent
    const emailsSent = await db.abandoned_checkouts.count({
      where: { emailSentCount: { gt: 0 } },
    });

    // Recovered checkouts
    const recovered = await db.abandoned_checkouts.count({
      where: { status: "recovered" },
    });

    // Recovery rate
    const recoveryRate = emailsSent > 0 ? (recovered / emailsSent) * 100 : 0;

    // Revenue recovered (sum of recovered order totals)
    const recoveredCheckouts = await db.abandoned_checkouts.findMany({
      where: { status: "recovered" },
      include: { recoveredOrder: true },
    });

    const revenueRecovered = recoveredCheckouts.reduce((sum, checkout) => {
      if (checkout.recoveredOrder) {
        return sum + parseFloat(String(checkout.recoveredOrder.total));
      }
      return sum;
    }, 0);

    // Pending checkouts (can still be recovered)
    const pending = await db.abandoned_checkouts.count({
      where: { status: "pending" },
    });

    // Checkouts with email sent but not recovered yet
    const awaitingRecovery = await db.abandoned_checkouts.count({
      where: { status: "email_sent" },
    });

    return serializeData({
      totalAbandoned,
      emailsSent,
      recovered,
      recoveryRate: Math.round(recoveryRate * 10) / 10,
      revenueRecovered: Math.round(revenueRecovered * 100) / 100,
      pending,
      awaitingRecovery,
    });
  });

export const getAbandonedCheckoutStatsQueryOptions = () => {
  return queryOptions({
    queryKey: [ABANDONED_CHECKOUTS_QUERY_KEY, "stats"],
    queryFn: async () => {
      return await getAbandonedCheckoutStatsServerFn();
    },
  });
};

// Get single abandoned checkout by ID
export const getAbandonedCheckoutByIdServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const checkout = await db.abandoned_checkouts.findUnique({
      where: { id: data.id },
      include: { recoveredOrder: true },
    });

    if (!checkout) {
      throw new Error("Abandoned checkout not found");
    }

    return serializeData(checkout);
  });

export const getAbandonedCheckoutByIdQueryOptions = (id: string) => {
  return queryOptions({
    queryKey: [ABANDONED_CHECKOUTS_QUERY_KEY, "detail", id],
    queryFn: async () => {
      return await getAbandonedCheckoutByIdServerFn({ data: { id } });
    },
  });
};

// Manually send abandoned checkout email
export const sendAbandonedCheckoutEmailServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    const checkout = await db.abandoned_checkouts.findUnique({
      where: { id: data.id },
    });

    if (!checkout) {
      throw new Error("Abandoned checkout not found");
    }

    if (checkout.status === "recovered") {
      throw new Error("Cannot send email for recovered checkout");
    }

    if (checkout.status === "expired") {
      throw new Error("Cannot send email for expired checkout");
    }

    // Send the email
    await sendAbandonedCheckoutEmail(
      checkout.email,
      data.id,
      checkout.cartData as AbandonedCartItem[],
      parseFloat(String(checkout.subtotal)),
      checkout.customerName || undefined,
      checkout.checkoutUrl || undefined
    );

    const now = new Date();
    const newEmailCount = checkout.emailSentCount + 1;

    // Calculate next email time based on count
    let nextEmailAt: Date | null = null;
    if (newEmailCount === 1) {
      nextEmailAt = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    } else if (newEmailCount === 2) {
      nextEmailAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
    }

    // Update checkout status and email count
    await db.abandoned_checkouts.update({
      where: { id: data.id },
      data: {
        status: "email_sent",
        emailSentAt: now,
        emailSentCount: newEmailCount,
        nextEmailAt,
        updatedAt: now,
      },
    });

    return { success: true };
  });

// Mark abandoned checkout as expired
export const expireAbandonedCheckoutServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string() }))
  .handler(async ({ data }) => {
    await db.abandoned_checkouts.update({
      where: { id: data.id },
      data: {
        status: "expired",
        nextEmailAt: null,
        updatedAt: new Date(),
      },
    });

    return { success: true };
  });

// Process abandoned checkouts for cron job
// Uses nextEmailAt field for precise timing - run this every 5 minutes
export const processAbandonedCheckoutsServerFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      secret: z.string(),
    })
  )
  .handler(async ({ data }) => {
    // Verify cron secret
    const expectedSecret = process.env.CRON_SECRET || "default_cron_secret";
    if (data.secret !== expectedSecret) {
      throw new Error("Invalid cron secret");
    }

    const now = new Date();
    let processed = 0;
    let sent = 0;
    let errors = 0;

    // Find all checkouts where it's time to send an email
    const eligibleCheckouts = await db.abandoned_checkouts.findMany({
      where: {
        status: { in: ["pending", "email_sent"] },
        nextEmailAt: { lte: now },
        emailSentCount: { lt: 3 },
        expiresAt: { gt: now },
      },
      take: 50, // Process in batches
      orderBy: { nextEmailAt: "asc" }, // Process oldest first
    });

    for (const checkout of eligibleCheckouts) {
      processed++;
      try {
        await sendAbandonedCheckoutEmail(
          checkout.email,
          checkout.id,
          checkout.cartData as AbandonedCartItem[],
          parseFloat(String(checkout.subtotal)),
          checkout.customerName || undefined,
          checkout.checkoutUrl || undefined
        );

        const newEmailCount = checkout.emailSentCount + 1;

        // Calculate next email time based on count
        // 1st email: at 1h (already sent), next at 24h from creation (+23h)
        // 2nd email: at 24h (already sent), next at 72h from creation (+48h)
        // 3rd email: at 72h (already sent), no more emails
        let nextEmailAt: Date | null = null;
        if (newEmailCount === 1) {
          // Schedule 2nd email 23 hours from now (24h total from creation)
          nextEmailAt = new Date(now.getTime() + 23 * 60 * 60 * 1000);
        } else if (newEmailCount === 2) {
          // Schedule 3rd email 48 hours from now (72h total from creation)
          nextEmailAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        }
        // If newEmailCount === 3, nextEmailAt stays null (done)

        await db.abandoned_checkouts.update({
          where: { id: checkout.id },
          data: {
            status: "email_sent",
            emailSentAt: now,
            emailSentCount: newEmailCount,
            nextEmailAt,
            updatedAt: now,
          },
        });
        sent++;
      } catch (error) {
        console.error(`Failed to send email for checkout ${checkout.id}:`, error);
        errors++;
      }
    }

    // Mark expired checkouts
    await db.abandoned_checkouts.updateMany({
      where: {
        status: { in: ["pending", "email_sent"] },
        expiresAt: { lt: now },
      },
      data: {
        status: "expired",
        nextEmailAt: null,
        updatedAt: now,
      },
    });

    return {
      success: true,
      processed,
      sent,
      errors,
      timestamp: now.toISOString(),
    };
  });
