import { Intent } from "../../types/intent";
import { MenuEntry, WorkflowHandler } from "../../types/handler";
import { WorkflowContext } from "../../types/workflowContext";

/** Stateless system handlers — no conversation state, no module gating. */

export class GoodbyeHandler implements WorkflowHandler {
  readonly intents = [Intent.GOODBYE] as const;
  readonly module = null;

  async start(ctx: WorkflowContext): Promise<void> {
    await ctx.whatsapp.sendTextMessage(
      `Thanks for reaching out! Have a great day 😊\n\nType *hi* anytime to start again.`,
    );
  }

  async resume(ctx: WorkflowContext): Promise<void> {
    return this.start(ctx);
  }
}

export class HelpHandler implements WorkflowHandler {
  readonly intents = [Intent.HELP] as const;
  readonly module = null;

  async start(ctx: WorkflowContext): Promise<void> {
    const items = ctx.menu ?? [];
    const lines = items
      .map((i) => `${i.emoji} *${i.title}* — ${i.hint}`)
      .join("\n");
    try {
      await ctx.whatsapp.sendInteractiveButtons({
        to: ctx.message.customerWaId,
        bodyText: `Here's what I can help with:\n\n${lines}`,
        footerText: "Tap a button or type your request",
        buttons: items.map((i) => ({
          type: "reply" as const,
          reply: { id: i.buttonId, title: `${i.emoji} ${i.title}` },
        })),
      });
    } catch {
      await ctx.whatsapp.sendTextMessage(
        `Here's what I can help with:\n\n${lines}`,
      );
    }
  }

  async resume(ctx: WorkflowContext): Promise<void> {
    return this.start(ctx);
  }
}

export class UnknownHandler implements WorkflowHandler {
  readonly intents = [Intent.UNKNOWN, Intent.GENERAL_INQUIRY] as const;
  readonly module = null;

  async start(ctx: WorkflowContext): Promise<void> {
    const items: MenuEntry[] = ctx.menu ?? [];
    const lines = items.map((i) => `• ${i.textHint}`).join("\n");
    await ctx.whatsapp.sendTextMessage(
      `I didn't quite get that 🤔\n\n` +
        `You can:\n${lines}\n` +
        `• Type *help* to see the menu`,
    );
  }

  async resume(ctx: WorkflowContext): Promise<void> {
    return this.start(ctx);
  }
}
