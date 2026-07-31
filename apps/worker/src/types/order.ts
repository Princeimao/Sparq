export interface OrderItem {
  productId: string;
  quantity: number;
}

export interface PendingOrder {
  items: OrderItem[];
  addressId?: string;
  notes?: string;
}
