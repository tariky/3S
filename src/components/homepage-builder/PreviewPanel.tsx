import { cn } from "@/lib/utils";
import { MobilePreviewFrame } from "./MobilePreviewFrame";
import { ProductsCarouselSection } from "@/components/homepage/ProductsCarouselSection";
import { TextInfoSection } from "@/components/homepage/TextInfoSection";
import { MarqueeSection } from "@/components/homepage/MarqueeSection";
import { CountdownSection } from "@/components/homepage/CountdownSection";
import type {
	HomepageComponent,
	ProductsCarouselComponent,
	TextInfoComponent,
	MarqueeComponent,
	CountdownComponent,
} from "./types";

interface PreviewPanelProps {
	components: HomepageComponent[];
	mode: "desktop" | "mobile";
	theme: "light" | "dark";
	selectedId: string | null;
	onSelect: (id: string | null) => void;
}

export function PreviewPanel({ components, mode, theme, selectedId, onSelect }: PreviewPanelProps) {
	const sortedComponents = [...components].sort((a, b) => a.position - b.position);

	const renderComponent = (component: HomepageComponent) => {
		const isSelected = selectedId === component.id;

		const wrapperClass = cn(
			"relative transition-all cursor-pointer",
			isSelected && "ring-2 ring-primary ring-offset-2"
		);

		const content = (() => {
			switch (component.type) {
				case "products_carousel":
					return (
						<ProductsCarouselSection
							component={component as ProductsCarouselComponent}
							isPreview
							previewTheme={theme}
						/>
					);
				case "text_info":
					return (
						<TextInfoSection
							component={component as TextInfoComponent}
							previewTheme={theme}
						/>
					);
				case "marquee":
					return (
						<MarqueeSection
							component={component as MarqueeComponent}
							previewTheme={theme}
						/>
					);
				case "countdown":
					return (
						<CountdownSection
							component={component as CountdownComponent}
							previewTheme={theme}
						/>
					);
				default:
					return null;
			}
		})();

		return (
			<div
				key={component.id}
				className={wrapperClass}
				onClick={() => onSelect(component.id)}
			>
				{content}
			</div>
		);
	};

	const previewContent = (
		<div className="min-h-full bg-background">
			{sortedComponents.length === 0 ? (
				<div className="flex items-center justify-center h-96 text-muted-foreground">
					Dodajte komponente da vidite pregled
				</div>
			) : (
				sortedComponents.map(renderComponent)
			)}
		</div>
	);

	if (mode === "mobile") {
		return (
			<div className="flex items-start justify-center p-8 min-h-full">
				<MobilePreviewFrame>
					{previewContent}
				</MobilePreviewFrame>
			</div>
		);
	}

	return (
		<div className="min-h-full">
			{previewContent}
		</div>
	);
}
