import { DefinitionsTable } from "@/components/definitions/DefinitionsTable";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getAllDefinitionsQueryOptions } from "@/queries/definitions";

const definitionsSearchSchema = z.object({
  search: z.string().catch(""),
  page: z.number().catch(1),
  limit: z.number().catch(25),
});

export const Route = createFileRoute("/admin/products/definitions")({
  component: RouteComponent,
  validateSearch: definitionsSearchSchema,
  loaderDeps: ({ search }) => ({
    search: search.search,
    page: search.page,
    limit: search.limit,
  }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(
      getAllDefinitionsQueryOptions({
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
      <h1 className="text-2xl font-bold">Definicije</h1>
      <DefinitionsTable />
    </div>
  );
}
