import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ProductSearch } from "@/components/orders/ProductSearch";
import { CustomerSearch } from "@/components/orders/CustomerSearch";
import { AddCustomerDialog } from "@/components/orders/AddCustomerDialog";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectValue,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { X, Loader2 } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getActiveShippingMethodsQueryOptions } from "@/queries/shipping-methods";
import { getActivePaymentMethodsQueryOptions } from "@/queries/payment-methods";
import {
  createOrderServerFn,
  getInventoryForVariantsServerFn,
} from "@/queries/orders";
import { getCustomerByIdServerFn } from "@/queries/customers";

interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  title: string;
  sku?: string;
  quantity: number;
  price: number;
  variantTitle?: string;
  image?: string;
  inventory?: {
    available: number;
    onHand: number;
    reserved: number;
    committed: number;
  };
}

export const Route = createFileRoute("/admin/orders/new")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerAddresses, setCustomerAddresses] = useState<any[]>([]);
  const [shippingMethodId, setShippingMethodId] = useState<string>("");
  const [paymentMethodId, setPaymentMethodId] = useState<string>("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">(
    "percentage"
  );
  const [discountValue, setDiscountValue] = useState<string>("");
  const [appliedDiscountValue, setAppliedDiscountValue] = useState<string>("");
  const [appliedDiscountType, setAppliedDiscountType] = useState<
    "percentage" | "fixed"
  >("percentage");
  const [note, setNote] = useState<string>("");
  const [showCustomerError, setShowCustomerError] = useState(false);
  const [showValidationError, setShowValidationError] = useState(false);
  const [validationErrorMessage, setValidationErrorMessage] = useState("");

  const { data: shippingMethods } = useQuery(
    getActiveShippingMethodsQueryOptions()
  );
  const { data: paymentMethods } = useQuery(
    getActivePaymentMethodsQueryOptions()
  );

  // Fetch customer details when selected
  const { data: customerData } = useQuery({
    queryKey: ["customer", selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer?.id) return null;
      return await getCustomerByIdServerFn({
        data: { id: selectedCustomer.id },
      });
    },
    enabled: !!selectedCustomer?.id,
  });

  // Update addresses when customer data changes
  useEffect(() => {
    if (customerData?.addresses) {
      setCustomerAddresses(customerData.addresses);
    }
  }, [customerData]);

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
    const existingItem = cart.find(
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
      setCart(
        cart.map((item) =>
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
        try {
          const inventoryData = await getInventoryForVariantsServerFn({
            data: { variantIds: [product.variantId] },
          });
          if (inventoryData[product.variantId]) {
            product.inventory = inventoryData[product.variantId];
            if (product.inventory.available < 1) {
              alert(
                `Nema dovoljno zaliha. Dostupno: ${product.inventory.available}`
              );
              return;
            }
          }
        } catch (error) {
          console.error("Error fetching inventory:", error);
        }
      }

      setCart([
        ...cart,
        {
          id: `${product.productId}-${product.variantId || "default"}`,
          ...product,
          quantity: 1,
        },
      ]);
    }
  };

  const handleRemoveItem = (itemId: string) => {
    setCart(cart.filter((item) => item.id !== itemId));
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveItem(itemId);
      return;
    }

    const item = cart.find((i) => i.id === itemId);
    if (!item) return;

    // Check inventory if variant exists
    if (item.variantId && item.inventory) {
      if (quantity > item.inventory.available) {
        alert(`Nema dovoljno zaliha. Dostupno: ${item.inventory.available}`);
        return;
      }
    }

    setCart(
      cart.map((item) => (item.id === itemId ? { ...item, quantity } : item))
    );
  };

  const handleSelectCustomer = async (customer: any) => {
    setSelectedCustomer(customer);
  };

  const handleCustomerAdded = async (customer: any) => {
    setSelectedCustomer(customer);
  };

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const shippingCost = useMemo(() => {
    if (!shippingMethodId || !shippingMethods) return 0;
    const method = shippingMethods.find((m) => m.id === shippingMethodId);
    return method ? parseFloat(method.price) : 0;
  }, [shippingMethodId, shippingMethods]);

  const discountAmount = useMemo(() => {
    if (!appliedDiscountValue) return 0;
    const value = parseFloat(appliedDiscountValue);
    if (isNaN(value)) return 0;
    if (appliedDiscountType === "percentage") {
      return (subtotal * value) / 100;
    }
    return value;
  }, [appliedDiscountValue, appliedDiscountType, subtotal]);

  const handleApplyDiscount = () => {
    if (discountValue && parseFloat(discountValue) > 0) {
      setAppliedDiscountValue(discountValue);
      setAppliedDiscountType(discountType);
    }
  };

  const handleRemoveDiscount = () => {
    setAppliedDiscountValue("");
    setDiscountValue("");
  };

  const tax = 0; // You can add tax calculation logic here
  const total = subtotal + shippingCost - discountAmount + tax;

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const defaultAddress =
        customerAddresses.find((a) => a.isDefault) || customerAddresses[0];

      return await createOrderServerFn({
        data: {
          customerId: selectedCustomer?.id || null,
          email: selectedCustomer?.email || null,
          items: cart.map((item) => ({
            productId: item.productId,
            variantId: item.variantId,
            title: item.title,
            sku: item.sku,
            quantity: item.quantity,
            price: item.price,
            variantTitle: item.variantTitle,
          })),
          shippingMethodId: shippingMethodId || null,
          paymentMethodId: paymentMethodId || null,
          discountType: appliedDiscountType,
          discountValue: appliedDiscountValue
            ? parseFloat(appliedDiscountValue)
            : undefined,
          subtotal,
          tax,
          shipping: shippingCost,
          discount: discountAmount,
          total,
          note: note || undefined,
          billingAddress: defaultAddress
            ? {
                firstName: defaultAddress.firstName || undefined,
                lastName: defaultAddress.lastName || undefined,
                company: defaultAddress.company || undefined,
                address1: defaultAddress.address1,
                address2: defaultAddress.address2 || undefined,
                city: defaultAddress.city,
                state: defaultAddress.state || undefined,
                zip: defaultAddress.zip || undefined,
                country: defaultAddress.country,
                phone: defaultAddress.phone || undefined,
              }
            : undefined,
          shippingAddress: defaultAddress
            ? {
                firstName: defaultAddress.firstName || undefined,
                lastName: defaultAddress.lastName || undefined,
                company: defaultAddress.company || undefined,
                address1: defaultAddress.address1,
                address2: defaultAddress.address2 || undefined,
                city: defaultAddress.city,
                state: defaultAddress.state || undefined,
                zip: defaultAddress.zip || undefined,
                country: defaultAddress.country,
                phone: defaultAddress.phone || undefined,
              }
            : undefined,
        },
      });
    },
    onSuccess: (order) => {
      navigate({
        to: "/admin/orders/$orderId",
        params: { orderId: order.id },
      });
    },
    onError: (error: any) => {
      setValidationErrorMessage(
        error.message || "Došlo je do greške pri kreiranju narudžbe."
      );
      setShowValidationError(true);
    },
  });

  // Check if all required fields are present
  const isOrderValid = useMemo(() => {
    return (
      selectedCustomer !== null &&
      cart.length > 0 &&
      shippingMethodId !== "" &&
      paymentMethodId !== ""
    );
  }, [selectedCustomer, cart.length, shippingMethodId, paymentMethodId]);

  const handleCreateOrder = () => {
    // Validate customer
    if (!selectedCustomer) {
      setShowCustomerError(true);
      return;
    }

    // Validate cart
    if (cart.length === 0) {
      setValidationErrorMessage("Dodajte barem jedan proizvod u korpu.");
      setShowValidationError(true);
      return;
    }

    // Validate shipping method
    if (!shippingMethodId) {
      setValidationErrorMessage("Odaberite način dostave.");
      setShowValidationError(true);
      return;
    }

    // Validate payment method
    if (!paymentMethodId) {
      setValidationErrorMessage("Odaberite način plaćanja.");
      setShowValidationError(true);
      return;
    }

    createOrderMutation.mutate();
  };

  return (
    <div className="flex flex-col gap-4 container mx-auto">
      <div className="flex items-center gap-2 justify-between">
        <h1 className="text-2xl font-bold">Nova narudžba</h1>
        <Button
          onClick={handleCreateOrder}
          disabled={createOrderMutation.isPending || !isOrderValid}
        >
          {createOrderMutation.isPending && (
            <Loader2 className="size-4 animate-spin mr-2" />
          )}
          Napravi narudžbu
        </Button>
      </div>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-6 flex flex-col gap-3 border border-gray-200 rounded-md p-4">
          <span className="font-semibold">Kosarica</span>
          <ProductSearch onSelectProduct={handleAddProduct} />
          <div className="flex flex-col gap-2">
            {cart.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                Korpa je prazna
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex items-center gap-2 w-full">
                  <div className="flex gap-3 w-full">
                    <div className="relative">
                      <img
                        src={item.image || "https://via.placeholder.com/64"}
                        alt={item.title}
                        className="w-16 h-16 rounded-md aspect-square object-cover"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-[2px] right-[2px] size-5"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        <X className="size-3" />
                      </Button>
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
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="size-6"
                              onClick={() =>
                                handleUpdateQuantity(item.id, item.quantity - 1)
                              }
                            >
                              <span className="text-xs">-</span>
                            </Button>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateQuantity(
                                  item.id,
                                  parseInt(e.target.value) || 0
                                )
                              }
                              className="w-12 h-6 text-center text-xs"
                              min="1"
                              max={
                                item.variantId && item.inventory
                                  ? item.inventory.available
                                  : undefined
                              }
                            />
                            <Button
                              variant="outline"
                              size="icon"
                              className="size-6"
                              onClick={() =>
                                handleUpdateQuantity(item.id, item.quantity + 1)
                              }
                              disabled={
                                item.variantId && item.inventory
                                  ? item.inventory.available <= item.quantity
                                  : false
                              }
                            >
                              <span className="text-xs">+</span>
                            </Button>
                          </div>
                          {item.variantId && item.inventory && (
                            <span className="text-xs text-gray-500">
                              Dostupno: {item.inventory.available}
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">
                          {item.quantity} x {item.price.toFixed(2)} BAM
                        </span>
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-right">
                          Ukupno
                        </span>
                        <span className="text-sm font-medium text-gray-500 text-right">
                          {(item.price * item.quantity).toFixed(2)} BAM
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <Separator />
          <div className="flex flex-col gap-2">
            <div className="flex justify-between">
              <span className="text-sm">Međuzbir:</span>
              <span className="text-sm font-medium">
                {subtotal.toFixed(2)} BAM
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Dostava:</span>
              <span className="text-sm font-medium">
                {shippingCost.toFixed(2)} BAM
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Popust:</span>
              <span className="text-sm font-medium text-red-500">
                -{discountAmount.toFixed(2)} BAM
              </span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-lg font-bold">Ukupno:</span>
              <span className="text-lg font-bold">{total.toFixed(2)} BAM</span>
            </div>
          </div>
          <Separator />
          <div className="flex flex-col gap-2">
            <span className="font-semibold">Način dostave</span>
            <Select
              value={shippingMethodId}
              onValueChange={setShippingMethodId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Odaberi dostavljač" />
              </SelectTrigger>
              <SelectContent>
                {shippingMethods?.map((method) => (
                  <SelectItem key={method.id} value={method.id}>
                    {method.name} - {parseFloat(method.price).toFixed(2)} BAM
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="flex flex-col gap-2">
            <span className="font-semibold">Način plaćanja</span>
            <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Odaberi način plaćanja" />
              </SelectTrigger>
              <SelectContent>
                {paymentMethods?.map((method) => (
                  <SelectItem key={method.id} value={method.id}>
                    {method.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Separator />
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Popust</span>
              {appliedDiscountValue && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveDiscount}
                  className="h-6 text-xs"
                >
                  Ukloni popust
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Unesi popust"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                type="number"
                min="0"
                className="flex-1"
              />
              <Button
                onClick={handleApplyDiscount}
                disabled={!discountValue || parseFloat(discountValue) <= 0}
              >
                Primijeni popust
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant={discountType === "percentage" ? "default" : "outline"}
                onClick={() => setDiscountType("percentage")}
                size="sm"
              >
                <span className="text-xs">%</span>
              </Button>
              <Button
                variant={discountType === "fixed" ? "default" : "outline"}
                onClick={() => setDiscountType("fixed")}
                size="sm"
              >
                <span className="text-xs">BAM</span>
              </Button>
            </div>
            {appliedDiscountValue && (
              <div className="text-xs text-gray-500 mt-1">
                Primijenjen popust: {appliedDiscountValue}{" "}
                {appliedDiscountType === "percentage" ? "%" : "BAM"}
              </div>
            )}
          </div>
          <Separator />
          <div className="flex flex-col gap-2">
            <span className="font-semibold">Napomena</span>
            <Input
              placeholder="Unesi napomenu"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <div className="col-span-6 flex flex-col gap-3 border border-gray-200 rounded-md p-4">
          <span className="font-semibold">Podaci o kupcu</span>
          <div className="flex items-center gap-2">
            <CustomerSearch onSelectCustomer={handleSelectCustomer} />
            <AddCustomerDialog onCustomerAdded={handleCustomerAdded} />
          </div>
          {selectedCustomer && (
            <>
              <Separator />
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 justify-between">
                  <span className="font-semibold">Kupac</span>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerAddresses([]);
                    }}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
                <p>
                  {selectedCustomer.firstName || selectedCustomer.lastName
                    ? `${selectedCustomer.firstName || ""} ${selectedCustomer.lastName || ""}`.trim()
                    : ""}
                </p>
                {selectedCustomer.email &&
                  (selectedCustomer.hasEmail ||
                    (!selectedCustomer.email.endsWith("@placeholder.local") &&
                      !selectedCustomer.email.includes("customer-") &&
                      !selectedCustomer.email.includes("@placeholder"))) && (
                    <p>{selectedCustomer.email}</p>
                  )}
                {selectedCustomer.phone && <p>{selectedCustomer.phone}</p>}
                {customerAddresses.length > 0 && (
                  <div className="mt-2 pt-2 border-t">
                    <span className="text-sm font-semibold">Adrese:</span>
                    {customerAddresses.map((address) => (
                      <div key={address.id} className="text-sm mt-1">
                        <p>
                          {address.firstName} {address.lastName}
                        </p>
                        <p>{address.address1}</p>
                        {address.address2 && <p>{address.address2}</p>}
                        <p>
                          {address.city} {address.zip}
                        </p>
                        <p>{address.country}</p>
                        {address.phone && <p>{address.phone}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Customer Error Dialog */}
      <AlertDialog open={showCustomerError} onOpenChange={setShowCustomerError}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kupac nije odabran</AlertDialogTitle>
            <AlertDialogDescription>
              Morate odabrati kupca prije kreiranja narudžbe. Molimo odaberite
              postojećeg kupca ili dodajte novog kupca.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowCustomerError(false)}>
              Razumijem
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Validation Error Dialog */}
      <AlertDialog
        open={showValidationError}
        onOpenChange={setShowValidationError}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Greška pri validaciji</AlertDialogTitle>
            <AlertDialogDescription>
              {validationErrorMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowValidationError(false)}>
              Razumijem
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
