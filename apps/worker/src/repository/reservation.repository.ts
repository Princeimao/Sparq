import { BaseRepository } from "./base.repository";

export class ReservationRepository extends BaseRepository {
  async findAvailableSlots(userId: string) {
    try {
      return await (this.prisma as any).reservationSlot.findMany({
        where: {
          userId,
          isActive: true,
        },
      });
    } catch {
      return [];
    }
  }

  async findSlotById(slotId: string) {
    try {
      return await (this.prisma as any).reservationSlot.findUnique({
        where: { id: slotId },
      });
    } catch {
      return null;
    }
  }

  async createBooking(data: {
    userId: string;
    slotId: string;
    customerName: string;
    customerPhone?: string;
    customerEmail?: string;
    startDate: Date;
    endDate: Date;
    guestCount?: number;
    specialRequests?: string;
    totalAmount?: number;
  }) {
    try {
      return await (this.prisma as any).reservationBooking.create({
        data: {
          userId: data.userId,
          slotId: data.slotId,
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          customerEmail: data.customerEmail,
          startDate: data.startDate,
          endDate: data.endDate,
          guestCount: data.guestCount,
          specialRequests: data.specialRequests,
          totalAmount: data.totalAmount,
          status: "PENDING",
        },
      });
    } catch (err) {
      console.error("[ReservationRepository] Error creating booking:", err);
      return null;
    }
  }
}
