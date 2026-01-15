import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductsCarouselEditor } from "./editors/ProductsCarouselEditor";
import { TextInfoEditor } from "./editors/TextInfoEditor";
import { MarqueeEditor } from "./editors/MarqueeEditor";
import { CountdownEditor } from "./editors/CountdownEditor";
import { COMPONENT_TYPE_LABELS } from "./types";
import type {
	HomepageComponent,
	ProductsCarouselComponent,
	TextInfoComponent,
	MarqueeComponent,
	CountdownComponent,
} from "./types";

interface ComponentEditorProps {
	component: HomepageComponent;
	onUpdate: (updates: Partial<HomepageComponent>) => void;
	onClose: () => void;
}

export function ComponentEditor({ component, onUpdate, onClose }: ComponentEditorProps) {
	const renderEditor = () => {
		switch (component.type) {
			case "products_carousel":
				return (
					<ProductsCarouselEditor
						component={component as ProductsCarouselComponent}
						onUpdate={onUpdate}
					/>
				);
			case "text_info":
				return (
					<TextInfoEditor
						component={component as TextInfoComponent}
						onUpdate={onUpdate}
					/>
				);
			case "marquee":
				return (
					<MarqueeEditor
						component={component as MarqueeComponent}
						onUpdate={onUpdate}
					/>
				);
			case "countdown":
				return (
					<CountdownEditor
						component={component as CountdownComponent}
						onUpdate={onUpdate}
					/>
				);
			default:
				return null;
		}
	};

	return (
		<div className="flex flex-col h-full">
			<div className="flex items-center justify-between p-4 border-b bg-muted/30">
				<h3 className="font-medium text-sm">
					{COMPONENT_TYPE_LABELS[component.type]}
				</h3>
				<Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
					<X className="h-4 w-4" />
				</Button>
			</div>
			<div className="flex-1 overflow-auto p-4">
				{renderEditor()}
			</div>
		</div>
	);
}
