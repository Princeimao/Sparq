import { z } from "zod";

/**
 * Canonical onboarding rules. The backend is authoritative; the frontend
 * mirrors step visibility from `enabledModules`/`businessType` only, while
 * completion requirements are enforced here.
 */

export const BUSINESS_TYPES = [
  "SALON",
  "CLINIC",
  "RESTAURANT",
  "HOTEL",
  "RETAIL",
  "HOME_SERVICES",
  "FITNESS",
  "OTHER",
] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const MODULES = ["products", "bookings"] as const;
export type BusinessModule = (typeof MODULES)[number];

/** Legacy module ids accepted on input, remapped to the current set. */
const LEGACY_MODULES: Record<string, BusinessModule> = {
  orders: "products",
  appointments: "bookings",
  reservations: "bookings",
};

/** Normalize stored or submitted modules (deduped, legacy remapped). */
export function normalizeModules(modules: unknown): BusinessModule[] {
  if (!Array.isArray(modules)) return [];
  const out: BusinessModule[] = [];
  for (const m of modules) {
    const mapped =
      m === "products" || m === "bookings"
        ? (m as BusinessModule)
        : LEGACY_MODULES[String(m)];
    if (mapped && !out.includes(mapped)) out.push(mapped);
  }
  return out;
}

export const LOCATION_MODES = ["AT_BUSINESS", "AT_CUSTOMER", "BOTH"] as const;

export interface OnboardingData {
  businessName?: string;
  businessType?: BusinessType;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  industry?: string;
  servicesOffered?: string[];
  enabledModules?: string[];
  addressLine1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  locationMode?: "AT_BUSINESS" | "AT_CUSTOMER" | "BOTH";
  serviceArea?: string;
  operatingHours?: Record<string, { open: string; close: string; closed?: boolean }>;
  staffCount?: number;
  communicationPrefs?: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

/** Modules implied by business type when the user hasn't chosen explicitly. */
export function defaultModulesFor(businessType?: BusinessType): BusinessModule[] {
  switch (businessType) {
    case "RETAIL":
      return ["products"];
    case "SALON":
    case "CLINIC":
    case "FITNESS":
    case "HOME_SERVICES":
    case "RESTAURANT":
    case "HOTEL":
      return ["bookings"];
    default:
      return [];
  }
}

/**
 * Fields required to COMPLETE onboarding, driven by type + modules.
 * Drafts may be partial — this only gates the final step.
 */
export function requiredFieldsFor(data: OnboardingData): string[] {
  const required = ["businessName", "businessType"];
  const modules = new Set(normalizeModules(data.enabledModules));

  if (modules.has("bookings")) {
    required.push("locationMode");
    if (data.locationMode === "AT_BUSINESS" || data.locationMode === "BOTH") {
      required.push("addressLine1", "city", "pincode");
    }
    if (data.locationMode === "AT_CUSTOMER" || data.locationMode === "BOTH") {
      required.push("serviceArea");
    }
    required.push("operatingHours");
  }
  if (modules.has("products")) {
    required.push("addressLine1", "city", "pincode");
  }
  if (data.businessType === "RESTAURANT" || data.businessType === "HOTEL") {
    if (!required.includes("addressLine1")) {
      required.push("addressLine1", "city", "pincode");
    }
  }
  return [...new Set(required)];
}

export function missingFields(data: OnboardingData): string[] {
  const required = requiredFieldsFor(data);
  return required.filter((field) => {
    const value = (data as Record<string, unknown>)[field];
    if (value === undefined || value === null) return true;
    if (typeof value === "string") return value.trim().length === 0;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === "object") return Object.keys(value).length === 0;
    return false;
  });
}

// ─── Zod schemas (draft = all optional; complete = checked via missingFields) ─

const operatingDaySchema = z.object({
  open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM format"),
  close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM format"),
  closed: z.boolean().optional(),
});

export const onboardingDraftSchema = z.object({
  businessName: z.string().max(200).optional(),
  businessType: z.enum(BUSINESS_TYPES).optional(),
  description: z.string().max(2000).optional(),
  contactEmail: z.string().email().max(200).optional().or(z.literal("")),
  contactPhone: z.string().max(20).optional(),
  industry: z.string().max(200).optional(),
  servicesOffered: z.array(z.string().max(200)).max(50).optional(),
  enabledModules: z.array(z.string().max(50)).max(5).optional(),
  addressLine1: z.string().max(500).optional(),
  city: z.string().max(200).optional(),
  state: z.string().max(200).optional(),
  pincode: z.string().regex(/^[1-9][0-9]{5}$/, "Enter a valid 6-digit pincode").optional().or(z.literal("")),
  country: z.string().max(100).optional(),
  locationMode: z.enum(LOCATION_MODES).optional(),
  serviceArea: z.string().max(500).optional(),
  operatingHours: z.record(operatingDaySchema).optional(),
  timezone: z.string().max(100).optional(),
  staffCount: z.number().int().min(0).max(10000).optional(),
  communicationPrefs: z.record(z.unknown()).optional(),
  settings: z.record(z.unknown()).optional(),
  step: z.number().int().min(0).max(20).optional(),
});

export type OnboardingDraft = z.infer<typeof onboardingDraftSchema>;
