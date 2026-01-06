import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { CustomersTable } from "@/components/customers/CustomersTable";
import { getAllCustomersQueryOptions } from "@/queries/customers";
import { AddCustomerDialog } from "@/components/orders/AddCustomerDialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const customersSearchSchema = z.object({
  search: z.string().catch(""),
  page: z.number().catch(1),
  limit: z.number().catch(25),
});

export const Route = createFileRoute("/admin/customers/")({
  component: RouteComponent,
  validateSearch: customersSearchSchema,
  loaderDeps: ({ search }) => ({
    search: search.search,
    page: search.page,
    limit: search.limit,
  }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(
      getAllCustomersQueryOptions({
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kupci</h1>
        <AddCustomerDialog
          onCustomerAdded={() => {}}
          trigger={
            <Button>
              <Plus className="size-4 mr-2" />
              Dodaj kupca
            </Button>
          }
        />
      </div>
      <CustomersTable />
    </div>
  );
}
