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
}
