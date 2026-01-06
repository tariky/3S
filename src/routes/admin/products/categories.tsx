import { CategoriesTable } from "@/components/categories/CategoriesTable";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getAllCategoriesQueryOptions } from "@/queries/categories";

const categoriesSearchSchema = z.object({
  search: z.string().catch(""),
  page: z.number().catch(1),
  limit: z.number().catch(25),
});

export const Route = createFileRoute("/admin/products/categories")({
  component: RouteComponent,
  validateSearch: categoriesSearchSchema,
  loaderDeps: ({ search }) => ({
    search: search.search,
    page: search.page,
    limit: search.limit,
  }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(
      getAllCategoriesQueryOptions({
        search: deps.search,
        page: deps.page,
        limit: deps.limit,
      })
    );
  },
});

function RouteComponent() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Kategorije</h1>
      <CategoriesTable />
    </div>
  );
}
