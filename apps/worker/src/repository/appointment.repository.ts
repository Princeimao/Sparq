import { Prisma } from "@sparq/database/src/generated/prisma/client";
import { BaseRepository } from "./base.repository";

export class AppointmentRepository extends BaseRepository {
  async create(data: Prisma.AppointmentCreateInput) {
    return this.prisma.appointment.create({
      data,
    });
  }
}
