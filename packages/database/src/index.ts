import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

export { PrismaClient, PrismaPg };
export type { ConversationState, Customer, Order } from "./generated/prisma/client";
export type { ConversationStep } from "./generated/prisma/enums";
