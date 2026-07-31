import { IncomingMessage } from "./message";
import { ConversationState } from "./conversationState";
import { LLMResponse } from "./llm";

export interface WorkflowContext {
  message: IncomingMessage;

  llm?: LLMResponse;

  state?: ConversationState;

  customer?: {
    id: string;
    name: string;
  };
}
