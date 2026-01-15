import { db, serializeData } from "@/db/db";
import { queryOptions, mutationOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { nanoid } from "nanoid";
import { auth } from "@/lib/auth";

export const WISHLIST_QUERY_KEY = "wishlist";

// Helper to get or create customer from user (same as cart.ts)
async function getOrCreateCustomer(userId: string) {
	const authUser = await db.user.findUnique({
		where: { id: userId },
	});

	if (!authUser) {
		return null;
	}

	const existingCustomer = await db.customers.findUnique({
		where: { email: authUser.email },
	});

	if (existingCustomer) {
		return existingCustomer.id;
	}

	const customerId = nanoid();
	const nameParts = authUser.name?.split(" ") || [];
	const firstName = nameParts[0] || null;
	const lastName = nameParts.slice(1).join(" ") || null;

	await db.customers.create({
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

// Helper to get or create wishlist
async function getOrCreateWishlist(
	userId: string | null,
	sessionId: string | null
) {
	let customerId: string | null = null;
	if (userId) {
		customerId = await getOrCreateCustomer(userId);
	}

	const conditions: { customerId?: string; sessionId?: string }[] = [];
	if (customerId) {
		conditions.push({ customerId });
	}
	if (sessionId) {
		conditions.push({ sessionId });
	}

	let existingWishlist = null;
	if (conditions.length > 0) {
		existingWishlist = await db.wishlist.findFirst({
			where: conditions.length === 1 ? conditions[0] : { OR: conditions },
			orderBy: { createdAt: "desc" },
		});
	}

	if (existingWishlist) {
		return existingWishlist;
	}

	const wishlistId = nanoid();
	const newWishlist = await db.wishlist.create({
		data: {
			id: wishlistId,
			customerId: customerId || null,
			sessionId: sessionId || null,
		},
	});

	return newWishlist;
}

// Get wishlist with items
export const getWishlistServerFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ sessionId: z.string().optional() }))
	.handler(async ({ data, request }) => {
		const headers = request.headers;
		const session = await auth.api.getSession({ headers });
		const userId = session?.user?.id || null;
		const sessionId = data.sessionId || null;

		const wishlistData = await getOrCreateWishlist(userId, sessionId);

		const items = await db.wishlist_items.findMany({
			where: { wishlistId: wishlistData.id },
			include: {
				product: {
					include: {
						media: {
							where: { isPrimary: true },
							include: { media: true },
							take: 1,
						},
						variants: {
							include: {
								inventory: true,
								variantOptions: {
									include: {
										option: true,
										optionValue: true,
									},
								},
							},
						},
						category: true,
					},
				},
			},
			orderBy: { createdAt: "desc" },
		});

		return serializeData({
			wishlist: wishlistData,
			items,
		});
	});

export const getWishlistQueryOptions = (sessionId?: string) => {
	return queryOptions({
		queryKey: [WISHLIST_QUERY_KEY, sessionId],
		queryFn: async () => {
			return await getWishlistServerFn({ data: { sessionId } });
		},
	});
};

// Add to wishlist
export const addToWishlistServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			productId: z.string(),
			sessionId: z.string().optional(),
		})
	)
	.handler(async ({ data, request }) => {
		const headers = request.headers;
		const session = await auth.api.getSession({ headers });
		const userId = session?.user?.id || null;
		const sessionId = data.sessionId || null;

		const wishlistData = await getOrCreateWishlist(userId, sessionId);

		// Check if item already exists
		const existingItem = await db.wishlist_items.findFirst({
			where: {
				wishlistId: wishlistData.id,
				productId: data.productId,
			},
		});

		if (!existingItem) {
			const itemId = nanoid();
			await db.wishlist_items.create({
				data: {
					id: itemId,
					wishlistId: wishlistData.id,
					productId: data.productId,
				},
			});
		}

		return serializeData(await getWishlistServerFn({ data: { sessionId } }));
	});

export const addToWishlistMutationOptions = (sessionId?: string) => {
	return mutationOptions({
		mutationFn: async (data: { productId: string }) => {
			return await addToWishlistServerFn({
				data: { ...data, sessionId },
			});
		},
	});
};

// Remove from wishlist
export const removeFromWishlistServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			productId: z.string(),
			sessionId: z.string().optional(),
		})
	)
	.handler(async ({ data, request }) => {
		const headers = request.headers;
		const session = await auth.api.getSession({ headers });
		const userId = session?.user?.id || null;
		const sessionId = data.sessionId || null;

		const wishlistData = await getOrCreateWishlist(userId, sessionId);

		await db.wishlist_items.deleteMany({
			where: {
				wishlistId: wishlistData.id,
				productId: data.productId,
			},
		});

		return serializeData(await getWishlistServerFn({ data: { sessionId } }));
	});

export const removeFromWishlistMutationOptions = (sessionId?: string) => {
	return mutationOptions({
		mutationFn: async (data: { productId: string }) => {
			return await removeFromWishlistServerFn({
				data: { ...data, sessionId },
			});
		},
	});
};

// Toggle wishlist (add if not exists, remove if exists)
export const toggleWishlistServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			productId: z.string(),
			sessionId: z.string().optional(),
		})
	)
	.handler(async ({ data, request }) => {
		const headers = request.headers;
		const session = await auth.api.getSession({ headers });
		const userId = session?.user?.id || null;
		const sessionId = data.sessionId || null;

		const wishlistData = await getOrCreateWishlist(userId, sessionId);

		const existingItem = await db.wishlist_items.findFirst({
			where: {
				wishlistId: wishlistData.id,
				productId: data.productId,
			},
		});

		let isInWishlist: boolean;

		if (existingItem) {
			await db.wishlist_items.delete({ where: { id: existingItem.id } });
			isInWishlist = false;
		} else {
			const itemId = nanoid();
			await db.wishlist_items.create({
				data: {
					id: itemId,
					wishlistId: wishlistData.id,
					productId: data.productId,
				},
			});
			isInWishlist = true;
		}

		const wishlistResult = await getWishlistServerFn({ data: { sessionId } });

		return serializeData({
			isInWishlist,
			...wishlistResult,
		});
	});

export const toggleWishlistMutationOptions = (sessionId?: string) => {
	return mutationOptions({
		mutationFn: async (data: { productId: string }) => {
			return await toggleWishlistServerFn({
				data: { ...data, sessionId },
			});
		},
	});
};

// Check if product is in wishlist
export const isInWishlistServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			productId: z.string(),
			sessionId: z.string().optional(),
		})
	)
	.handler(async ({ data, request }) => {
		const headers = request.headers;
		const session = await auth.api.getSession({ headers });
		const userId = session?.user?.id || null;
		const sessionId = data.sessionId || null;

		if (!userId && !sessionId) {
			return { isInWishlist: false };
		}

		const conditions: { customerId?: string; sessionId?: string }[] = [];

		if (userId) {
			const customer = await db.customers.findFirst({
				where: {
					email: (await db.user.findUnique({ where: { id: userId } }))?.email,
				},
			});
			if (customer) conditions.push({ customerId: customer.id });
		}
		if (sessionId) conditions.push({ sessionId });

		if (conditions.length === 0) return { isInWishlist: false };

		const wishlist = await db.wishlist.findFirst({
			where: conditions.length === 1 ? conditions[0] : { OR: conditions },
		});

		if (!wishlist) return { isInWishlist: false };

		const item = await db.wishlist_items.findFirst({
			where: {
				wishlistId: wishlist.id,
				productId: data.productId,
			},
		});

		return { isInWishlist: !!item };
	});

// Merge wishlists (guest to user)
export const mergeWishlistsServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			guestSessionId: z.string(),
			userId: z.string(),
		})
	)
	.handler(async ({ data }) => {
		// Get guest wishlist
		const guestWishlist = await db.wishlist.findFirst({
			where: { sessionId: data.guestSessionId },
		});

		if (!guestWishlist) {
			return serializeData(await getWishlistServerFn({ data: {} }));
		}

		// Get or create user wishlist
		const userWishlist = await getOrCreateWishlist(data.userId, null);

		// Get guest wishlist items
		const guestItems = await db.wishlist_items.findMany({
			where: { wishlistId: guestWishlist.id },
		});

		// Get user wishlist items
		const userItems = await db.wishlist_items.findMany({
			where: { wishlistId: userWishlist.id },
		});

		const userProductIds = new Set(userItems.map((item) => item.productId));

		// Merge items (add guest items not already in user wishlist)
		for (const guestItem of guestItems) {
			if (!userProductIds.has(guestItem.productId)) {
				await db.wishlist_items.update({
					where: { id: guestItem.id },
					data: { wishlistId: userWishlist.id },
				});
			}
		}

		// Delete guest wishlist (items moved or duplicate)
		await db.wishlist.delete({ where: { id: guestWishlist.id } });

		return serializeData(await getWishlistServerFn({ data: {} }));
	});

export const mergeWishlistsMutationOptions = () => {
	return mutationOptions({
		mutationFn: async (data: { guestSessionId: string; userId: string }) => {
			return await mergeWishlistsServerFn({ data });
		},
	});
};

// Get wishlist product IDs (lightweight check)
export const getWishlistProductIdsServerFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ sessionId: z.string().optional() }))
	.handler(async ({ data, request }) => {
		const headers = request.headers;
		const session = await auth.api.getSession({ headers });
		const userId = session?.user?.id || null;
		const sessionId = data.sessionId || null;

		if (!userId && !sessionId) {
			return { productIds: [] };
		}

		const conditions: { customerId?: string; sessionId?: string }[] = [];

		if (userId) {
			const customer = await db.customers.findFirst({
				where: {
					email: (await db.user.findUnique({ where: { id: userId } }))?.email,
				},
			});
			if (customer) conditions.push({ customerId: customer.id });
		}
		if (sessionId) conditions.push({ sessionId });

		if (conditions.length === 0) return { productIds: [] };

		const wishlist = await db.wishlist.findFirst({
			where: conditions.length === 1 ? conditions[0] : { OR: conditions },
		});

		if (!wishlist) return { productIds: [] };

		const items = await db.wishlist_items.findMany({
			where: { wishlistId: wishlist.id },
			select: { productId: true },
		});

		return { productIds: items.map((item) => item.productId) };
	});

export const getWishlistProductIdsQueryOptions = (sessionId?: string) => {
	return queryOptions({
		queryKey: [WISHLIST_QUERY_KEY, "productIds", sessionId],
		queryFn: async () => {
			return await getWishlistProductIdsServerFn({ data: { sessionId } });
		},
	});
};

// Analytics: Get most wishlisted products
export const getWishlistAnalyticsServerFn = createServerFn({ method: "GET" })
	.handler(async () => {
		const mostWishlisted = await db.wishlist_items.groupBy({
			by: ["productId"],
			_count: { productId: true },
			orderBy: { _count: { productId: "desc" } },
			take: 20,
		});

		const productIds = mostWishlisted.map((item) => item.productId);

		const products = await db.products.findMany({
			where: { id: { in: productIds } },
			include: {
				media: {
					where: { isPrimary: true },
					include: { media: true },
					take: 1,
				},
				category: true,
			},
		});

		const productMap = new Map(products.map((p) => [p.id, p]));

		const result = mostWishlisted.map((item) => ({
			product: productMap.get(item.productId),
			wishlistCount: item._count.productId,
		}));

		return serializeData(result);
	});
