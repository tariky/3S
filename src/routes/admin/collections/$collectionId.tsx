import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
	getCollectionByIdQueryOptions,
	getCollectionProductsQueryOptions,
	updateCollectionProductPositionsServerFn,
	removeProductFromCollectionServerFn,
	regenerateCollectionProductsServerFn,
	COLLECTIONS_QUERY_KEY,
} from "@/queries/collections";
import { CollectionEditor } from "@/components/collections/CollectionEditor";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
	Loader2,
	GripVertical,
	Trash2,
	RefreshCw,
	Package,
} from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	TouchSensor,
	useSensor,
	useSensors,
	DragEndEvent,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const Route = createFileRoute("/admin/collections/$collectionId")({
	component: EditCollectionPage,
});

// Type for collection products
interface CollectionProduct {
	id: string;
	productId: string;
	position: number;
	isManual: boolean;
	product: {
		id: string;
		name: string;
		slug: string;
		price: string;
		compareAtPrice: string | null;
		status: string;
		createdAt?: Date;
		image?: string | null;
	};
}

function EditCollectionPage() {
	const { collectionId } = Route.useParams();
	const queryClient = useQueryClient();

	const { data: collection, isLoading: collectionLoading } = useQuery(
		getCollectionByIdQueryOptions(collectionId)
	);

	const { data: productsData, isLoading: productsLoading } = useQuery(
		getCollectionProductsQueryOptions(collectionId)
	);

	const [sortedProducts, setSortedProducts] = useState<CollectionProduct[]>([]);
	// Track the productsData reference to detect when server data actually changes
	const lastServerDataRef = useRef<typeof productsData>(null);

	// Mutations (defined before useEffect that depends on them)
	const updatePositionsMutation = useMutation({
		mutationFn: async (data: {
			collectionId: string;
			products: { id: string; position: number }[];
		}) => {
			return await updateCollectionProductPositionsServerFn({ data });
		},
		onSuccess: () => {
			// Update ref to current data so we don't sync stale data
			lastServerDataRef.current = productsData;
		},
		onError: (error) => {
			console.error("Failed to update positions:", error);
			// Refetch to restore server state on error
			lastServerDataRef.current = null; // Allow next sync
			queryClient.invalidateQueries({
				queryKey: [COLLECTIONS_QUERY_KEY, collectionId, "products"],
			});
		},
	});

	// Sync sorted products with server data only when it actually changes
	useEffect(() => {
		// Only sync if productsData is different from last sync
		// This prevents overwriting local changes when mutation completes
		if (productsData && productsData !== lastServerDataRef.current) {
			setSortedProducts(productsData as CollectionProduct[]);
			lastServerDataRef.current = productsData;
		}
	}, [productsData]);

	// DnD sensors with activation constraints
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8, // Require 8px of movement before activating
			},
		}),
		useSensor(TouchSensor, {
			activationConstraint: {
				delay: 250,
				tolerance: 5,
			},
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	);

	// Memoize sortable items to prevent unnecessary re-renders
	const sortableItems = useMemo(
		() => sortedProducts.map((p) => p.id),
		[sortedProducts]
	);

	const removeProductMutation = useMutation({
		mutationFn: async (productId: string) => {
			return await removeProductFromCollectionServerFn({
				data: { collectionId, productId },
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: [COLLECTIONS_QUERY_KEY, collectionId, "products"],
			});
		},
	});

	const regenerateMutation = useMutation({
		mutationFn: async () => {
			return await regenerateCollectionProductsServerFn({
				data: { collectionId },
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: [COLLECTIONS_QUERY_KEY, collectionId, "products"],
			});
		},
	});

	// Handle drag end
	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;

		if (over && active.id !== over.id) {
			const oldIndex = sortedProducts.findIndex((p) => p.id === active.id);
			const newIndex = sortedProducts.findIndex((p) => p.id === over.id);

			const newOrder = arrayMove(sortedProducts, oldIndex, newIndex);
			setSortedProducts(newOrder);

			// Save new positions
			updatePositionsMutation.mutate({
				collectionId,
				products: newOrder.map((p, index) => ({
					id: p.id,
					position: index,
				})),
			});
		}
	};

	if (collectionLoading) {
		return (
			<div className="flex items-center justify-center h-64">
				<Loader2 className="size-8 animate-spin text-primary" />
			</div>
		);
	}

	if (!collection) {
		return (
			<div className="text-center py-12">
				<p className="text-gray-600">Kolekcija nije pronađena</p>
				<Button asChild className="mt-4">
					<Link to="/admin/collections">Nazad na kolekcije</Link>
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			{/* Collection Editor */}
			<CollectionEditor
				collection={{
					id: collection.id,
					name: collection.name,
					slug: collection.slug,
					description: collection.description,
					image: collection.image,
					ruleMatch: collection.ruleMatch as "all" | "any",
					sortOrder: collection.sortOrder,
					active: collection.active,
					seoTitle: collection.seoTitle,
					seoDescription: collection.seoDescription,
					rules: (collection.rules || []).map((rule) => ({
						id: rule.id,
						ruleType: rule.ruleType,
						operator: rule.operator,
						value: rule.value,
						position: rule.position,
					})),
				}}
				isEditing
			/>

			{/* Products Management */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle>Proizvodi u kolekciji ({sortedProducts.length})</CardTitle>
						<Button
							variant="outline"
							size="sm"
							onClick={() => regenerateMutation.mutate()}
							disabled={regenerateMutation.isPending}
						>
							{regenerateMutation.isPending ? (
								<Loader2 className="size-4 mr-2 animate-spin" />
							) : (
								<RefreshCw className="size-4 mr-2" />
							)}
							Regeneriši proizvode
						</Button>
					</div>
				</CardHeader>
				<CardContent>
					{productsLoading ? (
						<div className="flex items-center justify-center py-8">
							<Loader2 className="size-6 animate-spin text-primary" />
						</div>
					) : sortedProducts.length === 0 ? (
						<div className="text-center py-8 text-gray-500">
							<Package className="size-12 mx-auto mb-4 text-gray-300" />
							<p>Nema proizvoda u ovoj kolekciji</p>
							<p className="text-sm mt-1">
								Dodajte pravila ili ručno dodajte proizvode
							</p>
						</div>
					) : (
						<DndContext
							sensors={sensors}
							collisionDetection={closestCenter}
							onDragEnd={handleDragEnd}
						>
							<SortableContext
								items={sortableItems}
								strategy={verticalListSortingStrategy}
							>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead className="w-[50px]"></TableHead>
											<TableHead>Proizvod</TableHead>
											<TableHead>Cijena</TableHead>
											<TableHead>Status</TableHead>
											<TableHead>Tip</TableHead>
											<TableHead className="w-[80px]"></TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{sortedProducts.map((item) => (
											<SortableProductRow
												key={item.id}
												item={item}
												onRemove={() =>
													removeProductMutation.mutate(item.productId)
												}
												isRemoving={removeProductMutation.isPending}
											/>
										))}
									</TableBody>
								</Table>
							</SortableContext>
						</DndContext>
					)}
				</CardContent>
			</Card>
		</div>
	);
}

// Sortable product row component
function SortableProductRow({
	item,
	onRemove,
	isRemoving,
}: {
	item: CollectionProduct;
	onRemove: () => void;
	isRemoving: boolean;
}) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id: item.id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	return (
		<TableRow ref={setNodeRef} style={style}>
			<TableCell>
				<button
					{...attributes}
					{...listeners}
					className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
				>
					<GripVertical className="size-4 text-gray-400" />
				</button>
			</TableCell>
			<TableCell>
				<div className="flex items-center gap-3">
					{item.product?.image ? (
						<img
							src={item.product.image}
							alt={item.product?.name || ""}
							className="w-10 h-10 rounded object-cover"
						/>
					) : (
						<div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center">
							<Package className="size-5 text-gray-400" />
						</div>
					)}
					<div>
						<p className="font-medium text-gray-900">{item.product?.name}</p>
						<p className="text-sm text-gray-500">/{item.product?.slug}</p>
					</div>
				</div>
			</TableCell>
			<TableCell>
				<div>
					<p className="font-medium">{parseFloat(item.product?.price || "0").toFixed(2)} KM</p>
					{item.product?.compareAtPrice && (
						<p className="text-sm text-gray-500 line-through">
							{parseFloat(item.product.compareAtPrice).toFixed(2)} KM
						</p>
					)}
				</div>
			</TableCell>
			<TableCell>
				<Badge
					className={
						item.product?.status === "active"
							? "bg-green-100 text-green-800"
							: "bg-gray-100 text-gray-800"
					}
				>
					{item.product?.status === "active" ? "Aktivan" : "Nacrt"}
				</Badge>
			</TableCell>
			<TableCell>
				<Badge variant={item.isManual ? "default" : "secondary"}>
					{item.isManual ? "Ručno" : "Auto"}
				</Badge>
			</TableCell>
			<TableCell>
				<Button
					variant="ghost"
					size="icon"
					onClick={onRemove}
					disabled={isRemoving}
				>
					<Trash2 className="size-4 text-red-500" />
				</Button>
			</TableCell>
		</TableRow>
	);
}

