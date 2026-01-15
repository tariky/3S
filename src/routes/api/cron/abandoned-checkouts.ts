import { createFileRoute } from "@tanstack/react-router";
import { processAbandonedCheckoutsServerFn } from "@/queries/abandoned-checkouts";
import { json } from "@tanstack/react-start";

export const Route = createFileRoute("/api/cron/abandoned-checkouts")({
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

				try {
					const result = await processAbandonedCheckoutsServerFn({
						data: { secret: cronSecret },
					});

					return json({
						success: true,
						processed: result.processed,
						sent: result.sent,
						errors: result.errors,
						timestamp: result.timestamp,
					});
				} catch (error) {
					console.error("Cron abandoned checkouts error:", error);
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
				// Simple health check and also support query param for secret
				const authHeader = request.headers.get("Authorization");
				const url = new URL(request.url);
				const querySecret = url.searchParams.get("secret");
				const cronSecret = process.env.CRON_SECRET;

				if (!cronSecret) {
					return json(
						{ error: "CRON_SECRET not configured" },
						{ status: 500 }
					);
				}

				// Support both Authorization header and query param
				const providedSecret = authHeader?.replace("Bearer ", "") || querySecret;
				if (providedSecret !== cronSecret) {
					return json(
						{ error: "Unauthorized" },
						{ status: 401 }
					);
				}

				// If secret is valid, process abandoned checkouts
				try {
					const result = await processAbandonedCheckoutsServerFn({
						data: { secret: cronSecret },
					});

					return json({
						success: true,
						processed: result.processed,
						sent: result.sent,
						errors: result.errors,
						timestamp: result.timestamp,
					});
				} catch (error) {
					console.error("Cron abandoned checkouts error:", error);
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
		},
	},
});
