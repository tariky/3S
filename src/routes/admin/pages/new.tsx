import { createFileRoute } from "@tanstack/react-router";
import { PageEditor } from "@/components/pages/PageEditor";

export const Route = createFileRoute("/admin/pages/new")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<div className="container mx-auto py-6">
			<PageEditor />
		</div>
	);
}

