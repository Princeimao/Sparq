import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { WorkflowRegistry } from "./workflow.registry.js";
import { Intent } from "../types/intent.js";
import type { WorkflowHandler } from "../types/handler.js";
import type { WorkflowContext } from "../types/workflowContext.js";

function fakeHandler(
  overrides: Partial<WorkflowHandler> & { intents: WorkflowHandler["intents"] },
): WorkflowHandler {
  return {
    module: null,
    start: async (_ctx: WorkflowContext) => {},
    resume: async (_ctx: WorkflowContext) => {},
    ...overrides,
  };
}

describe("workflow registry", () => {
  it("resolves handlers by intent from handler metadata", () => {
    const registry = new WorkflowRegistry();
    const orders = fakeHandler({
      intents: [Intent.ORDER_PRODUCT],
      module: "products",
      menu: {
        buttonId: "MENU_ORDER",
        module: "products",
        emoji: "🛒",
        title: "Order",
        hint: "order things",
        textHint: "type order",
      },
    });
    registry.register(orders);
    assert.equal(registry.get(Intent.ORDER_PRODUCT), orders);
    assert.equal(registry.get(Intent.BOOK_APPOINTMENT), undefined);
  });

  it("derives module gates from handler metadata, no switch", () => {
    const registry = new WorkflowRegistry();
    registry.register(
      fakeHandler({ intents: [Intent.RESERVE_TABLE], module: "bookings" }),
    );
    assert.equal(registry.moduleFor(Intent.RESERVE_TABLE), "bookings");
    assert.equal(registry.moduleFor(Intent.GREETING), null);
  });

  it("supports gate-only intents without a runnable handler", () => {
    const registry = new WorkflowRegistry();
    registry.registerModule([Intent.CANCEL_ORDER], "products");
    assert.equal(registry.get(Intent.CANCEL_ORDER), undefined);
    assert.equal(registry.moduleFor(Intent.CANCEL_ORDER), "products");
  });

  it("maps menu buttons case-insensitively", () => {
    const registry = new WorkflowRegistry();
    registry.register(
      fakeHandler({
        intents: [Intent.BOOK_APPOINTMENT],
        module: "bookings",
        menu: {
          buttonId: "MENU_BOOK",
          module: "bookings",
          emoji: "📅",
          title: "Book",
          hint: "book things",
          textHint: "type book",
        },
      }),
    );
    assert.equal(registry.resolveButton("menu_book"), Intent.BOOK_APPOINTMENT);
    assert.equal(registry.resolveButton("MENU_UNKNOWN"), undefined);
  });

  it("exposes one menu entry per module in registration order", () => {
    const registry = new WorkflowRegistry();
    const menu = {
      buttonId: "MENU_ORDER",
      module: "products" as const,
      emoji: "🛒",
      title: "Order",
      hint: "order things",
      textHint: "type order",
    };
    registry.register(fakeHandler({ intents: [Intent.ORDER_PRODUCT], module: "products", menu }));
    registry.register(fakeHandler({ intents: [Intent.CANCEL_ORDER], module: "products", menu }));
    assert.equal(registry.menuEntries().length, 1);
    assert.equal(registry.menuEntries()[0]?.buttonId, "MENU_ORDER");
  });
});
