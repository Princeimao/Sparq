import { z } from "zod";

export function extractJson(content: string): unknown {
  const cleaned = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return JSON.parse(cleaned);
}

export const LlmTaskAnalysisSchema = z.object({
  intent: z
    .enum(["ORDER", "PROVIDE_ADDRESS", "CONFIRM", "DECLINE", "OTHER"])
    .describe(
      "The classified intent of the user's message. ORDER is for ordering a product. PROVIDE_ADDRESS is for sharing location/address details. CONFIRM/DECLINE are for yes/no actions. OTHER is for general queries.",
    ),
  productName: z
    .string()
    .optional()
    .describe(
      "The product name extracted from the message if the user is attempting to place an order (e.g., 'chocolate oats').",
    ),
  address: z
    .string()
    .optional()
    .describe(
      "The delivery/shipping address extracted from the message if the user is sharing an address.",
    ),
});

export const ProductSearchSchema = z.object({
  intent: z
    .enum(["ORDER_PRODUCT", "OTHER", "ERROR"])
    .describe(
      "The classified intent of the user's message. ORDER_PRODUCT is for ordering a product. OTHER is for general queries.",
    ),
  productQuery: z
    .string()
    .nullable()
    .describe(
      "The product name extracted from the message if the user is attempting to place an order (e.g., 'chocolate oats').",
    ),
  quantity: z
    .number()
    .nullable()
    .describe(
      "The quantity of the product extracted from the message if the user is attempting to place an order (e.g., '2').",
    ),
  headerMessage: z
    .string()
    .describe("The header message for the interactive buttons."),
  footerMessage: z
    .string()
    .describe("The footer message for the interactive buttons."),
  actionText: z.string().describe("The text for the action button."),
  type: z.string().describe("The type of interactive list."),
  title: z.string().describe("The title for the interactive list."),
});

export type LlmTaskAnalysis = z.infer<typeof LlmTaskAnalysisSchema>;
export type ProductSearch = z.infer<typeof ProductSearchSchema>;

export const ExtractedEntitiesSchema = z.object({
  productQuery: z.string().nullable().optional(),
  serviceQuery: z.string().nullable().optional(),
  quantity: z.number().nullable().optional(),
  date: z.string().nullable().optional(),
  time: z.string().nullable().optional(),
  timeOfDay: z.string().nullable().optional(),
  partySize: z.number().nullable().optional(),
  customerName: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export const IntentParseSchema = z.object({
  intent: z.enum([
    "ORDER_PRODUCT",
    "BOOK_APPOINTMENT",
    "RESERVE_TABLE",
    "ORDER_STATUS",
    "CANCEL_ORDER",
    "GREETING",
    "HELP",
    "UNKNOWN",
  ]),
  confidence: z.number().min(0).max(1),
  needsSelection: z.boolean(),
  entities: ExtractedEntitiesSchema,
});
