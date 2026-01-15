import { useUploadFiles } from "@better-upload/client";
import { UploadDropzone } from "../upload-dropzone";
import { X, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	DragEndEvent,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState, useEffect, useId, useRef } from "react";
import { createMediaServerFn } from "@/queries/products";
import { ProxyImage } from "@/components/ui/proxy-image";

export interface MediaItem {
	id: string;
	url: string;
	filename: string;
	originalFilename: string;
	mimeType: string;
	size: number;
	position: number;
	isPrimary: boolean;
	mediaId?: string; // Database media ID after creation
}

interface MediaUploaderProps {
	value?: MediaItem[];
	onChange?: (media: MediaItem[]) => void;
	maxFiles?: number;
}

function SortableMediaItem({
	item,
	onRemove,
}: {
	item: MediaItem;
	onRemove: (id: string) => void;
}) {
	const [isMounted, setIsMounted] = useState(false);
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: item.id });

	useEffect(() => {
		setIsMounted(true);
	}, []);

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	// Only spread dnd-kit attributes after client-side mount to avoid hydration mismatch
	const dragHandleProps = isMounted ? { ...attributes, ...listeners } : {};

	return (
		<div
			ref={setNodeRef}
			style={style}
			className={cn(
				"relative group aspect-square rounded-md overflow-hidden border-2",
				item.isPrimary ? "border-primary" : "border-gray-200"
			)}
		>
			<ProxyImage
				src={item.url}
				alt={item.originalFilename}
				width={200}
				height={200}
				resizingType="fill"
				className="w-full h-full object-cover"
			/>
			<div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors flex items-center justify-center">
				<div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
					<button
						{...dragHandleProps}
						className="p-2 bg-white/90 rounded-md cursor-grab active:cursor-grabbing"
						type="button"
					>
						<GripVertical className="size-4" />
					</button>
					<Button
						type="button"
						variant="destructive"
						size="icon"
						className="h-8 w-8"
						onClick={() => onRemove(item.id)}
					>
						<X className="size-4" />
					</Button>
				</div>
			</div>
			{item.isPrimary && (
				<div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
					Primarna
				</div>
			)}
		</div>
	);
}

export function MediaUploader({
	value = [],
	onChange,
	maxFiles = 12,
}: MediaUploaderProps) {
	const [mediaItems, setMediaItems] = useState<MediaItem[]>(value);
	const [isUploading, setIsUploading] = useState(false);
	const [uploadCounter, setUploadCounter] = useState(0);
	const baseId = useId();
	const isInternalUpdate = useRef(false);

	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	);

	// Sync external value changes to internal state (e.g., form reset, initial load)
	useEffect(() => {
		if (!isInternalUpdate.current) {
			// Only sync if the value actually changed from external source
			const valueIds = value.map(v => v.mediaId || v.id).sort().join(',');
			const currentIds = mediaItems.map(m => m.mediaId || m.id).sort().join(',');
			if (valueIds !== currentIds) {
				setMediaItems(value);
			}
		}
		isInternalUpdate.current = false;
	}, [value]);

	// Notify parent of internal changes
	const updateMediaItems = (updater: (prev: MediaItem[]) => MediaItem[]) => {
		isInternalUpdate.current = true;
		setMediaItems(prev => {
			const newItems = updater(prev);
			onChange?.(newItems);
			return newItems;
		});
	};

	const handleUploadComplete = async (data: {
		files: Array<{
			name: string;
			size: number;
			type: string;
			objectInfo: { key: string };
		}>;
		metadata?: { publicUrls?: string[] };
	}) => {
		setIsUploading(true);
		try {
			const publicUrls = data.metadata?.publicUrls || [];
			const newMediaItems: MediaItem[] = [];

			for (let i = 0; i < data.files.length; i++) {
				const file = data.files[i];
				const url = publicUrls[i] || "";

				// Create media record in database
				const mediaRecord = await createMediaServerFn({
					data: {
						filename: file.objectInfo.key,
						originalFilename: file.name,
						mimeType: file.type,
						size: file.size,
						url,
						type: "image",
						storage: "s3",
					},
				});

				const newItem: MediaItem = {
					id: `${baseId}-upload-${uploadCounter + i}`,
					url,
					filename: file.objectInfo.key,
					originalFilename: file.name,
					mimeType: file.type,
					size: file.size,
					position: mediaItems.length + i,
					isPrimary: mediaItems.length === 0 && i === 0, // First item is primary
					mediaId: mediaRecord.id,
				};

				newMediaItems.push(newItem);
			}

			setUploadCounter((prev) => prev + data.files.length);

			updateMediaItems((prev) => {
				const updated = [...prev, ...newMediaItems];
				// Ensure only first item is primary
				return updated.map((item, index) => ({
					...item,
					isPrimary: index === 0,
					position: index,
				}));
			});
		} catch (error) {
			console.error("Error creating media records:", error);
		} finally {
			setIsUploading(false);
		}
	};

	const { control } = useUploadFiles({
		route: "images",
		onUploadComplete: handleUploadComplete,
	});

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;

		if (over && active.id !== over.id) {
			updateMediaItems((items) => {
				const oldIndex = items.findIndex((item) => item.id === active.id);
				const newIndex = items.findIndex((item) => item.id === over.id);
				const newItems = arrayMove(items, oldIndex, newIndex);
				// Update positions and ensure first item is primary
				return newItems.map((item, index) => ({
					...item,
					position: index,
					isPrimary: index === 0,
				}));
			});
		}
	};

	const handleRemove = (id: string) => {
		updateMediaItems((items) => {
			const filtered = items.filter((item) => item.id !== id);
			// Ensure first item is primary after removal
			return filtered.map((item, index) => ({
				...item,
				position: index,
				isPrimary: index === 0,
			}));
		});
	};

	const primaryImage = mediaItems.find((item) => item.isPrimary);
	const otherImages = mediaItems.filter((item) => !item.isPrimary);

	return (
		<div className="flex flex-col gap-4">
			<UploadDropzone
				control={control}
				accept="image/*"
				description={{
					maxFiles: maxFiles - mediaItems.length,
					maxFileSize: "5MB",
					fileTypes: "JPEG, PNG, WEBP",
				}}
			/>

			{mediaItems.length > 0 && (
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragEnd={handleDragEnd}
				>
					<SortableContext
						items={mediaItems.map((item) => item.id)}
						strategy={rectSortingStrategy}
					>
						<div className="grid grid-cols-6 gap-3">
							{primaryImage && (
								<div key={primaryImage.id} className="col-span-2">
									<SortableMediaItem
										item={primaryImage}
										onRemove={handleRemove}
									/>
								</div>
							)}
							{otherImages.length > 0 && (
								<div className="grid grid-cols-3 gap-3 col-span-4">
									{otherImages.map((item) => (
										<div key={item.id} className="col-span-1">
											<SortableMediaItem
												item={item}
												onRemove={handleRemove}
											/>
										</div>
									))}
								</div>
							)}
						</div>
					</SortableContext>
				</DndContext>
			)}
		</div>
	);
}
