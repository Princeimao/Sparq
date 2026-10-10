import { api } from "./api";

// ─── Bookings domain client (matches the backend bookings module) ────────────

export interface BookingAllocation {
  staff: { id: string; name: string; color: string | null } | null;
  resource: { id: string; name: string; kind: string; color: string | null } | null;
}

export interface Booking {
  id: string;
  serviceId: string | null;
  customerId: string | null;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  locationMode: string | null;
  startTime: string;
  endTime: string;
  status: string;
  source: string;
  partySize: number | null;
  notes: string | null;
  totalAmount: number | null;
  createdAt: string;
  service: { id: string; name: string; duration: number; requiresPartySize: boolean } | null;
  customer: { id: string; name: string | null; phone: string } | null;
  visitAddress: {
    id: string;
    line1: string;
    city: string;
    state: string;
    pincode: string;
    landmark: string | null;
  } | null;
  allocations: BookingAllocation[];
}

interface ApiEnvelope<T> {
  data: T;
  message: string;
  success: boolean;
}

export interface BookingsPage {
  bookings: Booking[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export async function listBookings(params: {
  page?: number;
  limit?: number;
  status?: string;
  serviceId?: string;
  staffId?: string;
  resourceId?: string;
  customerId?: string;
  from?: string;
  to?: string;
}): Promise<BookingsPage> {
  const res = await api.get<ApiEnvelope<BookingsPage>>("/bookings", { params });
  return res.data.data;
}

export async function getBooking(id: string): Promise<Booking> {
  const res = await api.get<ApiEnvelope<{ booking: Booking }>>(`/bookings/${id}`);
  return res.data.data.booking;
}

export interface AvailabilitySlot {
  start: string;
  end: string;
  options: { id: string; kind: string; name: string }[];
}

export async function getAvailability(params: {
  serviceId: string;
  date: string;
  partySize?: number;
  staffId?: string;
  resourceId?: string;
}): Promise<{ slots: AvailabilitySlot[]; timezone: string; ownerImplicit: boolean }> {
  const res = await api.get<
    ApiEnvelope<{ slots: AvailabilitySlot[]; timezone: string; ownerImplicit: boolean }>
  >("/bookings/availability", { params });
  return res.data.data;
}

export async function createBooking(input: {
  serviceId: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  startTime: string;
  endTime?: string;
  locationChoice?: "AT_BUSINESS" | "AT_CUSTOMER";
  visitAddress?: {
    addressId?: string;
    line1?: string;
    city?: string;
    pincode?: string;
    landmark?: string;
  };
  partySize?: number;
  staffId?: string;
  resourceId?: string;
  notes?: string;
}): Promise<Booking> {
  const res = await api.post<ApiEnvelope<{ booking: Booking }>>("/bookings", input);
  return res.data.data.booking;
}

export async function setBookingStatus(id: string, status: string): Promise<Booking> {
  const res = await api.patch<ApiEnvelope<{ booking: Booking }>>(
    `/bookings/${id}/status`,
    { status },
  );
  return res.data.data.booking;
}

export async function reassignBooking(
  id: string,
  input: { staffId?: string; resourceId?: string },
): Promise<Booking> {
  const res = await api.patch<ApiEnvelope<{ booking: Booking }>>(
    `/bookings/${id}/reassign`,
    input,
  );
  return res.data.data.booking;
}

export async function deleteBooking(id: string): Promise<void> {
  await api.delete(`/bookings/${id}`);
}
