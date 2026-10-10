import { z } from "zod";

// ─── Booking input shared by apps/api and apps/worker ────────────────────────
// Both sides validate with this schema, so WhatsApp-created and
// dashboard-created bookings obey identical rules.

export const bookingStatusSchema = z.enum([
  "PENDING",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
  "NO_SHOW",
  "CHECKED_IN",
]);

export const bookingSourceSchema = z.enum(["WHATSAPP", "DASHBOARD", "API"]);

const visitAddressSchema = z.object({
  addressId: z.string().cuid().optional(),
  line1: z.string().min(5).max(500).optional(),
  line2: z.string().max(500).optional(),
  city: z.string().min(2).max(200).optional(),
  state: z.string().max(200).optional(),
  pincode: z
    .string()
    .regex(/^[1-9][0-9]{5}$/, "Enter a valid 6-digit pincode")
    .optional(),
  landmark: z.string().max(500).optional(),
});

export const createBookingSchema = z.object({
  serviceId: z.string().cuid().optional(),
  customerId: z.string().cuid().optional(),
  customerName: z.string().min(1).max(200).optional(),
  customerPhone: z.string().max(20).optional(),
  customerEmail: z.string().email().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  locationChoice: z.enum(["AT_BUSINESS", "AT_CUSTOMER"]).optional(),
  visitAddress: visitAddressSchema.optional(),
  partySize: z.number().int().positive().optional(),
  staffId: z.string().cuid().optional(),
  resourceId: z.string().cuid().optional(),
  notes: z.string().max(2000).optional(),
  source: bookingSourceSchema.default("DASHBOARD"),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const availabilityQuerySchema = z.object({
  serviceId: z.string().cuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  partySize: z.coerce.number().int().positive().optional(),
  staffId: z.string().cuid().optional(),
  resourceId: z.string().cuid().optional(),
});

export type AvailabilityQuery = z.infer<typeof availabilityQuerySchema>;
