import { createFileRoute } from "@tanstack/react-router";
import { processPendingRegenerations } from "@/queries/collections";
import { json } from "@tanstack/react-start";

export const Route = createFileRoute("/api/cron/regenerate-collections")({
	server: {
		handlers: {
			POST: async ({ request }) => {
				// Verify cron secret
				const authHeader = request.headers.get("Authorization");
				const cronSecret = process.env.CRON_SECRET;

				if (!cronSecret) {
					return json(
						{ error: "CRON_SECRET not configured" },
						{ status: 500 }
					);
				}

				// Expect "Bearer <secret>" format
				const providedSecret = authHeader?.replace("Bearer ", "");
				if (providedSecret !== cronSecret) {
					return json(
						{ error: "Unauthorized" },
						{ status: 401 }
					);
				}

				// Parse batch size from body (optional)
				let batchSize = 10;
				try {
					const body = await request.json().catch(() => ({}));
					if (body.batchSize && typeof body.batchSize === "number") {
						batchSize = Math.min(Math.max(body.batchSize, 1), 50); // Clamp between 1-50
					}
				} catch {
					// Use default batch size
				}

				try {
					const result = await processPendingRegenerations(batchSize);

					return json({
						success: true,
						...result,
						timestamp: new Date().toISOString(),
					});
				} catch (error) {
					console.error("Cron regeneration error:", error);
					return json(
						{
							success: false,
							error: String(error),
							timestamp: new Date().toISOString(),
						},
						{ status: 500 }
					);
				}
			},
			GET: async ({ request }) => {
				// Simple health check for the cron endpoint
				const authHeader = request.headers.get("Authorization");
				const cronSecret = process.env.CRON_SECRET;

				if (!cronSecret) {
					return json(
						{ error: "CRON_SECRET not configured" },
						{ status: 500 }
					);
				}

				const providedSecret = authHeader?.replace("Bearer ", "");
				if (providedSecret !== cronSecret) {
					return json(
						{ error: "Unauthorized" },
						{ status: 401 }
					);
				}

				return json({
					status: "ok",
					endpoint: "regenerate-collections",
					timestamp: new Date().toISOString(),
				});
			},
		},
	},
});
