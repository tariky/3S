import { VendorsTable } from "@/components/vendors/VendorsTable";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getAllVendorsQueryOptions } from "@/queries/vendors";

const vendorsSearchSchema = z.object({
  search: z.string().catch(""),
  page: z.number().catch(1),
  limit: z.number().catch(25),
});

export const Route = createFileRoute("/admin/products/vendors")({
  component: RouteComponent,
  validateSearch: vendorsSearchSchema,
  loaderDeps: ({ search }) => ({
    search: search.search,
    page: search.page,
    limit: search.limit,
  }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(
      getAllVendorsQueryOptions({
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
      <h1 className="text-2xl font-bold">Dobavljači</h1>
      <VendorsTable />
    </div>
  );
}
