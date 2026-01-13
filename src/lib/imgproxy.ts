import crypto from "crypto";

const IMGPROXY_URL = "http://img.lunatik.cloud";

// Get environment variables at runtime
function getKey() {
	const key = process.env.IMGPROXY_KEY;
	if (!key) {
		console.error("IMGPROXY_KEY is not set!");
	}
	return key || "";
}

function getSalt() {
	const salt = process.env.IMGPROXY_SALT;
	if (!salt) {
		console.error("IMGPROXY_SALT is not set!");
	}
	return salt || "";
}

// URL-safe base64 encoding (remove padding, replace + with -, replace / with _)
const urlSafeBase64 = (buffer: Buffer) =>
	buffer.toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

// Convert hex string to buffer
const hexToBuffer = (hex: string) => Buffer.from(hex, "hex");

// Sign imgproxy path using KEY+SALT
// Signature = urlsafe_base64(HMAC-SHA256(key_bytes, salt_bytes + path))
function sign(path: string): string {
	const keyHex = getKey();
	const saltHex = getSalt();

	if (!keyHex || !saltHex) {
		console.error("Missing IMGPROXY_KEY or IMGPROXY_SALT");
		return "invalid";
	}

	const key = hexToBuffer(keyHex);
	const salt = hexToBuffer(saltHex);

	// HMAC-SHA256 with key, message is salt_bytes + path
	const hmac = crypto.createHmac("sha256", key);
	hmac.update(salt);
	hmac.update(path);

	return urlSafeBase64(hmac.digest());
}

// Build imgproxy URL
export interface ImgproxyOptions {
	width?: number;
	height?: number;
	resizingType?: "fit" | "fill" | "auto";
	gravity?: "no" | "so" | "ea" | "we" | "noea" | "nowe" | "soea" | "sowe" | "ce" | "sm";
	quality?: number;
	format?: "webp" | "avif" | "jpg" | "png";
	blur?: number;
	enlarge?: boolean;
}

export function getImgproxyUrl(sourceUrl: string, options: ImgproxyOptions = {}): string {
	if (!sourceUrl) return "";

	// Don't process data URLs or already proxied URLs
	if (sourceUrl.startsWith("data:") || sourceUrl.includes("img.lunatik.cloud")) {
		return sourceUrl;
	}

	const {
		width,
		height,
		resizingType = "fit",
		gravity = "sm",
		quality = 80,
		format = "webp",
		blur,
		enlarge = false,
	} = options;

	// Build processing options
	const processingOptions: string[] = [];

	// Resize
	if (width || height) {
		processingOptions.push(`rs:${resizingType}:${width || 0}:${height || 0}`);
	}

	// Gravity (for fill mode)
	if (resizingType === "fill") {
		processingOptions.push(`g:${gravity}`);
	}

	// Quality
	processingOptions.push(`q:${quality}`);

	// Enlarge
	if (enlarge) {
		processingOptions.push("el:1");
	}

	// Blur
	if (blur) {
		processingOptions.push(`bl:${blur}`);
	}

	// Encode source URL
	const encodedUrl = urlSafeBase64(Buffer.from(sourceUrl));

	// Build path
	const optionsPath = processingOptions.length > 0
		? processingOptions.join("/") + "/"
		: "";
	const path = `/${optionsPath}${encodedUrl}.${format}`;

	// Sign and return
	const signature = sign(path);
	return `${IMGPROXY_URL}/${signature}${path}`;
}
