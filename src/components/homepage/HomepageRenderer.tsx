import { ProductsCarouselSection } from "./ProductsCarouselSection";
import { TextInfoSection } from "./TextInfoSection";
import { MarqueeSection } from "./MarqueeSection";
import { CountdownSection } from "./CountdownSection";
import type {
	HomepageConfig,
	HomepageComponent,
	ProductsCarouselComponent,
	TextInfoComponent,
	MarqueeComponent,
	CountdownComponent,
} from "@/components/homepage-builder/types";

interface HomepageRendererProps {
	config: HomepageConfig;
}

export function HomepageRenderer({ config }: HomepageRendererProps) {
	const sortedComponents = [...config.components].sort((a, b) => a.position - b.position);

	const renderComponent = (component: HomepageComponent) => {
		switch (component.type) {
			case "products_carousel":
				return (
					<ProductsCarouselSection
						key={component.id}
						component={component as ProductsCarouselComponent}
					/>
				);
			case "text_info":
				return (
					<TextInfoSection
						key={component.id}
						component={component as TextInfoComponent}
					/>
				);
			case "marquee":
				return (
					<MarqueeSection
						key={component.id}
						component={component as MarqueeComponent}
					/>
				);
			case "countdown":
				return (
					<CountdownSection
						key={component.id}
						component={component as CountdownComponent}
					/>
				);
			default:
				return null;
		}
	};

	if (sortedComponents.length === 0) {
		return null;
	}

	return <>{sortedComponents.map(renderComponent)}</>;
}
