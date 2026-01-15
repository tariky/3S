"use client";

import * as React from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { ProxyImage } from "@/components/ui/proxy-image";
import {
	Dialog,
	DialogContent,
	DialogClose,
} from "@/components/ui/dialog";

interface ProductImageCarouselProps {
	images: Array<{
		url: string;
		alt?: string;
	}>;
	productName: string;
}

export function ProductImageCarousel({
	images,
	productName,
}: ProductImageCarouselProps) {
	const [selectedIndex, setSelectedIndex] = React.useState(0);
	const [lightboxOpen, setLightboxOpen] = React.useState(false);

	// Main carousel
	const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });

	// Thumbnail carousel
	const [thumbsRef, thumbsApi] = useEmblaCarousel({
		containScroll: "keepSnaps",
		dragFree: true,
	});

	// Lightbox carousel
	const [lightboxRef, lightboxApi] = useEmblaCarousel({
		loop: true,
		startIndex: selectedIndex,
	});

	// Sync main carousel with selected index
	const onSelect = React.useCallback(() => {
		if (!emblaApi) return;
		setSelectedIndex(emblaApi.selectedScrollSnap());
	}, [emblaApi]);

	React.useEffect(() => {
		if (!emblaApi) return;
		onSelect();
		emblaApi.on("select", onSelect);
		return () => {
			emblaApi.off("select", onSelect);
		};
	}, [emblaApi, onSelect]);

	// Scroll to selected thumbnail when index changes
	React.useEffect(() => {
		if (!thumbsApi) return;
		thumbsApi.scrollTo(selectedIndex);
	}, [thumbsApi, selectedIndex]);

	// Sync lightbox with main carousel when opened
	React.useEffect(() => {
		if (lightboxOpen && lightboxApi) {
			lightboxApi.scrollTo(selectedIndex, true);
		}
	}, [lightboxOpen, lightboxApi, selectedIndex]);

	// Handle lightbox navigation
	const onLightboxSelect = React.useCallback(() => {
		if (!lightboxApi) return;
		const newIndex = lightboxApi.selectedScrollSnap();
		setSelectedIndex(newIndex);
		emblaApi?.scrollTo(newIndex);
	}, [lightboxApi, emblaApi]);

	React.useEffect(() => {
		if (!lightboxApi) return;
		lightboxApi.on("select", onLightboxSelect);
		return () => {
			lightboxApi.off("select", onLightboxSelect);
		};
	}, [lightboxApi, onLightboxSelect]);

	const scrollPrev = React.useCallback(() => {
		emblaApi?.scrollPrev();
	}, [emblaApi]);

	const scrollNext = React.useCallback(() => {
		emblaApi?.scrollNext();
	}, [emblaApi]);

	const scrollTo = React.useCallback(
		(index: number) => {
			emblaApi?.scrollTo(index);
		},
		[emblaApi]
	);

	// Keyboard navigation
	React.useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (lightboxOpen) {
				if (e.key === "ArrowLeft") {
					lightboxApi?.scrollPrev();
				} else if (e.key === "ArrowRight") {
					lightboxApi?.scrollNext();
				} else if (e.key === "Escape") {
					setLightboxOpen(false);
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [lightboxOpen, lightboxApi]);

	if (images.length === 0) {
		return (
			<div className="aspect-[4/5] lg:aspect-square bg-muted rounded-b-lg lg:rounded-lg flex items-center justify-center">
				<span className="text-muted-foreground">Nema slike</span>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			{/* Main Carousel */}
			<div className="relative group">
				<div
					className="overflow-hidden rounded-b-lg lg:rounded-lg bg-muted"
					ref={emblaRef}
					role="region"
					aria-label="Product images"
				>
					<div className="flex">
						{images.map((image, index) => (
							<div
								key={index}
								className="flex-[0_0_100%] min-w-0 relative aspect-[4/5] lg:aspect-square cursor-zoom-in"
								onClick={() => setLightboxOpen(true)}
							>
								<ProxyImage
									src={image.url}
									alt={image.alt || `${productName} - Image ${index + 1}`}
									width={800}
									height={1000}
									resizingType="fill"
									className="w-full h-full object-cover"
								/>
								{/* Zoom indicator */}
								<div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-sm rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity">
									<ZoomIn className="size-5 text-gray-700" />
								</div>
							</div>
						))}
					</div>
				</div>

				{/* Navigation Arrows - Desktop */}
				{images.length > 1 && (
					<>
						<button
							onClick={scrollPrev}
							className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
							aria-label="Previous image"
						>
							<ChevronLeft className="size-5 text-gray-700" />
						</button>
						<button
							onClick={scrollNext}
							className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
							aria-label="Next image"
						>
							<ChevronRight className="size-5 text-gray-700" />
						</button>
					</>
				)}

				{/* Image Counter - Mobile */}
				{images.length > 1 && (
					<div className="absolute bottom-4 left-4 bg-black/60 text-white text-sm px-2.5 py-1 rounded-full lg:hidden">
						{selectedIndex + 1} / {images.length}
					</div>
				)}
			</div>

			{/* Thumbnail Strip */}
			{images.length > 1 && (
				<div className="overflow-hidden px-4 lg:px-0" ref={thumbsRef}>
					<div className="flex gap-2">
						{images.map((image, index) => (
							<button
								key={index}
								onClick={() => scrollTo(index)}
								className={cn(
									"flex-[0_0_auto] w-16 h-16 sm:w-20 sm:h-20 rounded-md overflow-hidden border-2 transition-all",
									index === selectedIndex
										? "border-foreground opacity-100"
										: "border-transparent opacity-60 hover:opacity-100"
								)}
								aria-label={`View image ${index + 1}`}
								aria-selected={index === selectedIndex}
							>
								<ProxyImage
									src={image.url}
									alt=""
									width={80}
									height={80}
									resizingType="fill"
									className="w-full h-full object-cover"
								/>
							</button>
						))}
					</div>
				</div>
			)}

			{/* Lightbox Dialog */}
			<Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
				<DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 bg-black/95 border-none">
					<DialogClose className="absolute right-4 top-4 z-50 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
						<X className="size-5 text-white" />
						<span className="sr-only">Close</span>
					</DialogClose>

					{/* Lightbox Carousel */}
					<div
						className="h-full overflow-hidden flex items-center"
						ref={lightboxRef}
					>
						<div className="flex h-full">
							{images.map((image, index) => (
								<div
									key={index}
									className="flex-[0_0_100%] min-w-0 h-full flex items-center justify-center p-4"
								>
									<ProxyImage
										src={image.url}
										alt={image.alt || `${productName} - Image ${index + 1}`}
										width={1200}
										height={1200}
										quality={90}
										className="max-w-full max-h-full object-contain"
									/>
								</div>
							))}
						</div>
					</div>

					{/* Lightbox Navigation */}
					{images.length > 1 && (
						<>
							<button
								onClick={() => lightboxApi?.scrollPrev()}
								className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
								aria-label="Previous image"
							>
								<ChevronLeft className="size-6 text-white" />
							</button>
							<button
								onClick={() => lightboxApi?.scrollNext()}
								className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
								aria-label="Next image"
							>
								<ChevronRight className="size-6 text-white" />
							</button>
						</>
					)}

					{/* Lightbox Counter */}
					<div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/10 text-white text-sm px-3 py-1.5 rounded-full">
						{selectedIndex + 1} / {images.length}
					</div>
				</DialogContent>
			</Dialog>
		</div>
	);
}
