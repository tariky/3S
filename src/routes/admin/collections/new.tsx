import { createFileRoute } from "@tanstack/react-router";
import { CollectionEditor } from "@/components/collections/CollectionEditor";

export const Route = createFileRoute("/admin/collections/new")({
	component: NewCollectionPage,
});

function NewCollectionPage() {
	return <CollectionEditor />;
}

