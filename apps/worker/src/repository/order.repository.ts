import { Prisma } from "@sparq/database/src/generated/prisma/client";
import { BaseRepository } from "./base.repository";

export class OrderRepository extends BaseRepository {
  async create(data: Prisma.OrderCreateInput) {
    return this.prisma.order.create({
      data,
    });
  }

  async findById(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
    });
  }

  async findByCustomer(customerId: string) {
    return this.prisma.order.findMany({
      where: {
        customerId,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async updatePaymentLink(id: string, paymentLink: string) {
    return this.prisma.order.update({
      where: { id },
      data: { paymentLink },
    });
  }

  async updateStatus(id: string, status: "PENDING" | "PAID" | "COMPLETED" | "CANCELLED") {
    return this.prisma.order.update({
      where: { id },
      data: { status },
    });
  }
}
