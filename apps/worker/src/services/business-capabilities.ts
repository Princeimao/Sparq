import { prisma } from "../config/prisma";
import { redis } from "../config/redis";
import { BusinessModule } from "../types/handler";

export type { BusinessModule };

export interface BusinessCapabilities {
  businessName: string;
  enabledModules: Set<BusinessModule>;
}

const ALL_MODULES: BusinessModule[] = ["products", "bookings"];
const CACHE_TTL_SEC = 300;

function cacheKey(userId: string) {
  return `sparq:capabilities:${userId}`;
}

/**
 * What a business offers, derived from its onboarding profile.
 * - No profile yet (existing businesses) → everything enabled (backward compat).
 * - Cached in Redis for 5 minutes; onboarding updates take effect shortly after.
 */
export async function getBusinessCapabilities(
  userId: string,
): Promise<BusinessCapabilities> {
  try {
    const cached = await redis.get(cacheKey(userId));
    if (cached) {
      const parsed = JSON.parse(cached) as {
        businessName: string;
        enabledModules: BusinessModule[];
      };
      return {
        businessName: parsed.businessName,
        enabledModules: new Set(parsed.enabledModules),
      };
    }
  } catch (err) {
    console.warn("[capabilities] redis read failed:", err);
  }

  const caps = await loadCapabilities(userId);

  try {
    await redis.set(
      cacheKey(userId),
      JSON.stringify({
        businessName: caps.businessName,
        enabledModules: [...caps.enabledModules],
      }),
      "EX",
      CACHE_TTL_SEC,
    );
  } catch (err) {
    console.warn("[capabilities] redis write failed:", err);
  }

  return caps;
}

async function loadCapabilities(userId: string): Promise<BusinessCapabilities> {
  try {
    const [profile, user] = await Promise.all([
      prisma.businessProfile.findUnique({ where: { userId } }),
      prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
    ]);
    const businessName =
      profile?.businessName ?? user?.name ?? "Our Business";
    if (!profile || profile.enabledModules.length === 0) {
      // No onboarding data → all modules (existing behavior preserved).
      return { businessName, enabledModules: new Set(ALL_MODULES) };
    }
    // Legacy ids (orders/appointments/reservations) remap to the
    // current set (products/bookings) so old profiles keep working.
    const legacy: Record<string, BusinessModule> = {
      orders: "products",
      appointments: "bookings",
      reservations: "bookings",
    };
    const modules = (profile.enabledModules as string[])
      .map((m): BusinessModule | null => {
        if (m === "products" || m === "bookings") return m;
        return legacy[m] ?? null;
      })
      .filter((m): m is BusinessModule => m !== null);
    return {
      businessName,
      enabledModules: new Set(modules.length > 0 ? modules : ALL_MODULES),
    };
  } catch {
    return { businessName: "Our Business", enabledModules: new Set(ALL_MODULES) };
  }
}

/** Drop the cache so onboarding changes apply immediately. */
export async function invalidateCapabilities(userId: string): Promise<void> {
  try {
    await redis.del(cacheKey(userId));
  } catch (err) {
    console.warn("[capabilities] redis delete failed:", err);
  }
}
