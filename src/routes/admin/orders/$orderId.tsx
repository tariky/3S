import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Loader2,
  Edit,
  X,
  Save,
  XCircle,
  Package,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getOrderByIdQueryOptions,
  updateOrderServerFn,
  cancelOrderServerFn,
  fulfillOrderServerFn,
  getInventoryForVariantsServerFn,
} from "@/queries/orders";
import { ProductSearch } from "@/components/orders/ProductSearch";
import { cn } from "@/lib/utils";
import { ProxyImage } from "@/components/ui/proxy-image";
import { useState, useMemo } from "react";
import { ORDERS_QUERY_KEY } from "@/queries/orders";

interface CartItem {
  id?: string;
  productId: string;
  variantId?: string;
  title: string;
  sku?: string;
  quantity: number;
  price: number;
  variantTitle?: string;
  imageUrl?: string;
  inventory?: {
    available: number;
    onHand: number;
    reserved: number;
    committed: number;
  };
}

export const Route = createFileRoute("/admin/orders/$orderId")({
  component: RouteComponent,
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(
      getOrderByIdQueryOptions(params.orderId)
    );
  },
});

function RouteComponent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { orderId } = Route.useParams();
  const { data: order, isLoading } = useQuery(
    getOrderByIdQueryOptions(orderId)
  );
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedItems, setEditedItems] = useState<CartItem[]>([]);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showFulfillDialog, setShowFulfillDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [inventoryMap, setInventoryMap] = useState<
    Record<
      string,
      { available: number; onHand: number; reserved: number; committed: number }
    >
  >({});

  // Fetch inventory for variants when entering edit mode
  const handleEditClick = async () => {
    if (order?.items) {
      const items = order.items.map((item) => ({
        id: item.id,
        productId: item.productId || "",
        variantId: item.variantId || undefined,
        title: item.title,
        sku: item.sku || undefined,
        quantity: item.quantity,
        price: parseFloat(item.price),
        variantTitle: item.variantTitle || undefined,
        imageUrl: (item as any).imageUrl || undefined,
      }));

      // Fetch inventory for all variants
      const variantIds = items
        .map((item) => item.variantId)
        .filter((id): id is string => !!id);

      if (variantIds.length > 0) {
        const inventoryData = await getInventoryForVariantsServerFn({
          data: { variantIds },
        });
        setInventoryMap(inventoryData);
      }

      setEditedItems(items);
    }
    setIsEditMode(true);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditedItems([]);
  };

  const handleAddProduct = async (product: {
    productId: string;
    variantId?: string;
    title: string;
    sku?: string;
    price: number;
    variantTitle?: string;
    image?: string;
    inventory?: {
      available: number;
      onHand: number;
      reserved: number;
      committed: number;
    };
  }) => {
    const existingItem = editedItems.find(
      (item) =>
        item.productId === product.productId &&
        item.variantId === product.variantId
    );

    // Check inventory if variant exists
    if (product.variantId && product.inventory) {
      const available = product.inventory.available;
      if (existingItem) {
        if (existingItem.quantity >= available) {
          alert(`Nema dovoljno zaliha. Dostupno: ${available}`);
          return;
        }
      } else {
        if (available < 1) {
          alert(`Nema dovoljno zaliha. Dostupno: ${available}`);
          return;
        }
      }
    }

    if (existingItem) {
      setEditedItems(
        editedItems.map((item) =>
          item.id === existingItem.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                inventory: product.inventory,
              }
            : item
        )
      );
    } else {
      // Fetch inventory if not provided
      if (product.variantId && !product.inventory) {
        const inventoryData = await getInventoryForVariantsServerFn({
          data: { variantIds: [product.variantId] },
        });
        if (inventoryData[product.variantId]) {
          product.inventory = inventoryData[product.variantId];
        }
      }

      setEditedItems([
        ...editedItems,
        {
          productId: product.productId,
          variantId: product.variantId,
          title: product.title,
          sku: product.sku,
          quantity: 1,
          price: product.price,
          variantTitle: product.variantTitle,
          imageUrl: product.image,
          inventory: product.inventory,
        },
      ]);

      // Update inventory map
      if (product.variantId && product.inventory) {
        setInventoryMap((prev) => ({
          ...prev,
          [product.variantId!]: product.inventory!,
        }));
      }
    }
  };

  const handleRemoveItem = (itemId: string) => {
    setEditedItems(editedItems.filter((item) => item.id !== itemId));
  };

  const handleUpdateQuantity = async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(itemId);
      return;
    }

    const item = editedItems.find((i) => i.id === itemId);
    if (!item) return;

    // Check inventory if variant exists
    if (item.variantId) {
      const inv = item.inventory || inventoryMap[item.variantId];
      if (inv && quantity > inv.available) {
        alert(`Nema dovoljno zaliha. Dostupno: ${inv.available}`);
        return;
      }
    }

    setEditedItems(
      editedItems.map((item) =>
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  };

  const editedSubtotal = useMemo(() => {
    return editedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  }, [editedItems]);

  const editedShipping = useMemo(() => {
    if (!order) return 0;
    return parseFloat(order.shipping);
  }, [order]);

  const editedDiscount = useMemo(() => {
    if (!order) return 0;
    return parseFloat(order.discount);
  }, [order]);

  const editedTax = useMemo(() => {
    if (!order) return 0;
    return parseFloat(order.tax);
  }, [order]);

  const editedTotal =
    editedSubtotal + editedShipping - editedDiscount + editedTax;

  const updateOrderMutation = useMutation({
    mutationFn: async () => {
      return await updateOrderServerFn({
        data: {
          orderId,
          items: editedItems.map((item) => ({
            id: item.id,
            productId: item.productId,
            variantId: item.variantId,
            title: item.title,
            sku: item.sku,
            quantity: item.quantity,
            price: item.price,
            variantTitle: item.variantTitle,
          })),
          subtotal: editedSubtotal,
          tax: editedTax,
          shipping: editedShipping,
          discount: editedDiscount,
          total: editedTotal,
          note: order?.note || null,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });
      setIsEditMode(false);
      setEditedItems([]);
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async () => {
      return await cancelOrderServerFn({
        data: {
          orderId,
          reason: cancelReason || undefined,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });
      setShowCancelDialog(false);
      setCancelReason("");
    },
  });

  const fulfillOrderMutation = useMutation({
    mutationFn: async () => {
      return await fulfillOrderServerFn({
        data: {
          orderId,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ORDERS_QUERY_KEY] });
      alert("Narudžba je uspješno isporučena. Zalihe su ažurirane.");
    },
    onError: (error: any) => {
      alert(error.message || "Došlo je do greške pri isporuci narudžbe.");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  if (!order) {
    return <div>Narudžba nije pronađena</div>;
  }

  // Helper to get inventory for an item
  const getItemInventory = (
    item: CartItem | ((typeof order.items)[0] & { imageUrl?: string | null })
  ) => {
    if (isEditMode && "inventory" in item) {
      return (
        item.inventory ||
        (item.variantId ? inventoryMap[item.variantId] : undefined)
      );
    }
    return item.variantId ? inventoryMap[item.variantId] : undefined;
  };

  const isCancelled = order.status === "cancelled";
  const displayItems: (
    | CartItem
    | ((typeof order.items)[0] & { imageUrl?: string | null })
  )[] = isEditMode ? editedItems : order.items || [];
  const displaySubtotal = isEditMode
    ? editedSubtotal
    : parseFloat(order.subtotal);
  const displayShipping = isEditMode
    ? editedShipping
    : parseFloat(order.shipping);
  const displayDiscount = isEditMode
    ? editedDiscount
    : parseFloat(order.discount);
  const displayTax = isEditMode ? editedTax : parseFloat(order.tax);
  const displayTotal = isEditMode ? editedTotal : parseFloat(order.total);

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Na čekanju",
      paid: "Plaćeno",
      fulfilled: "Isporučeno",
      cancelled: "Otkazano",
      refunded: "Refundirano",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "text-yellow-500",
      paid: "text-blue-500",
      fulfilled: "text-green-500",
      cancelled: "text-red-500",
      refunded: "text-gray-500",
    };
    return colors[status] || "text-gray-500";
  };

  const getFinancialStatusLabel = (status: string | null | undefined) => {
    if (!status) return "-";
    const labels: Record<string, string> = {
      pending: "Na čekanju",
      paid: "Plaćeno",
      refunded: "Refundirano",
    };
    return labels[status] || status;
  };

  const getFulfillmentStatusLabel = (status: string | null | undefined) => {
    if (!status) return "-";
    const labels: Record<string, string> = {
      unfulfilled: "Neisporučeno",
      fulfilled: "Isporučeno",
      partial: "Djelomično",
    };
    return labels[status] || status;
  };

  return (
    <div className="flex flex-col gap-4 container mx-auto">
      <div className="flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              navigate({
                to: "/admin/orders",
                search: {
                  search: "",
                  page: 1,
                  limit: 25,
                },
              })
            }
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Narudžba {order.orderNumber}</h1>
            <p className="text-sm text-gray-500">
              Kreirano:{" "}
              {(() => {
                const dateObj = new Date(order.createdAt);
                const year = dateObj.getFullYear();
                const month = String(dateObj.getMonth() + 1).padStart(2, "0");
                const day = String(dateObj.getDate()).padStart(2, "0");
                const hours = String(dateObj.getHours()).padStart(2, "0");
                const minutes = String(dateObj.getMinutes()).padStart(2, "0");
                return `${day}.${month}.${year} ${hours}:${minutes}`;
              })()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-xs text-gray-500">Status</span>
            <span className={cn("font-medium", getStatusColor(order.status))}>
              {getStatusLabel(order.status)}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-gray-500">Finansijski status</span>
            <span
              className={cn(
                "font-medium text-sm",
                order.financialStatus === "paid"
                  ? "text-green-500"
                  : order.financialStatus === "pending"
                    ? "text-yellow-500"
                    : "text-gray-500"
              )}
            >
              {getFinancialStatusLabel(order.financialStatus)}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-xs text-gray-500">Status isporuke</span>
            <span
              className={cn(
                "font-medium text-sm",
                order.fulfillmentStatus === "fulfilled"
                  ? "text-green-500"
                  : order.fulfillmentStatus === "unfulfilled"
                    ? "text-yellow-500"
                    : "text-blue-500"
              )}
            >
              {getFulfillmentStatusLabel(order.fulfillmentStatus)}
            </span>
          </div>
          {!isCancelled && (
            <div className="flex gap-2">
              {!isEditMode ? (
                <>
                  {order.fulfillmentStatus !== "fulfilled" && (
                    <Button
                      variant="default"
                      onClick={() => setShowFulfillDialog(true)}
                      disabled={
                        fulfillOrderMutation.isPending ||
                        order.fulfillmentStatus === "fulfilled"
                      }
                    >
                      <Package className="size-4 mr-2" />
                      Isporuci narudžbu
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={handleEditClick}
                    disabled={isCancelled}
                  >
                    <Edit className="size-4 mr-2" />
                    Uredi
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setShowCancelDialog(true)}
                    disabled={isCancelled}
                  >
                    <XCircle className="size-4 mr-2" />
                    Otkaži narudžbu
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={updateOrderMutation.isPending}
                  >
                    Odustani
                  </Button>
                  <Button
                    onClick={() => updateOrderMutation.mutate()}
                    disabled={
                      updateOrderMutation.isPending || editedItems.length === 0
                    }
                  >
                    {updateOrderMutation.isPending && (
                      <Loader2 className="size-4 animate-spin mr-2" />
                    )}
                    <Save className="size-4 mr-2" />
                    Sačuvaj
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-6 flex flex-col gap-3 border border-gray-200 rounded-md p-4">
          <div className="flex items-center justify-between">
            <span className="font-semibold">Stavke narudžbe</span>
            {isEditMode && <ProductSearch onSelectProduct={handleAddProduct} />}
          </div>
          <div className="flex flex-col gap-2">
            {displayItems && displayItems.length > 0 ? (
              displayItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 w-full border-b pb-2"
                >
                  <div className="flex gap-3 w-full">
                    <div className="relative">
                      <ProxyImage
                        src={
                          (item as any).imageUrl ||
                          "https://via.placeholder.com/64"
                        }
                        alt={item.title}
                        width={64}
                        height={64}
                        resizingType="fill"
                        className="w-16 h-16 rounded-md aspect-square object-cover"
                      />
                      {isEditMode && (
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-[2px] right-[2px] size-5"
                          onClick={() => handleRemoveItem(item.id!)}
                        >
                          <X className="size-3" />
                        </Button>
                      )}
                    </div>
                    <div className="flex justify-between items-center w-full">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium">
                          {item.title}
                        </span>
                        {item.variantTitle && (
                          <span className="text-xs text-gray-500">
                            {item.variantTitle}
                          </span>
                        )}
                        {item.sku && (
                          <span className="text-xs text-gray-400">
                            SKU: {item.sku}
                          </span>
                        )}
                        {isEditMode ? (
                          <div className="flex flex-col gap-1 mt-1">
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                className="size-6"
                                onClick={() =>
                                  handleUpdateQuantity(
                                    item.id!,
                                    item.quantity - 1
                                  )
                                }
                              >
                                <span className="text-xs">-</span>
                              </Button>
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleUpdateQuantity(
                                    item.id!,
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className="w-12 h-6 text-center text-xs"
                                min="1"
                                max={
                                  item.variantId && getItemInventory(item)
                                    ? getItemInventory(item)?.available
                                    : undefined
                                }
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                className="size-6"
                                onClick={() =>
                                  handleUpdateQuantity(
                                    item.id!,
                                    item.quantity + 1
                                  )
                                }
                                disabled={
                                  item.variantId && getItemInventory(item)
                                    ? (getItemInventory(item)?.available ||
                                        0) <= item.quantity
                                    : false
                                }
                              >
                                <span className="text-xs">+</span>
                              </Button>
                            </div>
                            {item.variantId && getItemInventory(item) && (
                              <span className="text-xs text-gray-500">
                                Dostupno:{" "}
                                {getItemInventory(item)?.available || 0}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">
                            Količina: {item.quantity}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 items-end">
                        <span className="text-sm font-medium">
                          {typeof item.price === "number"
                            ? item.price.toFixed(2)
                            : parseFloat(item.price as any).toFixed(2)}{" "}
                          BAM
                        </span>
                        <span className="text-sm text-gray-500">
                          Ukupno:{" "}
                          {(
                            (typeof item.price === "number"
                              ? item.price
                              : parseFloat(item.price as any)) * item.quantity
                          ).toFixed(2)}{" "}
                          BAM
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">Nema stavki</div>
            )}
          </div>
          <Separator />
          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="text-sm">Međuzbir:</span>
              <span className="text-sm font-medium">
                {displaySubtotal.toFixed(2)} BAM
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Dostava:</span>
              <span className="text-sm font-medium">
                {displayShipping.toFixed(2)} BAM
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Popust:</span>
              <span className="text-sm font-medium text-red-500">
                -{displayDiscount.toFixed(2)} BAM
              </span>
            </div>
            {displayTax > 0 && (
              <div className="flex justify-between">
                <span className="text-sm">PDV:</span>
                <span className="text-sm font-medium">
                  {displayTax.toFixed(2)} BAM
                </span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between">
              <span className="text-lg font-bold">Ukupno:</span>
              <span className="text-lg font-bold">
                {displayTotal.toFixed(2)} {order.currency || "BAM"}
              </span>
            </div>
          </div>
          {order.note && (
            <>
              <Separator />
              <div className="flex flex-col gap-2">
                <span className="font-semibold">Napomena</span>
                <p className="text-sm text-gray-600">{order.note}</p>
              </div>
            </>
          )}
        </div>

        <div className="col-span-6 flex flex-col gap-3 border border-gray-200 rounded-md p-4">
          <span className="font-semibold">Podaci o kupcu</span>
          {order.customer ? (
            <>
              <div className="flex flex-col gap-2">
                <div>
                  <span className="text-xs text-gray-500">Ime i prezime</span>
                  <p className="text-sm font-medium">
                    {order.customer.firstName || order.customer.lastName
                      ? `${order.customer.firstName || ""} ${order.customer.lastName || ""}`.trim()
                      : "-"}
                  </p>
                </div>
                {order.customer.email &&
                  (order.customer.hasEmail ||
                    (!order.customer.email.endsWith("@placeholder.local") &&
                      !order.customer.email.includes("customer-") &&
                      !order.customer.email.includes("@placeholder"))) && (
                    <div>
                      <span className="text-xs text-gray-500">Email</span>
                      <p className="text-sm">{order.customer.email}</p>
                    </div>
                  )}
                {order.customer.phone && (
                  <div>
                    <span className="text-xs text-gray-500">Telefon</span>
                    <p className="text-sm">{order.customer.phone}</p>
                  </div>
                )}
              </div>
            </>
          ) : order.email &&
            !order.email.endsWith("@placeholder.local") &&
            !order.email.includes("customer-") &&
            !order.email.includes("@placeholder") ? (
            <div className="flex flex-col gap-2">
              <div>
                <span className="text-xs text-gray-500">Email</span>
                <p className="text-sm">{order.email}</p>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">Nema podataka o kupcu</div>
          )}

          {order.billingAddress && (
            <>
              <Separator />
              <div className="flex flex-col gap-2">
                <span className="font-semibold">Adresa za naplatu</span>
                <div className="text-sm">
                  {order.billingAddress.firstName ||
                  order.billingAddress.lastName ? (
                    <p>
                      {order.billingAddress.firstName}{" "}
                      {order.billingAddress.lastName}
                    </p>
                  ) : null}
                  {order.billingAddress.company && (
                    <p>{order.billingAddress.company}</p>
                  )}
                  <p>{order.billingAddress.address1}</p>
                  {order.billingAddress.address2 && (
                    <p>{order.billingAddress.address2}</p>
                  )}
                  <p>
                    {order.billingAddress.city} {order.billingAddress.zip}
                  </p>
                  {order.billingAddress.state && (
                    <p>{order.billingAddress.state}</p>
                  )}
                  <p>{order.billingAddress.country}</p>
                  {order.billingAddress.phone && (
                    <p>{order.billingAddress.phone}</p>
                  )}
                </div>
              </div>
            </>
          )}

          {order.shippingAddress && (
            <>
              <Separator />
              <div className="flex flex-col gap-2">
                <span className="font-semibold">Adresa za dostavu</span>
                <div className="text-sm">
                  {order.shippingAddress.firstName ||
                  order.shippingAddress.lastName ? (
                    <p>
                      {order.shippingAddress.firstName}{" "}
                      {order.shippingAddress.lastName}
                    </p>
                  ) : null}
                  {order.shippingAddress.company && (
                    <p>{order.shippingAddress.company}</p>
                  )}
                  <p>{order.shippingAddress.address1}</p>
                  {order.shippingAddress.address2 && (
                    <p>{order.shippingAddress.address2}</p>
                  )}
                  <p>
                    {order.shippingAddress.city} {order.shippingAddress.zip}
                  </p>
                  {order.shippingAddress.state && (
                    <p>{order.shippingAddress.state}</p>
                  )}
                  <p>{order.shippingAddress.country}</p>
                  {order.shippingAddress.phone && (
                    <p>{order.shippingAddress.phone}</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Otkaži narudžbu</AlertDialogTitle>
            <AlertDialogDescription>
              Da li ste sigurni da želite otkazati ovu narudžbu? Ova akcija ne
              može biti poništena.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">
              Razlog otkazivanja (opciono)
            </label>
            <Input
              placeholder="Unesi razlog otkazivanja"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Odustani</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelOrderMutation.mutate()}
              disabled={cancelOrderMutation.isPending}
              className="bg-red-500 hover:bg-red-600"
            >
              {cancelOrderMutation.isPending && (
                <Loader2 className="size-4 animate-spin mr-2" />
              )}
              Otkaži narudžbu
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showFulfillDialog} onOpenChange={setShowFulfillDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Isporuci narudžbu</AlertDialogTitle>
            <AlertDialogDescription>
              Da li ste sigurni da želite isporučiti ovu narudžbu? Ova akcija će
              smanjiti zalihe za sve proizvode u narudžbi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {order.items && order.items.length > 0 && (
            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
              <span className="text-sm font-medium">
                Proizvodi koji će biti isporučeni:
              </span>
              {order.items.map((item) => (
                <div key={item.id} className="text-sm">
                  <span className="font-medium">{item.title}</span>
                  {item.variantTitle && (
                    <span className="text-gray-500">
                      {" "}
                      - {item.variantTitle}
                    </span>
                  )}
                  <span className="text-gray-500">
                    {" "}
                    (Količina: {item.quantity})
                  </span>
                </div>
              ))}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Odustani</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                fulfillOrderMutation.mutate();
                setShowFulfillDialog(false);
              }}
              disabled={fulfillOrderMutation.isPending}
              className="bg-green-500 hover:bg-green-600"
            >
              {fulfillOrderMutation.isPending && (
                <Loader2 className="size-4 animate-spin mr-2" />
              )}
              Isporuci narudžbu
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
