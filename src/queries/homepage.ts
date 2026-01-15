import { db } from "@/db/db";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { nanoid } from "nanoid";
import type { HomepageConfig } from "@/components/homepage-builder/types";
import { createEmptyConfig } from "@/components/homepage-builder/types";

export const HOMEPAGE_QUERY_KEY = "homepage";

const homepageConfigSchema = z.object({
	version: z.literal(1),
	components: z.array(z.any()),
	updatedAt: z.string(),
});

export const getHomepageConfigServerFn = createServerFn({ method: "GET" })
	.handler(async (): Promise<HomepageConfig> => {
		const setting = await db.settings.findFirst({
			where: { key: "homepage_config" },
		});

		if (!setting?.value) {
			return createEmptyConfig();
		}

		try {
			const parsed = JSON.parse(setting.value);
			return homepageConfigSchema.parse(parsed) as HomepageConfig;
		} catch {
			return createEmptyConfig();
		}
	});

export const saveHomepageConfigServerFn = createServerFn({ method: "POST" })
	.inputValidator(homepageConfigSchema)
	.handler(async ({ data }) => {
		const configWithTimestamp = {
			...data,
			updatedAt: new Date().toISOString(),
		};

		const existing = await db.settings.findFirst({
			where: { key: "homepage_config" },
		});

		if (existing) {
			await db.settings.update({
				where: { id: existing.id },
				data: {
					value: JSON.stringify(configWithTimestamp),
					updatedAt: new Date(),
				},
			});
		} else {
			await db.settings.create({
				data: {
					id: nanoid(),
					key: "homepage_config",
					value: JSON.stringify(configWithTimestamp),
					type: "json",
					group: "homepage",
				},
			});
		}

		return { success: true };
	});

export const getPublicHomepageConfigServerFn = createServerFn({ method: "GET" })
	.handler(async (): Promise<HomepageConfig> => {
		const setting = await db.settings.findFirst({
			where: { key: "homepage_config" },
		});

		if (!setting?.value) {
			return createEmptyConfig();
		}

		try {
			const parsed = JSON.parse(setting.value);
			return homepageConfigSchema.parse(parsed) as HomepageConfig;
		} catch {
			return createEmptyConfig();
		}
	});

export const getHomepageConfigQueryOptions = () => {
	return {
		queryKey: [HOMEPAGE_QUERY_KEY, "config"],
		queryFn: async () => {
			return await getHomepageConfigServerFn();
		},
	};
};

export const getPublicHomepageConfigQueryOptions = () => {
	return {
		queryKey: [HOMEPAGE_QUERY_KEY, "public-config"],
		queryFn: async () => {
			return await getPublicHomepageConfigServerFn();
		},
		staleTime: 1000 * 60 * 5,
	};
};
