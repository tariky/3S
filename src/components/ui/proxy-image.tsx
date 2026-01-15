"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { getSignedImageUrlServerFn } from "@/queries/images";

export interface ProxyImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "width" | "height"> {
	src: string;
	width?: number;
	height?: number;
	resizingType?: "fit" | "fill" | "auto";
	quality?: number;
	format?: "webp" | "avif" | "jpg" | "png";
	fallback?: React.ReactNode;
}

// Cache for signed URLs to avoid repeated server calls
const urlCache = new Map<string, string>();

function getCacheKey(
	src: string,
	width?: number,
	height?: number,
	resizingType?: string,
	quality?: number,
	format?: string
) {
	return `${src}|${width}|${height}|${resizingType}|${quality}|${format}`;
}

export const ProxyImage = React.forwardRef<HTMLImageElement, ProxyImageProps>(
	(
		{
			src,
			width,
			height,
			resizingType = "fit",
			quality = 80,
			format = "webp",
			fallback,
			className,
			alt = "",
			...props
		},
		ref
	) => {
		const [proxyUrl, setProxyUrl] = React.useState<string>("");
		const [loading, setLoading] = React.useState(true);
		const [imageLoaded, setImageLoaded] = React.useState(false);
		const [error, setError] = React.useState(false);

		React.useEffect(() => {
			if (!src) {
				setLoading(false);
				return;
			}

			// Skip proxy for data URLs or already proxied URLs
			if (src.startsWith("data:") || src.includes("img.lunatik.cloud")) {
				setProxyUrl(src);
				setLoading(false);
				return;
			}

			const cacheKey = getCacheKey(src, width, height, resizingType, quality, format);

			// Check cache first
			if (urlCache.has(cacheKey)) {
				setProxyUrl(urlCache.get(cacheKey)!);
				setLoading(false);
				return;
			}

			// Fetch signed URL from server
			setLoading(true);
			getSignedImageUrlServerFn({
				data: { src, width, height, resizingType, quality, format },
			})
				.then((signedUrl) => {
					urlCache.set(cacheKey, signedUrl);
					setProxyUrl(signedUrl);
					setLoading(false);
				})
				.catch(() => {
					// Fallback to original URL on error
					setProxyUrl(src);
					setLoading(false);
				});
		}, [src, width, height, resizingType, quality, format]);

		const handleImageLoad = React.useCallback(() => {
			setImageLoaded(true);
		}, []);

		if (error && fallback) {
			return <>{fallback}</>;
		}

		if (!src) {
			return fallback ? <>{fallback}</> : null;
		}

		if (loading) {
			// Show placeholder while loading signed URL
			return (
				<div
					className={cn("bg-gray-100 animate-pulse", className)}
					style={{ width, height }}
				/>
			);
		}

		return (
			<img
				ref={ref}
				src={proxyUrl}
				alt={alt}
				width={width}
				height={height}
				onLoad={handleImageLoad}
				onError={() => setError(true)}
				className={cn(
					"transition-[filter,opacity] duration-500",
					!imageLoaded && "blur-sm opacity-80",
					className
				)}
				loading="lazy"
				{...props}
			/>
		);
	}
);

ProxyImage.displayName = "ProxyImage";
