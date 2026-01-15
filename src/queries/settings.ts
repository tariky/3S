import { db } from "@/db/db";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { nanoid } from "nanoid";

export const SETTINGS_QUERY_KEY = "settings";

// Helper function to find a setting value from an array of settings
function findSettingValue(
  settings: Array<{ key: string; value: string | null }>,
  key: string
): string | null {
  const setting = settings.find((s) => s.key === key);
  return setting?.value ?? null;
}

// Helper function to upsert a setting
async function upsertSetting(
  key: string,
  value: string,
  type: string,
  group: string
): Promise<void> {
  const existing = await db.settings.findFirst({ where: { key } });

  if (existing) {
    await db.settings.update({
      where: { id: existing.id },
      data: { value, updatedAt: new Date() },
    });
  } else {
    await db.settings.create({
      data: {
        id: nanoid(),
        key,
        value,
        type,
        group,
      },
    });
  }
}

// Get SKU generator settings
export const getSkuGeneratorSettingsServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({}).optional())
  .handler(async () => {
    const skuPrefix = await db.settings.findFirst({
      where: { key: "sku_prefix" },
    });

    const skuDigits = await db.settings.findFirst({
      where: { key: "sku_digits" },
    });

    const skuCounter = await db.settings.findFirst({
      where: { key: "sku_counter" },
    });

    return {
      prefix: skuPrefix?.value || "SKU",
      digits: skuDigits ? parseInt(skuDigits.value || "5") : 5,
      counter: skuCounter ? parseInt(skuCounter.value || "0") : 0,
    };
  });

// Update SKU generator settings
export const updateSkuGeneratorSettingsServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(
    z.object({
      prefix: z.string().min(1).max(10),
      digits: z.number().min(1).max(10),
    })
  )
  .handler(async ({ data }) => {
    // Update or create sku_prefix
    const existingPrefix = await db.settings.findFirst({
      where: { key: "sku_prefix" },
    });

    if (existingPrefix) {
      await db.settings.update({
        where: { id: existingPrefix.id },
        data: {
          value: data.prefix,
          updatedAt: new Date(),
        },
      });
    } else {
      await db.settings.create({
        data: {
          id: nanoid(),
          key: "sku_prefix",
          value: data.prefix,
          type: "string",
          group: "sku",
        },
      });
    }

    // Update or create sku_digits
    const existingDigits = await db.settings.findFirst({
      where: { key: "sku_digits" },
    });

    if (existingDigits) {
      await db.settings.update({
        where: { id: existingDigits.id },
        data: {
          value: String(data.digits),
          updatedAt: new Date(),
        },
      });
    } else {
      await db.settings.create({
        data: {
          id: nanoid(),
          key: "sku_digits",
          value: String(data.digits),
          type: "number",
          group: "sku",
        },
      });
    }

    return { success: true };
  });

// Get next SKU number and increment counter
export const getNextSkuNumberServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({}).optional())
  .handler(async () => {
    const skuSettings = await getSkuGeneratorSettingsServerFn();

    // Get current counter
    const skuCounter = await db.settings.findFirst({
      where: { key: "sku_counter" },
    });

    const currentCounter = skuCounter
      ? parseInt(skuCounter.value || "0")
      : 0;
    const nextCounter = currentCounter + 1;

    // Update counter
    if (skuCounter) {
      await db.settings.update({
        where: { id: skuCounter.id },
        data: {
          value: String(nextCounter),
          updatedAt: new Date(),
        },
      });
    } else {
      await db.settings.create({
        data: {
          id: nanoid(),
          key: "sku_counter",
          value: String(nextCounter),
          type: "number",
          group: "sku",
        },
      });
    }

    // Generate SKU
    const paddedNumber = String(nextCounter).padStart(skuSettings.digits, "0");
    return `${skuSettings.prefix}${paddedNumber}`;
  });

// ============================================================================
// SHOP SETTINGS
// ============================================================================

// Shop settings schema for validation
const shopSettingsSchema = z.object({
  shopTitle: z.string().max(255).optional().default(""),
  shopDescription: z.string().max(1000).optional().default(""),
  shopLogo: z.string().optional().default(""),
  shopLogoWidth: z.number().min(20).max(500).optional().default(120),
  shopLogoSvgContent: z.string().nullable().optional(),
  shopFavicon: z.string().optional().default(""),
  seoHomeTitle: z.string().max(70).optional().default(""),
  seoHomeDescription: z.string().max(160).optional().default(""),
  alertEnabled: z.boolean().optional().default(false),
  alertText: z.string().max(500).optional().default(""),
  alertLink: z.string().optional().default(""),
  alertIcon: z.string().optional().default("Bell"),
  alertBgColor: z.string().optional().default("bg-blue-500"),
  alertTextColor: z.string().optional().default("text-white"),
  // Product page info
  productShippingInfo: z.string().max(2000).optional().default(""),
  productPaymentInfo: z.string().max(2000).optional().default(""),
  // Local pickup location
  pickupLocationUrl: z.string().optional().default(""),
  pickupLocationAddress: z.string().max(500).optional().default(""),
  // Email settings
  emailLogo: z.string().optional().default(""),
  emailLogoWidth: z.number().min(50).max(400).optional().default(150),
  emailButtonBgColor: z.string().optional().default("#2563eb"),
  emailButtonTextColor: z.string().optional().default("#ffffff"),
});

export type ShopSettings = z.infer<typeof shopSettingsSchema>;

// Get all shop settings
export const getShopSettingsServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({}).optional())
  .handler(async () => {
    const settings = await db.settings.findMany({
      where: { group: { in: ["shop", "seo", "alert", "product", "pickup", "email"] } },
    });

    const logoWidthStr = findSettingValue(settings, "shop_logo_width");
    return {
      shopTitle: findSettingValue(settings, "shop_title") || "",
      shopDescription: findSettingValue(settings, "shop_description") || "",
      shopLogo: findSettingValue(settings, "shop_logo") || "",
      shopLogoWidth: logoWidthStr ? parseInt(logoWidthStr, 10) : 120,
      shopFavicon: findSettingValue(settings, "shop_favicon") || "",
      seoHomeTitle: findSettingValue(settings, "seo_home_title") || "",
      seoHomeDescription: findSettingValue(settings, "seo_home_description") || "",
      alertEnabled: findSettingValue(settings, "alert_enabled") === "true",
      alertText: findSettingValue(settings, "alert_text") || "",
      alertLink: findSettingValue(settings, "alert_link") || "",
      alertIcon: findSettingValue(settings, "alert_icon") || "Bell",
      alertBgColor: findSettingValue(settings, "alert_bg_color") || "bg-blue-500",
      alertTextColor: findSettingValue(settings, "alert_text_color") || "text-white",
      productShippingInfo: findSettingValue(settings, "product_shipping_info") || "",
      productPaymentInfo: findSettingValue(settings, "product_payment_info") || "",
      pickupLocationUrl: findSettingValue(settings, "pickup_location_url") || "",
      pickupLocationAddress: findSettingValue(settings, "pickup_location_address") || "",
      emailLogo: findSettingValue(settings, "email_logo") || "",
      emailLogoWidth: parseInt(findSettingValue(settings, "email_logo_width") || "150", 10),
      emailButtonBgColor: findSettingValue(settings, "email_button_bg_color") || "#2563eb",
      emailButtonTextColor: findSettingValue(settings, "email_button_text_color") || "#ffffff",
    };
  });

// Update all shop settings
export const updateShopSettingsServerFn = createServerFn({ method: "POST" })
  .inputValidator(shopSettingsSchema)
  .handler(async ({ data }) => {
    // Shop branding settings
    await upsertSetting("shop_title", data.shopTitle, "string", "shop");
    await upsertSetting("shop_description", data.shopDescription, "string", "shop");
    await upsertSetting("shop_logo", data.shopLogo, "string", "shop");
    await upsertSetting("shop_logo_width", String(data.shopLogoWidth), "number", "shop");
    await upsertSetting("shop_favicon", data.shopFavicon, "string", "shop");

    // SEO settings
    await upsertSetting("seo_home_title", data.seoHomeTitle, "string", "seo");
    await upsertSetting("seo_home_description", data.seoHomeDescription, "string", "seo");

    // Alert settings
    await upsertSetting("alert_enabled", String(data.alertEnabled), "boolean", "alert");
    await upsertSetting("alert_text", data.alertText, "string", "alert");
    await upsertSetting("alert_link", data.alertLink, "string", "alert");
    await upsertSetting("alert_icon", data.alertIcon, "string", "alert");
    await upsertSetting("alert_bg_color", data.alertBgColor, "string", "alert");
    await upsertSetting("alert_text_color", data.alertTextColor, "string", "alert");

    // Product page info settings
    await upsertSetting("product_shipping_info", data.productShippingInfo, "text", "product");
    await upsertSetting("product_payment_info", data.productPaymentInfo, "text", "product");

    // Pickup location settings
    await upsertSetting("pickup_location_url", data.pickupLocationUrl, "string", "pickup");
    await upsertSetting("pickup_location_address", data.pickupLocationAddress, "string", "pickup");

    // Email settings
    await upsertSetting("email_logo", data.emailLogo, "string", "email");
    await upsertSetting("email_logo_width", String(data.emailLogoWidth), "number", "email");
    await upsertSetting("email_button_bg_color", data.emailButtonBgColor, "string", "email");
    await upsertSetting("email_button_text_color", data.emailButtonTextColor, "string", "email");

    return { success: true };
  });

// ============================================================================
// PUBLIC SHOP SETTINGS (no auth required - for storefront)
// ============================================================================

// Helper to fetch SVG content
async function fetchSvgContent(url: string): Promise<string | null> {
  if (!url || !url.toLowerCase().endsWith(".svg")) {
    return null;
  }
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    const text = await response.text();
    if (text.includes("<svg") || text.includes("<?xml")) {
      return text;
    }
    return null;
  } catch {
    return null;
  }
}

// Get public shop settings for storefront display
export const getPublicShopSettingsServerFn = createServerFn({ method: "GET" })
  .handler(async () => {
    const settings = await db.settings.findMany({
      where: { group: { in: ["shop", "seo", "alert", "product"] } },
    });

    const logoWidthStr = findSettingValue(settings, "shop_logo_width");
    const shopLogo = findSettingValue(settings, "shop_logo") || "";

    // Pre-fetch SVG content for logo if it's an SVG
    const shopLogoSvgContent = await fetchSvgContent(shopLogo);

    return {
      // Branding
      shopTitle: findSettingValue(settings, "shop_title") || "Shop",
      shopDescription: findSettingValue(settings, "shop_description") || "",
      shopLogo,
      shopLogoWidth: logoWidthStr ? parseInt(logoWidthStr, 10) : 120,
      shopLogoSvgContent,
      shopFavicon: findSettingValue(settings, "shop_favicon") || "",
      // SEO
      seoHomeTitle: findSettingValue(settings, "seo_home_title") || "",
      seoHomeDescription: findSettingValue(settings, "seo_home_description") || "",
      // Alert
      alertEnabled: findSettingValue(settings, "alert_enabled") === "true",
      alertText: findSettingValue(settings, "alert_text") || "",
      alertLink: findSettingValue(settings, "alert_link") || "",
      alertIcon: findSettingValue(settings, "alert_icon") || "Bell",
      alertBgColor: findSettingValue(settings, "alert_bg_color") || "bg-blue-500",
      alertTextColor: findSettingValue(settings, "alert_text_color") || "text-white",
      // Product page info
      productShippingInfo: findSettingValue(settings, "product_shipping_info") || "",
      productPaymentInfo: findSettingValue(settings, "product_payment_info") || "",
    };
  });

// Query options for public shop settings
export const getPublicShopSettingsQueryOptions = () => {
  return {
    queryKey: [SETTINGS_QUERY_KEY, "public-shop"],
    queryFn: async () => {
      return await getPublicShopSettingsServerFn();
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  };
};
