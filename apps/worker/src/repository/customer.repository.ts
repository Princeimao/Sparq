import { Prisma } from "@sparq/database/src/generated/prisma/client";
import { BaseRepository } from "./base.repository";

export class CustomerRepository extends BaseRepository {
  // ─── Find ──────────────────────────────────────────────────────────────────

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

  async findById(id: string) {
    return this.prisma.customer.findUnique({
      where: { id },
    });
  }

  // ─── Find or Create ────────────────────────────────────────────────────────

  /**
   * Finds an existing customer by phone+userId or creates one if not found.
   */
  async findOrCreate(params: {
    phone: string;
    name?: string;
    phoneNumberId: string;
    userId: string;
  }) {
    const existing = await this.prisma.customer.findFirst({
      where: {
        phone: params.phone,
        userId: params.userId,
      },
    });

    if (existing) return existing;

    return this.prisma.customer.create({
      data: {
        phone: params.phone,
        name: params.name,
        userId: params.userId,
      },
    });
  }

  // ─── Create / Update ──────────────────────────────────────────────────────

  async create(data: Prisma.CustomerCreateInput) {
    return this.prisma.customer.create({
      data,
    });
  }

  async update(id: string, data: Partial<Prisma.CustomerUpdateInput>) {
    return this.prisma.customer.update({
      where: { id },
      data,
    });
  }

  // ─── Addresses ────────────────────────────────────────────────────────────

  async getAddresses(customerId: string) {
    return this.prisma.address.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
    });
  }

  async createAddress(
    customerId: string,
    params: {
      line1: string;
      line2?: string;
      city: string;
      state: string;
      pincode: string;
      country?: string;
    },
  ) {
    return this.prisma.address.create({
      data: {
        customerId,
        line1: params.line1,
        line2: params.line2,
        city: params.city,
        state: params.state,
        pincode: params.pincode,
        country: params.country ?? "India",
      },
    });
  }
}
