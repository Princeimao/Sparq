import { IncomingMessage } from "../types/message";
import { WorkflowRegistry } from "./workflow.registry";
import { ConversationStore } from "../services/store/conversation.store";
import { ConversationState } from "../types/conversationState";

export class WorkflowEngine {
  constructor(
    private conversationStore: ConversationStore,
    private llmService: LlmService,
    private registry: WorkflowRegistry,
  ) {}

  async process(message: IncomingMessage) {
    const key = `${message.phoneNumberId}:${message.customerWaId}`;

    const state = await this.conversationStore.get(key);

    if (state) {
      return this.resumeConversation(message, state);
    }

    return this.startConversation(message);
  }

  private async startConversation(message: IncomingMessage) {
    const llm = await this.llmService.parseIntent(message.text);

    const handler = this.registry.get(llm.intent);

    if (!handler) {
      throw new Error("Handler not found");
    }

    return handler.start({
      message,

      llm,
    });
  }

  private async resumeConversation(
    message: IncomingMessage,
    state: ConversationState,
  ) {
    const handler = this.registry.get(state.intent);

    if (!handler) {
      throw new Error("Handler not found");
    }

    return handler.resume({
      message,

      state,
    });
  }
}
