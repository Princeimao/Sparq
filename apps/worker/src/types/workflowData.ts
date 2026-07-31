export interface WorkflowData {
  productIds?: string[];
  selectedProductId?: string;
  serviceIds?: string[];
  selectedServiceId?: string;
  quantity?: number;
  customerId?: string;
  addressId?: string;
  appointmentId?: string;
  reservationId?: string;
  orderId?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}
