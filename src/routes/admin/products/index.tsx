import { ProductsTable } from "@/components/products/ProductsTable";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getAllProductsQueryOptions } from "@/queries/products";

const productsSearchSchema = z.object({
  search: z.string().catch(""),
  status: z.enum(["draft", "active", "archived"]).optional().catch(undefined),
  categoryId: z.string().optional().catch(undefined),
  page: z.number().catch(1),
  limit: z.number().catch(25),
});

export const Route = createFileRoute("/admin/products/")({
  component: RouteComponent,
  validateSearch: productsSearchSchema,
  loaderDeps: ({ search }) => ({
    search: search.search,
    status: search.status,
    categoryId: search.categoryId,
    page: search.page,
    limit: search.limit,
  }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(
      getAllProductsQueryOptions({
        search: deps.search,
        status: deps.status,
        categoryId: deps.categoryId,
        page: deps.page,
        limit: deps.limit,
      })
    );
  },
});

function RouteComponent() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Proizvodi</h1>
      <ProductsTable />
    </div>
  );
}
