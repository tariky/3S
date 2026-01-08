import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/**
 * Check if a value is a Prisma Decimal object.
 * Prisma Decimal objects have s, e, d properties and a toStringTag of "[object Decimal]"
 */
function isDecimal(value: unknown): boolean {
  if (value === null || value === undefined || typeof value !== "object") {
    return false;
  }
  const obj = value as Record<string, unknown>;
  // Check for Decimal signature: has s (sign), e (exponent), d (digits) properties
  return (
    "s" in obj &&
    "e" in obj &&
    "d" in obj &&
    typeof obj.s === "number" &&
    typeof obj.e === "number" &&
    Array.isArray(obj.d) &&
    typeof (obj as { toString?: unknown }).toString === "function"
  );
}

/**
 * Recursively converts Prisma Decimal objects to strings for serialization.
 * This is needed because Prisma returns Decimal objects which can't be
 * serialized by TanStack Start's server functions.
 */
export function serializeData<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  // Check for Decimal using structural check (more reliable than instanceof)
  if (isDecimal(data)) {
    return (data as { toString: () => string }).toString() as unknown as T;
  }

  if (data instanceof Date) {
    return data as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => serializeData(item)) as unknown as T;
  }

  if (typeof data === "object") {
    const serialized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      serialized[key] = serializeData(value);
    }
    return serialized as T;
  }

  return data;
}
