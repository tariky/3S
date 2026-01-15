import { useState, useCallback, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { nanoid } from "nanoid";
import { ArrowLeft, Monitor, Smartphone, Save, Loader2, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ComponentList } from "./ComponentList";
import { ComponentTypeSelector } from "./ComponentTypeSelector";
import { ComponentEditor } from "./ComponentEditor";
import { PreviewPanel } from "./PreviewPanel";
import type {
	HomepageConfig,
	HomepageComponent,
	ProductsCarouselComponent,
	TextInfoComponent,
	MarqueeComponent,
	CountdownComponent,
} from "./types";
import {
	createDefaultProductsCarousel,
	createDefaultTextInfo,
	createDefaultMarquee,
	createDefaultCountdown,
} from "./types";

interface HomepageBuilderProps {
	initialConfig: HomepageConfig;
	onSave: (config: HomepageConfig) => Promise<{ success: boolean }>;
	isSaving: boolean;
}

export function HomepageBuilder({ initialConfig, onSave, isSaving }: HomepageBuilderProps) {
	const [config, setConfig] = useState<HomepageConfig>(initialConfig);
	const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
	const [previewTheme, setPreviewTheme] = useState<"light" | "dark">("light");
	const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
	const [showTypeSelector, setShowTypeSelector] = useState(false);
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

	useEffect(() => {
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			if (hasUnsavedChanges) {
				e.preventDefault();
				e.returnValue = "";
			}
		};
		window.addEventListener("beforeunload", handleBeforeUnload);
		return () => window.removeEventListener("beforeunload", handleBeforeUnload);
	}, [hasUnsavedChanges]);

	const handleAddComponent = useCallback((type: HomepageComponent["type"]) => {
		const id = nanoid();
		const position = config.components.length;

		let newComponent: HomepageComponent;

		switch (type) {
			case "products_carousel":
				newComponent = { id, position, ...createDefaultProductsCarousel() } as ProductsCarouselComponent;
				break;
			case "text_info":
				newComponent = { id, position, ...createDefaultTextInfo() } as TextInfoComponent;
				break;
			case "marquee":
				newComponent = { id, position, ...createDefaultMarquee() } as MarqueeComponent;
				break;
			case "countdown":
				newComponent = { id, position, ...createDefaultCountdown() } as CountdownComponent;
				break;
		}

		setConfig((prev) => ({
			...prev,
			components: [...prev.components, newComponent],
		}));
		setSelectedComponentId(id);
		setShowTypeSelector(false);
		setHasUnsavedChanges(true);
	}, [config.components.length]);

	const handleUpdateComponent = useCallback((id: string, updates: Partial<HomepageComponent>) => {
		setConfig((prev) => ({
			...prev,
			components: prev.components.map((comp) =>
				comp.id === id ? { ...comp, ...updates } as HomepageComponent : comp
			),
		}));
		setHasUnsavedChanges(true);
	}, []);

	const handleDeleteComponent = useCallback((id: string) => {
		setConfig((prev) => ({
			...prev,
			components: prev.components
				.filter((comp) => comp.id !== id)
				.map((comp, index) => ({ ...comp, position: index })),
		}));
		if (selectedComponentId === id) {
			setSelectedComponentId(null);
		}
		setHasUnsavedChanges(true);
	}, [selectedComponentId]);

	const handleReorderComponents = useCallback((reorderedComponents: HomepageComponent[]) => {
		setConfig((prev) => ({
			...prev,
			components: reorderedComponents.map((comp, index) => ({
				...comp,
				position: index,
			})),
		}));
		setHasUnsavedChanges(true);
	}, []);

	const handleSave = async () => {
		try {
			await onSave(config);
			setHasUnsavedChanges(false);
			toast.success("Promjene su uspješno sačuvane");
		} catch {
			toast.error("Greška pri čuvanju");
		}
	};

	const selectedComponent = selectedComponentId
		? config.components.find((c) => c.id === selectedComponentId)
		: null;

	return (
		<div className="fixed inset-0 z-50 bg-background flex flex-col">
			<header className="flex h-14 items-center justify-between border-b px-4 shrink-0">
				<div className="flex items-center gap-4">
					<Link to="/admin" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
						<ArrowLeft className="h-4 w-4" />
						<span className="hidden sm:inline">Nazad</span>
					</Link>
					<div className="h-4 w-px bg-border" />
					<h1 className="font-semibold">Homepage Builder</h1>
					{hasUnsavedChanges && (
						<span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
							Nespremljene promjene
						</span>
					)}
				</div>
				<div className="flex items-center gap-2">
					{/* Light/Dark Toggle */}
					<div className="hidden sm:flex items-center border rounded-md">
						<Button
							variant={previewTheme === "light" ? "secondary" : "ghost"}
							size="sm"
							className="rounded-r-none"
							onClick={() => setPreviewTheme("light")}
						>
							<Sun className="h-4 w-4" />
						</Button>
						<Button
							variant={previewTheme === "dark" ? "secondary" : "ghost"}
							size="sm"
							className="rounded-l-none"
							onClick={() => setPreviewTheme("dark")}
						>
							<Moon className="h-4 w-4" />
						</Button>
					</div>
					{/* Desktop/Mobile Toggle */}
					<div className="hidden sm:flex items-center border rounded-md">
						<Button
							variant={previewMode === "desktop" ? "secondary" : "ghost"}
							size="sm"
							className="rounded-r-none"
							onClick={() => setPreviewMode("desktop")}
						>
							<Monitor className="h-4 w-4" />
						</Button>
						<Button
							variant={previewMode === "mobile" ? "secondary" : "ghost"}
							size="sm"
							className="rounded-l-none"
							onClick={() => setPreviewMode("mobile")}
						>
							<Smartphone className="h-4 w-4" />
						</Button>
					</div>
					<Button onClick={handleSave} disabled={isSaving || !hasUnsavedChanges}>
						{isSaving ? (
							<Loader2 className="h-4 w-4 animate-spin mr-2" />
						) : (
							<Save className="h-4 w-4 mr-2" />
						)}
						Sačuvaj
					</Button>
				</div>
			</header>

			<div className="flex flex-1 overflow-hidden">
				<aside className="w-80 border-r flex flex-col shrink-0">
					<ComponentList
						components={config.components}
						selectedId={selectedComponentId}
						onSelect={setSelectedComponentId}
						onDelete={handleDeleteComponent}
						onReorder={handleReorderComponents}
						onAddClick={() => setShowTypeSelector(true)}
					/>
					{selectedComponent && (
						<div className="border-t overflow-auto flex-1">
							<ComponentEditor
								component={selectedComponent}
								onUpdate={(updates) => handleUpdateComponent(selectedComponent.id, updates)}
								onClose={() => setSelectedComponentId(null)}
							/>
						</div>
					)}
				</aside>

				<main className="flex-1 overflow-auto bg-muted/30">
					<PreviewPanel
						components={config.components}
						mode={previewMode}
						theme={previewTheme}
						selectedId={selectedComponentId}
						onSelect={setSelectedComponentId}
					/>
				</main>
			</div>

			<ComponentTypeSelector
				open={showTypeSelector}
				onOpenChange={setShowTypeSelector}
				onSelect={handleAddComponent}
			/>
		</div>
	);
}
