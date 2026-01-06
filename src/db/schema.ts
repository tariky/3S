import { relations } from "drizzle-orm";
import {
  mysqlTable,
  varchar,
  text,
  timestamp,
  boolean,
  index,
  int,
  decimal,
  json,
  foreignKey,
} from "drizzle-orm/mysql-core";

export const user = mysqlTable("user", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { fsp: 3 })
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  role: text("role").default("customer").notNull(),
  phoneNumber: text("phone_number"),
});

export const session = mysqlTable(
  "session",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    expiresAt: timestamp("expires_at", { fsp: 3 }).notNull(),
    token: varchar("token", { length: 255 }).notNull().unique(),
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("session_userId_idx").on(table.userId)]
);

export const account = mysqlTable(
  "account",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { fsp: 3 }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { fsp: 3 }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("account_userId_idx").on(table.userId)]
);

export const verification = mysqlTable(
  "verification",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    identifier: varchar("identifier", { length: 255 }).notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { fsp: 3 }).notNull(),
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("verification_identifier_idx").on(table.identifier)]
);

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

// E-commerce schemas

// Vendors
export const vendors = mysqlTable(
  "vendors",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    website: varchar("website", { length: 255 }),
    address: text("address"),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("vendors_name_idx").on(table.name)]
);

// Product Categories
export const productCategories = mysqlTable(
  "product_categories",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    description: text("description"),
    image: text("image"),
    parentId: varchar("parent_id", { length: 36 }),
    position: int("position").default(0).notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("product_categories_parentId_idx").on(table.parentId),
    index("product_categories_slug_idx").on(table.slug),
  ]
);

// Variant Definitions (e.g., Size: S,M,L or Color: Red,Blue,Green)
export const definitions = mysqlTable("definitions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // size, color, material, etc.
  values: json("values").notNull(), // Array of values like ["S", "M", "L"]
  position: int("position").default(0).notNull(),
  createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { fsp: 3 })
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

// Products
export const products = mysqlTable(
  "products",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    description: text("description"),
    sku: varchar("sku", { length: 100 }), // Base SKU (variants have their own SKUs)
    price: decimal("price", { precision: 10, scale: 2 }).notNull(), // Base price (variants can override)
    compareAtPrice: decimal("compare_at_price", { precision: 10, scale: 2 }),
    cost: decimal("cost", { precision: 10, scale: 2 }), // Base cost (variants can override)
    trackQuantity: boolean("track_quantity").default(true).notNull(),
    status: varchar("status", { length: 50 }).default("draft").notNull(), // draft, active, archived
    featured: boolean("featured").default(false).notNull(),
    vendorId: varchar("vendor_id", { length: 36 }),
    categoryId: varchar("category_id", { length: 36 }),
    material: text("material"),
    weight: decimal("weight", { precision: 10, scale: 2 })
      .default("1")
      .notNull(),
    weightUnit: varchar("weight_unit", { length: 10 }).default("kg"),
    requiresShipping: boolean("requires_shipping").default(true).notNull(),
    taxIncluded: boolean("tax_included").default(false).notNull(),
    internalNote: text("internal_note"),
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("products_slug_idx").on(table.slug),
    index("products_status_idx").on(table.status),
    index("products_categoryId_idx").on(table.categoryId),
    index("products_vendorId_idx").on(table.vendorId),
  ]
);

// Product Options (Variant Option Definitions - e.g., Size: S, M, L)
export const productOptions = mysqlTable(
  "product_options",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    productId: varchar("product_id", { length: 36 })
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(), // e.g., "Size", "Color"
    position: int("position").default(0).notNull(),
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("product_options_productId_idx").on(table.productId)]
);

// Product Option Values (e.g., S, M, L for Size)
export const productOptionValues = mysqlTable(
  "product_option_values",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    optionId: varchar("option_id", { length: 36 })
      .notNull()
      .references(() => productOptions.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(), // e.g., "S", "M", "L"
    position: int("position").default(0).notNull(),
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("product_option_values_optionId_idx").on(table.optionId)]
);

// Product Variants
export const productVariants = mysqlTable(
  "product_variants",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    productId: varchar("product_id", { length: 36 })
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: varchar("sku", { length: 100 }),
    barcode: varchar("barcode", { length: 100 }),
    price: decimal("price", { precision: 10, scale: 2 }),
    compareAtPrice: decimal("compare_at_price", { precision: 10, scale: 2 }),
    cost: decimal("cost", { precision: 10, scale: 2 }),
    weight: decimal("weight", { precision: 10, scale: 2 }),
    position: int("position").default(0).notNull(),
    isDefault: boolean("is_default").default(false).notNull(), // For single variant products
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("product_variants_productId_idx").on(table.productId),
    index("product_variants_sku_idx").on(table.sku),
  ]
);

// Product Variant Options (Links variants to their option values)
export const productVariantOptions = mysqlTable(
  "product_variant_options",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    variantId: varchar("variant_id", { length: 36 }).notNull(),
    optionId: varchar("option_id", { length: 36 }).notNull(),
    optionValueId: varchar("option_value_id", { length: 36 }).notNull(),
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("product_variant_options_variantId_idx").on(table.variantId),
    index("product_variant_options_optionId_idx").on(table.optionId),
    index("product_variant_options_optionValueId_idx").on(table.optionValueId),
    foreignKey({
      name: "pvo_variant_fk",
      columns: [table.variantId],
      foreignColumns: [productVariants.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "pvo_option_fk",
      columns: [table.optionId],
      foreignColumns: [productOptions.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "pvo_option_value_fk",
      columns: [table.optionValueId],
      foreignColumns: [productOptionValues.id],
    }).onDelete("cascade"),
  ]
);

// Inventory (Tracks available and reserved inventory per variant)
export const inventory = mysqlTable(
  "inventory",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    variantId: varchar("variant_id", { length: 36 })
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" })
      .unique(),
    available: int("available").default(0).notNull(), // Available quantity
    reserved: int("reserved").default(0).notNull(), // Reserved quantity (pending fulfillment)
    onHand: int("on_hand").default(0).notNull(), // Physical quantity on hand
    committed: int("committed").default(0).notNull(), // Committed to orders
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("inventory_variantId_idx").on(table.variantId)]
);

// Inventory Tracking (History of all inventory movements)
export const inventoryTracking = mysqlTable(
  "inventory_tracking",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    variantId: varchar("variant_id", { length: 36 })
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    productId: varchar("product_id", { length: 36 })
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 50 }).notNull(), // adjustment, sale, return, restock, reservation, fulfillment, cancellation
    quantity: int("quantity").notNull(), // Positive for increases, negative for decreases
    previousAvailable: int("previous_available").notNull(),
    previousReserved: int("previous_reserved").notNull(),
    newAvailable: int("new_available").notNull(),
    newReserved: int("new_reserved").notNull(),
    reason: text("reason"), // Reason for the change
    referenceType: varchar("reference_type", { length: 50 }), // order, adjustment, etc.
    referenceId: varchar("reference_id", { length: 36 }), // ID of the order, adjustment, etc.
    userId: varchar("user_id", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }), // Who made the change
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
  },
  (table) => [
    index("inventory_tracking_variantId_idx").on(table.variantId),
    index("inventory_tracking_productId_idx").on(table.productId),
    index("inventory_tracking_type_idx").on(table.type),
    index("inventory_tracking_referenceType_referenceId_idx").on(
      table.referenceType,
      table.referenceId
    ),
    index("inventory_tracking_userId_idx").on(table.userId),
    index("inventory_tracking_createdAt_idx").on(table.createdAt),
  ]
);

// Media (Reusable across the app - products, pages, etc.)
export const media = mysqlTable(
  "media",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    filename: varchar("filename", { length: 255 }).notNull(),
    originalFilename: varchar("original_filename", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(), // image/jpeg, image/png, video/mp4, etc.
    size: int("size").notNull(), // File size in bytes
    url: text("url").notNull(), // Full URL to the media file
    alt: text("alt"), // Alt text for accessibility
    type: varchar("type", { length: 50 }).notNull(), // image, video, document, etc.
    storage: varchar("storage", { length: 50 }).default("local").notNull(), // local, s3, cloudinary, etc.
    metadata: json("metadata"), // Additional metadata (EXIF data, etc.)
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("media_type_idx").on(table.type),
    index("media_mimeType_idx").on(table.mimeType),
  ]
);

// Product Tags
export const productTags = mysqlTable(
  "product_tags",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("product_tags_slug_idx").on(table.slug)]
);

// Product Tags Junction Table (many-to-many)
export const productTagsToProducts = mysqlTable(
  "product_tags_to_products",
  {
    productId: varchar("product_id", { length: 36 })
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    tagId: varchar("tag_id", { length: 36 })
      .notNull()
      .references(() => productTags.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("product_tags_to_products_productId_idx").on(table.productId),
    index("product_tags_to_products_tagId_idx").on(table.tagId),
  ]
);

// Product Media Junction Table (many-to-many)
export const productMedia = mysqlTable(
  "product_media",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    productId: varchar("product_id", { length: 36 }).notNull(),
    mediaId: varchar("media_id", { length: 36 }).notNull(),
    position: int("position").default(0).notNull(), // For ordering media
    isPrimary: boolean("is_primary").default(false).notNull(), // Primary image/video
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("product_media_productId_idx").on(table.productId),
    index("product_media_mediaId_idx").on(table.mediaId),
    index("product_media_position_idx").on(table.position),
    foreignKey({
      name: "pm_product_fk",
      columns: [table.productId],
      foreignColumns: [products.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "pm_media_fk",
      columns: [table.mediaId],
      foreignColumns: [media.id],
    }).onDelete("cascade"),
  ]
);

// Product Variant Media Junction Table (many-to-many)
export const productVariantMedia = mysqlTable(
  "product_variant_media",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    variantId: varchar("variant_id", { length: 36 }).notNull(),
    mediaId: varchar("media_id", { length: 36 }).notNull(),
    position: int("position").default(0).notNull(), // For ordering media
    isPrimary: boolean("is_primary").default(false).notNull(), // Primary image/video
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("product_variant_media_variantId_idx").on(table.variantId),
    index("product_variant_media_mediaId_idx").on(table.mediaId),
    index("product_variant_media_position_idx").on(table.position),
    foreignKey({
      name: "pvm_variant_fk",
      columns: [table.variantId],
      foreignColumns: [productVariants.id],
    }).onDelete("cascade"),
    foreignKey({
      name: "pvm_media_fk",
      columns: [table.mediaId],
      foreignColumns: [media.id],
    }).onDelete("cascade"),
  ]
);

// Product Metafields
export const productMetafields = mysqlTable(
  "product_metafields",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    productId: varchar("product_id", { length: 36 })
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    namespace: varchar("namespace", { length: 100 }).notNull(),
    key: varchar("key", { length: 100 }).notNull(),
    value: text("value"),
    type: varchar("type", { length: 50 }).notNull(), // string, number, json, etc.
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("product_metafields_productId_idx").on(table.productId),
    index("product_metafields_namespace_key_idx").on(
      table.namespace,
      table.key
    ),
  ]
);

// Customers
export const customers = mysqlTable(
  "customers",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    firstName: varchar("first_name", { length: 255 }),
    lastName: varchar("last_name", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    acceptsMarketing: boolean("accepts_marketing").default(false).notNull(),
    totalSpent: decimal("total_spent", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    ordersCount: int("orders_count").default(0).notNull(),
    status: varchar("status", { length: 50 }).default("active").notNull(),
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("customers_email_idx").on(table.email),
    index("customers_status_idx").on(table.status),
  ]
);

// Customer Metafields
export const customerMetafields = mysqlTable(
  "customer_metafields",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    customerId: varchar("customer_id", { length: 36 })
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    namespace: varchar("namespace", { length: 100 }).notNull(),
    key: varchar("key", { length: 100 }).notNull(),
    value: text("value"),
    type: varchar("type", { length: 50 }).notNull(),
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("customer_metafields_customerId_idx").on(table.customerId),
    index("customer_metafields_namespace_key_idx").on(
      table.namespace,
      table.key
    ),
  ]
);

// Addresses
export const addresses = mysqlTable(
  "addresses",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    customerId: varchar("customer_id", { length: 36 }).references(
      () => customers.id,
      { onDelete: "cascade" }
    ),
    orderId: varchar("order_id", { length: 36 }), // For order addresses
    type: varchar("type", { length: 20 }).notNull(), // billing, shipping
    firstName: varchar("first_name", { length: 255 }),
    lastName: varchar("last_name", { length: 255 }),
    company: varchar("company", { length: 255 }),
    address1: varchar("address1", { length: 255 }).notNull(),
    address2: varchar("address2", { length: 255 }),
    city: varchar("city", { length: 100 }).notNull(),
    state: varchar("state", { length: 100 }),
    zip: varchar("zip", { length: 20 }),
    country: varchar("country", { length: 100 }).notNull(),
    phone: varchar("phone", { length: 50 }),
    isDefault: boolean("is_default").default(false).notNull(),
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("addresses_customerId_idx").on(table.customerId),
    index("addresses_orderId_idx").on(table.orderId),
  ]
);

// Orders
export const orders = mysqlTable(
  "orders",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    orderNumber: varchar("order_number", { length: 50 }).notNull().unique(),
    customerId: varchar("customer_id", { length: 36 }).references(
      () => customers.id,
      { onDelete: "set null" }
    ),
    email: varchar("email", { length: 255 }),
    status: varchar("status", { length: 50 }).notNull(), // pending, paid, fulfilled, cancelled, refunded
    financialStatus: varchar("financial_status", { length: 50 }), // pending, paid, refunded
    fulfillmentStatus: varchar("fulfillment_status", { length: 50 }), // unfulfilled, fulfilled, partial
    subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
    tax: decimal("tax", { precision: 10, scale: 2 }).default("0").notNull(),
    shipping: decimal("shipping", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    discount: decimal("discount", { precision: 10, scale: 2 })
      .default("0")
      .notNull(),
    total: decimal("total", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("BAM").notNull(),
    note: text("note"),
    cancelledAt: timestamp("cancelled_at", { fsp: 3 }),
    cancelledReason: text("cancelled_reason"),
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("orders_orderNumber_idx").on(table.orderNumber),
    index("orders_customerId_idx").on(table.customerId),
    index("orders_status_idx").on(table.status),
  ]
);

// Order Items
export const orderItems = mysqlTable(
  "order_items",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    orderId: varchar("order_id", { length: 36 })
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: varchar("product_id", { length: 36 }).references(
      () => products.id,
      { onDelete: "set null" }
    ),
    variantId: varchar("variant_id", { length: 36 }).references(
      () => productVariants.id,
      { onDelete: "set null" }
    ),
    title: varchar("title", { length: 255 }).notNull(),
    sku: varchar("sku", { length: 100 }),
    quantity: int("quantity").notNull(),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
    total: decimal("total", { precision: 10, scale: 2 }).notNull(),
    variantTitle: varchar("variant_title", { length: 255 }),
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("order_items_orderId_idx").on(table.orderId),
    index("order_items_productId_idx").on(table.productId),
    index("order_items_variantId_idx").on(table.variantId),
  ]
);

// Order Metafields
export const orderMetafields = mysqlTable(
  "order_metafields",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    orderId: varchar("order_id", { length: 36 })
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    namespace: varchar("namespace", { length: 100 }).notNull(),
    key: varchar("key", { length: 100 }).notNull(),
    value: text("value"),
    type: varchar("type", { length: 50 }).notNull(),
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("order_metafields_orderId_idx").on(table.orderId),
    index("order_metafields_namespace_key_idx").on(table.namespace, table.key),
  ]
);

// Discounts
export const discounts = mysqlTable(
  "discounts",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    code: varchar("code", { length: 100 }).notNull().unique(),
    type: varchar("type", { length: 50 }).notNull(), // percentage, fixed_amount
    value: decimal("value", { precision: 10, scale: 2 }).notNull(),
    minimumPurchase: decimal("minimum_purchase", { precision: 10, scale: 2 }),
    maximumDiscount: decimal("maximum_discount", { precision: 10, scale: 2 }),
    usageLimit: int("usage_limit"),
    usageCount: int("usage_count").default(0).notNull(),
    startsAt: timestamp("starts_at", { fsp: 3 }),
    endsAt: timestamp("ends_at", { fsp: 3 }),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("discounts_code_idx").on(table.code),
    index("discounts_active_idx").on(table.active),
  ]
);

// Cart
export const cart = mysqlTable(
  "cart",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    customerId: varchar("customer_id", { length: 36 }).references(
      () => customers.id,
      { onDelete: "cascade" }
    ),
    sessionId: varchar("session_id", { length: 255 }), // For guest carts
    discountId: varchar("discount_id", { length: 36 }).references(
      () => discounts.id,
      { onDelete: "set null" }
    ),
    expiresAt: timestamp("expires_at", { fsp: 3 }),
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("cart_customerId_idx").on(table.customerId),
    index("cart_sessionId_idx").on(table.sessionId),
  ]
);

// Cart Items
export const cartItems = mysqlTable(
  "cart_items",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    cartId: varchar("cart_id", { length: 36 })
      .notNull()
      .references(() => cart.id, { onDelete: "cascade" }),
    productId: varchar("product_id", { length: 36 }).references(
      () => products.id,
      { onDelete: "cascade" }
    ),
    variantId: varchar("variant_id", { length: 36 }).references(
      () => productVariants.id,
      { onDelete: "cascade" }
    ),
    quantity: int("quantity").notNull(),
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("cart_items_cartId_idx").on(table.cartId),
    index("cart_items_productId_idx").on(table.productId),
    index("cart_items_variantId_idx").on(table.variantId),
  ]
);

// Shipping Methods
export const shippingMethods = mysqlTable(
  "shipping_methods",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    price: decimal("price", { precision: 10, scale: 2 }).default("0").notNull(),
    isFreeShipping: boolean("is_free_shipping").default(false).notNull(),
    minimumOrderAmount: decimal("minimum_order_amount", { precision: 10, scale: 2 }),
    active: boolean("active").default(true).notNull(),
    position: int("position").default(0).notNull(),
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("shipping_methods_name_idx").on(table.name)]
);

// Payment Methods
export const paymentMethods = mysqlTable(
  "payment_methods",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    active: boolean("active").default(true).notNull(),
    position: int("position").default(0).notNull(),
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("payment_methods_name_idx").on(table.name)]
);

// Settings
export const settings = mysqlTable(
  "settings",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    key: varchar("key", { length: 255 }).notNull().unique(),
    value: text("value"),
    type: varchar("type", { length: 50 }).notNull(), // string, number, boolean, json
    group: varchar("group", { length: 100 }), // general, shipping, payment, etc.
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("settings_key_idx").on(table.key)]
);

// Pages (for storing HTML content)
export const pages = mysqlTable(
  "pages",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    content: text("content").notNull(), // HTML content
    excerpt: text("excerpt"),
    status: varchar("status", { length: 50 }).default("draft").notNull(), // draft, published
    template: varchar("template", { length: 100 }),
    seoTitle: varchar("seo_title", { length: 255 }),
    seoDescription: text("seo_description"),
    createdAt: timestamp("created_at", { fsp: 3 }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { fsp: 3 })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("pages_slug_idx").on(table.slug),
    index("pages_status_idx").on(table.status),
  ]
);

// Relations for e-commerce tables

export const productCategoriesRelations = relations(
  productCategories,
  ({ one, many }) => ({
    parent: one(productCategories, {
      fields: [productCategories.parentId],
      references: [productCategories.id],
      relationName: "parent",
    }),
    children: many(productCategories, { relationName: "parent" }),
    products: many(products),
  })
);

export const vendorsRelations = relations(vendors, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(productCategories, {
    fields: [products.categoryId],
    references: [productCategories.id],
  }),
  vendor: one(vendors, {
    fields: [products.vendorId],
    references: [vendors.id],
  }),
  variants: many(productVariants),
  options: many(productOptions),
  metafields: many(productMetafields),
  media: many(productMedia),
  orderItems: many(orderItems),
  cartItems: many(cartItems),
  tags: many(productTagsToProducts),
  inventoryTracking: many(inventoryTracking),
}));

export const productOptionsRelations = relations(
  productOptions,
  ({ one, many }) => ({
    product: one(products, {
      fields: [productOptions.productId],
      references: [products.id],
    }),
    values: many(productOptionValues),
    variantOptions: many(productVariantOptions),
  })
);

export const productOptionValuesRelations = relations(
  productOptionValues,
  ({ one, many }) => ({
    option: one(productOptions, {
      fields: [productOptionValues.optionId],
      references: [productOptions.id],
    }),
    variantOptions: many(productVariantOptions),
  })
);

export const productVariantsRelations = relations(
  productVariants,
  ({ one, many }) => ({
    product: one(products, {
      fields: [productVariants.productId],
      references: [products.id],
    }),
    variantOptions: many(productVariantOptions),
    media: many(productVariantMedia),
    inventory: one(inventory, {
      fields: [productVariants.id],
      references: [inventory.variantId],
    }),
    inventoryTracking: many(inventoryTracking),
    orderItems: many(orderItems),
    cartItems: many(cartItems),
  })
);

export const productVariantOptionsRelations = relations(
  productVariantOptions,
  ({ one }) => ({
    variant: one(productVariants, {
      fields: [productVariantOptions.variantId],
      references: [productVariants.id],
    }),
    option: one(productOptions, {
      fields: [productVariantOptions.optionId],
      references: [productOptions.id],
    }),
    optionValue: one(productOptionValues, {
      fields: [productVariantOptions.optionValueId],
      references: [productOptionValues.id],
    }),
  })
);

export const inventoryRelations = relations(inventory, ({ one }) => ({
  variant: one(productVariants, {
    fields: [inventory.variantId],
    references: [productVariants.id],
  }),
}));

export const inventoryTrackingRelations = relations(
  inventoryTracking,
  ({ one }) => ({
    variant: one(productVariants, {
      fields: [inventoryTracking.variantId],
      references: [productVariants.id],
    }),
    product: one(products, {
      fields: [inventoryTracking.productId],
      references: [products.id],
    }),
    user: one(user, {
      fields: [inventoryTracking.userId],
      references: [user.id],
    }),
  })
);

export const productTagsRelations = relations(productTags, ({ many }) => ({
  products: many(productTagsToProducts),
}));

export const productTagsToProductsRelations = relations(
  productTagsToProducts,
  ({ one }) => ({
    product: one(products, {
      fields: [productTagsToProducts.productId],
      references: [products.id],
    }),
    tag: one(productTags, {
      fields: [productTagsToProducts.tagId],
      references: [productTags.id],
    }),
  })
);

export const productMetafieldsRelations = relations(
  productMetafields,
  ({ one }) => ({
    product: one(products, {
      fields: [productMetafields.productId],
      references: [products.id],
    }),
  })
);

export const mediaRelations = relations(media, ({ many }) => ({
  products: many(productMedia),
  variants: many(productVariantMedia),
}));

export const productMediaRelations = relations(productMedia, ({ one }) => ({
  product: one(products, {
    fields: [productMedia.productId],
    references: [products.id],
  }),
  media: one(media, {
    fields: [productMedia.mediaId],
    references: [media.id],
  }),
}));

export const productVariantMediaRelations = relations(
  productVariantMedia,
  ({ one }) => ({
    variant: one(productVariants, {
      fields: [productVariantMedia.variantId],
      references: [productVariants.id],
    }),
    media: one(media, {
      fields: [productVariantMedia.mediaId],
      references: [media.id],
    }),
  })
);

export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
  addresses: many(addresses),
  metafields: many(customerMetafields),
  carts: many(cart),
}));

export const customerMetafieldsRelations = relations(
  customerMetafields,
  ({ one }) => ({
    customer: one(customers, {
      fields: [customerMetafields.customerId],
      references: [customers.id],
    }),
  })
);

export const addressesRelations = relations(addresses, ({ one }) => ({
  customer: one(customers, {
    fields: [addresses.customerId],
    references: [customers.id],
  }),
  order: one(orders, {
    fields: [addresses.orderId],
    references: [orders.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  items: many(orderItems),
  metafields: many(orderMetafields),
  addresses: many(addresses),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [orderItems.variantId],
    references: [productVariants.id],
  }),
}));

export const orderMetafieldsRelations = relations(
  orderMetafields,
  ({ one }) => ({
    order: one(orders, {
      fields: [orderMetafields.orderId],
      references: [orders.id],
    }),
  })
);

export const discountsRelations = relations(discounts, ({ many }) => ({
  carts: many(cart),
}));

export const cartRelations = relations(cart, ({ one, many }) => ({
  customer: one(customers, {
    fields: [cart.customerId],
    references: [customers.id],
  }),
  discount: one(discounts, {
    fields: [cart.discountId],
    references: [discounts.id],
  }),
  items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(cart, {
    fields: [cartItems.cartId],
    references: [cart.id],
  }),
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
  variant: one(productVariants, {
    fields: [cartItems.variantId],
    references: [productVariants.id],
  }),
}));

export type ProductCategory = typeof productCategories.$inferSelect;
export type ShippingMethod = typeof shippingMethods.$inferSelect;
export type PaymentMethod = typeof paymentMethods.$inferSelect;
