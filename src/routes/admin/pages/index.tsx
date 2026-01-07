import { createFileRoute } from "@tanstack/react-router";
import { PagesTable } from "@/components/pages/PagesTable";

export const Route = createFileRoute("/admin/pages/")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="flex flex-col gap-8 container mx-auto py-6">
			<div>
				<h1 className="text-2xl font-bold">Stranice</h1>
				<p className="text-muted-foreground">
					Upravljajte statičkim stranicama kao što su Politika privatnosti,
					Informacije o dostavi, itd.
				</p>
			</div>
			<PagesTable />
		</div>
	);
}

