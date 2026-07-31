import { PrismaClient } from "@sparq/database";
import { prisma } from "../config/prisma";

export abstract class BaseRepository {
  protected prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }
}
