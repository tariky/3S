import { db } from "@/db/db";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { nanoid } from "nanoid";
import type { Prisma } from "@prisma/client";

export const PURCHASE_ORDERS_QUERY_KEY = "purchase-orders";

// ==================== PURCHASE ORDER MANAGEMENT ====================

// Generate unique PO number
async function generatePONumber(): Promise<string> {
	const year = new Date().getFullYear();
	const prefix = `PO-${year}-`;

	// Get the latest PO number for this year
	const latestPO = await db.purchase_orders.findFirst({
		where: {
			orderNumber: { startsWith: prefix },
		},
		orderBy: { orderNumber: "desc" },
	});

	let nextNumber = 1;
	if (latestPO) {
		const currentNumber = parseInt(latestPO.orderNumber.replace(prefix, ""));
		if (!isNaN(currentNumber)) {
			nextNumber = currentNumber + 1;
		}
	}

	return `${prefix}${nextNumber.toString().padStart(4, "0")}`;
}

// Create a new purchase order
export const createPurchaseOrderServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			vendorId: z.string().optional().nullable(),
			vendorName: z.string().min(1),
			expectedDate: z.string().optional().nullable(),
			notes: z.string().optional().nullable(),
			userId: z.string().optional().nullable(),
		})
	)
	.handler(async ({ data }) => {
		const orderNumber = await generatePONumber();

		const purchaseOrder = await db.purchase_orders.create({
			data: {
				id: nanoid(),
				orderNumber,
				vendorId: data.vendorId ?? null,
				vendorName: data.vendorName,
				status: "draft",
				expectedDate: data.expectedDate ? new Date(data.expectedDate) : null,
				notes: data.notes ?? null,
				userId: data.userId ?? null,
			},
		});

		return purchaseOrder;
	});

// Update purchase order
export const updatePurchaseOrderServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			id: z.string(),
			vendorId: z.string().optional().nullable(),
			vendorName: z.string().optional(),
			expectedDate: z.string().optional().nullable(),
			notes: z.string().optional().nullable(),
		})
	)
	.handler(async ({ data }) => {
		const { id, ...updateData } = data;

		// Check if PO can be updated
		const existingPO = await db.purchase_orders.findUnique({
			where: { id },
		});

		if (!existingPO) {
			throw new Error("Narudžbenica nije pronađena");
		}

		if (existingPO.status === "received" || existingPO.status === "cancelled") {
			throw new Error("Ne možete ažurirati završenu narudžbenicu");
		}

		const purchaseOrder = await db.purchase_orders.update({
			where: { id },
			data: {
				...(updateData.vendorId !== undefined && {
					vendorId: updateData.vendorId,
				}),
				...(updateData.vendorName !== undefined && {
					vendorName: updateData.vendorName,
				}),
				...(updateData.expectedDate !== undefined && {
					expectedDate: updateData.expectedDate
						? new Date(updateData.expectedDate)
						: null,
				}),
				...(updateData.notes !== undefined && { notes: updateData.notes }),
			},
		});

		return purchaseOrder;
	});

// Delete purchase order (only draft)
export const deletePurchaseOrderServerFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ id: z.string() }))
	.handler(async ({ data }) => {
		const existingPO = await db.purchase_orders.findUnique({
			where: { id: data.id },
		});

		if (!existingPO) {
			throw new Error("Narudžbenica nije pronađena");
		}

		if (existingPO.status !== "draft") {
			throw new Error("Možete obrisati samo narudžbenice u statusu draft");
		}

		await db.purchase_orders.delete({
			where: { id: data.id },
		});

		return { success: true };
	});

// Get all purchase orders
export const getPurchaseOrdersServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			search: z.string().optional(),
			status: z
				.enum([
					"all",
					"draft",
					"ordered",
					"partially_received",
					"received",
					"cancelled",
				])
				.default("all"),
			vendorId: z.string().optional(),
			startDate: z.string().optional(),
			endDate: z.string().optional(),
			page: z.number().default(1),
			limit: z.number().default(25),
		})
	)
	.handler(async ({ data }) => {
		const where: Prisma.purchase_ordersWhereInput = {};

		if (data.search) {
			where.OR = [
				{ orderNumber: { contains: data.search } },
				{ vendorName: { contains: data.search } },
			];
		}

		if (data.status !== "all") {
			where.status = data.status;
		}

		if (data.vendorId) {
			where.vendorId = data.vendorId;
		}

		if (data.startDate || data.endDate) {
			where.createdAt = {};
			if (data.startDate) {
				where.createdAt.gte = new Date(data.startDate);
			}
			if (data.endDate) {
				where.createdAt.lte = new Date(data.endDate);
			}
		}

		const [purchaseOrders, total] = await Promise.all([
			db.purchase_orders.findMany({
				where,
				orderBy: { createdAt: "desc" },
				skip: (data.page - 1) * data.limit,
				take: data.limit,
				include: {
					vendor: true,
					user: {
						select: { id: true, name: true },
					},
					_count: {
						select: { items: true },
					},
				},
			}),
			db.purchase_orders.count({ where }),
		]);

		return {
			data: purchaseOrders,
			total,
			page: data.page,
			limit: data.limit,
			hasNextPage: data.page * data.limit < total,
			hasPreviousPage: data.page > 1,
		};
	});

// Get single purchase order with items
export const getPurchaseOrderServerFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ id: z.string() }))
	.handler(async ({ data }) => {
		const purchaseOrder = await db.purchase_orders.findUnique({
			where: { id: data.id },
			include: {
				vendor: true,
				user: {
					select: { id: true, name: true },
				},
				items: {
					include: {
						product: {
							include: {
								media: {
									where: { isPrimary: true },
									include: { media: true },
									take: 1,
								},
							},
						},
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
						inventoryBatches: {
							orderBy: { createdAt: "desc" },
						},
					},
					orderBy: { createdAt: "asc" },
				},
			},
		});

		return purchaseOrder;
	});

// ==================== PURCHASE ORDER ITEMS ====================

// Add item to purchase order
export const addPurchaseOrderItemServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			purchaseOrderId: z.string(),
			productId: z.string(),
			variantId: z.string(),
			productName: z.string(),
			variantTitle: z.string().optional().nullable(),
			sku: z.string().optional().nullable(),
			quantityOrdered: z.number().min(1),
			costPerUnit: z.number().min(0),
		})
	)
	.handler(async ({ data }) => {
		// Check if PO can be modified
		const po = await db.purchase_orders.findUnique({
			where: { id: data.purchaseOrderId },
		});

		if (!po) {
			throw new Error("Narudžbenica nije pronađena");
		}

		if (po.status !== "draft") {
			throw new Error(
				"Možete dodavati stavke samo na narudžbenice u statusu draft"
			);
		}

		// Check if item already exists
		const existingItem = await db.purchase_order_items.findFirst({
			where: {
				purchaseOrderId: data.purchaseOrderId,
				variantId: data.variantId,
			},
		});

		if (existingItem) {
			throw new Error("Ova varijanta već postoji u narudžbenici");
		}

		const totalCost = data.quantityOrdered * data.costPerUnit;

		const item = await db.purchase_order_items.create({
			data: {
				id: nanoid(),
				purchaseOrderId: data.purchaseOrderId,
				productId: data.productId,
				variantId: data.variantId,
				productName: data.productName,
				variantTitle: data.variantTitle ?? null,
				sku: data.sku ?? null,
				quantityOrdered: data.quantityOrdered,
				costPerUnit: data.costPerUnit,
				totalCost,
			},
		});

		// Update PO totals
		await updatePOTotals(data.purchaseOrderId);

		return item;
	});

// Update purchase order item
export const updatePurchaseOrderItemServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			itemId: z.string(),
			quantityOrdered: z.number().min(1).optional(),
			costPerUnit: z.number().min(0).optional(),
		})
	)
	.handler(async ({ data }) => {
		const existingItem = await db.purchase_order_items.findUnique({
			where: { id: data.itemId },
			include: { purchaseOrder: true },
		});

		if (!existingItem) {
			throw new Error("Stavka nije pronađena");
		}

		if (existingItem.purchaseOrder.status !== "draft") {
			throw new Error(
				"Možete ažurirati stavke samo na narudžbenicama u statusu draft"
			);
		}

		const quantityOrdered =
			data.quantityOrdered ?? existingItem.quantityOrdered;
		const costPerUnit =
			data.costPerUnit ?? Number(existingItem.costPerUnit);
		const totalCost = quantityOrdered * costPerUnit;

		const item = await db.purchase_order_items.update({
			where: { id: data.itemId },
			data: {
				...(data.quantityOrdered !== undefined && {
					quantityOrdered: data.quantityOrdered,
				}),
				...(data.costPerUnit !== undefined && { costPerUnit: data.costPerUnit }),
				totalCost,
			},
		});

		// Update PO totals
		await updatePOTotals(existingItem.purchaseOrderId);

		return item;
	});

// Remove item from purchase order
export const removePurchaseOrderItemServerFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ itemId: z.string() }))
	.handler(async ({ data }) => {
		const existingItem = await db.purchase_order_items.findUnique({
			where: { id: data.itemId },
			include: { purchaseOrder: true },
		});

		if (!existingItem) {
			throw new Error("Stavka nije pronađena");
		}

		if (existingItem.purchaseOrder.status !== "draft") {
			throw new Error(
				"Možete brisati stavke samo sa narudžbenica u statusu draft"
			);
		}

		await db.purchase_order_items.delete({
			where: { id: data.itemId },
		});

		// Update PO totals
		await updatePOTotals(existingItem.purchaseOrderId);

		return { success: true };
	});

// Helper to update PO totals
async function updatePOTotals(purchaseOrderId: string): Promise<void> {
	const items = await db.purchase_order_items.findMany({
		where: { purchaseOrderId },
	});

	const totalItems = items.length;
	const totalQuantity = items.reduce((sum, i) => sum + i.quantityOrdered, 0);
	const receivedQuantity = items.reduce((sum, i) => sum + i.quantityReceived, 0);
	const totalCost = items.reduce((sum, i) => sum + Number(i.totalCost), 0);

	await db.purchase_orders.update({
		where: { id: purchaseOrderId },
		data: {
			totalItems,
			totalQuantity,
			receivedQuantity,
			totalCost,
		},
	});
}

// ==================== STATUS TRANSITIONS ====================

// Mark PO as ordered
export const markPurchaseOrderOrderedServerFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ id: z.string() }))
	.handler(async ({ data }) => {
		const po = await db.purchase_orders.findUnique({
			where: { id: data.id },
			include: { items: true },
		});

		if (!po) {
			throw new Error("Narudžbenica nije pronađena");
		}

		if (po.status !== "draft") {
			throw new Error("Samo draft narudžbenice mogu biti označene kao naručene");
		}

		if (po.items.length === 0) {
			throw new Error("Narudžbenica mora imati barem jednu stavku");
		}

		const purchaseOrder = await db.purchase_orders.update({
			where: { id: data.id },
			data: {
				status: "ordered",
				orderDate: new Date(),
			},
		});

		return purchaseOrder;
	});

// Cancel purchase order
export const cancelPurchaseOrderServerFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ id: z.string() }))
	.handler(async ({ data }) => {
		const po = await db.purchase_orders.findUnique({
			where: { id: data.id },
		});

		if (!po) {
			throw new Error("Narudžbenica nije pronađena");
		}

		if (po.status === "received") {
			throw new Error("Ne možete otkazati narudžbenicu koja je već primljena");
		}

		if (po.status === "cancelled") {
			throw new Error("Narudžbenica je već otkazana");
		}

		const purchaseOrder = await db.purchase_orders.update({
			where: { id: data.id },
			data: {
				status: "cancelled",
			},
		});

		return purchaseOrder;
	});

// ==================== RECEIVE STOCK (CRITICAL) ====================

// Receive stock from purchase order
export const receivePurchaseOrderServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			purchaseOrderId: z.string(),
			receivedItems: z.array(
				z.object({
					itemId: z.string(),
					quantityReceived: z.number().min(1),
				})
			),
			userId: z.string().optional().nullable(),
		})
	)
	.handler(async ({ data }) => {
		return await db.$transaction(
			async (tx) => {
				const po = await tx.purchase_orders.findUnique({
					where: { id: data.purchaseOrderId },
					include: { items: true },
				});

				if (!po) {
					throw new Error("Narudžbenica nije pronađena");
				}

				if (po.status === "cancelled" || po.status === "received") {
					throw new Error("Nevažeći status narudžbenice");
				}

				let totalReceived = po.receivedQuantity;

				for (const received of data.receivedItems) {
					const item = po.items.find((i) => i.id === received.itemId);
					if (!item) continue;

					const newReceived = item.quantityReceived + received.quantityReceived;
					if (newReceived > item.quantityOrdered) {
						throw new Error(
							`Ne možete primiti više nego što je naručeno za ${item.productName}`
						);
					}

					// 1. Update PO item
					await tx.purchase_order_items.update({
						where: { id: item.id },
						data: {
							quantityReceived: newReceived,
							status:
								newReceived >= item.quantityOrdered
									? "received"
									: "partially_received",
						},
					});

					// 2. Update inventory
					const inventory = await tx.inventory.findUnique({
						where: { variantId: item.variantId },
					});

					const previousAvailable = inventory?.available ?? 0;
					const previousReserved = inventory?.reserved ?? 0;

					if (inventory) {
						await tx.inventory.update({
							where: { variantId: item.variantId },
							data: {
								onHand: inventory.onHand + received.quantityReceived,
								available: inventory.available + received.quantityReceived,
							},
						});
					} else {
						await tx.inventory.create({
							data: {
								id: nanoid(),
								variantId: item.variantId,
								onHand: received.quantityReceived,
								available: received.quantityReceived,
								reserved: 0,
								committed: 0,
							},
						});
					}

					// 3. Create inventory batch
					await tx.inventory_batches.create({
						data: {
							id: nanoid(),
							variantId: item.variantId,
							productId: item.productId,
							quantityAdded: received.quantityReceived,
							quantitySold: 0,
							quantityRemaining: received.quantityReceived,
							costPerUnit: item.costPerUnit,
							restockedAt: new Date(),
							source: "purchase_order",
							notes: `Primljeno iz narudžbenice #${po.orderNumber}`,
							userId: data.userId ?? null,
							purchaseOrderItemId: item.id,
						},
					});

					// 4. Create inventory tracking
					await tx.inventory_tracking.create({
						data: {
							id: nanoid(),
							variantId: item.variantId,
							productId: item.productId,
							type: "purchase_order_received",
							quantity: received.quantityReceived,
							previousAvailable,
							previousReserved,
							newAvailable: previousAvailable + received.quantityReceived,
							newReserved: previousReserved,
							reason: `Primljeno iz narudžbenice #${po.orderNumber}`,
							referenceType: "purchase_order",
							referenceId: data.purchaseOrderId,
							userId: data.userId ?? null,
						},
					});

					// 5. Update variant cost if different and track history
					const variant = await tx.product_variants.findUnique({
						where: { id: item.variantId },
						select: { cost: true },
					});

					const currentCost = variant?.cost ? Number(variant.cost) : null;
					const newCost = Number(item.costPerUnit);

					// Only update and track if cost is different
					if (currentCost !== newCost) {
						// Update variant cost
						await tx.product_variants.update({
							where: { id: item.variantId },
							data: { cost: newCost },
						});

						// Create cost history record
						await tx.variant_cost_history.create({
							data: {
								id: nanoid(),
								variantId: item.variantId,
								productId: item.productId,
								previousCost: currentCost,
								newCost: newCost,
								source: "purchase_order",
								referenceType: "purchase_order",
								referenceId: data.purchaseOrderId,
								notes: `Cijena ažurirana iz narudžbenice #${po.orderNumber}`,
								userId: data.userId ?? null,
							},
						});
					}

					totalReceived += received.quantityReceived;
				}

				// 6. Update PO status
				const allItemsReceived = po.items.every((item) => {
					const received = data.receivedItems.find((r) => r.itemId === item.id);
					const newReceived =
						item.quantityReceived + (received?.quantityReceived || 0);
					return newReceived >= item.quantityOrdered;
				});

				await tx.purchase_orders.update({
					where: { id: data.purchaseOrderId },
					data: {
						receivedQuantity: totalReceived,
						status: allItemsReceived ? "received" : "partially_received",
						receivedDate: allItemsReceived ? new Date() : null,
					},
				});

				return { success: true };
			},
			{
				timeout: 30000,
			}
		);
	});

// ==================== STATS ====================

// Get purchase order stats
export const getPurchaseOrderStatsServerFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({}))
	.handler(async () => {
		const [totalCount, statusCounts, pendingValue] = await Promise.all([
			db.purchase_orders.count(),
			db.purchase_orders.groupBy({
				by: ["status"],
				_count: { id: true },
			}),
			db.purchase_orders.aggregate({
				where: {
					status: { in: ["ordered", "partially_received"] },
				},
				_sum: { totalCost: true },
			}),
		]);

		const statusMap = statusCounts.reduce(
			(acc, s) => {
				acc[s.status] = s._count.id;
				return acc;
			},
			{} as Record<string, number>
		);

		// Get this month's received value
		const startOfMonth = new Date();
		startOfMonth.setDate(1);
		startOfMonth.setHours(0, 0, 0, 0);

		const thisMonthReceived = await db.purchase_orders.aggregate({
			where: {
				status: "received",
				receivedDate: { gte: startOfMonth },
			},
			_sum: { totalCost: true },
		});

		return {
			total: totalCount,
			draft: statusMap["draft"] || 0,
			ordered: statusMap["ordered"] || 0,
			partiallyReceived: statusMap["partially_received"] || 0,
			received: statusMap["received"] || 0,
			cancelled: statusMap["cancelled"] || 0,
			pendingDelivery: (statusMap["ordered"] || 0) + (statusMap["partially_received"] || 0),
			valueInTransit: Number(pendingValue._sum.totalCost) || 0,
			receivedThisMonth: Number(thisMonthReceived._sum.totalCost) || 0,
		};
	});

// ==================== QUERY OPTIONS ====================

export function getPurchaseOrdersQueryOptions(params?: {
	search?: string;
	status?:
		| "all"
		| "draft"
		| "ordered"
		| "partially_received"
		| "received"
		| "cancelled";
	vendorId?: string;
	startDate?: string;
	endDate?: string;
	page?: number;
	limit?: number;
}) {
	return queryOptions({
		queryKey: [PURCHASE_ORDERS_QUERY_KEY, params],
		queryFn: () => getPurchaseOrdersServerFn({ data: params ?? {} }),
	});
}

export function getPurchaseOrderQueryOptions(id: string) {
	return queryOptions({
		queryKey: [PURCHASE_ORDERS_QUERY_KEY, id],
		queryFn: () => getPurchaseOrderServerFn({ data: { id } }),
	});
}

export function getPurchaseOrderStatsQueryOptions() {
	return queryOptions({
		queryKey: [PURCHASE_ORDERS_QUERY_KEY, "stats"],
		queryFn: () => getPurchaseOrderStatsServerFn({ data: {} }),
	});
}
