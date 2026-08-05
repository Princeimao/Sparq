import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/prisma/client";

export { PrismaClient, PrismaPg };
export type {
  ConversationState,
  Customer,
  Order,
  $Enums,
} from "./generated/prisma/client";
export * from "./generated/prisma/enums";
