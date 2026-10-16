import { IncomingMessage } from "./message";
import { ConversationState } from "./conversationState";
import { LLMResponse } from "./llm";
import { ChannelSender } from "./channel";
import { MenuEntry } from "./handler";

export interface WorkflowContext {
  message: IncomingMessage;
  llm?: LLMResponse;
  state?: ConversationState;
  /**
   * The reply channel for this conversation. The property name is
   * historical — it carries a WhatsAppService OR an InstagramService,
   * both behind the ChannelSender interface, so handlers stay untouched.
   */
  whatsapp: ChannelSender;
  /** Menu entries filtered to the business's enabled modules (fresh flows). */
  menu?: MenuEntry[];
  /** Resolved business display name (fresh flows). */
  businessName?: string;
  customer?: {
    id: string;
    name: string;
  };
}
