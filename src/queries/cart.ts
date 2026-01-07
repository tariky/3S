import { db } from "@/db/db";
import { queryOptions, mutationOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import {
	cart,
	cartItems,
	products,
	productVariants,
	productMedia,
	media,
	inventory,
	customers,
	user,
} from "@/db/schema";
import { eq, and, or, desc } from "drizzle-orm";
import { z } from "zod";
import { nanoid } from "nanoid";
import { auth } from "@/lib/auth";

export const CART_QUERY_KEY = "cart";

// Helper to get or create customer from user
async function getOrCreateCustomer(userId: string) {
	// Check if customer exists with user's email
	const [authUser] = await db
		.select()
		.from(user)
		.where(eq(user.id, userId))
		.limit(1);

	if (!authUser) {
		return null;
	}

	// Check if customer already exists
	const [existingCustomer] = await db
		.select()
		.from(customers)
		.where(eq(customers.email, authUser.email))
		.limit(1);

	if (existingCustomer) {
		return existingCustomer.id;
	}

	// Create new customer from user
	const customerId = nanoid();
	const nameParts = authUser.name?.split(" ") || [];
	const firstName = nameParts[0] || null;
	const lastName = nameParts.slice(1).join(" ") || null;

	await db.insert(customers).values({
		id: customerId,
		email: authUser.email,
		firstName,
		lastName,
		phone: authUser.phoneNumber || null,
		hasEmail: true,
		acceptsMarketing: false,
	});

	return customerId;
}

// Helper to get or create cart
async function getOrCreateCart(
	userId: string | null,
	sessionId: string | null,
	headers: Headers
) {
	// If user is logged in, get or create customer record
	let customerId: string | null = null;
	if (userId) {
		customerId = await getOrCreateCustomer(userId);
	}
	// Try to find existing cart
	const conditions = [];
	if (customerId) {
		conditions.push(eq(cart.customerId, customerId));
	}
	if (sessionId) {
		conditions.push(eq(cart.sessionId, sessionId));
	}

	let existingCart = null;
	if (conditions.length > 0) {
		const carts = await db
			.select()
			.from(cart)
			.where(conditions.length === 1 ? conditions[0] : or(...conditions)!)
			.orderBy(desc(cart.createdAt))
			.limit(1);

		existingCart = carts[0] || null;
	}

	if (existingCart) {
		return existingCart;
	}

	// Create new cart
	const cartId = nanoid();
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + 30); // Cart expires in 30 days

	await db.insert(cart).values({
		id: cartId,
		customerId: customerId || null,
		sessionId: sessionId || null,
		expiresAt,
	});

	const [newCart] = await db
		.select()
		.from(cart)
		.where(eq(cart.id, cartId))
		.limit(1);

	return newCart!;
}

// Get cart with items
export const getCartServerFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ sessionId: z.string().optional() }))
	.handler(async ({ data, request }) => {
		const headers = request.headers;
		const session = await auth.api.getSession({ headers });
		const userId = session?.user?.id || null;
		const sessionId = data.sessionId || null;

		const cartData = await getOrCreateCart(userId, sessionId, headers);

		// Get cart items with product and variant details
		const items = await db
			.select({
				cartItem: cartItems,
				product: products,
				variant: productVariants,
			})
			.from(cartItems)
			.leftJoin(products, eq(cartItems.productId, products.id))
			.leftJoin(productVariants, eq(cartItems.variantId, productVariants.id))
			.where(eq(cartItems.cartId, cartData.id))
			.orderBy(cartItems.createdAt);

		// Get images and inventory for each item
		const itemsWithDetails = await Promise.all(
			items.map(async (item) => {
				let imageUrl: string | null = null;
				let inventoryData: typeof inventory.$inferSelect | null = null;

				// Try to get variant image first, then product image
				if (item.variant?.id) {
					const variantMediaRow = await db
						.select({
							media: media,
						})
						.from(productMedia)
						.leftJoin(media, eq(productMedia.mediaId, media.id))
						.where(
							and(
								eq(productMedia.productId, item.product?.id || ""),
								eq(productMedia.isPrimary, true)
							)
						)
						.limit(1);

					imageUrl = variantMediaRow[0]?.media?.url || null;

					// Get inventory for variant
					const [inventoryRow] = await db
						.select()
						.from(inventory)
						.where(eq(inventory.variantId, item.variant!.id))
						.limit(1);

					inventoryData = inventoryRow || null;
				}

				// Fallback to product image
				if (!imageUrl && item.product?.id) {
					const productMediaRow = await db
						.select({
							media: media,
						})
						.from(productMedia)
						.leftJoin(media, eq(productMedia.mediaId, media.id))
						.where(
							and(
								eq(productMedia.productId, item.product.id),
								eq(productMedia.isPrimary, true)
							)
						)
						.limit(1);

					imageUrl = productMediaRow[0]?.media?.url || null;
				}

				return {
					...item.cartItem,
					product: item.product,
					variant: item.variant,
					image: imageUrl,
					inventory: inventoryData,
				};
			})
		);

		return {
			cart: cartData,
			items: itemsWithDetails,
		};
	});

export const getCartQueryOptions = (sessionId?: string) => {
	return queryOptions({
		queryKey: [CART_QUERY_KEY, sessionId],
		queryFn: async () => {
			return await getCartServerFn({ data: { sessionId } });
		},
	});
};

// Add item to cart
export const addToCartServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			productId: z.string(),
			variantId: z.string().optional(),
			quantity: z.number().int().positive().default(1),
			sessionId: z.string().optional(),
		})
	)
	.handler(async ({ data, request }) => {
		const headers = request.headers;
		const session = await auth.api.getSession({ headers });
		const userId = session?.user?.id || null;
		const sessionId = data.sessionId || null;

		const cartData = await getOrCreateCart(userId, sessionId, headers);

		// Check if item already exists in cart
		const existingItem = await db
			.select()
			.from(cartItems)
			.where(
				and(
					eq(cartItems.cartId, cartData.id),
					eq(cartItems.productId, data.productId),
					data.variantId
						? eq(cartItems.variantId, data.variantId)
						: eq(cartItems.variantId, null as any)
				)
			)
			.limit(1);

		// Check inventory if variant exists
		if (data.variantId) {
			const [inventoryData] = await db
				.select()
				.from(inventory)
				.where(eq(inventory.variantId, data.variantId))
				.limit(1);

			if (inventoryData) {
				const available = inventoryData.available || 0;
				const requestedQuantity = existingItem.length > 0
					? existingItem[0].quantity + data.quantity
					: data.quantity;

				if (requestedQuantity > available) {
					throw new Error(
						`Nema dovoljno na zalihi. Dostupno: ${available} kom`
					);
				}
			}
		}

		if (existingItem.length > 0) {
			// Update quantity
			await db
				.update(cartItems)
				.set({
					quantity: existingItem[0].quantity + data.quantity,
					updatedAt: new Date(),
				})
				.where(eq(cartItems.id, existingItem[0].id));
		} else {
			// Add new item
			const itemId = nanoid();
			await db.insert(cartItems).values({
				id: itemId,
				cartId: cartData.id,
				productId: data.productId,
				variantId: data.variantId || null,
				quantity: data.quantity,
			});
		}

		// Return updated cart
		return await getCartServerFn({ data: { sessionId } });
	});

export const addToCartMutationOptions = (sessionId?: string) => {
	return mutationOptions({
		mutationFn: async (data: {
			productId: string;
			variantId?: string;
			quantity?: number;
		}) => {
			return await addToCartServerFn({
				data: { ...data, sessionId, quantity: data.quantity || 1 },
			});
		},
	});
};

// Update cart item quantity
export const updateCartItemServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			itemId: z.string(),
			quantity: z.number().int().positive(),
			sessionId: z.string().optional(),
		})
	)
	.handler(async ({ data, request }) => {
		const headers = request.headers;
		const session = await auth.api.getSession({ headers });
		const userId = session?.user?.id || null;
		const sessionId = data.sessionId || null;

		// Verify cart ownership
		const cartData = await getOrCreateCart(userId, sessionId, headers);

		const [item] = await db
			.select()
			.from(cartItems)
			.where(eq(cartItems.id, data.itemId))
			.limit(1);

		if (!item || item.cartId !== cartData.id) {
			throw new Error("Cart item not found");
		}

		// Check inventory if quantity is being increased and variant exists
		if (data.quantity > item.quantity && item.variantId) {
			const [inventoryData] = await db
				.select()
				.from(inventory)
				.where(eq(inventory.variantId, item.variantId))
				.limit(1);

			if (inventoryData) {
				const available = inventoryData.available || 0;
				if (data.quantity > available) {
					throw new Error(
						`Nema dovoljno na zalihi. Dostupno: ${available} kom`
					);
				}
			}
		}

		if (data.quantity === 0) {
			// Remove item
			await db.delete(cartItems).where(eq(cartItems.id, data.itemId));
		} else {
			// Update quantity
			await db
				.update(cartItems)
				.set({
					quantity: data.quantity,
					updatedAt: new Date(),
				})
				.where(eq(cartItems.id, data.itemId));
		}

		return await getCartServerFn({ data: { sessionId } });
	});

export const updateCartItemMutationOptions = (sessionId?: string) => {
	return mutationOptions({
		mutationFn: async (data: { itemId: string; quantity: number }) => {
			return await updateCartItemServerFn({
				data: { ...data, sessionId },
			});
		},
	});
};

// Remove item from cart
export const removeFromCartServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			itemId: z.string(),
			sessionId: z.string().optional(),
		})
	)
	.handler(async ({ data, request }) => {
		const headers = request.headers;
		const session = await auth.api.getSession({ headers });
		const userId = session?.user?.id || null;
		const sessionId = data.sessionId || null;

		// Verify cart ownership
		const cartData = await getOrCreateCart(userId, sessionId, headers);

		const [item] = await db
			.select()
			.from(cartItems)
			.where(eq(cartItems.id, data.itemId))
			.limit(1);

		if (!item || item.cartId !== cartData.id) {
			throw new Error("Cart item not found");
		}

		await db.delete(cartItems).where(eq(cartItems.id, data.itemId));

		return await getCartServerFn({ data: { sessionId } });
	});

export const removeFromCartMutationOptions = (sessionId?: string) => {
	return mutationOptions({
		mutationFn: async (data: { itemId: string }) => {
			return await removeFromCartServerFn({
				data: { ...data, sessionId },
			});
		},
	});
};

// Merge guest cart with user cart (called after login/signup)
export const mergeCartsServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			guestSessionId: z.string(),
			userId: z.string(),
		})
	)
	.handler(async ({ data }) => {
		// Get guest cart
		const [guestCart] = await db
			.select()
			.from(cart)
			.where(eq(cart.sessionId, data.guestSessionId))
			.limit(1);

		if (!guestCart) {
			// No guest cart to merge
			return await getCartServerFn({ data: {} });
		}

		// Get or create user cart
		const userCart = await getOrCreateCart(data.userId, null, new Headers());

		// Get guest cart items
		const guestItems = await db
			.select()
			.from(cartItems)
			.where(eq(cartItems.cartId, guestCart.id));

		// Get user cart items
		const userItems = await db
			.select()
			.from(cartItems)
			.where(eq(cartItems.cartId, userCart.id));

		// Merge items
		for (const guestItem of guestItems) {
			// Check if same product/variant exists in user cart
			const existingUserItem = userItems.find(
				(item) =>
					item.productId === guestItem.productId &&
					item.variantId === guestItem.variantId
			);

			if (existingUserItem) {
				// Update quantity
				await db
					.update(cartItems)
					.set({
						quantity: existingUserItem.quantity + guestItem.quantity,
						updatedAt: new Date(),
					})
					.where(eq(cartItems.id, existingUserItem.id));
			} else {
				// Move item to user cart
				await db
					.update(cartItems)
					.set({
						cartId: userCart.id,
						updatedAt: new Date(),
					})
					.where(eq(cartItems.id, guestItem.id));
			}
		}

		// Delete guest cart
		await db.delete(cart).where(eq(cart.id, guestCart.id));

		// Return merged cart
		return await getCartServerFn({ data: {} });
	});

export const mergeCartsMutationOptions = () => {
	return mutationOptions({
		mutationFn: async (data: { guestSessionId: string; userId: string }) => {
			return await mergeCartsServerFn({ data });
		},
	});
};

// Clear cart (delete all items and cart)
export const clearCartServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			sessionId: z.string().optional(),
		})
	)
	.handler(async ({ data, request }) => {
		const headers = request.headers;
		const session = await auth.api.getSession({ headers });
		const userId = session?.user?.id || null;
		const sessionId = data.sessionId || null;

		const cartData = await getOrCreateCart(userId, sessionId, headers);

		// Delete all cart items
		await db.delete(cartItems).where(eq(cartItems.cartId, cartData.id));

		// Delete the cart itself
		await db.delete(cart).where(eq(cart.id, cartData.id));

		return { success: true };
	});

export const clearCartMutationOptions = (sessionId?: string) => {
	return mutationOptions({
		mutationFn: async () => {
			return await clearCartServerFn({ data: { sessionId } });
		},
	});
};

