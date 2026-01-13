import { db, serializeData } from "@/db/db";
import { queryOptions, mutationOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { nanoid } from "nanoid";
import { auth } from "@/lib/auth";
import type { Inventory } from "@prisma/client";
import { isGorseConfigured, insertFeedback } from "@/lib/gorse";

export const CART_QUERY_KEY = "cart";

// Helper to get or create customer from user
async function getOrCreateCustomer(userId: string) {
	// Check if customer exists with user's email
	const authUser = await db.user.findUnique({
		where: { id: userId },
	});

	if (!authUser) {
		return null;
	}

	// Check if customer already exists
	const existingCustomer = await db.customer.findUnique({
		where: { email: authUser.email },
	});

	if (existingCustomer) {
		return existingCustomer.id;
	}

	// Create new customer from user
	const customerId = nanoid();
	const nameParts = authUser.name?.split(" ") || [];
	const firstName = nameParts[0] || null;
	const lastName = nameParts.slice(1).join(" ") || null;

	await db.customer.create({
		data: {
			id: customerId,
			email: authUser.email,
			firstName,
			lastName,
			phone: authUser.phoneNumber || null,
			hasEmail: true,
			acceptsMarketing: false,
		},
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
	const conditions: { customerId?: string; sessionId?: string }[] = [];
	if (customerId) {
		conditions.push({ customerId });
	}
	if (sessionId) {
		conditions.push({ sessionId });
	}

	let existingCart = null;
	if (conditions.length > 0) {
		existingCart = await db.cart.findFirst({
			where: conditions.length === 1 ? conditions[0] : { OR: conditions },
			orderBy: { createdAt: "desc" },
		});
	}

	if (existingCart) {
		return existingCart;
	}

	// Create new cart
	const cartId = nanoid();
	const expiresAt = new Date();
	expiresAt.setDate(expiresAt.getDate() + 30); // Cart expires in 30 days

	const newCart = await db.cart.create({
		data: {
			id: cartId,
			customerId: customerId || null,
			sessionId: sessionId || null,
			expiresAt,
		},
	});

	return newCart;
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
		const items = await db.cartItem.findMany({
			where: { cartId: cartData.id },
			include: {
				product: true,
				variant: true,
			},
			orderBy: { createdAt: "asc" },
		});

		// Get images, inventory, and variant options for each item
		const itemsWithDetails = await Promise.all(
			items.map(async (item) => {
				let imageUrl: string | null = null;
				let inventoryData: Inventory | null = null;
				let variantOptions: { optionName: string; optionValue: string }[] = [];

				// Try to get variant image first, then product image
				if (item.variant?.id) {
					const variantMediaRow = await db.productMedia.findFirst({
						where: {
							productId: item.product?.id || "",
							isPrimary: true,
						},
						include: {
							media: true,
						},
					});

					imageUrl = variantMediaRow?.media?.url || null;

					// Get inventory for variant
					inventoryData = await db.inventory.findUnique({
						where: { variantId: item.variant.id },
					});

					// Get variant options (Size, Color, etc.)
					const variantOptionsRows = await db.productVariantOption.findMany({
						where: { variantId: item.variant.id },
						include: {
							optionValue: {
								include: {
									option: true,
								},
							},
						},
					});

					variantOptions = variantOptionsRows.map((vo) => ({
						optionName: vo.optionValue?.option?.name || "",
						optionValue: vo.optionValue?.name || "",
					}));
				}

				// Fallback to product image
				if (!imageUrl && item.product?.id) {
					const productMediaRow = await db.productMedia.findFirst({
						where: {
							productId: item.product.id,
							isPrimary: true,
						},
						include: {
							media: true,
						},
					});

					imageUrl = productMediaRow?.media?.url || null;
				}

				return {
					...item,
					image: imageUrl,
					inventory: inventoryData,
					variantOptions,
				};
			})
		);

		return serializeData({
			cart: cartData,
			items: itemsWithDetails,
		});
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
		const existingItem = await db.cartItem.findFirst({
			where: {
				cartId: cartData.id,
				productId: data.productId,
				variantId: data.variantId || null,
			},
		});

		// Check inventory if variant exists
		if (data.variantId) {
			const inventoryData = await db.inventory.findUnique({
				where: { variantId: data.variantId },
			});

			if (inventoryData) {
				const available = inventoryData.available || 0;
				const requestedQuantity = existingItem
					? existingItem.quantity + data.quantity
					: data.quantity;

				if (requestedQuantity > available) {
					throw new Error(
						`Nema dovoljno na zalihi. Dostupno: ${available} kom`
					);
				}
			}
		}

		if (existingItem) {
			// Update quantity
			await db.cartItem.update({
				where: { id: existingItem.id },
				data: {
					quantity: existingItem.quantity + data.quantity,
					updatedAt: new Date(),
				},
			});
		} else {
			// Add new item
			const itemId = nanoid();
			await db.cartItem.create({
				data: {
					id: itemId,
					cartId: cartData.id,
					productId: data.productId,
					variantId: data.variantId || null,
					quantity: data.quantity,
				},
			});
		}

		// Track add-to-cart feedback in Gorse
		if (isGorseConfigured()) {
			const feedbackUserId = userId || sessionId;
			if (feedbackUserId) {
				try {
					await insertFeedback([
						{
							FeedbackType: "cart",
							UserId: feedbackUserId,
							ItemId: data.productId,
							Timestamp: new Date().toISOString(),
						},
					]);
				} catch (error) {
					// Log but don't fail the cart operation
					console.error("Failed to track cart feedback:", error);
				}
			}
		}

		// Return updated cart
		return serializeData(await getCartServerFn({ data: { sessionId } }));
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

		const item = await db.cartItem.findUnique({
			where: { id: data.itemId },
		});

		if (!item || item.cartId !== cartData.id) {
			throw new Error("Cart item not found");
		}

		// Check inventory if quantity is being increased and variant exists
		if (data.quantity > item.quantity && item.variantId) {
			const inventoryData = await db.inventory.findUnique({
				where: { variantId: item.variantId },
			});

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
			await db.cartItem.delete({
				where: { id: data.itemId },
			});
		} else {
			// Update quantity
			await db.cartItem.update({
				where: { id: data.itemId },
				data: {
					quantity: data.quantity,
					updatedAt: new Date(),
				},
			});
		}

		return serializeData(await getCartServerFn({ data: { sessionId } }));
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

		const item = await db.cartItem.findUnique({
			where: { id: data.itemId },
		});

		if (!item || item.cartId !== cartData.id) {
			throw new Error("Cart item not found");
		}

		await db.cartItem.delete({
			where: { id: data.itemId },
		});

		return serializeData(await getCartServerFn({ data: { sessionId } }));
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
		const guestCart = await db.cart.findFirst({
			where: { sessionId: data.guestSessionId },
		});

		if (!guestCart) {
			// No guest cart to merge
			return serializeData(await getCartServerFn({ data: {} }));
		}

		// Get or create user cart
		const userCart = await getOrCreateCart(data.userId, null, new Headers());

		// Get guest cart items
		const guestItems = await db.cartItem.findMany({
			where: { cartId: guestCart.id },
		});

		// Get user cart items
		const userItems = await db.cartItem.findMany({
			where: { cartId: userCart.id },
		});

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
				await db.cartItem.update({
					where: { id: existingUserItem.id },
					data: {
						quantity: existingUserItem.quantity + guestItem.quantity,
						updatedAt: new Date(),
					},
				});
			} else {
				// Move item to user cart
				await db.cartItem.update({
					where: { id: guestItem.id },
					data: {
						cartId: userCart.id,
						updatedAt: new Date(),
					},
				});
			}
		}

		// Delete guest cart
		await db.cart.delete({
			where: { id: guestCart.id },
		});

		// Return merged cart
		return serializeData(await getCartServerFn({ data: {} }));
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
		await db.cartItem.deleteMany({
			where: { cartId: cartData.id },
		});

		// Delete the cart itself
		await db.cart.delete({
			where: { id: cartData.id },
		});

		return { success: true };
	});

export const clearCartMutationOptions = (sessionId?: string) => {
	return mutationOptions({
		mutationFn: async () => {
			return await clearCartServerFn({ data: { sessionId } });
		},
	});
};
