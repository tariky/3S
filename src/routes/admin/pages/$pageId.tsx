import { createFileRoute } from "@tanstack/react-router";
import { PageEditor } from "@/components/pages/PageEditor";

export const Route = createFileRoute("/admin/pages/$pageId")({
	component: RouteComponent,
});

function RouteComponent() {
	const { pageId } = Route.useParams();
	return (
		<div className="container mx-auto py-6">
			<PageEditor pageId={pageId} />
		</div>
	);
}

