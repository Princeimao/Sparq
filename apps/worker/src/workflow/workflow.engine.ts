import { IncomingMessage } from "../types/message";
import { WorkflowRegistry } from "./workflow.registry";
import { ConversationStore } from "../services/store/conversation.store";
import { ConversationState } from "../types/conversationState";
import { LlmService } from "../services/llm.service";
import { Intent } from "../types/intent";
import { WhatsAppService } from "../services/whatsapp.service";
import { MessageRouter } from "../services/message.router";
import { GreetingHandler } from "./greeting/greeting.handler";

/**
 * WorkflowEngine — the central message dispatcher.
 *
 * Processing order (optimised for speed and correctness):
 * 1. If a conversation is already in-progress → resume it (no LLM needed)
 * 2. Handle hard-coded menu button IDs (MENU_ORDER, MENU_BOOK, etc.)
 * 3. Try the fast keyword MessageRouter (no API call)
 * 4. Fall back to LLM intent classification for ambiguous messages
 */
export class WorkflowEngine {
  private readonly router = new MessageRouter();
  private readonly greetingHandler = new GreetingHandler();

  constructor(
    private conversationStore: ConversationStore,
    private llmService: LlmService,
    private registry: WorkflowRegistry,
  ) {}

  // ─── Main entry ─────────────────────────────────────────────────────────────

  async process(message: IncomingMessage, whatsapp: WhatsAppService) {
    const key = this.conversationKey(message);
    const state = await this.conversationStore.get(key);

    // ── 1. Resume in-progress conversation ──
    if (state) {
      return this.resumeConversation(message, state, whatsapp);
    }

    // ── 2. Menu button shortcuts (interactive button_reply from greeting) ──
    if (message.messageType === "interactive" || message.messageType === "button") {
      const id = message.interactiveId?.toUpperCase();
      if (id === "MENU_ORDER") {
        return this.dispatchIntent(Intent.ORDER_PRODUCT, message, whatsapp, null);
      }
      if (id === "MENU_BOOK") {
        return this.dispatchIntent(Intent.BOOK_APPOINTMENT, message, whatsapp, null);
      }
      if (id === "MENU_RESERVE") {
        return this.dispatchIntent(Intent.RESERVE_TABLE, message, whatsapp, null);
      }
    }

    // ── 3. Fast keyword router ──
    const keywordResult = this.router.route(message.text);

    if (keywordResult && keywordResult.confidence >= 0.85) {
      console.log(
        `[Engine] Keyword route: ${keywordResult.intent} (${(keywordResult.confidence * 100).toFixed(0)}%)`
      );
      return this.dispatchIntent(keywordResult.intent, message, whatsapp, null);
    }

    // ── 4. LLM classification for ambiguous messages ──
    console.log(`[Engine] Invoking LLM for: "${message.text.slice(0, 60)}"`);
    const llm = await this.llmService.parseIntent(message.text);

    console.log(`[Engine] LLM intent: ${llm.intent} (${(llm.confidence * 100).toFixed(0)}%)`);
    return this.dispatchIntent(llm.intent, message, whatsapp, llm);
  }

  // ─── Dispatch ────────────────────────────────────────────────────────────────

  private async dispatchIntent(
    intent: Intent,
    message: IncomingMessage,
    whatsapp: WhatsAppService,
    llm: any,
  ) {
    switch (intent) {
      case Intent.GREETING:
        return this.greetingHandler.handle(message, whatsapp);

      case Intent.GOODBYE:
        return whatsapp.sendTextMessage(
          `Thanks for reaching out! Have a great day 😊\n\nType *hi* anytime to start again.`
        );

      case Intent.HELP:
        return this.sendHelpMenu(message, whatsapp);

      case Intent.UNKNOWN:
      case Intent.GENERAL_INQUIRY:
        return this.sendUnknownResponse(message, whatsapp);

      default: {
        const handler = this.registry.get(intent);
        if (!handler) {
          return whatsapp.sendTextMessage(
            `Sorry, I can't handle that yet. Type *help* to see what I can do!`
          );
        }
        return handler.start({ message, llm, whatsapp });
      }
    }
  }

  // ─── Resume ─────────────────────────────────────────────────────────────────

  private async resumeConversation(
    message: IncomingMessage,
    state: ConversationState,
    whatsapp: WhatsAppService,
  ) {
    const handler = this.registry.get(state.intent);

    if (!handler) {
      await this.conversationStore.delete(this.conversationKey(message));
      await whatsapp.sendTextMessage(
        "Your previous session couldn't be resumed. Please start again."
      );
      return;
    }

    return handler.resume({ message, state, whatsapp });
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private conversationKey(message: IncomingMessage) {
    return `${message.phoneNumberId}:${message.customerWaId}`;
  }

  private async sendHelpMenu(message: IncomingMessage, whatsapp: WhatsAppService) {
    try {
      await whatsapp.sendInteractiveButtons({
        to: message.customerWaId,
        bodyText:
          "Here's what I can help with:\n\n" +
          "🛒 *Order Products* — order anything from our catalog\n" +
          "📅 *Book Appointment* — schedule a service or consultation\n" +
          "🍽️ *Reservations* — reserve a table, room, or space",
        footerText: "Tap a button or type your request",
        buttons: [
          { type: "reply", reply: { id: "MENU_ORDER", title: "🛒 Order Products" } },
          { type: "reply", reply: { id: "MENU_BOOK", title: "📅 Book Appointment" } },
          { type: "reply", reply: { id: "MENU_RESERVE", title: "🍽️ Reservations" } },
        ],
      });
    } catch {
      await whatsapp.sendTextMessage(
        "Here's what I can help with:\n\n" +
        "🛒 *Order Products* — type \"order\"\n" +
        "📅 *Book Appointment* — type \"book\"\n" +
        "🍽️ *Reserve Table/Room* — type \"reserve\""
      );
    }
  }

  private async sendUnknownResponse(message: IncomingMessage, whatsapp: WhatsAppService) {
    await whatsapp.sendTextMessage(
      `I didn't quite get that 🤔\n\n` +
      `You can:\n` +
      `• Type *order* to buy something\n` +
      `• Type *book* to schedule an appointment\n` +
      `• Type *reserve* to book a table or room\n` +
      `• Type *help* to see the menu`
    );
  }
}
