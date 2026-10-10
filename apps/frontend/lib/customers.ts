import { api } from "./api";

// ─── Customer domain client (matches the backend customer module) ────────────

export interface CustomerAddress {
  id: string;
  label: string | null;
  isDefault: boolean;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  landmark: string | null;
  createdAt: string;
}

export interface CustomerOrder {
  id: string;
  productName: string;
  amount: number | null;
  currency: string | null;
  status: string;
  purchaseDate: string;
  paymentLink: string | null;
}

export interface CustomerBooking {
  id: string;
  customerName: string;
  startTime: string;
  endTime: string;
  status: string;
  partySize: number | null;
  locationMode: string | null;
  service: { id: string; name: string } | null;
  allocations: {
    staff: { id: string; name: string } | null;
    resource: { id: string; name: string; kind: string } | null;
  }[];
}

export interface CustomerMessage {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  type: string;
  body: string | null;
  status: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  notes: string | null;
  customFields: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    orders?: number;
    conversations?: number;
    bookings?: number;
  };
}

export interface CustomerDetail extends Omit<Customer, "_count"> {
  orders: CustomerOrder[];
  bookings: CustomerBooking[];
  messages: CustomerMessage[];
  addresses: CustomerAddress[];
  _count: {
    orders: number;
    bookings: number;
    messages: number;
  };
}

interface ApiEnvelope<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface CustomersPage {
  customers: Customer[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export async function listCustomers(params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<CustomersPage> {
  // NOTE: list/create live under the doubled /customers/customers path
  // (existing backend routing) — detail/update/delete use /customers/:id.
  const res = await api.get<ApiEnvelope<CustomersPage>>("/customers/customers", {
    params,
  });
  return res.data.data;
}

export async function getCustomer(id: string): Promise<CustomerDetail> {
  const res = await api.get<ApiEnvelope<{ customer: CustomerDetail }>>(
    `/customers/${id}`,
  );
  return res.data.data.customer;
}

export async function createCustomer(input: {
  phone: string;
  name?: string;
  email?: string;
  notes?: string;
  customFields?: Record<string, unknown>;
}): Promise<Customer> {
  const res = await api.post<ApiEnvelope<{ customer: Customer }>>(
    "/customers/customers",
    input,
  );
  return res.data.data.customer;
}

export async function updateCustomer(
  id: string,
  input: {
    name?: string;
    email?: string | null;
    notes?: string | null;
    customFields?: Record<string, unknown>;
  },
): Promise<Customer> {
  const res = await api.patch<ApiEnvelope<{ customer: Customer }>>(
    `/customers/${id}`,
    input,
  );
  return res.data.data.customer;
}

export async function deleteCustomer(id: string): Promise<void> {
  await api.delete(`/customers/${id}`);
}

export async function addCustomerAddress(
  customerId: string,
  input: {
    label?: string;
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    pincode: string;
    landmark?: string;
    isDefault?: boolean;
  },
): Promise<CustomerAddress> {
  const res = await api.post<ApiEnvelope<{ address: CustomerAddress }>>(
    `/customers/${customerId}/addresses`,
    input,
  );
  return res.data.data.address;
}

export async function deleteCustomerAddress(
  customerId: string,
  addressId: string,
): Promise<void> {
  await api.delete(`/customers/${customerId}/addresses/${addressId}`);
}

export function formatAddress(a: Pick<CustomerAddress, "line1" | "city" | "state" | "pincode">): string {
  return [a.line1, a.city, a.state, a.pincode].filter(Boolean).join(", ");
}
