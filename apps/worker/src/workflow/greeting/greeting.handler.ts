import { Intent } from "../../types/intent";
import { MenuEntry, WorkflowHandler } from "../../types/handler";
import { WorkflowContext } from "../../types/workflowContext";
import { WhatsAppService } from "../../services/whatsapp.service";
import { IncomingMessage } from "../../types/message";

/**
 * GreetingHandler
 *
 * Responds to "hi / hello / hey" style messages with:
 * 1. A branded welcome text message (plain text + emoji, no template needed)
 * 2. An interactive button menu built from the registry's menu entries
 *    (already filtered to the business's enabled modules by the engine)
 */
export class GreetingHandler implements WorkflowHandler {
  readonly intents = [Intent.GREETING] as const;
  readonly module = null;

  async start(ctx: WorkflowContext): Promise<void> {
    return this.handle(
      ctx.message,
      ctx.whatsapp,
      ctx.menu ?? [],
      ctx.businessName ?? "Our Business",
    );
  }

  async resume(ctx: WorkflowContext): Promise<void> {
    return this.start(ctx);
  }

  /**
   * Send a branded greeting + action menu.
   */
  async handle(
    message: IncomingMessage,
    whatsapp: WhatsAppService,
    menu: MenuEntry[],
    businessName: string,
  ): Promise<void> {
    const customerFirst = this.firstName(message.customerName);

    const buttons = menu.map((entry) => ({
      type: "reply" as const,
      reply: { id: entry.buttonId, title: `${entry.emoji} ${entry.title}` },
    }));

    // Build the welcome text
    const greeting = [
      customerFirst ? `👋 Hi ${customerFirst}!` : `👋 Hello there!`,
      ``,
      `I'm the virtual assistant for *${businessName}*.`,
      `How can I help you today?`,
    ].join("\n");

    const textFallback =
      `${greeting}\n\n` +
      `Here's what I can help with:\n` +
      menu
        .map((entry) => `${entry.emoji} *${entry.title}* — ${entry.hint}`)
        .join("\n") +
      `\n❓ *Help* — type "help"`;

    try {
      if (buttons.length === 0) throw new Error("no modules enabled");
      // Send interactive buttons menu (works for all phone numbers)
      await whatsapp.sendInteractiveButtons({
        to: message.customerWaId,
        headerText: businessName,
        bodyText: greeting,
        footerText: "Powered by Sparq ⚡",
        buttons,
      });
    } catch {
      // If interactive buttons fail (e.g. pre-24h window), fall back to plain text
      await whatsapp.sendTextMessage(textFallback);
    }
  }

  private firstName(fullName?: string): string {
    if (!fullName) return "";
    return fullName.split(" ")[0] ?? "";
  }
}
