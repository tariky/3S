import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { OrdersTable } from "@/components/orders/OrdersTable";
import { getAllOrdersQueryOptions } from "@/queries/orders";

const ordersSearchSchema = z.object({
  search: z.string().catch(""),
  status: z.string().optional().catch(undefined),
  page: z.number().catch(1),
  limit: z.number().catch(25),
});

export const Route = createFileRoute("/admin/orders/")({
  component: RouteComponent,
  validateSearch: ordersSearchSchema,
  loaderDeps: ({ search }) => ({
    search: search.search,
    status: search.status,
    page: search.page,
    limit: search.limit,
  }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(
      getAllOrdersQueryOptions({
        search: deps.search,
        status: deps.status,
        page: deps.page,
        limit: deps.limit,
      })
    );
  },
});

function RouteComponent() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Narudžbe</h1>
      <OrdersTable />
    </div>
  );
}
