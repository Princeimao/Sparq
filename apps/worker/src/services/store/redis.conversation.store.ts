import { redis } from "../../config/redis";
import { ConversationState } from "../../types/conversationState";
import { ConversationStore } from "./conversation.store";

const TTL_SECONDS = 60 * 60; // 1 hour

export class RedisConversationStore implements ConversationStore {
  private key(key: string) {
    return `sparq:conversation:${key}`;
  }

  async get(key: string): Promise<ConversationState | null> {
    const raw = await redis.get(this.key(key));
    if (!raw) return null;

    try {
      const state = JSON.parse(raw) as ConversationState;
      if (state.expiresAt && state.expiresAt < Date.now()) {
        await this.delete(key);
        return null;
      }
      return state;
    } catch {
      await this.delete(key);
      return null;
    }
  }

  async set(key: string, state: ConversationState): Promise<void> {
    await redis.set(this.key(key), JSON.stringify(state), "EX", TTL_SECONDS);
  }

  async delete(key: string): Promise<void> {
    await redis.del(this.key(key));
  }
}
