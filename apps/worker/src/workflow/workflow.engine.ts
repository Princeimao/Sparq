import { IncomingMessage } from "../types/message";
import { WorkflowRegistry } from "./workflow.registry";
import { ConversationStore } from "../services/store/conversation.store";
import { ConversationState } from "../types/conversationState";
import { LlmService } from "../services/llm.service";
import { Intent } from "../types/intent";
import { WhatsAppService } from "../services/whatsapp.service";
import { MessageRouter } from "../services/message.router";
import { getBusinessCapabilities } from "../services/business-capabilities";

/**
 * WorkflowEngine — the central message dispatcher.
 *
 * Routing, module gating, menu buttons and help text all come from the
 * WorkflowRegistry (which reads handler metadata). This class owns only the
 * processing pipeline, so new flows never require changes here:
 * 1. If a conversation is already in-progress → resume it (no LLM needed)
 * 2. Map menu button IDs to intents via the registry
 * 3. Try the fast keyword MessageRouter (no API call)
 * 4. Fall back to LLM intent classification for ambiguous messages
 */
export class WorkflowEngine {
  private readonly router = new MessageRouter();

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

    // ── 2. Menu button shortcuts (interactive button_reply) ──
    if (message.messageType === "interactive" || message.messageType === "button") {
      const intent = this.registry.resolveButton(message.interactiveId ?? "");
      if (intent) {
        return this.dispatchIntent(intent, message, whatsapp, null);
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
    const caps = await getBusinessCapabilities(message.userId);

    // Module gate: don't run flows the business hasn't enabled.
    const module = this.registry.moduleFor(intent);
    if (module && !caps.enabledModules.has(module)) {
      return whatsapp.sendTextMessage(
        `Sorry, ${caps.businessName} doesn't offer that right now. Type *help* to see what I can help with! 😊`,
      );
    }

    const handler = this.registry.get(intent);
    if (!handler) {
      return whatsapp.sendTextMessage(
        `Sorry, I can't handle that yet. Type *help* to see what I can do!`
      );
    }

    const menu = this.registry
      .menuEntries()
      .filter((entry) => caps.enabledModules.has(entry.module));

    return handler.start({
      message,
      llm,
      whatsapp,
      menu,
      businessName: caps.businessName,
    });
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
}
