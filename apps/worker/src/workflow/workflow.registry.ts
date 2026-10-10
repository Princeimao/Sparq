import { Intent } from "../types/intent";
import {
  BusinessModule,
  MenuEntry,
  WorkflowHandler,
} from "../types/handler";

/**
 * Single source of truth for intent routing.
 *
 * Knows, for every intent: which handler runs it, which business module
 * gates it, which menu button maps to it, and what appears in help menus.
 * All of it derived from handler metadata — no switch statements.
 */
export class WorkflowRegistry {
  private readonly byIntent = new Map<Intent, WorkflowHandler>();
  private readonly modules = new Map<Intent, BusinessModule>();
  private readonly buttons = new Map<string, Intent>();
  private readonly menus: MenuEntry[] = [];

  /** Register a handler; its `intents`/`module`/`menu` are indexed. */
  register(handler: WorkflowHandler): this {
    for (const intent of handler.intents) {
      this.byIntent.set(intent, handler);
      if (handler.module) {
        this.modules.set(intent, handler.module);
      }
    }
    if (handler.menu) {
      this.buttons.set(
        handler.menu.buttonId.toUpperCase(),
        handler.intents[0] as Intent,
      );
      if (!this.menus.some((m) => m.module === handler.menu?.module)) {
        this.menus.push(handler.menu);
      }
    }
    return this;
  }

  /**
   * Gate-only mapping for intents with no runnable handler yet
   * (e.g. CANCEL_ORDER). Keeps module gating without a switch.
   */
  registerModule(intents: readonly Intent[], module: BusinessModule): this {
    for (const intent of intents) {
      if (!this.modules.has(intent)) {
        this.modules.set(intent, module);
      }
    }
    return this;
  }

  get(intent: Intent): WorkflowHandler | undefined {
    return this.byIntent.get(intent);
  }

  moduleFor(intent: Intent): BusinessModule | null {
    return this.modules.get(intent) ?? null;
  }

  /** Map a menu button id (e.g. "MENU_ORDER") to its intent. */
  resolveButton(buttonId: string): Intent | undefined {
    return this.buttons.get(buttonId.toUpperCase());
  }

  /** Menu entries in registration order, one per module. */
  menuEntries(): MenuEntry[] {
    return [...this.menus];
  }
}
