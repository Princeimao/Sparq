import { Intent } from "../types/intent";

/**
 * Fast keyword-based message router.
 *
 * Runs synchronously BEFORE the LLM, so simple messages like "hi" or
 * "order oats" are handled instantly without an API round-trip.
 *
 * Returns `null` when the message is ambiguous and the LLM is needed.
 *
 * Design goals:
 * - O(1) / O(n) per message — no async calls
 * - Easy to extend: add new intent blocks without touching the engine
 * - Falls through to LLM for anything uncertain
 */

// ─── Keyword map ─────────────────────────────────────────────────────────────

const GREETING_WORDS = new Set([
  "hi", "hello", "hey", "hii", "hiii", "hy", "hyy", "hola",
  "namaste", "namaskar", "salaam", "salam", "assalamu", "assalamualaikum",
  "good morning", "good afternoon", "good evening", "good night",
  "morning", "afternoon", "evening", "yo", "sup", "what's up", "whats up",
  "howdy", "greetings", "welcome",
]);

const HELP_WORDS = new Set([
  "help", "menu", "options", "what can you do", "what can i do",
  "services", "how does this work", "how it works", "commands",
]);

const ORDER_KEYWORDS = [
  "order", "buy", "purchase", "want to order", "i want", "i need",
  "add to cart", "get me", "deliver", "delivery",
];

const APPOINTMENT_KEYWORDS = [
  "appointment", "book", "schedule", "haircut", "doctor", "consult",
  "meeting", "slot", "session", "booking", "checkup", "check-up",
];

const RESERVATION_KEYWORDS = [
  "reserve", "reservation", "table", "room", "check in", "check-in",
  "hotel", "restaurant", "seat", "seats", "dine", "dinner",
  "lunch", "breakfast", "night stay",
];

const STATUS_KEYWORDS = [
  "status", "track", "tracking", "where is my order", "order status",
  "my order",
];

const CANCEL_KEYWORDS = [
  "cancel", "cancellation", "cancel order", "cancel appointment",
  "cancel reservation",
];

const GOODBYE_WORDS = new Set([
  "bye", "goodbye", "good bye", "see you", "later", "cya", "take care",
  "thank you", "thanks", "ok", "okay", "done", "that's all",
]);

// ─── Router ─────────────────────────────────────────────────────────────────

export interface RouterResult {
  intent: Intent;
  confidence: number;
  /** Method used: "keyword" = instant, "llm" = needs LLM */
  method: "keyword" | "llm";
}

export class MessageRouter {
  /**
   * Attempt to classify the message using only keywords.
   * Returns null if the message is too ambiguous — the caller should then
   * invoke the LLM.
   */
  route(rawText: string): RouterResult | null {
    const text = rawText.trim().toLowerCase();

    if (!text) return null;

    // ── Exact-word greeting check (highest priority) ──
    if (GREETING_WORDS.has(text)) {
      return { intent: Intent.GREETING, confidence: 1.0, method: "keyword" };
    }

    // ── Goodbye ──
    if (GOODBYE_WORDS.has(text)) {
      return { intent: Intent.GOODBYE, confidence: 1.0, method: "keyword" };
    }

    // ── Help ──
    if (HELP_WORDS.has(text) || this.matchesAny(text, [...HELP_WORDS])) {
      return { intent: Intent.HELP, confidence: 0.95, method: "keyword" };
    }

    // ── Status ──
    if (this.matchesAny(text, STATUS_KEYWORDS)) {
      return { intent: Intent.ORDER_STATUS, confidence: 0.9, method: "keyword" };
    }

    // ── Cancel ──
    if (this.matchesAny(text, CANCEL_KEYWORDS)) {
      return { intent: Intent.CANCEL_ORDER, confidence: 0.85, method: "keyword" };
    }

    // ── For multi-keyword intents, score them ──
    const orderScore = this.scoreKeywords(text, ORDER_KEYWORDS);
    const apptScore = this.scoreKeywords(text, APPOINTMENT_KEYWORDS);
    const resScore = this.scoreKeywords(text, RESERVATION_KEYWORDS);

    const maxScore = Math.max(orderScore, apptScore, resScore);

    // If there's a clear winner with high confidence, classify now
    if (maxScore >= 0.7) {
      if (orderScore === maxScore) {
        return { intent: Intent.ORDER_PRODUCT, confidence: orderScore, method: "keyword" };
      }
      if (apptScore === maxScore) {
        return { intent: Intent.BOOK_APPOINTMENT, confidence: apptScore, method: "keyword" };
      }
      if (resScore === maxScore) {
        return { intent: Intent.RESERVE_TABLE, confidence: resScore, method: "keyword" };
      }
    }

    // Ambiguous → caller should use LLM
    return null;
  }

  private matchesAny(text: string, keywords: string[]): boolean {
    return keywords.some((kw) => text.includes(kw));
  }

  private scoreKeywords(text: string, keywords: string[]): number {
    const matched = keywords.filter((kw) => text.includes(kw));
    if (matched.length === 0) return 0;
    // Score based on # of matches and whether a longer keyword matched
    const longestMatch = Math.max(...matched.map((k) => k.length));
    return Math.min(0.95, 0.5 + matched.length * 0.15 + longestMatch * 0.01);
  }
}
