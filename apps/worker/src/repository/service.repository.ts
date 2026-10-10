import { BaseRepository } from "./base.repository";

export class ServiceRepository extends BaseRepository {
  async search(phoneNumberId: string, query: string) {
    return this.prisma.service.findMany({
      where: {
        user: {
          whatsappIntegrations: {
            phoneNumberId,
          },
        },
        ...(query
          ? {
              name: {
                contains: query,
                mode: "insensitive",
              },
            }
          : {}),
      },
      orderBy: { name: "asc" },
      take: 10,
    });
  }

  async findById(id: string) {
    return this.prisma.service.findUnique({
      where: { id },
    });
  }

  async findByIdWithStaff(id: string) {
    return this.prisma.service.findUnique({
      where: { id },
      include: {
        staff: {
          where: { isActive: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        },
      },
    });
  }

  /** The business's table-booking offering, if one is configured. */
  async findTableService(userId: string) {
    return this.prisma.service.findFirst({
      where: { userId, requiresPartySize: true },
      orderBy: { createdAt: "asc" },
      include: {
        resourceLinks: {
          include: {
            resource: {
              select: { id: true, name: true, capacity: true, isActive: true },
            },
          },
        },
      },
    });
  }

  /** Full offering config: staff + eligible resources for allocation. */
  async findBookingConfig(id: string) {
    return this.prisma.service.findUnique({
      where: { id },
      include: {
        staff: {
          where: { isActive: true },
          select: { id: true, name: true, isActive: true },
          orderBy: { name: "asc" },
        },
        resourceLinks: {
          include: {
            resource: {
              select: { id: true, name: true, kind: true, capacity: true, isActive: true },
            },
          },
        },
      },
    });
  }
}
