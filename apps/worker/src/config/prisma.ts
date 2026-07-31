import { PrismaClient, PrismaPg } from "@sparq/database";
import { env } from "./env";

const connectionString = env.DATABASE_URL

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export { prisma };