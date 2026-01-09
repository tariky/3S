export interface Variant {
  position: number;
  id: string;
  name: string;
  options: {
    position: number;
    id: string;
    name: string;
  }[];
}

export interface GeneratedVariant {
  id: string;
  combination: {
    variantName: string;
    optionName: string;
    optionId: string;
  }[];
  sku: string;
  quantity: string;
  price: string;
  compareAtPrice: string;
  cost: string;
  reserved?: number; // Reserved inventory quantity
}
