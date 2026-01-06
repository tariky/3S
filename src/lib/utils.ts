import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Helper function to compute cartesian product of arrays
export function cartesianProduct<T>(arrays: T[][]): T[][] {
  if (arrays.length === 0) return [];
  if (arrays.length === 1) return arrays[0].map((item) => [item]);

  return arrays.reduce(
    (acc, curr) => acc.flatMap((a) => curr.map((c) => [...a, c])),
    [[]] as T[][]
  );
}
