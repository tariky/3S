import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getImgproxyUrl, type ImgproxyOptions } from "@/lib/imgproxy";

export const getSignedImageUrlServerFn = createServerFn({ method: "GET" })
	.inputValidator(
		z.object({
			src: z.string(),
			width: z.number().optional(),
			height: z.number().optional(),
			resizingType: z.enum(["fit", "fill", "auto"]).optional(),
			quality: z.number().optional(),
			format: z.enum(["webp", "avif", "jpg", "png"]).optional(),
		})
	)
	.handler(async ({ data }) => {
		const options: ImgproxyOptions = {
			width: data.width,
			height: data.height,
			resizingType: data.resizingType,
			quality: data.quality,
			format: data.format,
		};
		return getImgproxyUrl(data.src, options);
	});

// Server function to fetch SVG content (avoids CORS issues)
export const fetchSvgContentServerFn = createServerFn({ method: "GET" })
	.inputValidator(z.object({ url: z.string() }))
	.handler(async ({ data }) => {
		try {
			const response = await fetch(data.url);
			if (!response.ok) {
				return null;
			}
			const text = await response.text();
			// Basic validation that it's actually an SVG
			if (text.includes("<svg") || text.includes("<?xml")) {
				return text;
			}
			return null;
		} catch {
			return null;
		}
	});
