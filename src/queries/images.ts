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
		// Debug: Check env vars
		console.log("IMGPROXY_KEY loaded:", !!process.env.IMGPROXY_KEY, "length:", process.env.IMGPROXY_KEY?.length);
		console.log("IMGPROXY_SALT loaded:", !!process.env.IMGPROXY_SALT, "length:", process.env.IMGPROXY_SALT?.length);

		const options: ImgproxyOptions = {
			width: data.width,
			height: data.height,
			resizingType: data.resizingType,
			quality: data.quality,
			format: data.format,
		};
		const url = getImgproxyUrl(data.src, options);
		console.log("Generated imgproxy URL:", url);
		return url;
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
