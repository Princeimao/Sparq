import { prisma } from "../../config/prisma";
import { WhatsAppService } from "../../services/whatsapp.service";
import { IncomingMessage } from "../../types/message";

/**
 * GreetingHandler
 *
 * Responds to "hi / hello / hey" style messages with:
 * 1. A branded welcome text message (plain text + emoji, no template needed)
 * 2. An interactive button menu so the user knows what they can do
 *
 * Business name is fetched from the user profile linked to the WABA.
 * Falls back gracefully if the user profile has no name.
 */
export class GreetingHandler {
  /**
   * Send a branded greeting + action menu.
   */
  async handle(
    message: IncomingMessage,
    whatsapp: WhatsAppService
  ): Promise<void> {
    const businessName = await this.resolveBusinessName(message.wabaId);
    const customerFirst = this.firstName(message.customerName);

    // Build the welcome text
    const greeting = [
      customerFirst ? `👋 Hi ${customerFirst}!` : `👋 Hello there!`,
      ``,
      `I'm the virtual assistant for *${businessName}*.`,
      `How can I help you today?`,
    ].join("\n");

    try {
      // Send interactive buttons menu (works for all phone numbers)
      await whatsapp.sendInteractiveButtons({
        to: message.customerWaId,
        headerText: businessName,
        bodyText: greeting,
        footerText: "Powered by Sparq ⚡",
        buttons: [
          { type: "reply", reply: { id: "MENU_ORDER", title: "🛒 Order Products" } },
          { type: "reply", reply: { id: "MENU_BOOK", title: "📅 Book Appointment" } },
          { type: "reply", reply: { id: "MENU_RESERVE", title: "🍽️ Reservations" } },
        ],
      });
    } catch {
      // If interactive buttons fail (e.g. pre-24h window), fall back to plain text
      await whatsapp.sendTextMessage(
        `${greeting}\n\n` +
        `Here's what I can help with:\n` +
        `🛒 *Order Products* — type "order"\n` +
        `📅 *Book Appointment* — type "book"\n` +
        `🍽️ *Reserve Table/Room* — type "reserve"\n` +
        `❓ *Help* — type "help"`
      );
    }
  }

  /**
   * Resolve the business name from the WhatsApp integration's user record.
   */
  private async resolveBusinessName(wabaId: string): Promise<string> {
    try {
      const integration = await prisma.whatsappIntegration.findFirst({
        where: { wabaId },
        select: { user: { select: { name: true } } },
      });
      return integration?.user?.name ?? "Our Business";
    } catch {
      return "Our Business";
    }
  }

  private firstName(fullName?: string): string {
    if (!fullName) return "";
    return fullName.split(" ")[0] ?? "";
  }
}
