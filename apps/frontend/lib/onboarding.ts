import { api } from "./api";

// ─── Types (mirror the backend onboarding module) ────────────────────────────

export type BusinessType =
  | "SALON"
  | "CLINIC"
  | "RESTAURANT"
  | "HOTEL"
  | "RETAIL"
  | "HOME_SERVICES"
  | "FITNESS"
  | "OTHER";

export type BusinessModule = "products" | "bookings";

// Legacy ids remapped for profiles saved before the unification.
const LEGACY_MODULES: Record<string, BusinessModule> = {
  orders: "products",
  appointments: "bookings",
  reservations: "bookings",
};

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
export type LocationMode = "AT_BUSINESS" | "AT_CUSTOMER" | "BOTH";

export interface OperatingDay {
  open: string;
  close: string;
  closed?: boolean;
}

export interface OnboardingProfile {
  id: string;
  businessName: string | null;
  businessType: BusinessType | null;
  description: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  industry: string | null;
  servicesOffered: string[];
  enabledModules: string[];
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string;
  locationMode: LocationMode | null;
  serviceArea: string | null;
  operatingHours: Record<string, OperatingDay> | null;
  timezone: string | null;
  staffCount: number | null;
  communicationPrefs: Record<string, unknown> | null;
  settings: Record<string, unknown> | null;
  onboardingStatus: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  onboardingStep: number;
  completedAt: string | null;
}

export interface OnboardingDraft {
  businessName?: string;
  businessType?: BusinessType;
  description?: string;
  contactEmail?: string;
  contactPhone?: string;
  industry?: string;
  servicesOffered?: string[];
  enabledModules?: BusinessModule[];
  addressLine1?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  locationMode?: LocationMode;
  serviceArea?: string;
  operatingHours?: Record<string, OperatingDay>;
  timezone?: string;
  staffCount?: number;
  communicationPrefs?: Record<string, unknown>;
  step?: number;
}

interface ApiEnvelope<T> {
  data: T;
  message: string;
  success: boolean;
}

// ─── API ─────────────────────────────────────────────────────────────────────

export async function getOnboarding(): Promise<OnboardingProfile> {
  const res = await api.get<ApiEnvelope<OnboardingProfile>>("/onboarding");
  return res.data.data;
}

export async function saveOnboardingDraft(
  draft: OnboardingDraft,
): Promise<OnboardingProfile> {
  const res = await api.put<ApiEnvelope<OnboardingProfile>>(
    "/onboarding",
    draft,
  );
  return res.data.data;
}

export async function completeOnboarding(
  draft: OnboardingDraft,
): Promise<OnboardingProfile> {
  const res = await api.post<ApiEnvelope<OnboardingProfile>>(
    "/onboarding/complete",
    draft,
  );
  return res.data.data;
}

// ─── Dynamic step visibility (mirrors backend requiredFieldsFor) ─────────────

export function defaultModulesFor(type?: BusinessType): BusinessModule[] {
  switch (type) {
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

export function hasModule(
  draft: OnboardingDraft,
  module: BusinessModule,
): boolean {
  return normalizeModules(draft.enabledModules).includes(module);
}

export function needsBusinessAddress(draft: OnboardingDraft): boolean {
  if (
    draft.businessType === "RESTAURANT" ||
    draft.businessType === "HOTEL"
  )
    return true;
  if (hasModule(draft, "products")) return true;
  if (
    hasModule(draft, "bookings") &&
    (draft.locationMode === "AT_BUSINESS" || draft.locationMode === "BOTH")
  )
    return true;
  return false;
}

export function needsServiceArea(draft: OnboardingDraft): boolean {
  return (
    hasModule(draft, "bookings") &&
    (draft.locationMode === "AT_CUSTOMER" || draft.locationMode === "BOTH")
  );
}

export function needsHours(draft: OnboardingDraft): boolean {
  return hasModule(draft, "bookings");
}

export const BUSINESS_TYPE_META: Array<{
  id: BusinessType;
  label: string;
  emoji: string;
  blurb: string;
}> = [
  { id: "SALON", label: "Salon / Spa", emoji: "💇", blurb: "Appointments & staff" },
  { id: "CLINIC", label: "Clinic", emoji: "🩺", blurb: "Appointments & visits" },
  { id: "RESTAURANT", label: "Restaurant", emoji: "🍽️", blurb: "Orders & tables" },
  { id: "HOTEL", label: "Hotel / Stay", emoji: "🏨", blurb: "Rooms & bookings" },
  { id: "RETAIL", label: "Retail / Shop", emoji: "🛍️", blurb: "Product sales" },
  { id: "HOME_SERVICES", label: "Home services", emoji: "🔧", blurb: "Visits & jobs" },
  { id: "FITNESS", label: "Fitness", emoji: "💪", blurb: "Sessions & plans" },
  { id: "OTHER", label: "Other", emoji: "✨", blurb: "Mix & match" },
];

export const MODULE_META: Array<{
  id: BusinessModule;
  label: string;
  emoji: string;
  blurb: string;
}> = [
  { id: "products", label: "Products", emoji: "🛒", blurb: "Catalog, orders & delivery" },
  { id: "bookings", label: "Services & bookings", emoji: "📅", blurb: "Appointments, tables, visits & schedule" },
];

export const WEEK_DAYS = [
  { id: "mon", label: "Mon" },
  { id: "tue", label: "Tue" },
  { id: "wed", label: "Wed" },
  { id: "thu", label: "Thu" },
  { id: "fri", label: "Fri" },
  { id: "sat", label: "Sat" },
  { id: "sun", label: "Sun" },
];
