import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { z } from "zod";
import { env } from "../config/env";
import { intentClassificationPrompt as fullIntentPrompt } from "../templets/intentPrompt";
import { Intent } from "../types/intent";
import { LLMResponse } from "../types/llm";
import { getSystemPrompt } from "../templets/messagePrompt";
import {
  extractJson,
  IntentParseSchema,
  LlmTaskAnalysis,
  LlmTaskAnalysisSchema,
  ProductSearch,
  ProductSearchSchema,
} from "../schema/llm.schema";

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
        { role: "system", content: fullIntentPrompt },
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
      console.log("SENDING TO LLM", message);
      const response = await this.model.invoke([
        { role: "system", content: fullIntentPrompt },
        { role: "user", content: message },
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

  // async analyzeMessage(rawMessageText: string): Promise<LlmTaskAnalysis> {
  //   const sanitizedText = sanitizeInputForLlm(rawMessageText);
  //   const structuredModel = this.model.withStructuredOutput(
  //     LlmTaskAnalysisSchema,
  //   );
  //   const systemPrompt = getSystemPrompt(sanitizedText);

  //   try {
  //     const response = await structuredModel.invoke([
  //       { role: "system", content: "You are a helpful structured extractor." },
  //       { role: "user", content: systemPrompt },
  //     ]);

  //     return response;
  //   } catch (error) {
  //     console.error("Error during LLM message analysis:", error);
  //     return {
  //       intent: "OTHER",
  //     };
  //   }
  // }
}

export const llmService = new LlmService();
