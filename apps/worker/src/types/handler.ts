import { Intent } from "./intent";
import { WorkflowContext } from "./workflowContext";

export type BusinessModule = "products" | "bookings";

export interface MenuEntry {
  buttonId: string;
  module: BusinessModule;
  emoji: string;
  title: string;
  hint: string;
  textHint: string;
}

/**
 * Self-describing workflow handler.
 *
 * Each handler declares WHAT it handles (`intents`), WHICH business module
 * gates it (`module`, or `null` when always available), and HOW it appears
 * in menus (`menu`, when applicable). The registry reads this metadata, so
 * adding a new flow means writing one handler class + one `register()` call
 * — the engine never needs another switch-case.
 */
export interface WorkflowHandler {
  readonly intents: readonly Intent[];
  readonly module: BusinessModule | null;
  readonly menu?: MenuEntry;

  start(ctx: WorkflowContext): Promise<void>;

  resume(ctx: WorkflowContext): Promise<void>;
}
