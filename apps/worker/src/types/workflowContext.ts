import { IncomingMessage } from "./message";
import { ConversationState } from "./conversationState";
import { LLMResponse } from "./llm";
import { WhatsAppService } from "../services/whatsapp.service";
import { MenuEntry } from "./handler";

export interface WorkflowContext {
  message: IncomingMessage;
  llm?: LLMResponse;
  state?: ConversationState;
  whatsapp: WhatsAppService;
  /** Menu entries filtered to the business's enabled modules (fresh flows). */
  menu?: MenuEntry[];
  /** Resolved business display name (fresh flows). */
  businessName?: string;
  customer?: {
    id: string;
    name: string;
  };
}
