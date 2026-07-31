import { IncomingMessage } from "../types/message";
import { ConversationState } from "../types/conversationState";
import { LLMResponse } from "../types/llm";

export interface WorkflowContext {
  message: IncomingMessage;
  state?: ConversationState;
  llm?: LLMResponse;
}
