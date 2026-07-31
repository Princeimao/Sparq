import { Prisma } from "@sparq/database/src/generated/prisma/client";
import { BaseRepository } from "./base.repository";

export class CustomerRepository extends BaseRepository {
  async findByPhone(phone: string, phoneNumberId: string) {
    return this.prisma.customer.findFirst({
      where: {
        phone,
        user: {
          whatsappIntegrations: {
            phoneNumberId,
          },
        },
      },
    });
  }

  async create(data: Prisma.CustomerCreateInput) {
    return this.prisma.customer.create({
      data,
    });
  }

  async update(id: string, data: any) {
    return this.prisma.customer.update({
      where: { id },
      data,
    });
  }
}
