import { db, serializeData } from "@/db/db";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const EMAIL_LOGS_QUERY_KEY = "email-logs";

// Get email logs with filtering and pagination
export const getEmailLogsServerFn = createServerFn({ method: "POST" })
	.inputValidator(
		z.object({
			search: z.string().optional(),
			type: z.string().optional(),
			status: z.string().optional(),
			page: z.number().optional(),
			limit: z.number().optional(),
		})
	)
	.handler(async ({ data }) => {
		const { search = "", type, status, page = 1, limit = 25 } = data;

		// Build where conditions
		const whereConditions: {
			OR?: Array<{
				to?: { contains: string };
				subject?: { contains: string };
			}>;
			type?: string;
			status?: string;
		} = {};

		if (search) {
			whereConditions.OR = [
				{ to: { contains: search } },
				{ subject: { contains: search } },
			];
		}
		if (type) {
			whereConditions.type = type;
		}
		if (status) {
			whereConditions.status = status;
		}

		// Fetch email logs
		const response = await db.email_logs.findMany({
			where: Object.keys(whereConditions).length > 0 ? whereConditions : undefined,
			orderBy: { createdAt: "desc" },
			take: limit,
			skip: (page - 1) * limit,
		});

		// Get total count
		const totalCount = await db.email_logs.count({
			where: Object.keys(whereConditions).length > 0 ? whereConditions : undefined,
		});

		const hasNextPage = page * limit < totalCount;
		const hasPreviousPage = page > 1;

		return serializeData({
			data: response,
			total: totalCount,
			hasNextPage,
			hasPreviousPage,
			nextCursor: page + 1,
			previousCursor: page - 1,
		});
	});

export const getEmailLogsQueryOptions = (opts: {
	search?: string;
	type?: string;
	status?: string;
	page?: number;
	limit?: number;
}) => {
	return queryOptions({
		queryKey: [EMAIL_LOGS_QUERY_KEY, opts],
		queryFn: async () => {
			return await getEmailLogsServerFn({ data: opts });
		},
	});
};

// Get email log by ID
export const getEmailLogByIdServerFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ id: z.string() }))
	.handler(async ({ data }) => {
		const emailLog = await db.email_logs.findUnique({
			where: { id: data.id },
		});

		if (!emailLog) {
			throw new Error("Email log not found");
		}

		return serializeData(emailLog);
	});

// Get email stats
export const getEmailStatsServerFn = createServerFn({ method: "GET" })
	.handler(async () => {
		const [total, sent, failed, pending] = await Promise.all([
			db.email_logs.count(),
			db.email_logs.count({ where: { status: "sent" } }),
			db.email_logs.count({ where: { status: "failed" } }),
			db.email_logs.count({ where: { status: "pending" } }),
		]);

		// Get counts by type
		const byType = await db.email_logs.groupBy({
			by: ["type"],
			_count: { type: true },
		});

		const typeStats = byType.reduce(
			(acc, item) => {
				acc[item.type] = item._count.type;
				return acc;
			},
			{} as Record<string, number>
		);

		return {
			total,
			sent,
			failed,
			pending,
			byType: typeStats,
		};
	});

export const getEmailStatsQueryOptions = () => {
	return queryOptions({
		queryKey: [EMAIL_LOGS_QUERY_KEY, "stats"],
		queryFn: async () => {
			return await getEmailStatsServerFn();
		},
	});
};

// Resend email (placeholder - would need to store email content)
export const resendEmailServerFn = createServerFn({ method: "POST" })
	.inputValidator(z.object({ id: z.string() }))
	.handler(async () => {
		// For now, just mark it as a feature that could be implemented
		// Would need to store the HTML content in the logs to resend
		throw new Error("Resend functionality not yet implemented");
	});
