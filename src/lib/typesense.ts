import Typesense from "typesense";

// Typesense client configuration
const typesenseUrl = process.env.TYPESENSE_URL || "http://localhost:8108";
const typesenseToken = process.env.TYPESENSE_TOKEN || "";

// Parse URL to extract host, port, and protocol
function parseTypesenseUrl(url: string) {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parsed.port || (parsed.protocol === "https:" ? "443" : "8108"),
      protocol: parsed.protocol.replace(":", "") as "http" | "https",
    };
  } catch {
    return {
      host: "localhost",
      port: "8108",
      protocol: "http" as const,
    };
  }
}

const urlConfig = parseTypesenseUrl(typesenseUrl);

export const typesenseClient = new Typesense.Client({
  nodes: [
    {
      host: urlConfig.host,
      port: urlConfig.port,
      protocol: urlConfig.protocol,
    },
  ],
  apiKey: typesenseToken,
  connectionTimeoutSeconds: 10,
});

// Product document schema for Typesense
export const PRODUCTS_COLLECTION = "products";

export interface TypesenseProduct {
  id: string;
  name: string;
  slug: string;
  description: string;
  status: string;
  price: number;
  compareAtPrice: number | null;
  minPrice: number;
  maxPrice: number;
  primaryImage: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  vendorId: string | null;
  vendorName: string | null;
  tagIds: string[];
  tagNames: string[];
  collectionIds: string[];
  featured: boolean;
  totalInventory: number;
  inStock: boolean;
  createdAt: number;
  updatedAt: number;
  // Variant data for filtering
  variants: {
    id: string;
    sku: string;
    price: number;
    compareAtPrice: number;
    inventory: number;
    inStock: boolean;
    options: { name: string; value: string }[];
  }[];
  // Flattened option values for filtering (e.g., ["S", "M", "L", "Red", "Blue"])
  optionValues: string[];
  // Option names for faceting (e.g., ["Size", "Color"])
  optionNames: string[];
}

// Schema definition for creating collection
export const productsSchema = {
  name: PRODUCTS_COLLECTION,
  enable_nested_fields: true,
  fields: [
    { name: "name", type: "string" as const },
    { name: "slug", type: "string" as const },
    { name: "description", type: "string" as const },
    { name: "status", type: "string" as const, facet: true },
    { name: "price", type: "float" as const },
    { name: "compareAtPrice", type: "float" as const, optional: true },
    { name: "minPrice", type: "float" as const },
    { name: "maxPrice", type: "float" as const },
    { name: "primaryImage", type: "string" as const, optional: true },
    { name: "categoryId", type: "string" as const, optional: true, facet: true },
    { name: "categoryName", type: "string" as const, optional: true, facet: true },
    { name: "categorySlug", type: "string" as const, optional: true },
    { name: "vendorId", type: "string" as const, optional: true, facet: true },
    { name: "vendorName", type: "string" as const, optional: true, facet: true },
    { name: "tagIds", type: "string[]" as const, facet: true },
    { name: "tagNames", type: "string[]" as const, facet: true },
    { name: "collectionIds", type: "string[]" as const, facet: true },
    { name: "featured", type: "bool" as const, facet: true },
    { name: "totalInventory", type: "int32" as const },
    { name: "inStock", type: "bool" as const, facet: true },
    { name: "createdAt", type: "int64" as const },
    { name: "updatedAt", type: "int64" as const },
    // Explicitly define nested variant fields (must be array types for object[])
    { name: "variants", type: "object[]" as const, optional: true },
    { name: "variants.id", type: "string[]" as const, optional: true },
    { name: "variants.sku", type: "string[]" as const, optional: true },
    { name: "variants.price", type: "float[]" as const, optional: true },
    { name: "variants.compareAtPrice", type: "float[]" as const, optional: true },
    { name: "variants.inventory", type: "int32[]" as const, optional: true },
    { name: "variants.inStock", type: "bool[]" as const, optional: true },
    { name: "variants.options", type: "object[]" as const, optional: true },
    { name: "variants.options.name", type: "string[]" as const, optional: true },
    { name: "variants.options.value", type: "string[]" as const, optional: true },
    { name: "optionValues", type: "string[]" as const, facet: true },
    { name: "optionNames", type: "string[]" as const, facet: true },
  ],
  default_sorting_field: "createdAt",
};

// Check if Typesense is configured
export function isTypesenseConfigured(): boolean {
  return !!(process.env.TYPESENSE_URL && process.env.TYPESENSE_TOKEN);
}
