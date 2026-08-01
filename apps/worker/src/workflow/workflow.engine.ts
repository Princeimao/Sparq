import { IncomingMessage } from "../types/message";
import { WorkflowRegistry } from "./workflow.registry";
import { ConversationStore } from "../services/store/conversation.store";
import { ConversationState } from "../types/conversationState";
import { LlmService } from "../services/llm.service";
import { Intent } from "../types/intent";
import { WhatsAppService } from "../services/whatsapp.service";

export class WorkflowEngine {
  constructor(
    private conversationStore: ConversationStore,
    private llmService: LlmService,
    private registry: WorkflowRegistry,
  ) {}

  async process(message: IncomingMessage, whatsapp: WhatsAppService) {
    const key = this.conversationKey(message);

    const state = await this.conversationStore.get(key);

    if (state) {
      return this.resumeConversation(message, state, whatsapp);
    }

    return this.startConversation(message, whatsapp);
  }

  private conversationKey(message: IncomingMessage) {
    return `${message.phoneNumberId}:${message.customerWaId}`;
  }

  private async startConversation(
    message: IncomingMessage,
    whatsapp: WhatsAppService,
  ) {
    const llm = await this.llmService.parseIntent(message.text);

    if (llm.intent === Intent.GREETING) {
      await whatsapp.sendTextMessage(
        `Hi${message.customerName ? ` ${message.customerName}` : ""}! 👋\n\nI can help you:\n• Order products\n• Book appointments\n• Reserve a table\n\nJust tell me what you'd like to do!`,
      );
      return;
    }

    if (llm.intent === Intent.HELP) {
      await whatsapp.sendTextMessage(
        "Here's what I can help with:\n\n🛒 *Order products* — say \"I want to order oats\"\n📅 *Book appointment* — say \"book a haircut\"\n🍽️ *Reserve table* — say \"reserve a table for 4\"\n📦 *Track order* — say \"order status\"\n\nHow can I assist you?",
      );
      return;
    }

    if (llm.intent === Intent.UNKNOWN) {
      await whatsapp.sendTextMessage(
        "I'm not sure I understood that. You can order products, book appointments, or reserve a table. How can I help?",
      );
      return;
    }

    const handler = this.registry.get(llm.intent);

    if (!handler) {
      await whatsapp.sendTextMessage(
        "Sorry, that feature isn't available yet. Please try ordering a product or booking an appointment.",
      );
      return;
    }

    return handler.start({ message, llm, whatsapp });
  }

  private async resumeConversation(
    message: IncomingMessage,
    state: ConversationState,
    whatsapp: WhatsAppService,
  ) {
    const handler = this.registry.get(state.intent);

    if (!handler) {
      await this.conversationStore.delete(this.conversationKey(message));
      await whatsapp.sendTextMessage(
        "Your previous session expired. Please start again.",
      );
      return;
    }

    return handler.resume({ message, state, whatsapp });
  }
}
