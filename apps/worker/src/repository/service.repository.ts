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
        name: {
          contains: query,
          mode: "insensitive",
        },
      },
    });
  }
}
