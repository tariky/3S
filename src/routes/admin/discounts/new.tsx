import { createFileRoute } from "@tanstack/react-router";
import { DiscountEditor } from "@/components/discounts/DiscountEditor";

export const Route = createFileRoute("/admin/discounts/new")({
	component: NewDiscountPage,
});

function NewDiscountPage() {
	return <DiscountEditor />;
}
