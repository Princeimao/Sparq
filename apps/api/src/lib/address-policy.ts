/**
 * Address-requirement policy — single source of truth for WHEN an address
 * must be collected. Used by the API (validation), the worker (conversation
 * steps) and mirrored in the frontend.
 *
 * Rules:
 * - Product orders always need a shipping address (delivery).
 * - In-business appointments never need an address.
 * - Home-service appointments always need a visit address.
 * - "Both" services let the customer choose; only the AT_CUSTOMER choice
 *   requires a visit address.
 * - A saved address NEVER auto-becomes shipping/visit — the customer must
 *   explicitly select or provide one for that transaction.
 */

export type ServiceLocationMode = "AT_BUSINESS" | "AT_CUSTOMER" | "BOTH";
export type LocationChoice = "AT_BUSINESS" | "AT_CUSTOMER";

export type AddressRequirement =
  | { required: false }
  | { required: true; kind: "SHIPPING" | "VISIT" };

export function orderAddressRequirement(): AddressRequirement {
  return { required: true, kind: "SHIPPING" };
}

export function appointmentAddressRequirement(
  serviceLocation: ServiceLocationMode,
  choice?: LocationChoice,
): AddressRequirement {
  if (serviceLocation === "AT_BUSINESS") return { required: false };
  if (serviceLocation === "AT_CUSTOMER")
    return { required: true, kind: "VISIT" };
  // BOTH: address needed only when the customer chose a home visit.
  if (choice === "AT_CUSTOMER") return { required: true, kind: "VISIT" };
  return { required: false };
}

export function reservationAddressRequirement(): AddressRequirement {
  // Reservations happen at the business venue — no address needed.
  return { required: false };
}

const IN_PINCODE = /^[1-9][0-9]{5}$/;

export interface VisitAddressInput {
  line1?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

/** Validate a visit/shipping address collected conversationally or via API. */
export function validateCollectedAddress(input: VisitAddressInput): string[] {
  const errors: string[] = [];
  if (!input.line1 || input.line1.trim().length < 5)
    errors.push("Street address must be at least 5 characters.");
  if (!input.city || input.city.trim().length < 2)
    errors.push("City is required.");
  if (!input.pincode || !IN_PINCODE.test(input.pincode.trim()))
    errors.push("Enter a valid 6-digit pincode.");
  return errors;
}
