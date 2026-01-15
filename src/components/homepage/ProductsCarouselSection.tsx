import { useRef, useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProductCard } from "@/components/shop/ProductCard";
import { getPublicCollectionProductsServerFn } from "@/queries/collections";
import { getSpacingStyle } from "@/components/homepage-builder/types";
import { useTheme } from "@/components/theme-provider";
import type { ProductsCarouselComponent, TextSize } from "@/components/homepage-builder/types";

interface ProductsCarouselSectionProps {
	component: ProductsCarouselComponent;
	isPreview?: boolean;
	previewTheme?: "light" | "dark";
}

const TEXT_SIZE_CLASSES: Record<TextSize, string> = {
	sm: "text-sm",
	md: "text-base",
	lg: "text-lg",
	xl: "text-xl",
	"2xl": "text-2xl",
	"3xl": "text-3xl",
};

export function ProductsCarouselSection({ component, isPreview, previewTheme }: ProductsCarouselSectionProps) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(false);
	const { resolvedTheme } = useTheme();

	// Use previewTheme if provided (for builder preview), otherwise use resolvedTheme
	const activeTheme = previewTheme ?? resolvedTheme;

	// Use dark mode colors when in dark mode
	const bgColor = activeTheme === "dark" ? (component.darkBgColor || component.bgColor) : component.bgColor;
	const textColor = activeTheme === "dark" ? (component.darkTextColor || component.textColor) : component.textColor;

	const { data, isLoading } = useQuery({
		queryKey: ["homepage-carousel", component.collectionId, component.limit],
		queryFn: async () => {
			if (!component.collectionId) return { products: [] };
			return await getPublicCollectionProductsServerFn({
				data: {
					collectionId: component.collectionId,
					limit: component.limit,
				},
			});
		},
		enabled: !!component.collectionId,
	});

	const products = data?.products || [];

	const updateScrollButtons = useCallback(() => {
		const container = scrollRef.current;
		if (!container) return;

		setCanScrollLeft(container.scrollLeft > 0);
		setCanScrollRight(
			container.scrollLeft < container.scrollWidth - container.clientWidth - 1
		);
	}, []);

	useEffect(() => {
		updateScrollButtons();
		const container = scrollRef.current;
		if (container) {
			container.addEventListener("scroll", updateScrollButtons);
			window.addEventListener("resize", updateScrollButtons);
			return () => {
				container.removeEventListener("scroll", updateScrollButtons);
				window.removeEventListener("resize", updateScrollButtons);
			};
		}
	}, [updateScrollButtons, products]);

	const scroll = (direction: "left" | "right") => {
		const container = scrollRef.current;
		if (!container) return;

		const scrollAmount = container.clientWidth * 0.8;
		container.scrollBy({
			left: direction === "left" ? -scrollAmount : scrollAmount,
			behavior: "smooth",
		});
	};

	const spacingStyle = getSpacingStyle(component);

	if (!component.collectionId) {
		return (
			<section
				style={{
					backgroundColor: bgColor,
					color: textColor,
					...spacingStyle,
				}}
			>
				<div className="container mx-auto px-4">
					<div className="text-center py-12 text-muted-foreground">
						Izaberite kolekciju za prikaz proizvoda
					</div>
				</div>
			</section>
		);
	}

	return (
		<section
			style={{
				backgroundColor: bgColor,
				color: textColor,
				...spacingStyle,
			}}
		>
			<div className="container mx-auto px-4">
				<div className="flex items-center justify-between mb-6">
					<div>
						{component.title && (
							<h2 className={cn("font-semibold", TEXT_SIZE_CLASSES[component.titleSize])}>
								{component.title}
							</h2>
						)}
						{component.subtitle && (
							<p className={cn("mt-1 opacity-70", TEXT_SIZE_CLASSES[component.subtitleSize])}>
								{component.subtitle}
							</p>
						)}
					</div>

					<div className="flex items-center gap-4">
						{component.showButton && component.buttonText && !isPreview && data?.collectionSlug && (
							<Link
								to="/collection/$slug"
								params={{ slug: data.collectionSlug }}
								search={{
									cursor: undefined,
									sort: undefined,
									minPrice: undefined,
									maxPrice: undefined,
									category: undefined,
									options: undefined,
								}}
								className="hidden sm:inline-flex items-center gap-1 text-sm font-bold underline"
							>
								{component.buttonText}
								<ArrowRight className="size-4" />
							</Link>
						)}

						<div className="hidden md:flex items-center gap-2">
							<button
								onClick={() => scroll("left")}
								disabled={!canScrollLeft}
								className={cn(
									"p-2 rounded-full border transition-colors",
									canScrollLeft
										? "hover:bg-current/10"
										: "opacity-30 cursor-not-allowed"
								)}
								style={{ borderColor: textColor }}
							>
								<ChevronLeft className="size-5" />
							</button>
							<button
								onClick={() => scroll("right")}
								disabled={!canScrollRight}
								className={cn(
									"p-2 rounded-full border transition-colors",
									canScrollRight
										? "hover:bg-current/10"
										: "opacity-30 cursor-not-allowed"
								)}
								style={{ borderColor: textColor }}
							>
								<ChevronRight className="size-5" />
							</button>
						</div>
					</div>
				</div>

				{isLoading ? (
					<div className="flex items-center justify-center py-12">
						<Loader2 className="size-8 animate-spin opacity-50" />
					</div>
				) : products.length === 0 ? (
					<div className="text-center py-12 opacity-50">
						Nema proizvoda u ovoj kolekciji
					</div>
				) : (
					<div
						ref={scrollRef}
						className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-4 pl-4 pr-4 md:mx-0 md:pl-0 md:pr-0 snap-x snap-mandatory scroll-pl-4 md:scroll-pl-0"
						style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
					>
						{products.map((product) => (
							<div
								key={product.id}
								className="flex-shrink-0 w-[160px] sm:w-[200px] md:w-[220px] lg:w-[240px] snap-start"
							>
								<ProductCard
									id={product.id}
									name={product.name}
									slug={product.slug}
									price={product.price}
									compareAtPrice={product.compareAtPrice}
									image={product.primaryImage}
									variants={product.variants}
									inheritColors
								/>
							</div>
						))}
					</div>
				)}

				{component.showButton && component.buttonText && !isPreview && data?.collectionSlug && (
					<div className="mt-6 text-center sm:hidden">
						<Link
							to="/collection/$slug"
							params={{ slug: data.collectionSlug }}
							search={{
								cursor: undefined,
								sort: undefined,
								minPrice: undefined,
								maxPrice: undefined,
								category: undefined,
								options: undefined,
							}}
							className="inline-flex items-center gap-1 text-sm font-bold underline"
						>
							{component.buttonText}
							<ArrowRight className="size-4" />
						</Link>
					</div>
				)}
			</div>
		</section>
	);
}
