import { db } from "@/db/db";
import { createServerFn } from "@tanstack/react-start";
import { settings as settingsTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { nanoid } from "nanoid";

export const SETTINGS_QUERY_KEY = "settings";

// Get SKU generator settings
export const getSkuGeneratorSettingsServerFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({}).optional())
  .handler(async () => {
    const [skuPrefix] = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.key, "sku_prefix"))
      .limit(1);

    const [skuDigits] = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.key, "sku_digits"))
      .limit(1);

    const [skuCounter] = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.key, "sku_counter"))
      .limit(1);

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
    const [existingPrefix] = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.key, "sku_prefix"))
      .limit(1);

    if (existingPrefix) {
      await db
        .update(settingsTable)
        .set({
          value: data.prefix,
          updatedAt: new Date(),
        })
        .where(eq(settingsTable.key, "sku_prefix"));
    } else {
      await db.insert(settingsTable).values({
        id: nanoid(),
        key: "sku_prefix",
        value: data.prefix,
        type: "string",
        group: "sku",
      });
    }

    // Update or create sku_digits
    const [existingDigits] = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.key, "sku_digits"))
      .limit(1);

    if (existingDigits) {
      await db
        .update(settingsTable)
        .set({
          value: String(data.digits),
          updatedAt: new Date(),
        })
        .where(eq(settingsTable.key, "sku_digits"));
    } else {
      await db.insert(settingsTable).values({
        id: nanoid(),
        key: "sku_digits",
        value: String(data.digits),
        type: "number",
        group: "sku",
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
    const [skuCounter] = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.key, "sku_counter"))
      .limit(1);

    const currentCounter = skuCounter
      ? parseInt(skuCounter.value || "0")
      : 0;
    const nextCounter = currentCounter + 1;

    // Update counter
    if (skuCounter) {
      await db
        .update(settingsTable)
        .set({
          value: String(nextCounter),
          updatedAt: new Date(),
        })
        .where(eq(settingsTable.key, "sku_counter"));
    } else {
      await db.insert(settingsTable).values({
        id: nanoid(),
        key: "sku_counter",
        value: String(nextCounter),
        type: "number",
        group: "sku",
      });
    }

    // Generate SKU
    const paddedNumber = String(nextCounter).padStart(skuSettings.digits, "0");
    return `${skuSettings.prefix}${paddedNumber}`;
  });

