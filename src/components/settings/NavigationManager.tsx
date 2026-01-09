"use client";

import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
	Plus,
	Pencil,
	Trash2,
	ChevronRight,
	ChevronDown,
	GripVertical,
	Upload,
	X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	NAVIGATION_QUERY_KEY,
	type NavigationItem,
	createNavigationItemServerFn,
	updateNavigationItemServerFn,
	deleteNavigationItemServerFn,
	reorderNavigationItemsServerFn,
	getNavigationQueryOptions,
} from "@/queries/navigation";
import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
	DndContext,
	closestCenter,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
	type DragEndEvent,
} from "@dnd-kit/core";
import {
	arrayMove,
	SortableContext,
	sortableKeyboardCoordinates,
	useSortable,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useUploadFiles } from "@better-upload/client";

function SortableNavigationItem({
	item,
	level = 0,
	onEdit,
	onDelete,
	onAddChild,
	allItems,
}: {
	item: NavigationItem;
	level?: number;
	onEdit: (item: NavigationItem) => void;
	onDelete: (id: string) => void;
	onAddChild: (parentId: string) => void;
	allItems: NavigationItem[];
}) {
	const [isExpanded, setIsExpanded] = React.useState(true);
	
	// Get children from allItems
	const children = allItems.filter((i) => i.parentId === item.id);
	const hasChildren = children.length > 0;

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
		<div ref={setNodeRef} style={style}>
			<div
				className={cn(
					"flex items-center gap-2 p-2 rounded-md hover:bg-gray-50 border",
					level > 0 && "ml-6"
				)}
			>
				<div
					{...attributes}
					{...listeners}
					className="cursor-grab active:cursor-grabbing p-1"
				>
					<GripVertical className="size-4 text-gray-400" />
				</div>

				{hasChildren && (
					<Button
						variant="ghost"
						size="icon"
						className="size-6"
						onClick={() => setIsExpanded(!isExpanded)}
					>
						{isExpanded ? (
							<ChevronDown className="size-4" />
						) : (
							<ChevronRight className="size-4" />
						)}
					</Button>
				)}
				{!hasChildren && <div className="size-6" />}

				<div className="flex-1 flex items-center gap-2">
					{item.image && (
						<img
							src={item.image}
							alt=""
							className="size-6 object-contain rounded"
						/>
					)}
					<span className="font-medium">{item.title}</span>
					<span className="text-sm text-gray-500">{item.url}</span>
					{hasChildren && (
						<span className="text-xs text-gray-400">
							({children.length} {children.length === 1 ? "dijete" : "djece"})
						</span>
					)}
				</div>

				<div className="flex items-center gap-1">
					<Button
						variant="ghost"
						size="icon"
						className="size-8"
						onClick={() => onAddChild(item.id)}
						title="Dodaj dijete"
					>
						<Plus className="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="size-8"
						onClick={() => onEdit(item)}
						title="Uredi"
					>
						<Pencil className="size-4" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="size-8 text-red-500 hover:text-red-700"
						onClick={() => onDelete(item.id)}
						title="Obriši"
					>
						<Trash2 className="size-4" />
					</Button>
				</div>
			</div>

			{hasChildren && isExpanded && (
				<div className="ml-4 mt-1">
					{children
						.sort((a, b) => a.position - b.position)
						.map((child) => (
							<SortableNavigationItem
								key={child.id}
								item={child}
								level={level + 1}
								onEdit={onEdit}
								onDelete={onDelete}
								onAddChild={onAddChild}
								allItems={allItems}
							/>
						))}
				</div>
			)}
		</div>
	);
}

// Image upload component for navigation
function NavImageUpload({
	value,
	onChange,
}: {
	value: string;
	onChange: (url: string) => void;
}) {
	const [isUploading, setIsUploading] = React.useState(false);

	const { control } = useUploadFiles({
		route: "images",
		onUploadComplete: (data) => {
			const publicUrls = data.metadata?.publicUrls as string[] | undefined;
			if (publicUrls && publicUrls.length > 0) {
				onChange(publicUrls[0]);
			}
			setIsUploading(false);
		},
	});

	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		setIsUploading(true);
		control.upload([file]);
	};

	return (
		<div className="flex flex-col gap-2">
			{value ? (
				<div className="relative inline-flex items-center gap-3 p-3 border rounded-lg bg-gray-50">
					<img
						src={value}
						alt="Nav icon"
						className="size-10 object-contain"
					/>
					<span className="text-sm text-gray-600 truncate max-w-[200px]">
						{value.split("/").pop()}
					</span>
					<button
						type="button"
						onClick={() => onChange("")}
						className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600 ml-auto"
					>
						<X className="w-3 h-3" />
					</button>
				</div>
			) : (
				<label
					className={cn(
						"flex items-center justify-center gap-2 h-20 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 transition-colors",
						isUploading && "opacity-50 cursor-not-allowed"
					)}
				>
					{isUploading ? (
						<Loader2 className="size-5 text-gray-400 animate-spin" />
					) : (
						<Upload className="size-5 text-gray-400" />
					)}
					<span className="text-sm text-gray-500">
						{isUploading ? "Učitavanje..." : "Učitaj sliku (PNG, JPG, SVG)"}
					</span>
					<input
						type="file"
						accept="image/*,.svg"
						onChange={handleFileChange}
						className="hidden"
						disabled={isUploading}
					/>
				</label>
			)}
		</div>
	);
}

function NavigationItemDialog({
	open,
	onOpenChange,
	item,
	parentId,
	allItems,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	item?: NavigationItem;
	parentId?: string | null;
	allItems: NavigationItem[];
}) {
	const queryClient = useQueryClient();

	// Get parent item info if adding a child
	const parentItem = React.useMemo(() => {
		if (parentId && !item) {
			return allItems.find((i) => i.id === parentId);
		}
		return null;
	}, [parentId, item, allItems]);

	const form = useForm({
		defaultValues: {
			title: item?.title || "",
			url: item?.url || "",
			image: item?.image || "",
		},
		onSubmit: async ({ value }) => {
			if (item) {
				// Update
				await updateMutation.mutateAsync({
					id: item.id,
					title: value.title,
					url: value.url,
					image: value.image || null,
				});
			} else {
				// Create
				await createMutation.mutateAsync({
					parentId: parentId || null,
					title: value.title,
					url: value.url,
					image: value.image || null,
				});
			}
			onOpenChange(false);
		},
	});

	const createMutation = useMutation({
		mutationFn: async (data: {
			parentId: string | null;
			title: string;
			url: string;
			image: string | null;
		}) => {
			return await createNavigationItemServerFn({ data });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [NAVIGATION_QUERY_KEY] });
		},
	});

	const updateMutation = useMutation({
		mutationFn: async (data: {
			id: string;
			title: string;
			url: string;
			image: string | null;
		}) => {
			return await updateNavigationItemServerFn({ data });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [NAVIGATION_QUERY_KEY] });
		},
	});

	React.useEffect(() => {
		if (open) {
			if (item) {
				form.setFieldValue("title", item.title);
				form.setFieldValue("url", item.url);
				form.setFieldValue("image", item.image || "");
			} else {
				form.setFieldValue("title", "");
				form.setFieldValue("url", "");
				form.setFieldValue("image", "");
			}
		}
	}, [open, item, form]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						{item
							? "Uredi navigacijsku stavku"
							: parentItem
								? `Dodaj dijete za "${parentItem.title}"`
								: "Dodaj navigacijsku stavku"}
					</DialogTitle>
					<DialogDescription>
						{item
							? "Ažuriraj informacije o navigacijskoj stavci"
							: parentItem
								? `Dodaj novu podstavku za "${parentItem.title}"`
								: "Dodaj novu navigacijsku stavku"}
					</DialogDescription>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
					className="flex flex-col gap-4"
				>
					<form.Field name="title">
						{(field) => (
							<div className="flex flex-col gap-2">
								<Label htmlFor={field.name}>Naziv *</Label>
								<Input
									id={field.name}
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									required
								/>
								{field.state.meta.errors && (
									<span className="text-sm text-red-500">
										{field.state.meta.errors[0]}
									</span>
								)}
							</div>
						)}
					</form.Field>

					<form.Field name="url">
						{(field) => (
							<div className="flex flex-col gap-2">
								<Label htmlFor={field.name}>URL *</Label>
								<Input
									id={field.name}
									value={field.state.value}
									onChange={(e) => field.handleChange(e.target.value)}
									onBlur={field.handleBlur}
									placeholder="/products"
									required
								/>
								{field.state.meta.errors && (
									<span className="text-sm text-red-500">
										{field.state.meta.errors[0]}
									</span>
								)}
							</div>
						)}
					</form.Field>

					<form.Field name="image">
						{(field) => (
							<div className="flex flex-col gap-2">
								<Label>Slika (opciono)</Label>
								<NavImageUpload
									value={field.state.value}
									onChange={(url) => field.handleChange(url)}
								/>
								<span className="text-xs text-muted-foreground">
									Prikazuje se pored naziva u navigaciji
								</span>
							</div>
						)}
					</form.Field>

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
						>
							Otkaži
						</Button>
						<Button
							type="submit"
							disabled={
								createMutation.isPending || updateMutation.isPending
							}
						>
							{(createMutation.isPending || updateMutation.isPending) && (
								<Loader2 className="size-4 animate-spin mr-2" />
							)}
							{item ? "Sačuvaj" : "Dodaj"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export function NavigationManager() {
	const queryClient = useQueryClient();
	const [editingItem, setEditingItem] = React.useState<NavigationItem | undefined>();
	const [addingParentId, setAddingParentId] = React.useState<string | null | undefined>();
	const [dialogOpen, setDialogOpen] = React.useState(false);

	const { data: navigationItems, isLoading } = useQuery(
		getNavigationQueryOptions()
	);

	// Flatten items for drag and drop
	const flatItems = React.useMemo(() => {
		if (!navigationItems) return [];
		const flatten = (items: NavigationItem[]): NavigationItem[] => {
			const result: NavigationItem[] = [];
			for (const item of items) {
				result.push(item);
				if (item.children && item.children.length > 0) {
					result.push(...flatten(item.children));
				}
			}
			return result;
		};
		return flatten(navigationItems);
	}, [navigationItems]);

	const topLevelItems = React.useMemo(() => {
		if (!navigationItems) return [];
		return navigationItems.filter((item) => !item.parentId);
	}, [navigationItems]);

	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	);

	const deleteMutation = useMutation({
		mutationFn: async (id: string) => {
			return await deleteNavigationItemServerFn({ data: { id } });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [NAVIGATION_QUERY_KEY] });
		},
	});

	const reorderMutation = useMutation({
		mutationFn: async (data: { items: { id: string; position: number }[] }) => {
			return await reorderNavigationItemsServerFn({ data });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [NAVIGATION_QUERY_KEY] });
		},
	});

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;

		if (!over || active.id === over.id) return;

		// Only reorder top-level items for now
		const oldIndex = topLevelItems.findIndex((item) => item.id === active.id);
		const newIndex = topLevelItems.findIndex((item) => item.id === over.id);

		if (oldIndex === -1 || newIndex === -1) return;

		const reordered = arrayMove(topLevelItems, oldIndex, newIndex);

		// Update positions for top-level items only
		reorderMutation.mutate({
			items: reordered.map((item, index) => ({
				id: item.id,
				position: index,
			})),
		});
	};

	const handleEdit = (item: NavigationItem) => {
		setEditingItem(item);
		setAddingParentId(undefined);
		setDialogOpen(true);
	};

	const handleAdd = (parentId?: string | null) => {
		setEditingItem(undefined);
		setAddingParentId(parentId);
		setDialogOpen(true);
	};

	const handleDelete = async (id: string) => {
		if (confirm("Jeste li sigurni da želite obrisati ovu navigacijsku stavku?")) {
			await deleteMutation.mutateAsync(id);
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-8">
				<Loader2 className="size-6 animate-spin" />
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<div>
					<h3 className="text-lg font-semibold">Navigacija</h3>
					<p className="text-sm text-muted-foreground">
						Upravljajte navigacijskim stavkama za web shop
					</p>
				</div>
				<Button onClick={() => handleAdd(null)}>
					<Plus className="size-4 mr-2" />
					Dodaj stavku
				</Button>
			</div>

			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragEnd={handleDragEnd}
			>
				<SortableContext
					items={topLevelItems.map((item) => item.id)}
					strategy={verticalListSortingStrategy}
				>
					<div className="flex flex-col gap-2">
						{topLevelItems.length === 0 ? (
							<div className="text-center py-8 text-muted-foreground">
								Nema navigacijskih stavki. Dodajte prvu stavku.
							</div>
						) : (
							topLevelItems.map((item) => (
								<SortableNavigationItem
									key={item.id}
									item={item}
									onEdit={handleEdit}
									onDelete={handleDelete}
									onAddChild={handleAdd}
									allItems={flatItems}
								/>
							))
						)}
					</div>
				</SortableContext>
			</DndContext>

			<NavigationItemDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				item={editingItem}
				parentId={addingParentId}
				allItems={flatItems}
			/>
		</div>
	);
}

