import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ProductSearch } from "@/components/orders/ProductSearch";
import { CustomerSearch } from "@/components/orders/CustomerSearch";
import { AddCustomerDialog } from "@/components/orders/AddCustomerDialog";
import {
  Select,
  SelectContent,
  SelectValue,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  X,
  Loader2,
  ShoppingCart,
  User,
  Truck,
  CreditCard,
  Percent,
  StickyNote,
  Plus,
  Minus,
  Package,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ImageOff,
} from "lucide-react";
import { ProxyImage } from "@/components/ui/proxy-image";
import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getActiveShippingMethodsQueryOptions } from "@/queries/shipping-methods";
import { getActivePaymentMethodsQueryOptions } from "@/queries/payment-methods";
import {
  createOrderServerFn,
  getInventoryForVariantsServerFn,
} from "@/queries/orders";
import { getCustomerByIdServerFn } from "@/queries/customers";
import { cn } from "@/lib/utils";

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
            ? { ...item, quantity: item.quantity + 1, inventory: product.inventory }
            : item
        )
      );
    } else {
      if (product.variantId && !product.inventory) {
        try {
          const inventoryData = await getInventoryForVariantsServerFn({
            data: { variantIds: [product.variantId] },
          });
          if (inventoryData[product.variantId]) {
            product.inventory = inventoryData[product.variantId];
            if (product.inventory.available < 1) {
              alert(`Nema dovoljno zaliha. Dostupno: ${product.inventory.available}`);
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

  const tax = 0;
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

  const completionSteps = useMemo(() => {
    return [
      { label: "Proizvodi", completed: cart.length > 0, icon: ShoppingCart },
      { label: "Kupac", completed: selectedCustomer !== null, icon: User },
      { label: "Dostava", completed: shippingMethodId !== "", icon: Truck },
      { label: "Plaćanje", completed: paymentMethodId !== "", icon: CreditCard },
    ];
  }, [cart.length, selectedCustomer, shippingMethodId, paymentMethodId]);

  const completedSteps = completionSteps.filter((s) => s.completed).length;
  const isOrderValid = completedSteps === completionSteps.length;

  const handleCreateOrder = () => {
    if (!selectedCustomer) {
      setShowCustomerError(true);
      return;
    }
    if (cart.length === 0) {
      setValidationErrorMessage("Dodajte barem jedan proizvod u korpu.");
      setShowValidationError(true);
      return;
    }
    if (!shippingMethodId) {
      setValidationErrorMessage("Odaberite način dostave.");
      setShowValidationError(true);
      return;
    }
    if (!paymentMethodId) {
      setValidationErrorMessage("Odaberite način plaćanja.");
      setShowValidationError(true);
      return;
    }
    createOrderMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  navigate({
                    to: "/admin/orders",
                    search: { search: "", page: 1, limit: 25 },
                  })
                }
                className="rounded-full"
              >
                <ArrowLeft className="size-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Nova narudžba</h1>
                <p className="text-sm text-gray-500">Kreirajte novu narudžbu za kupca</p>
              </div>
            </div>

            {/* Progress Indicator */}
            <div className="hidden md:flex items-center gap-2">
              {completionSteps.map((step, index) => (
                <div key={step.label} className="flex items-center">
                  <div
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                      step.completed
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-gray-100 text-gray-500"
                    )}
                  >
                    {step.completed ? (
                      <CheckCircle2 className="size-4" />
                    ) : (
                      <step.icon className="size-4" />
                    )}
                    <span className="hidden lg:inline">{step.label}</span>
                  </div>
                  {index < completionSteps.length - 1 && (
                    <div className={cn(
                      "w-8 h-0.5 mx-1",
                      step.completed ? "bg-emerald-300" : "bg-gray-200"
                    )} />
                  )}
                </div>
              ))}
            </div>

            <Button
              onClick={handleCreateOrder}
              disabled={createOrderMutation.isPending || !isOrderValid}
              className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200"
            >
              {createOrderMutation.isPending ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="size-4 mr-2" />
              )}
              Kreiraj narudžbu
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Products & Cart */}
          <div className="lg:col-span-2 space-y-6">
            {/* Products Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <ShoppingCart className="size-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">Proizvodi</h2>
                      <p className="text-sm text-gray-500">
                        {cart.length} {cart.length === 1 ? "proizvod" : "proizvoda"} u korpi
                      </p>
                    </div>
                  </div>
                  <ProductSearch onSelectProduct={handleAddProduct} />
                </div>
              </div>

              <div className="p-6">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="p-4 bg-gray-100 rounded-full mb-4">
                      <Package className="size-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium">Korpa je prazna</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Pretražite i dodajte proizvode u narudžbu
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cart.map((item) => (
                      <div
                        key={item.id}
                        className="group flex gap-4 p-4 rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all bg-white"
                      >
                        <div className="relative">
                          {item.image ? (
                            <ProxyImage
                              src={item.image}
                              alt={item.title}
                              width={80}
                              height={80}
                              resizingType="fill"
                              className="w-20 h-20 rounded-lg object-cover bg-gray-100"
                            />
                          ) : (
                            <div className="w-20 h-20 rounded-lg bg-gray-100 flex flex-col items-center justify-center">
                              <ImageOff className="size-6 text-gray-400" />
                              <span className="text-[10px] text-gray-400 mt-1">Nema slike</span>
                            </div>
                          )}
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                          >
                            <X className="size-3" />
                          </button>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium text-gray-900 truncate">
                                {item.title}
                              </h3>
                              {item.variantTitle && (
                                <p className="text-sm text-gray-500 mt-0.5">
                                  {item.variantTitle}
                                </p>
                              )}
                              {item.sku && (
                                <p className="text-xs text-gray-400 mt-0.5">
                                  SKU: {item.sku}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">
                                {(item.price * item.quantity).toFixed(2)} KM
                              </p>
                              <p className="text-sm text-gray-500">
                                {item.price.toFixed(2)} KM / kom
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="size-8 rounded-lg"
                                onClick={() =>
                                  handleUpdateQuantity(item.id, item.quantity - 1)
                                }
                              >
                                <Minus className="size-3" />
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
                                className="w-14 h-8 text-center text-sm font-medium"
                                min="1"
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                className="size-8 rounded-lg"
                                onClick={() =>
                                  handleUpdateQuantity(item.id, item.quantity + 1)
                                }
                                disabled={
                                  item.variantId && item.inventory
                                    ? item.inventory.available <= item.quantity
                                    : false
                                }
                              >
                                <Plus className="size-3" />
                              </Button>
                            </div>
                            {item.variantId && item.inventory && (
                              <Badge variant="secondary" className="text-xs">
                                {item.inventory.available} dostupno
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Shipping & Payment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Shipping Method */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      shippingMethodId ? "bg-emerald-100" : "bg-gray-100"
                    )}>
                      <Truck className={cn(
                        "size-5",
                        shippingMethodId ? "text-emerald-600" : "text-gray-400"
                      )} />
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">Dostava</h2>
                      <p className="text-sm text-gray-500">Odaberite način dostave</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <Select value={shippingMethodId} onValueChange={setShippingMethodId}>
                    <SelectTrigger className="w-full h-12">
                      <SelectValue placeholder="Odaberite dostavu..." />
                    </SelectTrigger>
                    <SelectContent>
                      {shippingMethods?.map((method) => (
                        <SelectItem key={method.id} value={method.id}>
                          <div className="flex justify-between items-center w-full">
                            <span>{method.name}</span>
                            <span className="text-gray-500 ml-2">
                              {parseFloat(method.price).toFixed(2)} KM
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      paymentMethodId ? "bg-emerald-100" : "bg-gray-100"
                    )}>
                      <CreditCard className={cn(
                        "size-5",
                        paymentMethodId ? "text-emerald-600" : "text-gray-400"
                      )} />
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">Plaćanje</h2>
                      <p className="text-sm text-gray-500">Odaberite način plaćanja</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
                    <SelectTrigger className="w-full h-12">
                      <SelectValue placeholder="Odaberite plaćanje..." />
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
              </div>
            </div>

            {/* Discount & Note */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Discount */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      appliedDiscountValue ? "bg-orange-100" : "bg-gray-100"
                    )}>
                      <Percent className={cn(
                        "size-5",
                        appliedDiscountValue ? "text-orange-600" : "text-gray-400"
                      )} />
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">Popust</h2>
                      <p className="text-sm text-gray-500">Dodajte popust na narudžbu</p>
                    </div>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex gap-2">
                    <Button
                      variant={discountType === "percentage" ? "default" : "outline"}
                      onClick={() => setDiscountType("percentage")}
                      size="sm"
                      className="flex-1"
                    >
                      <Percent className="size-4 mr-1" />
                      Procenat
                    </Button>
                    <Button
                      variant={discountType === "fixed" ? "default" : "outline"}
                      onClick={() => setDiscountType("fixed")}
                      size="sm"
                      className="flex-1"
                    >
                      KM Fiksno
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="0"
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
                      Primijeni
                    </Button>
                  </div>
                  {appliedDiscountValue && (
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <span className="text-sm text-orange-700 font-medium">
                        Aktivan popust: {appliedDiscountValue}
                        {appliedDiscountType === "percentage" ? "%" : " KM"}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRemoveDiscount}
                        className="text-orange-700 hover:text-orange-900 hover:bg-orange-100"
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Note */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      note ? "bg-purple-100" : "bg-gray-100"
                    )}>
                      <StickyNote className={cn(
                        "size-5",
                        note ? "text-purple-600" : "text-gray-400"
                      )} />
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">Napomena</h2>
                      <p className="text-sm text-gray-500">Dodajte internu napomenu</p>
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <Textarea
                    placeholder="Unesite napomenu za ovu narudžbu..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Customer & Summary */}
          <div className="space-y-6">
            {/* Customer Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-lg",
                    selectedCustomer ? "bg-emerald-100" : "bg-gray-100"
                  )}>
                    <User className={cn(
                      "size-5",
                      selectedCustomer ? "text-emerald-600" : "text-gray-400"
                    )} />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">Kupac</h2>
                    <p className="text-sm text-gray-500">
                      {selectedCustomer ? "Kupac odabran" : "Odaberite kupca"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {!selectedCustomer ? (
                  <div className="space-y-4">
                    <CustomerSearch onSelectCustomer={handleSelectCustomer} />
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-gray-400">ili</span>
                      </div>
                    </div>
                    <AddCustomerDialog onCustomerAdded={handleCustomerAdded} />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="size-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {(selectedCustomer.firstName?.[0] || selectedCustomer.lastName?.[0] || "K").toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {selectedCustomer.firstName || selectedCustomer.lastName
                              ? `${selectedCustomer.firstName || ""} ${selectedCustomer.lastName || ""}`.trim()
                              : "Nepoznat kupac"}
                          </p>
                          {selectedCustomer.email &&
                            (selectedCustomer.hasEmail ||
                              (!selectedCustomer.email.endsWith("@placeholder.local") &&
                                !selectedCustomer.email.includes("customer-"))) && (
                              <p className="text-sm text-gray-500">{selectedCustomer.email}</p>
                            )}
                          {selectedCustomer.phone && (
                            <p className="text-sm text-gray-500">{selectedCustomer.phone}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedCustomer(null);
                          setCustomerAddresses([]);
                        }}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X className="size-4" />
                      </Button>
                    </div>

                    {customerAddresses.length > 0 && (
                      <div className="pt-4 border-t border-gray-100">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                          Adresa za dostavu
                        </p>
                        <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                          {customerAddresses.map((address) => (
                            <div key={address.id}>
                              <p>{address.firstName} {address.lastName}</p>
                              <p>{address.address1}</p>
                              {address.address2 && <p>{address.address2}</p>}
                              <p>{address.city} {address.zip}</p>
                              <p>{address.country}</p>
                              {address.phone && <p>{address.phone}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden sticky top-24">
              <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                <h2 className="font-semibold text-gray-900">Pregled narudžbe</h2>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Međuzbir</span>
                    <span className="font-medium">{subtotal.toFixed(2)} KM</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Dostava</span>
                    <span className="font-medium">{shippingCost.toFixed(2)} KM</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Popust</span>
                      <span className="font-medium text-red-500">
                        -{discountAmount.toFixed(2)} KM
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between">
                    <span className="text-lg font-semibold text-gray-900">Ukupno</span>
                    <span className="text-lg font-bold text-gray-900">
                      {total.toFixed(2)} KM
                    </span>
                  </div>
                </div>

                {/* Mobile Progress */}
                <div className="pt-4 border-t border-gray-200 md:hidden">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                    Status kompletiranja
                  </p>
                  <div className="space-y-2">
                    {completionSteps.map((step) => (
                      <div
                        key={step.label}
                        className={cn(
                          "flex items-center gap-2 text-sm",
                          step.completed ? "text-emerald-600" : "text-gray-400"
                        )}
                      >
                        {step.completed ? (
                          <CheckCircle2 className="size-4" />
                        ) : (
                          <AlertCircle className="size-4" />
                        )}
                        <span>{step.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <AlertDialog open={showCustomerError} onOpenChange={setShowCustomerError}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="size-5 text-amber-500" />
              Kupac nije odabran
            </AlertDialogTitle>
            <AlertDialogDescription>
              Morate odabrati kupca prije kreiranja narudžbe.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowCustomerError(false)}>
              Razumijem
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showValidationError} onOpenChange={setShowValidationError}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="size-5 text-red-500" />
              Greška pri validaciji
            </AlertDialogTitle>
            <AlertDialogDescription>{validationErrorMessage}</AlertDialogDescription>
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
