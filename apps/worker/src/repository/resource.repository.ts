import { BaseRepository } from "./base.repository";

export class ResourceRepository extends BaseRepository {
  async findActiveByKind(userId: string, kind: "TABLE" | "ROOM" | "EQUIPMENT" | "OTHER") {
    return this.prisma.resource.findMany({
      where: { userId, kind, isActive: true },
      orderBy: [{ capacity: "asc" }, { name: "asc" }],
    });
  }

  async findActiveTables(userId: string) {
    return this.findActiveByKind(userId, "TABLE");
  }

  async findById(id: string) {
    return this.prisma.resource.findUnique({ where: { id } });
  }

  async findHours(ownerIds: string[]) {
    if (ownerIds.length === 0) return [];
    return this.prisma.availability.findMany({
      where: {
        OR: [{ staffId: { in: ownerIds } }, { resourceId: { in: ownerIds } }],
      },
      select: {
        staffId: true,
        resourceId: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true,
        isActive: true,
      },
    });
  }

  async findTimeOffs(userId: string, ownerIds: string[], windowStart: Date, windowEnd: Date) {
    if (ownerIds.length === 0) return [];
    return this.prisma.timeOff.findMany({
      where: {
        userId,
        OR: [{ staffId: { in: ownerIds } }, { resourceId: { in: ownerIds } }],
        startDate: { lt: windowEnd },
        endDate: { gt: windowStart },
      },
      select: { staffId: true, resourceId: true, startDate: true, endDate: true },
    });
  }

  async findBreaks(userId: string, ownerIds: string[]) {
    if (ownerIds.length === 0) return [];
    return this.prisma.break.findMany({
      where: {
        userId,
        OR: [{ staffId: { in: ownerIds } }, { resourceId: { in: ownerIds } }],
      },
      select: { staffId: true, resourceId: true, dayOfWeek: true, startTime: true, endTime: true },
    });
  }

  async businessTimezone(userId: string): Promise<string> {
    const profile = await this.prisma.businessProfile.findUnique({
      where: { userId },
      select: { timezone: true },
    });
    return profile?.timezone || "Asia/Kolkata";
  }
}
