import { ConversationState } from "../../types/conversationState";

export interface ConversationStore {
  get(key: string): Promise<ConversationState | null>;
  set(key: string, state: ConversationState): Promise<void>;
  delete(key: string): Promise<void>;
}
