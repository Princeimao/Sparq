import { IncomingMessage } from "./message";
import { ConversationState } from "./conversationState";
import { LLMResponse } from "./llm";
import { WhatsAppService } from "../services/whatsapp.service";

export interface WorkflowContext {
  message: IncomingMessage;
  llm?: LLMResponse;
  state?: ConversationState;
  whatsapp: WhatsAppService;
  customer?: {
    id: string;
    name: string;
  };
}
