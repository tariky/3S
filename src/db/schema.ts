// Re-export Prisma types for use throughout the application
export type {
  User,
  Session,
  Account,
  Verification,
  Vendor,
  ProductCategory,
  Definition,
  Product,
  ProductOption,
  ProductOptionValue,
  ProductVariant,
  ProductVariantOption,
  Inventory,
  InventoryTracking,
  Media,
  ProductTag,
  ProductTagsToProduct,
  ProductMedia,
  ProductVariantMedia,
  ProductMetafield,
  Customer,
  CustomerMetafield,
  Address,
  Order,
  OrderItem,
  OrderMetafield,
  Discount,
  Cart,
  CartItem,
  ShippingMethod,
  PaymentMethod,
  Setting,
  Page,
  Navigation,
  Collection,
  CollectionRule,
  CollectionProduct,
} from "@prisma/client";

// For backwards compatibility with code that imports from schema
import type {
  ProductCategory as ProductCategoryType,
  ShippingMethod as ShippingMethodType,
  PaymentMethod as PaymentMethodType,
  Collection as CollectionType,
  CollectionRule as CollectionRuleType,
  CollectionProduct as CollectionProductType,
} from "@prisma/client";

export type { ProductCategoryType as ProductCategory };
export type { ShippingMethodType as ShippingMethod };
export type { PaymentMethodType as PaymentMethod };
export type { CollectionType as Collection };
export type { CollectionRuleType as CollectionRule };
export type { CollectionProductType as CollectionProduct };
