import { BaseRepository } from "./base.repository";

export class ProductRepository extends BaseRepository {
  async search(phoneNumberId: string, query: string, limit = 5) {
    return this.prisma.product.findMany({
      take: limit,
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

  async findById(id: string) {
    return this.prisma.product.findUnique({
      where: { id },
    });
  }
}
