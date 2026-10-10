import { prisma } from "../config/prisma";
import { ApiError } from "../middleware/errorHandler";

/**
 * Tenant-ownership guards. NEVER trust a client-provided business/customer/
 * staff/address/transaction ID — every one must be verified against the
 * authenticated user's tenant before use.
 */

export async function assertCustomerOwned(userId: string, customerId: string) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, userId },
  });
  if (!customer) throw new ApiError(404, "Customer not found");
  return customer;
}

export async function assertServiceOwned(userId: string, serviceId: string) {
  const service = await prisma.service.findFirst({
    where: { id: serviceId, userId },
  });
  if (!service) throw new ApiError(404, "Service not found");
  return service;
}

export async function assertStaffOwned(userId: string, staffId: string) {
  const staff = await prisma.staff.findFirst({
    where: { id: staffId, userId },
  });
  if (!staff) throw new ApiError(404, "Staff member not found");
  return staff;
}

export async function assertResourceOwned(userId: string, resourceId: string) {
  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, userId },
  });
  if (!resource) throw new ApiError(404, "Resource not found");
  return resource;
}

export async function assertBookingOwned(userId: string, bookingId: string) {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, userId },
  });
  if (!booking) throw new ApiError(404, "Booking not found");
  return booking;
}

/** Address ownership is verified through its parent customer. */
export async function assertAddressOwned(userId: string, addressId: string) {
  const address = await prisma.address.findFirst({
    where: { id: addressId, customer: { userId } },
    include: { customer: { select: { id: true, userId: true } } },
  });
  if (!address) throw new ApiError(404, "Address not found");
  return address;
}

/**
 * Resolve a customer for a booking/order within the tenant:
 * - customerId (verified) wins,
 * - else customerPhone finds-or-creates scoped to (userId, phone).
 */
export async function resolveBookingCustomer(
  userId: string,
  input: { customerId?: string; customerPhone?: string; customerName?: string },
) {
  if (input.customerId) {
    return assertCustomerOwned(userId, input.customerId);
  }
  if (input.customerPhone) {
    const phone = input.customerPhone.trim();
    const existing = await prisma.customer.findFirst({
      where: { userId, phone },
    });
    if (existing) return existing;
    return prisma.customer.create({
      data: {
        userId,
        phone,
        name: input.customerName?.trim() || undefined,
      },
    });
  }
  return null;
}

/**
 * Serialize an advisory-lock key for a scope string. Postgres
 * pg_advisory_xact_lock(bigint) is transaction-scoped: the lock is released
 * automatically on commit/rollback, so it can't leak.
 */
export function advisoryLockKey(scope: string): bigint {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let i = 0; i < scope.length; i++) {
    hash ^= BigInt(scope.charCodeAt(i));
    hash = (hash * prime) & mask;
  }
  // Keep within signed bigint range for Postgres.
  return BigInt.asIntN(64, hash);
}

/** Acquire a transaction-scoped advisory lock. Must run inside $transaction. */
export async function acquireAdvisoryLock(
  tx: { $executeRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown> },
  scope: string,
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(${advisoryLockKey(scope)})`;
}
