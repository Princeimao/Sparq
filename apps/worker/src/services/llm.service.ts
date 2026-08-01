import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import { env } from "../config/env";
import { intentClassificationPrompt } from "../templets/systemPrompt";
import { intentClassificationPrompt as fullIntentPrompt } from "../templets/intentPrompt";
import { Intent } from "../types/intent";
import { LLMResponse } from "../types/llm";

function extractJson(content: string): unknown {
  const cleaned = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return JSON.parse(cleaned);
}

export function sanitizeInputForLlm(text: string): string {
  if (!text) return "";

  let sanitized = text;
  sanitized = sanitized.replace(
    /(\+?\d{1,4}[\s-]?)?(\d{10,15})/g,
    "[PHONE_MASKED]",
  );
  sanitized = sanitized.replace(/\b[a-zA-Z0-9_-]{15,}\b/g, "[ID_MASKED]");
  sanitized = sanitized.replace(
    /(eaao|ghs|token|key|secret)[a-zA-Z0-9_]+/gi,
    "[TOKEN_MASKED]",
  );

  return sanitized;
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

const ExtractedEntitiesSchema = z.object({
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

const IntentParseSchema = z.object({
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

export class LlmService {
  private model: ChatGoogleGenerativeAI;

  constructor() {
    const apiKey =
      env.GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      console.warn(
        "WARNING: GEMINI_API_KEY is not set. Langchain Gemini LLM calls may fail.",
      );
    }

    this.model = new ChatGoogleGenerativeAI({
      apiKey: apiKey,
      model: "gemini-2.5-flash",
      maxOutputTokens: 512,
      temperature: 0,
    });
  }

  async findProduct(message: string): Promise<ProductSearch> {
    try {
      console.log("SENDING TO LLM", message);
      const response = await this.model.invoke([
        { role: "system", content: intentClassificationPrompt },
        { role: "user", content: message },
      ]);

      const parsed = extractJson(response.content as string);
      const validated = ProductSearchSchema.parse(parsed);
      console.log("parsed", validated);
      return validated;
    } catch (error) {
      console.error("Error during LLM product search:", error);
      return {
        intent: "ERROR",
        productQuery: null,
        quantity: null,
        headerMessage: "",
        footerMessage: "",
        actionText: "",
        type: "",
        title: "",
      };
    }
  }

  async parseIntent(message: string): Promise<LLMResponse> {
    try {
      const response = await this.model.invoke([
        { role: "system", content: fullIntentPrompt },
        { role: "user", content: sanitizeInputForLlm(message) },
      ]);

      const parsed = extractJson(response.content as string);
      const validated = IntentParseSchema.parse(parsed);

      return {
        intent: validated.intent as Intent,
        confidence: validated.confidence,
        needsSelection: validated.needsSelection,
        entities: {
          productQuery: validated.entities.productQuery ?? undefined,
          serviceQuery: validated.entities.serviceQuery ?? undefined,
          quantity: validated.entities.quantity ?? undefined,
          date: validated.entities.date ?? undefined,
          time: validated.entities.time ?? undefined,
          timeOfDay: validated.entities.timeOfDay ?? undefined,
          partySize: validated.entities.partySize ?? undefined,
          customerName: validated.entities.customerName ?? undefined,
          phone: validated.entities.phone ?? undefined,
          address: validated.entities.address ?? undefined,
          notes: validated.entities.notes ?? undefined,
        },
      };
    } catch (error) {
      console.error("Error during LLM intent parsing:", error);
      return {
        intent: Intent.UNKNOWN,
        confidence: 0,
        needsSelection: false,
        entities: {},
      };
    }
  }

  async analyzeMessage(rawMessageText: string): Promise<LlmTaskAnalysis> {
    const sanitizedText = sanitizeInputForLlm(rawMessageText);
    const structuredModel = this.model.withStructuredOutput(
      LlmTaskAnalysisSchema,
    );
    const systemPrompt = `You are an AI assistant helping to parse and understand customer responses for a conversational reordering bot.
Analyze the user's message and determine the customer's intent, the product name (if they want to place an order), and the address (if they are providing an address).

CRITICAL:
- Do not mention or search for credentials.
- Classify the intent accurately:
  * "ORDER": User wants to purchase/buy/order something (e.g. "order chocolate oats", "can you send me the last oats order").
  * "PROVIDE_ADDRESS": User is providing a delivery address (e.g., "123 Main St, Apt 4B, New York", "deliver it to sector 45").
  * "CONFIRM": User is confirming or saying yes (e.g., "yes", "sure", "correct", "yep").
  * "DECLINE": User is declining or saying no (e.g., "no", "cancel", "stop", "no thanks").
  * "OTHER": Anything else.

Customer Message: "${sanitizedText}"`;

    try {
      const response = await structuredModel.invoke([
        { role: "system", content: "You are a helpful structured extractor." },
        { role: "user", content: systemPrompt },
      ]);

      return response;
    } catch (error) {
      console.error("Error during LLM message analysis:", error);
      return {
        intent: "OTHER",
      };
    }
  }
}

export const llmService = new LlmService();
