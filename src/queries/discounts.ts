import { db, serializeData } from "@/db/db";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { nanoid } from "nanoid";
import { Decimal } from "@prisma/client/runtime/library";

export const DISCOUNTS_QUERY_KEY = "discounts";

// Types
export type DiscountType = "percentage" | "fixed";

export interface DiscountValidationResult {
	valid: boolean;
	error?: string;
	discount?: {
		id: string;
		code: string;
		type: string;
		value: number;
		maximumDiscount: number | null;
	};
}

// Get all discounts with optional filters
export const getAllDiscountsServerFn = createServerFn({ method: "GET" })
	.inputValidator(
		z.object({
			search: z.string().optional(),
			status: z.enum(["all", "active", "inactive", "expired"]).optional(),
			type: z.enum(["all", "percentage", "fixed"]).optional(),
		})
	)
	.handler(async ({ data }) => {
		const { search, status, type } = data;
		const now = new Date();

		const where: any = {};

		// Search by code
		if (search) {
			where.code = { contains: search };
		}

		// Filter by type
		if (type && type !== "all") {
			where.type = type;
		}

		// Filter by status
		if (status && status !== "all") {
			if (status === "active") {
				where.active = true;
				where.OR = [
					{ endsAt: null },
					{ endsAt: { gte: now } },
				];
			} else if (status === "inactive") {
				where.active = false;
			} else if (status === "expired") {
				where.endsAt = { lt: now };
			}
		}

		const discounts = await db.discounts.findMany({
			where,
			orderBy: { createdAt: "desc" },
		});

		return serializeData(discounts);
	});

// Get single discount by ID
export const getDiscountByIdServerFn = createServerFn({ method: "GET" })
	.inputValidator(z.object({ id: z.string() }))
	.handler(async ({ data }) => {
		const discount = await db.discounts.findUnique({
			where: { id: data.id },
		});

		if (!discount) {
			throw new Error("Popust nije pronađen");
		}

		return serializeData(discount);
	});

// Create new discount
export const createDiscountServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			code: z.string().min(1, "Kod je obavezan"),
			type: z.enum(["percentage", "fixed"]),
			value: z.number().positive("Vrijednost mora biti pozitivna"),
			minimumPurchase: z.number().nullable().optional(),
			maximumDiscount: z.number().nullable().optional(),
			usageLimit: z.number().nullable().optional(),
			startsAt: z.string().nullable().optional(),
			endsAt: z.string().nullable().optional(),
			active: z.boolean().default(true),
		})
	)
	.handler(async ({ data }) => {
		// Check if code already exists
		const existingDiscount = await db.discounts.findUnique({
			where: { code: data.code.toUpperCase() },
		});

		if (existingDiscount) {
			throw new Error("Kod za popust već postoji");
		}

		// Validate percentage value
		if (data.type === "percentage" && data.value > 100) {
			throw new Error("Postotak ne može biti veći od 100");
		}

		const discount = await db.discounts.create({
			data: {
				id: nanoid(),
				code: data.code.toUpperCase(),
				type: data.type,
				value: new Decimal(data.value),
				minimumPurchase: data.minimumPurchase
					? new Decimal(data.minimumPurchase)
					: null,
				maximumDiscount: data.maximumDiscount
					? new Decimal(data.maximumDiscount)
					: null,
				usageLimit: data.usageLimit || null,
				startsAt: data.startsAt ? new Date(data.startsAt) : null,
				endsAt: data.endsAt ? new Date(data.endsAt) : null,
				active: data.active,
			},
		});

		return serializeData(discount);
	});

// Update existing discount
export const updateDiscountServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			id: z.string(),
			code: z.string().min(1, "Kod je obavezan"),
			type: z.enum(["percentage", "fixed"]),
			value: z.number().positive("Vrijednost mora biti pozitivna"),
			minimumPurchase: z.number().nullable().optional(),
			maximumDiscount: z.number().nullable().optional(),
			usageLimit: z.number().nullable().optional(),
			startsAt: z.string().nullable().optional(),
			endsAt: z.string().nullable().optional(),
			active: z.boolean(),
		})
	)
	.handler(async ({ data }) => {
		// Check if code is unique (excluding current discount)
		const existingDiscount = await db.discounts.findFirst({
			where: {
				code: data.code.toUpperCase(),
				NOT: { id: data.id },
			},
		});

		if (existingDiscount) {
			throw new Error("Kod za popust već postoji");
		}

		// Validate percentage value
		if (data.type === "percentage" && data.value > 100) {
			throw new Error("Postotak ne može biti veći od 100");
		}

		const discount = await db.discounts.update({
			where: { id: data.id },
			data: {
				code: data.code.toUpperCase(),
				type: data.type,
				value: new Decimal(data.value),
				minimumPurchase: data.minimumPurchase
					? new Decimal(data.minimumPurchase)
					: null,
				maximumDiscount: data.maximumDiscount
					? new Decimal(data.maximumDiscount)
					: null,
				usageLimit: data.usageLimit || null,
				startsAt: data.startsAt ? new Date(data.startsAt) : null,
				endsAt: data.endsAt ? new Date(data.endsAt) : null,
				active: data.active,
			},
		});

		return serializeData(discount);
	});

// Delete discount
export const deleteDiscountServerFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ id: z.string() }))
	.handler(async ({ data }) => {
		await db.discounts.delete({
			where: { id: data.id },
		});

		return { success: true };
	});

// Get discount usage history (orders that used this discount)
export const getDiscountUsageHistoryServerFn = createServerFn({ method: "GET" })
	.inputValidator(z.object({ discountId: z.string() }))
	.handler(async ({ data }) => {
		const orders = await db.orders.findMany({
			where: { discountId: data.discountId },
			select: {
				id: true,
				orderNumber: true,
				createdAt: true,
				subtotal: true,
				discount: true,
				total: true,
				customer: {
					select: {
						id: true,
						firstName: true,
						lastName: true,
						email: true,
					},
				},
			},
			orderBy: { createdAt: "desc" },
		});

		return serializeData(orders);
	});

// Validate discount code for checkout
export const validateDiscountCodeServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			code: z.string(),
			cartSubtotal: z.number(),
		})
	)
	.handler(async ({ data }): Promise<DiscountValidationResult> => {
		const { code, cartSubtotal } = data;
		const now = new Date();

		// Find discount by code (case-insensitive)
		const discount = await db.discounts.findUnique({
			where: { code: code.toUpperCase() },
		});

		// Check if discount exists
		if (!discount) {
			return { valid: false, error: "Kod za popust ne postoji" };
		}

		// Check if discount is active
		if (!discount.active) {
			return { valid: false, error: "Kod za popust nije aktivan" };
		}

		// Check if discount has started
		if (discount.startsAt && discount.startsAt > now) {
			return { valid: false, error: "Kod za popust još nije aktivan" };
		}

		// Check if discount has expired
		if (discount.endsAt && discount.endsAt < now) {
			return { valid: false, error: "Kod za popust je istekao" };
		}

		// Check usage limit
		if (
			discount.usageLimit !== null &&
			discount.usageCount >= discount.usageLimit
		) {
			return {
				valid: false,
				error: "Kod za popust je iskorišten maksimalan broj puta",
			};
		}

		// Check minimum purchase
		if (discount.minimumPurchase !== null) {
			const minPurchase = Number(discount.minimumPurchase);
			if (cartSubtotal < minPurchase) {
				return {
					valid: false,
					error: `Minimalna vrijednost narudžbe je ${minPurchase.toFixed(2)} KM`,
				};
			}
		}

		// Discount is valid
		return {
			valid: true,
			discount: {
				id: discount.id,
				code: discount.code,
				type: discount.type,
				value: Number(discount.value),
				maximumDiscount: discount.maximumDiscount
					? Number(discount.maximumDiscount)
					: null,
			},
		};
	});

// Apply discount to cart
export const applyDiscountToCartServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			cartId: z.string(),
			discountId: z.string(),
		})
	)
	.handler(async ({ data }) => {
		const cart = await db.cart.update({
			where: { id: data.cartId },
			data: { discountId: data.discountId },
		});

		return serializeData(cart);
	});

// Remove discount from cart
export const removeDiscountFromCartServerFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ cartId: z.string() }))
	.handler(async ({ data }) => {
		const cart = await db.cart.update({
			where: { id: data.cartId },
			data: { discountId: null },
		});

		return serializeData(cart);
	});

// Increment discount usage (called when order is created)
export const incrementDiscountUsageServerFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ discountId: z.string() }))
	.handler(async ({ data }) => {
		await db.discounts.update({
			where: { id: data.discountId },
			data: { usageCount: { increment: 1 } },
		});

		return { success: true };
	});
