import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	getHomepageConfigQueryOptions,
	saveHomepageConfigServerFn,
	HOMEPAGE_QUERY_KEY,
} from "@/queries/homepage";
import { getCollectionsQueryOptions } from "@/queries/collections";
import { HomepageBuilder } from "@/components/homepage-builder/HomepageBuilder";
import type { HomepageConfig } from "@/components/homepage-builder/types";

export const Route = createFileRoute("/admin/homepage")({
	loader: async ({ context }) => {
		await Promise.all([
			context.queryClient.ensureQueryData(getHomepageConfigQueryOptions()),
			context.queryClient.ensureQueryData(getCollectionsQueryOptions()),
		]);
	},
	component: HomepageRoute,
});

function HomepageRoute() {
	const queryClient = useQueryClient();
	const { data: config } = useSuspenseQuery(getHomepageConfigQueryOptions());

	const saveMutation = useMutation({
		mutationFn: async (newConfig: HomepageConfig) => {
			return await saveHomepageConfigServerFn({ data: newConfig });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [HOMEPAGE_QUERY_KEY] });
		},
	});

	return (
		<HomepageBuilder
			initialConfig={config}
			onSave={(newConfig) => saveMutation.mutateAsync(newConfig)}
			isSaving={saveMutation.isPending}
		/>
	);
}
