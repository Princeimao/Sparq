import { Prisma } from "@sparq/database/src/generated/prisma/client";
import { BaseRepository } from "./base.repository";

function advisoryLockKey(scope: string): bigint {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let i = 0; i < scope.length; i++) {
    hash ^= BigInt(scope.charCodeAt(i));
    hash = (hash * prime) & mask;
  }
  return BigInt.asIntN(64, hash);
}

export interface AllocationInput {
  staffId?: string;
  resourceId?: string;
  role?: string;
}

export class BookingRepository extends BaseRepository {
  /**
   * Overlap-checked creation inside a transaction guarded by a
   * transaction-scoped advisory lock — concurrent confirmations for the
   * same scope can't double-book the same provider or resource.
   */
  async createChecked(
    scope: string,
    data: Prisma.BookingCreateInput,
    clashes: { ownerIds: string[]; startTime: Date; endTime: Date; bufferMinutes: number },
  ) {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${advisoryLockKey(scope)})`;
      const pad = clashes.bufferMinutes * 60_000;
      for (const ownerId of clashes.ownerIds) {
        const clash = await tx.booking.findFirst({
          where: {
            status: { notIn: ["CANCELLED"] },
            startTime: { lt: new Date(clashes.endTime.getTime() + pad) },
            endTime: { gt: new Date(clashes.startTime.getTime() - pad) },
            allocations: {
              some: { OR: [{ staffId: ownerId }, { resourceId: ownerId }] },
            },
          },
          select: { id: true },
        });
        if (clash) throw new Error("SLOT_TAKEN");
      }
      return tx.booking.create({ data });
    });
  }

  /** Busy periods for a set of owners inside a window (for availability). */
  async findBusy(
    userId: string,
    ownerIds: string[],
    windowStart: Date,
    windowEnd: Date,
  ) {
    if (ownerIds.length === 0) return [];
    const rows = await this.prisma.booking.findMany({
      where: {
        userId,
        status: { notIn: ["CANCELLED"] },
        startTime: { lt: windowEnd },
        endTime: { gt: windowStart },
        allocations: {
          some: { OR: [{ staffId: { in: ownerIds } }, { resourceId: { in: ownerIds } }] },
        },
      },
      select: {
        startTime: true,
        endTime: true,
        allocations: { select: { staffId: true, resourceId: true } },
      },
    });
    const busy: { ownerId: string; startTime: Date; endTime: Date }[] = [];
    for (const r of rows) {
      for (const a of r.allocations) {
        const ownerId = a.staffId ?? a.resourceId;
        if (ownerId && ownerIds.includes(ownerId)) {
          busy.push({ ownerId, startTime: r.startTime, endTime: r.endTime });
        }
      }
    }
    return busy;
  }
}
