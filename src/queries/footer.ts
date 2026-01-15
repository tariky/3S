import { db, serializeData } from "@/db/db";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { nanoid } from "nanoid";

export const FOOTER_QUERY_KEY = "footer_config";

// Types
export interface FooterLink {
  id: string;
  title: string;
  url: string;
}

export interface FooterColumn {
  id: string;
  title: string;
  links: FooterLink[];
}

export interface FooterConfig {
  id: string;
  logoUrl: string | null;
  subtitle: string | null;
  columns: FooterColumn[];
  bgColor: string;
  textColor: string;
  darkBgColor: string;
  darkTextColor: string;
  showSocials: boolean;
  facebookUrl: string | null;
  instagramUrl: string | null;
  twitterUrl: string | null;
  tiktokUrl: string | null;
  youtubeUrl: string | null;
  copyrightText: string | null;
}

// Schema for validation
const footerLinkSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
});

const footerColumnSchema = z.object({
  id: z.string(),
  title: z.string(),
  links: z.array(footerLinkSchema),
});

const footerConfigSchema = z.object({
  logoUrl: z.string().nullable().optional(),
  subtitle: z.string().nullable().optional(),
  columns: z.array(footerColumnSchema).optional(),
  bgColor: z.string().optional(),
  textColor: z.string().optional(),
  darkBgColor: z.string().optional(),
  darkTextColor: z.string().optional(),
  showSocials: z.boolean().optional(),
  facebookUrl: z.string().nullable().optional(),
  instagramUrl: z.string().nullable().optional(),
  twitterUrl: z.string().nullable().optional(),
  tiktokUrl: z.string().nullable().optional(),
  youtubeUrl: z.string().nullable().optional(),
  copyrightText: z.string().nullable().optional(),
});

// Get footer config
export const getFooterConfigServerFn = createServerFn({ method: "GET" }).handler(
  async () => {
    let config = await db.footer_config.findFirst();

    if (!config) {
      // Create default config
      config = await db.footer_config.create({
        data: {
          id: nanoid(),
          columns: [],
          bgColor: "#ffffff",
          textColor: "#0f172a",
          darkBgColor: "#0f172a",
          darkTextColor: "#f8fafc",
          showSocials: true,
        },
      });
    }

    return serializeData({
      ...config,
      columns: (config.columns as FooterColumn[]) || [],
    });
  }
);

export const getFooterConfigQueryOptions = () => {
  return queryOptions({
    queryKey: [FOOTER_QUERY_KEY],
    queryFn: async () => {
      return await getFooterConfigServerFn();
    },
  });
};

// Update footer config
export const updateFooterConfigServerFn = createServerFn({ method: "POST" })
  .inputValidator(footerConfigSchema)
  .handler(async ({ data }) => {
    let config = await db.footer_config.findFirst();

    if (!config) {
      config = await db.footer_config.create({
        data: {
          id: nanoid(),
          ...data,
          columns: data.columns || [],
        },
      });
    } else {
      config = await db.footer_config.update({
        where: { id: config.id },
        data: {
          ...data,
          columns: data.columns || config.columns,
          updatedAt: new Date(),
        },
      });
    }

    return serializeData({
      ...config,
      columns: (config.columns as FooterColumn[]) || [],
    });
  });

// Get public footer config (for shop)
export const getPublicFooterConfigServerFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const config = await db.footer_config.findFirst();

    if (!config) {
      return null;
    }

    return serializeData({
      ...config,
      columns: (config.columns as FooterColumn[]) || [],
    });
  }
);

export const getPublicFooterConfigQueryOptions = () => {
  return queryOptions({
    queryKey: [FOOTER_QUERY_KEY, "public"],
    queryFn: async () => {
      return await getPublicFooterConfigServerFn();
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
