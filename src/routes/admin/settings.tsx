import { createFileRoute } from "@tanstack/react-router";
import { ShippingMethodsTable } from "@/components/settings/ShippingMethodsTable";
import { PaymentMethodsTable } from "@/components/settings/PaymentMethodsTable";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/admin/settings")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="flex flex-col gap-8 container mx-auto py-6">
      <div>
        <h1 className="text-2xl font-bold">Postavke</h1>
        <p className="text-muted-foreground">
          Upravljajte načinima dostave i plaćanja
        </p>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-semibold">Načini dostave</h2>
            <p className="text-sm text-muted-foreground">
              Dodajte i upravljajte načinima dostave za narudžbe
            </p>
          </div>
          <ShippingMethodsTable />
        </div>

        <Separator />

        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-semibold">Načini plaćanja</h2>
            <p className="text-sm text-muted-foreground">
              Dodajte i upravljajte načinima plaćanja za narudžbe
            </p>
          </div>
          <PaymentMethodsTable />
        </div>
      </div>
    </div>
  );
}
