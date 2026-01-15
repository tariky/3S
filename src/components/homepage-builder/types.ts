export type TextSize = "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
export type CountdownSize = "sm" | "md" | "lg";
export type Alignment = "left" | "center" | "right";
export type MarqueePadding = "sm" | "md" | "lg";
export type MarqueeSpeed = "slow" | "normal" | "fast";
export type SpacingSize = "none" | "sm" | "md" | "lg" | "xl" | "2xl";
export type HeightSize = "auto" | "sm" | "md" | "lg" | "xl" | "2xl" | "full";

export interface BaseComponent {
	id: string;
	type: string;
	position: number;
	marginTop: SpacingSize;
	marginBottom: SpacingSize;
	paddingTop: SpacingSize;
	paddingBottom: SpacingSize;
}

export interface ProductsCarouselComponent extends BaseComponent {
	type: "products_carousel";
	collectionId: string;
	limit: number;
	title: string;
	titleSize: TextSize;
	subtitle?: string;
	subtitleSize: TextSize;
	showButton: boolean;
	buttonText?: string;
	bgColor: string;
	textColor: string;
	darkBgColor: string;
	darkTextColor: string;
}

export interface TextInfoComponent extends BaseComponent {
	type: "text_info";
	heading: string;
	headingSize: TextSize;
	subtitle?: string;
	subtitleSize: TextSize;
	showButton: boolean;
	buttonText?: string;
	buttonLink?: string;
	bgColor: string;
	textColor: string;
	darkBgColor: string;
	darkTextColor: string;
	alignment: Alignment;
	mobileHeight?: HeightSize;
	desktopHeight?: HeightSize;
}

export interface MarqueeComponent extends BaseComponent {
	type: "marquee";
	text: string;
	textSize: TextSize;
	padding: MarqueePadding;
	speed: MarqueeSpeed;
	bgColor: string;
	textColor: string;
	darkBgColor: string;
	darkTextColor: string;
}

export interface CountdownComponent extends BaseComponent {
	type: "countdown";
	endDate: string;
	title?: string;
	subtitle?: string;
	size: CountdownSize;
	bgColor: string;
	textColor: string;
	darkBgColor: string;
	darkTextColor: string;
	showDays: boolean;
	showHours: boolean;
	showMinutes: boolean;
	showSeconds: boolean;
}

export type HomepageComponent =
	| ProductsCarouselComponent
	| TextInfoComponent
	| MarqueeComponent
	| CountdownComponent;

export interface HomepageConfig {
	version: 1;
	components: HomepageComponent[];
	updatedAt: string;
}

export const COMPONENT_TYPE_LABELS: Record<HomepageComponent["type"], string> = {
	products_carousel: "Karusel proizvoda",
	text_info: "Tekst blok",
	marquee: "Pokretni tekst",
	countdown: "Odbrojavanje",
};

export const COMPONENT_TYPE_ICONS: Record<HomepageComponent["type"], string> = {
	products_carousel: "LayoutGrid",
	text_info: "Type",
	marquee: "MoveHorizontal",
	countdown: "Timer",
};

export const TEXT_SIZE_OPTIONS: { value: TextSize; label: string }[] = [
	{ value: "sm", label: "Mali" },
	{ value: "md", label: "Srednji" },
	{ value: "lg", label: "Veliki" },
	{ value: "xl", label: "Jako veliki" },
	{ value: "2xl", label: "Ogroman" },
	{ value: "3xl", label: "Najveći" },
];

export const COUNTDOWN_SIZE_OPTIONS: { value: CountdownSize; label: string }[] = [
	{ value: "sm", label: "Kompaktan" },
	{ value: "md", label: "Srednji" },
	{ value: "lg", label: "Veliki" },
];

export const ALIGNMENT_OPTIONS: { value: Alignment; label: string }[] = [
	{ value: "left", label: "Lijevo" },
	{ value: "center", label: "Centar" },
	{ value: "right", label: "Desno" },
];

export const MARQUEE_PADDING_OPTIONS: { value: MarqueePadding; label: string }[] = [
	{ value: "sm", label: "Mali" },
	{ value: "md", label: "Srednji" },
	{ value: "lg", label: "Veliki" },
];

export const MARQUEE_SPEED_OPTIONS: { value: MarqueeSpeed; label: string }[] = [
	{ value: "slow", label: "Sporo" },
	{ value: "normal", label: "Normalno" },
	{ value: "fast", label: "Brzo" },
];

export const SPACING_OPTIONS: { value: SpacingSize; label: string }[] = [
	{ value: "none", label: "Bez" },
	{ value: "sm", label: "Mali (8px)" },
	{ value: "md", label: "Srednji (16px)" },
	{ value: "lg", label: "Veliki (24px)" },
	{ value: "xl", label: "Jako veliki (32px)" },
	{ value: "2xl", label: "Ogroman (48px)" },
];

export const HEIGHT_OPTIONS: { value: HeightSize; label: string }[] = [
	{ value: "auto", label: "Automatski" },
	{ value: "sm", label: "Mali (200px)" },
	{ value: "md", label: "Srednji (300px)" },
	{ value: "lg", label: "Veliki (400px)" },
	{ value: "xl", label: "Jako veliki (500px)" },
	{ value: "2xl", label: "Ogroman (600px)" },
	{ value: "full", label: "Puna visina" },
];

export const COLOR_PRESETS = [
	{ value: "#ffffff", label: "Bijela" },
	{ value: "#f8fafc", label: "Slate 50" },
	{ value: "#f1f5f9", label: "Slate 100" },
	{ value: "#e2e8f0", label: "Slate 200" },
	{ value: "#1e293b", label: "Slate 800" },
	{ value: "#0f172a", label: "Slate 900" },
	{ value: "#000000", label: "Crna" },
	{ value: "#ef4444", label: "Crvena" },
	{ value: "#f97316", label: "Narandžasta" },
	{ value: "#eab308", label: "Žuta" },
	{ value: "#22c55e", label: "Zelena" },
	{ value: "#10b981", label: "Emerald" },
	{ value: "#14b8a6", label: "Teal" },
	{ value: "#06b6d4", label: "Cyan" },
	{ value: "#3b82f6", label: "Plava" },
	{ value: "#6366f1", label: "Indigo" },
	{ value: "#8b5cf6", label: "Violet" },
	{ value: "#a855f7", label: "Purple" },
	{ value: "#ec4899", label: "Pink" },
	{ value: "#f43f5e", label: "Rose" },
];

export function createDefaultProductsCarousel(): Omit<ProductsCarouselComponent, "id" | "position"> {
	return {
		type: "products_carousel",
		collectionId: "",
		limit: 8,
		title: "Izdvojeni proizvodi",
		titleSize: "2xl",
		subtitle: "",
		subtitleSize: "md",
		showButton: true,
		buttonText: "Pogledaj sve",
		bgColor: "#ffffff",
		textColor: "#0f172a",
		darkBgColor: "#0f172a",
		darkTextColor: "#f8fafc",
		marginTop: "none",
		marginBottom: "none",
		paddingTop: "lg",
		paddingBottom: "lg",
	};
}

export function createDefaultTextInfo(): Omit<TextInfoComponent, "id" | "position"> {
	return {
		type: "text_info",
		heading: "Naslov",
		headingSize: "2xl",
		subtitle: "Podnaslov",
		subtitleSize: "md",
		showButton: false,
		buttonText: "Saznaj više",
		buttonLink: "",
		bgColor: "#f1f5f9",
		textColor: "#0f172a",
		darkBgColor: "#1e293b",
		darkTextColor: "#f8fafc",
		alignment: "center",
		marginTop: "none",
		marginBottom: "none",
		paddingTop: "xl",
		paddingBottom: "xl",
		mobileHeight: "auto",
		desktopHeight: "auto",
	};
}

export function createDefaultMarquee(): Omit<MarqueeComponent, "id" | "position"> {
	return {
		type: "marquee",
		text: "Besplatna dostava za narudžbe preko 100 KM",
		textSize: "md",
		padding: "md",
		speed: "normal",
		bgColor: "#0f172a",
		textColor: "#ffffff",
		darkBgColor: "#1e293b",
		darkTextColor: "#f8fafc",
		marginTop: "none",
		marginBottom: "none",
		paddingTop: "none",
		paddingBottom: "none",
	};
}

export function createDefaultCountdown(): Omit<CountdownComponent, "id" | "position"> {
	const futureDate = new Date();
	futureDate.setDate(futureDate.getDate() + 7);

	return {
		type: "countdown",
		endDate: futureDate.toISOString(),
		title: "Akcija završava za",
		subtitle: "",
		size: "md",
		bgColor: "#ef4444",
		textColor: "#ffffff",
		darkBgColor: "#dc2626",
		darkTextColor: "#ffffff",
		showDays: true,
		showHours: true,
		showMinutes: true,
		showSeconds: true,
		marginTop: "none",
		marginBottom: "none",
		paddingTop: "md",
		paddingBottom: "md",
	};
}

export function createEmptyConfig(): HomepageConfig {
	return {
		version: 1,
		components: [],
		updatedAt: new Date().toISOString(),
	};
}

export const SPACING_VALUES: Record<SpacingSize, string> = {
	none: "0",
	sm: "0.5rem",
	md: "1rem",
	lg: "1.5rem",
	xl: "2rem",
	"2xl": "3rem",
};

export function getSpacingStyle(component: BaseComponent): React.CSSProperties {
	return {
		marginTop: SPACING_VALUES[component.marginTop],
		marginBottom: SPACING_VALUES[component.marginBottom],
		paddingTop: SPACING_VALUES[component.paddingTop],
		paddingBottom: SPACING_VALUES[component.paddingBottom],
	};
}

export const HEIGHT_VALUES: Record<HeightSize, string> = {
	auto: "auto",
	sm: "200px",
	md: "300px",
	lg: "400px",
	xl: "500px",
	"2xl": "600px",
	full: "100vh",
};
