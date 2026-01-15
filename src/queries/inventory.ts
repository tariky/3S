import { db } from "@/db/db";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { nanoid } from "nanoid";
import type { Prisma } from "@prisma/client";

export const INVENTORY_QUERY_KEY = "inventory";
export const INVENTORY_BATCHES_QUERY_KEY = "inventory-batches";

// ==================== INVENTORY BATCH MANAGEMENT ====================

// Create a new inventory batch when restocking
export const createInventoryBatchServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			variantId: z.string(),
			productId: z.string(),
			quantityAdded: z.number().min(1),
			costPerUnit: z.number().optional(),
			source: z
				.enum(["manual", "initial", "migration", "purchase_order"])
				.default("manual"),
			notes: z.string().optional(),
			userId: z.string().optional(),
			purchaseOrderItemId: z.string().optional(),
		})
	)
	.handler(async ({ data }) => {
		const batch = await db.inventory_batches.create({
			data: {
				id: nanoid(),
				variantId: data.variantId,
				productId: data.productId,
				quantityAdded: data.quantityAdded,
				quantitySold: 0,
				quantityRemaining: data.quantityAdded,
				costPerUnit: data.costPerUnit ?? null,
				restockedAt: new Date(),
				source: data.source,
				notes: data.notes ?? null,
				userId: data.userId ?? null,
				purchaseOrderItemId: data.purchaseOrderItemId ?? null,
			},
		});

		return batch;
	});

// Get inventory batches for a variant
export const getInventoryBatchesServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			variantId: z.string().optional(),
			productId: z.string().optional(),
			includeDepletedBatches: z.boolean().default(true),
			page: z.number().default(1),
			limit: z.number().default(25),
		})
	)
	.handler(async ({ data }) => {
		const where: Prisma.inventory_batchesWhereInput = {};

		if (data.variantId) {
			where.variantId = data.variantId;
		}

		if (data.productId) {
			where.productId = data.productId;
		}

		if (!data.includeDepletedBatches) {
			where.quantityRemaining = { gt: 0 };
		}

		const [batches, total] = await Promise.all([
			db.inventory_batches.findMany({
				where,
				orderBy: { restockedAt: "desc" },
				skip: (data.page - 1) * data.limit,
				take: data.limit,
				include: {
					variant: {
						include: {
							variantOptions: {
								include: {
									option: true,
									optionValue: true,
								},
							},
						},
					},
					product: {
						select: {
							id: true,
							name: true,
							slug: true,
						},
					},
					user: {
						select: {
							id: true,
							name: true,
						},
					},
					purchaseOrderItem: {
						include: {
							purchaseOrder: {
								select: {
									id: true,
									orderNumber: true,
								},
							},
						},
					},
				},
			}),
			db.inventory_batches.count({ where }),
		]);

		return {
			data: batches,
			total,
			page: data.page,
			limit: data.limit,
			hasNextPage: data.page * data.limit < total,
			hasPreviousPage: data.page > 1,
		};
	});

// Get a single inventory batch
export const getInventoryBatchServerFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ batchId: z.string() }))
	.handler(async ({ data }) => {
		const batch = await db.inventory_batches.findUnique({
			where: { id: data.batchId },
			include: {
				variant: {
					include: {
						variantOptions: {
							include: {
								option: true,
								optionValue: true,
							},
						},
						inventory: true,
					},
				},
				product: {
					select: {
						id: true,
						name: true,
						slug: true,
					},
				},
				user: {
					select: {
						id: true,
						name: true,
					},
				},
				purchaseOrderItem: {
					include: {
						purchaseOrder: {
							select: {
								id: true,
								orderNumber: true,
							},
						},
					},
				},
			},
		});

		return batch;
	});

// Update inventory batch (notes, cost)
export const updateInventoryBatchServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			batchId: z.string(),
			costPerUnit: z.number().optional(),
			notes: z.string().optional(),
		})
	)
	.handler(async ({ data }) => {
		const batch = await db.inventory_batches.update({
			where: { id: data.batchId },
			data: {
				...(data.costPerUnit !== undefined && { costPerUnit: data.costPerUnit }),
				...(data.notes !== undefined && { notes: data.notes }),
			},
		});

		return batch;
	});

// ==================== FIFO DEDUCTION ====================

// Deduct quantity from batches using FIFO (First In, First Out)
// This is called when orders are fulfilled
export async function deductFromBatchesFIFO(
	tx: Prisma.TransactionClient,
	variantId: string,
	quantityToDeduct: number
): Promise<void> {
	// Get active batches ordered by restockedAt (oldest first)
	const batches = await tx.inventory_batches.findMany({
		where: {
			variantId,
			quantityRemaining: { gt: 0 },
		},
		orderBy: { restockedAt: "asc" },
	});

	let remaining = quantityToDeduct;

	for (const batch of batches) {
		if (remaining <= 0) break;

		const deductFromThis = Math.min(batch.quantityRemaining, remaining);
		const newRemaining = batch.quantityRemaining - deductFromThis;
		const newSold = batch.quantitySold + deductFromThis;
		const sellThrough = (newSold / batch.quantityAdded) * 100;

		const updateData: Prisma.inventory_batchesUpdateInput = {
			quantitySold: newSold,
			quantityRemaining: newRemaining,
			sellThroughRate: sellThrough,
		};

		// If sold out, record timestamp and calculate days
		if (newRemaining === 0) {
			const now = new Date();
			const daysToSellOut = Math.ceil(
				(now.getTime() - batch.restockedAt.getTime()) / (1000 * 60 * 60 * 24)
			);
			updateData.soldOutAt = now;
			updateData.daysToSellOut = daysToSellOut;
		}

		await tx.inventory_batches.update({
			where: { id: batch.id },
			data: updateData,
		});

		remaining -= deductFromThis;
	}
}

// ==================== STOCK ADJUSTMENT ====================

// Manual stock adjustment with tracking
export const adjustInventoryServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			variantId: z.string(),
			productId: z.string(),
			adjustmentType: z.enum(["add", "remove", "set"]),
			quantity: z.number().min(0),
			costPerUnit: z.number().optional(),
			reason: z.string().optional(),
			userId: z.string().optional(),
		})
	)
	.handler(async ({ data }) => {
		return await db.$transaction(async (tx) => {
			// Get current inventory
			let inventory = await tx.inventory.findUnique({
				where: { variantId: data.variantId },
			});

			const previousAvailable = inventory?.available ?? 0;
			const previousOnHand = inventory?.onHand ?? 0;
			const previousReserved = inventory?.reserved ?? 0;

			let newAvailable: number;
			let newOnHand: number;
			let quantityChange: number;
			let trackingType: string;

			switch (data.adjustmentType) {
				case "add":
					newOnHand = previousOnHand + data.quantity;
					newAvailable = previousAvailable + data.quantity;
					quantityChange = data.quantity;
					trackingType = "restock";
					break;
				case "remove":
					newOnHand = Math.max(0, previousOnHand - data.quantity);
					newAvailable = Math.max(0, previousAvailable - data.quantity);
					quantityChange = -data.quantity;
					trackingType = "adjustment_decrease";
					break;
				case "set":
					newOnHand = data.quantity;
					newAvailable = Math.max(0, data.quantity - previousReserved);
					quantityChange = data.quantity - previousOnHand;
					trackingType = quantityChange >= 0 ? "restock" : "adjustment_decrease";
					break;
				default:
					throw new Error("Invalid adjustment type");
			}

			// Update or create inventory
			if (inventory) {
				inventory = await tx.inventory.update({
					where: { variantId: data.variantId },
					data: {
						onHand: newOnHand,
						available: newAvailable,
					},
				});
			} else {
				inventory = await tx.inventory.create({
					data: {
						id: nanoid(),
						variantId: data.variantId,
						onHand: newOnHand,
						available: newAvailable,
						reserved: 0,
						committed: 0,
					},
				});
			}

			// Create inventory tracking record
			await tx.inventory_tracking.create({
				data: {
					id: nanoid(),
					variantId: data.variantId,
					productId: data.productId,
					type: trackingType,
					quantity: Math.abs(quantityChange),
					previousAvailable,
					previousReserved,
					newAvailable,
					newReserved: previousReserved,
					reason: data.reason ?? `Manual ${data.adjustmentType} adjustment`,
					referenceType: "adjustment",
					referenceId: null,
					userId: data.userId ?? null,
				},
			});

			// Create inventory batch for positive adjustments
			if (quantityChange > 0) {
				await tx.inventory_batches.create({
					data: {
						id: nanoid(),
						variantId: data.variantId,
						productId: data.productId,
						quantityAdded: quantityChange,
						quantitySold: 0,
						quantityRemaining: quantityChange,
						costPerUnit: data.costPerUnit ?? null,
						restockedAt: new Date(),
						source: "manual",
						notes: data.reason ?? null,
						userId: data.userId ?? null,
					},
				});
			} else if (quantityChange < 0) {
				// For negative adjustments, deduct from batches using FIFO
				await deductFromBatchesFIFO(tx, data.variantId, Math.abs(quantityChange));
			}

			return inventory;
		});
	});

// ==================== ANALYTICS ====================

// Get sell-through analytics
export const getSellThroughAnalyticsServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			startDate: z.string().optional(),
			endDate: z.string().optional(),
			categoryId: z.string().optional(),
			vendorId: z.string().optional(),
		})
	)
	.handler(async ({ data }) => {
		const where: Prisma.inventory_batchesWhereInput = {};

		if (data.startDate || data.endDate) {
			where.restockedAt = {};
			if (data.startDate) {
				where.restockedAt.gte = new Date(data.startDate);
			}
			if (data.endDate) {
				where.restockedAt.lte = new Date(data.endDate);
			}
		}

		if (data.categoryId || data.vendorId) {
			where.product = {
				...(data.categoryId && { categoryId: data.categoryId }),
				...(data.vendorId && { vendorId: data.vendorId }),
			};
		}

		// Get all batches with filters
		const batches = await db.inventory_batches.findMany({
			where,
			include: {
				product: {
					select: {
						id: true,
						name: true,
						slug: true,
						categoryId: true,
						vendorId: true,
					},
				},
			},
		});

		// Calculate overall statistics
		const totalBatches = batches.length;
		const completedBatches = batches.filter((b) => b.soldOutAt !== null);

		const avgSellThroughRate =
			batches.length > 0
				? batches.reduce(
						(sum, b) => sum + (Number(b.sellThroughRate) || 0),
						0
				  ) / batches.length
				: 0;

		const avgDaysToSellOut =
			completedBatches.length > 0
				? completedBatches.reduce(
						(sum, b) => sum + (b.daysToSellOut || 0),
						0
				  ) / completedBatches.length
				: 0;

		const totalQuantityAdded = batches.reduce(
			(sum, b) => sum + b.quantityAdded,
			0
		);
		const totalQuantitySold = batches.reduce(
			(sum, b) => sum + b.quantitySold,
			0
		);

		return {
			totalBatches,
			completedBatches: completedBatches.length,
			avgSellThroughRate: Math.round(avgSellThroughRate * 100) / 100,
			avgDaysToSellOut: Math.round(avgDaysToSellOut * 10) / 10,
			totalQuantityAdded,
			totalQuantitySold,
			overallSellThroughRate:
				totalQuantityAdded > 0
					? Math.round((totalQuantitySold / totalQuantityAdded) * 10000) / 100
					: 0,
		};
	});

// Get product-level sell-through analysis
export const getProductSellThroughServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			productId: z.string().optional(),
			startDate: z.string().optional(),
			endDate: z.string().optional(),
			page: z.number().default(1),
			limit: z.number().default(25),
			sortBy: z
				.enum(["sellThroughRate", "daysToSellOut", "totalSold", "name"])
				.default("sellThroughRate"),
			sortOrder: z.enum(["asc", "desc"]).default("desc"),
		})
	)
	.handler(async ({ data }) => {
		// Get products with their batches
		const products = await db.products.findMany({
			where: data.productId ? { id: data.productId } : undefined,
			include: {
				category: { select: { id: true, name: true } },
				vendor: { select: { id: true, name: true } },
				inventoryBatches: {
					where: {
						...(data.startDate || data.endDate
							? {
									restockedAt: {
										...(data.startDate && { gte: new Date(data.startDate) }),
										...(data.endDate && { lte: new Date(data.endDate) }),
									},
							  }
							: {}),
					},
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
			},
		});

		// Calculate stats for each product
		const productStats = products.map((product) => {
			const batches = product.inventoryBatches;
			const completedBatches = batches.filter((b) => b.soldOutAt !== null);

			const avgSellThroughRate =
				batches.length > 0
					? batches.reduce(
							(sum, b) => sum + (Number(b.sellThroughRate) || 0),
							0
					  ) / batches.length
					: 0;

			const avgDaysToSellOut =
				completedBatches.length > 0
					? completedBatches.reduce(
							(sum, b) => sum + (b.daysToSellOut || 0),
							0
					  ) / completedBatches.length
					: null;

			const totalQuantityAdded = batches.reduce(
				(sum, b) => sum + b.quantityAdded,
				0
			);
			const totalQuantitySold = batches.reduce(
				(sum, b) => sum + b.quantitySold,
				0
			);

			const currentStock = product.variants.reduce(
				(sum, v) => sum + (v.inventory?.available || 0),
				0
			);

			return {
				productId: product.id,
				productName: product.name,
				productSlug: product.slug,
				category: product.category,
				vendor: product.vendor,
				batchesCount: batches.length,
				completedBatchesCount: completedBatches.length,
				avgSellThroughRate: Math.round(avgSellThroughRate * 100) / 100,
				avgDaysToSellOut: avgDaysToSellOut
					? Math.round(avgDaysToSellOut * 10) / 10
					: null,
				totalQuantityAdded,
				totalQuantitySold,
				currentStock,
			};
		});

		// Sort
		productStats.sort((a, b) => {
			let comparison = 0;
			switch (data.sortBy) {
				case "sellThroughRate":
					comparison = a.avgSellThroughRate - b.avgSellThroughRate;
					break;
				case "daysToSellOut":
					comparison =
						(a.avgDaysToSellOut ?? 999) - (b.avgDaysToSellOut ?? 999);
					break;
				case "totalSold":
					comparison = a.totalQuantitySold - b.totalQuantitySold;
					break;
				case "name":
					comparison = a.productName.localeCompare(b.productName);
					break;
			}
			return data.sortOrder === "asc" ? comparison : -comparison;
		});

		// Paginate
		const total = productStats.length;
		const paginatedData = productStats.slice(
			(data.page - 1) * data.limit,
			data.page * data.limit
		);

		return {
			data: paginatedData,
			total,
			page: data.page,
			limit: data.limit,
			hasNextPage: data.page * data.limit < total,
			hasPreviousPage: data.page > 1,
		};
	});

// Get low-performing products (slow movers)
export const getLowPerformingProductsServerFn = createServerFn({
	method: "POST",
})
	.inputValidator(
		z.object({
			threshold: z.number().default(50), // sell-through rate below this %
			minBatches: z.number().default(1), // minimum batches to consider
			limit: z.number().default(10),
		})
	)
	.handler(async ({ data }) => {
		// Get all products with their batches
		const products = await db.products.findMany({
			include: {
				category: { select: { id: true, name: true } },
				inventoryBatches: true,
				variants: {
					include: { inventory: true },
				},
			},
		});

		// Filter and calculate
		const lowPerformers = products
			.map((product) => {
				const batches = product.inventoryBatches;
				if (batches.length < data.minBatches) return null;

				const avgSellThroughRate =
					batches.length > 0
						? batches.reduce(
								(sum, b) => sum + (Number(b.sellThroughRate) || 0),
								0
						  ) / batches.length
						: 0;

				if (avgSellThroughRate >= data.threshold) return null;

				const currentStock = product.variants.reduce(
					(sum, v) => sum + (v.inventory?.available || 0),
					0
				);

				return {
					productId: product.id,
					productName: product.name,
					productSlug: product.slug,
					category: product.category,
					batchesCount: batches.length,
					avgSellThroughRate: Math.round(avgSellThroughRate * 100) / 100,
					currentStock,
				};
			})
			.filter(Boolean)
			.sort((a, b) => a!.avgSellThroughRate - b!.avgSellThroughRate)
			.slice(0, data.limit);

		return lowPerformers;
	});

// ==================== STOCK OVERVIEW ====================

// Get inventory overview with filters
export const getInventoryOverviewServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			search: z.string().optional(),
			categoryId: z.string().optional(),
			stockStatus: z.enum(["all", "in_stock", "low_stock", "out_of_stock"]).default("all"),
			lowStockThreshold: z.number().default(10),
			page: z.number().default(1),
			limit: z.number().default(25),
		})
	)
	.handler(async ({ data }) => {
		// Get all products with variants and inventory
		const products = await db.products.findMany({
			where: {
				...(data.search && {
					OR: [
						{ name: { contains: data.search } },
						{ sku: { contains: data.search } },
					],
				}),
				...(data.categoryId && { categoryId: data.categoryId }),
			},
			include: {
				category: { select: { id: true, name: true } },
				vendor: { select: { id: true, name: true } },
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
				inventoryBatches: {
					orderBy: { restockedAt: "desc" },
					take: 1,
				},
			},
			orderBy: { name: "asc" },
		});

		// Calculate stock info for each product
		const productStockData = products.map((product) => {
			const totalOnHand = product.variants.reduce(
				(sum, v) => sum + (v.inventory?.onHand || 0),
				0
			);
			const totalAvailable = product.variants.reduce(
				(sum, v) => sum + (v.inventory?.available || 0),
				0
			);
			const totalReserved = product.variants.reduce(
				(sum, v) => sum + (v.inventory?.reserved || 0),
				0
			);

			// Determine stock status
			let stockStatus: "in_stock" | "low_stock" | "out_of_stock";
			if (totalAvailable === 0) {
				stockStatus = "out_of_stock";
			} else if (totalAvailable <= data.lowStockThreshold) {
				stockStatus = "low_stock";
			} else {
				stockStatus = "in_stock";
			}

			// Get last restock date
			const lastRestock = product.inventoryBatches[0]?.restockedAt || null;

			// Calculate avg sell-through from batches
			const batches = product.inventoryBatches;
			const avgSellThroughRate =
				batches.length > 0
					? batches.reduce(
							(sum, b) => sum + (Number(b.sellThroughRate) || 0),
							0
					  ) / batches.length
					: null;

			return {
				productId: product.id,
				productName: product.name,
				productSlug: product.slug,
				sku: product.sku,
				category: product.category,
				vendor: product.vendor,
				image: product.media[0]?.media?.url || null,
				variantsCount: product.variants.length,
				totalOnHand,
				totalAvailable,
				totalReserved,
				stockStatus,
				lastRestock,
				avgSellThroughRate: avgSellThroughRate
					? Math.round(avgSellThroughRate * 100) / 100
					: null,
			};
		});

		// Filter by stock status
		let filteredData = productStockData;
		if (data.stockStatus !== "all") {
			filteredData = productStockData.filter(
				(p) => p.stockStatus === data.stockStatus
			);
		}

		// Calculate summary stats
		const stats = {
			totalProducts: productStockData.length,
			inStock: productStockData.filter((p) => p.stockStatus === "in_stock")
				.length,
			lowStock: productStockData.filter((p) => p.stockStatus === "low_stock")
				.length,
			outOfStock: productStockData.filter(
				(p) => p.stockStatus === "out_of_stock"
			).length,
			totalInventoryValue: 0, // Could calculate if we have cost data
		};

		// Paginate
		const total = filteredData.length;
		const paginatedData = filteredData.slice(
			(data.page - 1) * data.limit,
			data.page * data.limit
		);

		return {
			data: paginatedData,
			stats,
			total,
			page: data.page,
			limit: data.limit,
			hasNextPage: data.page * data.limit < total,
			hasPreviousPage: data.page > 1,
		};
	});

// Get inventory stats summary
export const getInventoryStatsServerFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({}))
	.handler(async () => {
		// Get all variants with inventory
		const variants = await db.product_variants.findMany({
			include: { inventory: true },
		});

		const stats = {
			totalSKUs: variants.length,
			totalOnHand: variants.reduce(
				(sum, v) => sum + (v.inventory?.onHand || 0),
				0
			),
			totalAvailable: variants.reduce(
				(sum, v) => sum + (v.inventory?.available || 0),
				0
			),
			totalReserved: variants.reduce(
				(sum, v) => sum + (v.inventory?.reserved || 0),
				0
			),
			inStock: variants.filter((v) => (v.inventory?.available || 0) > 0).length,
			lowStock: variants.filter(
				(v) => (v.inventory?.available || 0) > 0 && (v.inventory?.available || 0) <= 10
			).length,
			outOfStock: variants.filter((v) => (v.inventory?.available || 0) === 0)
				.length,
		};

		return stats;
	});

// ==================== QUERY OPTIONS ====================

export function getInventoryBatchesQueryOptions(params: {
	variantId?: string;
	productId?: string;
	includeDepletedBatches?: boolean;
	page?: number;
	limit?: number;
}) {
	return queryOptions({
		queryKey: [INVENTORY_BATCHES_QUERY_KEY, params],
		queryFn: () => getInventoryBatchesServerFn({ data: params }),
	});
}

export function getInventoryOverviewQueryOptions(params: {
	search?: string;
	categoryId?: string;
	stockStatus?: "all" | "in_stock" | "low_stock" | "out_of_stock";
	lowStockThreshold?: number;
	page?: number;
	limit?: number;
}) {
	return queryOptions({
		queryKey: [INVENTORY_QUERY_KEY, "overview", params],
		queryFn: () => getInventoryOverviewServerFn({ data: params }),
	});
}

export function getInventoryStatsQueryOptions() {
	return queryOptions({
		queryKey: [INVENTORY_QUERY_KEY, "stats"],
		queryFn: () => getInventoryStatsServerFn({ data: {} }),
	});
}

export function getSellThroughAnalyticsQueryOptions(params: {
	startDate?: string;
	endDate?: string;
	categoryId?: string;
	vendorId?: string;
}) {
	return queryOptions({
		queryKey: [INVENTORY_QUERY_KEY, "sell-through", params],
		queryFn: () => getSellThroughAnalyticsServerFn({ data: params }),
	});
}

export function getProductSellThroughQueryOptions(params: {
	productId?: string;
	startDate?: string;
	endDate?: string;
	page?: number;
	limit?: number;
	sortBy?: "sellThroughRate" | "daysToSellOut" | "totalSold" | "name";
	sortOrder?: "asc" | "desc";
}) {
	return queryOptions({
		queryKey: [INVENTORY_QUERY_KEY, "product-sell-through", params],
		queryFn: () => getProductSellThroughServerFn({ data: params }),
	});
}

// ==================== COST HISTORY ====================

export const COST_HISTORY_QUERY_KEY = "cost-history";

// Get cost history for a variant
export const getVariantCostHistoryServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			variantId: z.string(),
			limit: z.number().default(50),
		})
	)
	.handler(async ({ data }) => {
		const history = await db.variant_cost_history.findMany({
			where: { variantId: data.variantId },
			orderBy: { createdAt: "desc" },
			take: data.limit,
			include: {
				user: { select: { id: true, name: true } },
			},
		});

		return history;
	});

// Get cost history for a product (all variants)
export const getProductCostHistoryServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			productId: z.string(),
			limit: z.number().default(100),
		})
	)
	.handler(async ({ data }) => {
		const history = await db.variant_cost_history.findMany({
			where: { productId: data.productId },
			orderBy: { createdAt: "desc" },
			take: data.limit,
			include: {
				variant: {
					include: {
						variantOptions: {
							include: {
								option: true,
								optionValue: true,
							},
						},
					},
				},
				user: { select: { id: true, name: true } },
			},
		});

		return history;
	});

// Manually update variant cost with tracking
export const updateVariantCostServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			variantId: z.string(),
			productId: z.string(),
			newCost: z.number().min(0),
			notes: z.string().optional(),
			userId: z.string().optional(),
		})
	)
	.handler(async ({ data }) => {
		return await db.$transaction(async (tx) => {
			// Get current cost
			const variant = await tx.product_variants.findUnique({
				where: { id: data.variantId },
				select: { cost: true },
			});

			const previousCost = variant?.cost ? Number(variant.cost) : null;

			// Only update if cost is different
			if (previousCost === data.newCost) {
				return { success: true, message: "Cijena je već postavljena na tu vrijednost" };
			}

			// Update variant cost
			await tx.product_variants.update({
				where: { id: data.variantId },
				data: { cost: data.newCost },
			});

			// Create cost history record
			await tx.variant_cost_history.create({
				data: {
					id: nanoid(),
					variantId: data.variantId,
					productId: data.productId,
					previousCost,
					newCost: data.newCost,
					source: "manual",
					notes: data.notes ?? null,
					userId: data.userId ?? null,
				},
			});

			return { success: true };
		});
	});

// Get cost history query options
export function getVariantCostHistoryQueryOptions(variantId: string) {
	return queryOptions({
		queryKey: [COST_HISTORY_QUERY_KEY, "variant", variantId],
		queryFn: () => getVariantCostHistoryServerFn({ data: { variantId } }),
	});
}

export function getProductCostHistoryQueryOptions(productId: string) {
	return queryOptions({
		queryKey: [COST_HISTORY_QUERY_KEY, "product", productId],
		queryFn: () => getProductCostHistoryServerFn({ data: { productId } }),
	});
}
