import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { MessageRouter } from "./message.router.js";
import { Intent } from "../types/intent.js";

const router = new MessageRouter();

describe("message router", () => {
  it("routes greetings and farewells", () => {
    assert.equal(router.route("hi")?.intent, Intent.GREETING);
    assert.equal(router.route("namaste")?.intent, Intent.GREETING);
    assert.equal(router.route("thanks")?.intent, Intent.GOODBYE);
  });

  it("routes help", () => {
    assert.equal(router.route("help")?.intent, Intent.HELP);
    assert.equal(router.route("menu")?.intent, Intent.HELP);
  });

  it("routes commerce vs booking vs reservation keywords", () => {
    assert.equal(
      router.route("i want to order a birthday cake")?.intent,
      Intent.ORDER_PRODUCT,
    );
    assert.equal(
      router.route("book an appointment for tomorrow")?.intent,
      Intent.BOOK_APPOINTMENT,
    );
    assert.equal(
      router.route("reserve a table for 4")?.intent,
      Intent.RESERVE_TABLE,
    );
  });

  it("routes status and cancel lookups", () => {
    assert.equal(
      router.route("where is my order")?.intent,
      Intent.ORDER_STATUS,
    );
    assert.equal(router.route("cancel my order")?.intent, Intent.CANCEL_ORDER);
  });

  it("returns null for ambiguous text so the LLM takes over", () => {
    assert.equal(router.route(""), null);
    assert.equal(router.route("hmm interesting"), null);
  });
});
