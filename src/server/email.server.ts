import nodemailer from "nodemailer";
import { render } from "@react-email/render";
import { nanoid } from "nanoid";
import { db } from "@/db/db";
import { WelcomeEmail } from "@/emails/templates/WelcomeEmail";
import { OrderConfirmationEmail } from "@/emails/templates/OrderConfirmationEmail";
import { OrderFulfilledEmail } from "@/emails/templates/OrderFulfilledEmail";
import { OrderCancelledEmail } from "@/emails/templates/OrderCancelledEmail";
import { AbandonedCheckoutEmail } from "@/emails/templates/AbandonedCheckoutEmail";
import { PasswordResetEmail } from "@/emails/templates/PasswordResetEmail";

// Email types for logging
export type EmailType = "welcome" | "order_confirmation" | "order_fulfilled" | "order_cancelled" | "abandoned_checkout" | "password_reset";

// ============================================================================
// CONFIGURATION
// ============================================================================

interface SmtpConfig {
	host: string;
	port: number;
	secure: boolean;
	auth: {
		user: string;
		pass: string;
	};
	from: string;
}

function getSmtpConfig(): SmtpConfig {
	return {
		host: process.env.SMTP_HOST || "",
		port: parseInt(process.env.SMTP_PORT || "587"),
		secure: process.env.SMTP_SECURE === "true",
		auth: {
			user: process.env.SMTP_USER || "",
			pass: process.env.SMTP_PASS || "",
		},
		from: process.env.SMTP_FROM || "noreply@example.com",
	};
}

function isEmailConfigured(): boolean {
	const config = getSmtpConfig();
	return !!(config.host && config.auth.user && config.auth.pass);
}

// ============================================================================
// SHOP BRANDING
// ============================================================================

interface ButtonColors {
	bgColor: string;
	textColor: string;
}

interface ShopBranding {
	name: string;
	logo: string;
	url: string;
	buttonColors: ButtonColors;
}

async function getShopBranding(): Promise<ShopBranding> {
	const settings = await db.settings.findMany({
		where: { key: { in: ["shop_title", "shop_logo", "email_logo", "email_button_bg_color", "email_button_text_color"] } },
	});

	const shopTitle = settings.find((s) => s.key === "shop_title")?.value || "Shop";
	const emailLogo = settings.find((s) => s.key === "email_logo")?.value || "";
	const shopLogo = settings.find((s) => s.key === "shop_logo")?.value || "";
	const buttonBgColor = settings.find((s) => s.key === "email_button_bg_color")?.value || "#2563eb";
	const buttonTextColor = settings.find((s) => s.key === "email_button_text_color")?.value || "#ffffff";

	return {
		name: shopTitle,
		logo: emailLogo || shopLogo, // Prioritize email logo, fallback to shop logo
		url: process.env.SITE_URL || "http://localhost:3000",
		buttonColors: {
			bgColor: buttonBgColor,
			textColor: buttonTextColor,
		},
	};
}

// ============================================================================
// EMAIL TRANSPORT
// ============================================================================

function createTransport() {
	const config = getSmtpConfig();
	return nodemailer.createTransport({
		host: config.host,
		port: config.port,
		secure: config.secure,
		auth: config.auth,
	});
}

interface SendEmailOptions {
	to: string;
	subject: string;
	html: string;
	type: EmailType;
	metadata?: Record<string, unknown>;
	fromName?: string;
}

async function logEmail(
	options: Omit<SendEmailOptions, "html">,
	status: "pending" | "sent" | "failed",
	errorMessage?: string
): Promise<string> {
	const id = nanoid();
	await db.email_logs.create({
		data: {
			id,
			to: options.to,
			subject: options.subject,
			type: options.type,
			status,
			errorMessage: errorMessage || null,
			metadata: options.metadata ? JSON.stringify(options.metadata) : null,
			sentAt: status === "sent" ? new Date() : null,
		},
	});
	return id;
}

async function updateEmailLog(id: string, status: "sent" | "failed", errorMessage?: string): Promise<void> {
	await db.email_logs.update({
		where: { id },
		data: {
			status,
			errorMessage: errorMessage || null,
			sentAt: status === "sent" ? new Date() : null,
		},
	});
}

async function sendEmail(options: SendEmailOptions): Promise<void> {
	// Log email as pending first
	const logId = await logEmail(options, "pending");

	if (!isEmailConfigured()) {
		console.log("[Email] SMTP not configured, skipping email send");
		await updateEmailLog(logId, "failed", "SMTP not configured");
		return;
	}

	const config = getSmtpConfig();
	const transport = createTransport();

	// Format from address with sender name if provided
	const fromAddress = options.fromName
		? `"${options.fromName}" <${config.from}>`
		: config.from;

	try {
		await transport.sendMail({
			from: fromAddress,
			to: options.to,
			subject: options.subject,
			html: options.html,
		});
		await updateEmailLog(logId, "sent");
		console.log(`[Email] Sent "${options.subject}" to ${options.to}`);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : "Unknown error";
		await updateEmailLog(logId, "failed", errorMessage);
		console.error("[Email] Failed to send email:", error);
		throw error;
	}
}

// ============================================================================
// WELCOME EMAIL
// ============================================================================

export async function sendWelcomeEmail(
	to: string,
	customerName: string
): Promise<void> {
	try {
		const branding = await getShopBranding();

		const html = await render(
			WelcomeEmail({
				customerName,
				shopName: branding.name,
				shopLogo: branding.logo,
				shopUrl: branding.url,
				buttonColors: branding.buttonColors,
			})
		);

		await sendEmail({
			to,
			subject: `Dobrodošli u ${branding.name}!`,
			html,
			type: "welcome",
			metadata: { customerName },
			fromName: branding.name,
		});
	} catch (error) {
		console.error("[Email] Failed to send welcome email:", error);
		// Don't throw - email failures shouldn't break registration
	}
}

// ============================================================================
// ORDER CONFIRMATION EMAIL
// ============================================================================

export async function sendOrderConfirmationEmail(
	to: string,
	orderId: string
): Promise<void> {
	try {
		const branding = await getShopBranding();

		// Fetch order with all required data
		const order = await db.orders.findUnique({
			where: { id: orderId },
			include: {
				customer: true,
			},
		});

		if (!order) {
			console.error("[Email] Order not found:", orderId);
			return;
		}

		// Fetch order items with images
		const orderItems = await db.order_items.findMany({
			where: { orderId },
		});

		// Get images for items
		const items = await Promise.all(
			orderItems.map(async (item) => {
				let imageUrl: string | undefined;

				if (item.variantId) {
					const variantMedia = await db.product_variant_media.findFirst({
						where: { variantId: item.variantId, isPrimary: true },
						include: { media: true },
					});
					imageUrl = variantMedia?.media?.url || undefined;
				}

				if (!imageUrl && item.productId) {
					const productMedia = await db.product_media.findFirst({
						where: { productId: item.productId, isPrimary: true },
						include: { media: true },
					});
					imageUrl = productMedia?.media?.url || undefined;
				}

				return {
					name: item.title,
					image: imageUrl,
					quantity: item.quantity,
					price: parseFloat(String(item.price)),
					variant: item.variantTitle || undefined,
				};
			})
		);

		// Fetch shipping address
		const shippingAddress = await db.addresses.findFirst({
			where: { orderId, type: "shipping" },
		});

		const customerName =
			order.customer?.firstName ||
			shippingAddress?.firstName ||
			"Kupče";

		const html = await render(
			OrderConfirmationEmail({
				order: {
					id: order.id,
					orderNumber: order.orderNumber,
					items,
					subtotal: parseFloat(String(order.subtotal)),
					shipping: parseFloat(String(order.shipping)),
					discount: parseFloat(String(order.discount)),
					total: parseFloat(String(order.total)),
					shippingAddress: shippingAddress
						? {
								firstName: shippingAddress.firstName || "",
								lastName: shippingAddress.lastName || "",
								address: shippingAddress.address1,
								city: shippingAddress.city,
								postalCode: shippingAddress.zip || "",
								country: shippingAddress.country,
							}
						: {
								firstName: "",
								lastName: "",
								address: "",
								city: "",
								postalCode: "",
								country: "",
							},
				},
				customerName,
				shopName: branding.name,
				shopLogo: branding.logo,
				shopUrl: branding.url,
				buttonColors: branding.buttonColors,
			})
		);

		await sendEmail({
			to,
			subject: `Potvrda narudžbe #${order.orderNumber} - ${branding.name}`,
			html,
			type: "order_confirmation",
			metadata: { orderId, orderNumber: order.orderNumber, customerName },
			fromName: branding.name,
		});
	} catch (error) {
		console.error("[Email] Failed to send order confirmation email:", error);
	}
}

// ============================================================================
// ORDER FULFILLED EMAIL
// ============================================================================

export async function sendOrderFulfilledEmail(
	to: string,
	orderId: string,
	tracking?: { number: string; shippingCompany?: string; url?: string }
): Promise<void> {
	try {
		const branding = await getShopBranding();

		// Fetch order
		const order = await db.orders.findUnique({
			where: { id: orderId },
			include: { customer: true },
		});

		if (!order) {
			console.error("[Email] Order not found:", orderId);
			return;
		}

		// Fetch order items with images
		const orderItems = await db.order_items.findMany({
			where: { orderId },
		});

		const items = await Promise.all(
			orderItems.map(async (item) => {
				let imageUrl: string | undefined;

				if (item.variantId) {
					const variantMedia = await db.product_variant_media.findFirst({
						where: { variantId: item.variantId, isPrimary: true },
						include: { media: true },
					});
					imageUrl = variantMedia?.media?.url || undefined;
				}

				if (!imageUrl && item.productId) {
					const productMedia = await db.product_media.findFirst({
						where: { productId: item.productId, isPrimary: true },
						include: { media: true },
					});
					imageUrl = productMedia?.media?.url || undefined;
				}

				return {
					name: item.title,
					image: imageUrl,
					quantity: item.quantity,
					price: parseFloat(String(item.price)),
					variant: item.variantTitle || undefined,
				};
			})
		);

		// Fetch shipping address for customer name
		const shippingAddress = await db.addresses.findFirst({
			where: { orderId, type: "shipping" },
		});

		const customerName =
			order.customer?.firstName ||
			shippingAddress?.firstName ||
			"Kupče";

		// Check if this is a cash on delivery order
		const isCashOnDelivery = order.paymentMethodType === "cod";

		// Check if this is a local pickup order
		const isLocalPickup = order.isLocalPickup === true;

		// Fetch pickup location settings if local pickup
		let pickupLocation: { address?: string; mapsUrl?: string } | undefined;
		if (isLocalPickup) {
			const pickupSettings = await db.settings.findMany({
				where: { key: { in: ["pickup_location_url", "pickup_location_address"] } },
			});
			const pickupLocationUrl = pickupSettings.find((s) => s.key === "pickup_location_url")?.value;
			const pickupLocationAddress = pickupSettings.find((s) => s.key === "pickup_location_address")?.value;

			if (pickupLocationUrl || pickupLocationAddress) {
				pickupLocation = {
					address: pickupLocationAddress || undefined,
					mapsUrl: pickupLocationUrl || undefined,
				};
			}
		}

		const html = await render(
			OrderFulfilledEmail({
				order: {
					id: order.id,
					orderNumber: order.orderNumber,
					items,
					subtotal: parseFloat(String(order.subtotal)),
					shipping: parseFloat(String(order.shipping)),
					discount: parseFloat(String(order.discount)),
					total: parseFloat(String(order.total)),
				},
				trackingNumber: tracking?.number || order.trackingNumber || undefined,
				shippingCompany: tracking?.shippingCompany || order.shippingCompany || undefined,
				trackingUrl: tracking?.url,
				payment: {
					isCashOnDelivery,
					total: parseFloat(String(order.total)),
					paymentMethod: order.paymentMethodTitle || undefined,
				},
				isLocalPickup,
				pickupLocation,
				customerName,
				shopName: branding.name,
				shopLogo: branding.logo,
				shopUrl: branding.url,
				buttonColors: branding.buttonColors,
			})
		);

		// Different subject line for local pickup vs delivery
		const subject = isLocalPickup
			? `Vaša narudžba #${order.orderNumber} je spremna za preuzimanje! - ${branding.name}`
			: `Vaša narudžba #${order.orderNumber} je poslana! - ${branding.name}`;

		await sendEmail({
			to,
			subject,
			html,
			type: "order_fulfilled",
			metadata: { orderId, orderNumber: order.orderNumber, customerName, trackingNumber: tracking?.number, isLocalPickup },
			fromName: branding.name,
		});
	} catch (error) {
		console.error("[Email] Failed to send order fulfilled email:", error);
	}
}

// ============================================================================
// ORDER CANCELLED EMAIL
// ============================================================================

export async function sendOrderCancelledEmail(
	to: string,
	orderId: string
): Promise<void> {
	try {
		const branding = await getShopBranding();

		// Fetch order
		const order = await db.orders.findUnique({
			where: { id: orderId },
			include: { customer: true },
		});

		if (!order) {
			console.error("[Email] Order not found:", orderId);
			return;
		}

		// Fetch shipping address for customer name
		const shippingAddress = await db.addresses.findFirst({
			where: { orderId, type: "shipping" },
		});

		const customerName =
			order.customer?.firstName ||
			shippingAddress?.firstName ||
			"Kupče";

		const html = await render(
			OrderCancelledEmail({
				order: {
					id: order.id,
					orderNumber: order.orderNumber,
					total: parseFloat(String(order.total)),
				},
				customerName,
				shopName: branding.name,
				shopLogo: branding.logo,
				shopUrl: branding.url,
				buttonColors: branding.buttonColors,
			})
		);

		await sendEmail({
			to,
			subject: `Narudžba #${order.orderNumber} je otkazana - ${branding.name}`,
			html,
			type: "order_cancelled",
			metadata: { orderId, orderNumber: order.orderNumber, customerName },
			fromName: branding.name,
		});
	} catch (error) {
		console.error("[Email] Failed to send order cancelled email:", error);
	}
}

// ============================================================================
// ABANDONED CHECKOUT EMAIL
// ============================================================================

interface AbandonedCartItem {
	productId?: string | null;
	variantId?: string | null;
	title: string;
	sku?: string | null;
	quantity: number;
	price: number;
	variantTitle?: string | null;
	imageUrl?: string | null;
}

export async function sendAbandonedCheckoutEmail(
	to: string,
	checkoutId: string,
	cartItems: AbandonedCartItem[],
	subtotal: number,
	customerName?: string,
	checkoutUrl?: string
): Promise<void> {
	try {
		const branding = await getShopBranding();

		// Transform cart items to email format with images
		const items = await Promise.all(
			cartItems.map(async (item) => {
				let imageUrl = item.imageUrl || undefined;

				// If no image URL in cart data, try to fetch from database
				if (!imageUrl && item.variantId) {
					const variantMedia = await db.product_variant_media.findFirst({
						where: { variantId: item.variantId, isPrimary: true },
						include: { media: true },
					});
					imageUrl = variantMedia?.media?.url || undefined;
				}

				if (!imageUrl && item.productId) {
					const productMedia = await db.product_media.findFirst({
						where: { productId: item.productId, isPrimary: true },
						include: { media: true },
					});
					imageUrl = productMedia?.media?.url || undefined;
				}

				return {
					name: item.title,
					image: imageUrl,
					quantity: item.quantity,
					price: item.price,
					variant: item.variantTitle || undefined,
				};
			})
		);

		const html = await render(
			AbandonedCheckoutEmail({
				items,
				subtotal,
				customerName,
				checkoutUrl: checkoutUrl || `${branding.url}/checkout`,
				shopName: branding.name,
				shopLogo: branding.logo,
				shopUrl: branding.url,
				buttonColors: branding.buttonColors,
			})
		);

		await sendEmail({
			to,
			subject: `Zaboravili ste nešto? - ${branding.name}`,
			html,
			type: "abandoned_checkout",
			metadata: { checkoutId, customerName, itemCount: items.length, subtotal },
			fromName: branding.name,
		});
	} catch (error) {
		console.error("[Email] Failed to send abandoned checkout email:", error);
		throw error; // Re-throw to allow retry logic in cron
	}
}

// ============================================================================
// PASSWORD RESET EMAIL
// ============================================================================

export async function sendPasswordResetEmail(
	to: string,
	customerName: string,
	resetUrl: string
): Promise<void> {
	try {
		const branding = await getShopBranding();

		const html = await render(
			PasswordResetEmail({
				customerName,
				resetUrl,
				shopName: branding.name,
				shopLogo: branding.logo,
				shopUrl: branding.url,
				buttonColors: branding.buttonColors,
			})
		);

		await sendEmail({
			to,
			subject: `Resetujte lozinku - ${branding.name}`,
			html,
			type: "password_reset",
			metadata: { customerName },
			fromName: branding.name,
		});
	} catch (error) {
		console.error("[Email] Failed to send password reset email:", error);
		throw error;
	}
}
