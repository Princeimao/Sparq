import { Prisma } from "@sparq/database/src/generated/prisma/client";
import { BaseRepository } from "./base.repository";

export class OrderRepository extends BaseRepository {
  async create(data: Prisma.OrderCreateInput) {
    return this.prisma.order.create({
      data,
    });
  }

  async findByCustomer(customerId: string) {
    return this.prisma.order.findMany({
      where: {
        customerId,
      },
    });
  }
}
