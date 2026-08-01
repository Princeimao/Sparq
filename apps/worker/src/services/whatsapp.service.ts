import axios, { AxiosInstance } from "axios";
import { prisma } from "../config/prisma";
import { decrypt } from "../lib/encryption";

const WHATSAPP_API_VERSION = "v25.0";
const WHATSAPP_API_BASE = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`;

export interface WhatsAppConfig {
  messageId: string;
  phoneNumberId: string;
  wabaId: string;
  customerWaId: string;
  customerName: string;
  text: string;
}

export interface WhatsAppTemplateMessage {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: Array<{
    type: string;
    parameters: Array<{ type: string; text?: string }>;
  }>;
}

export interface WhatsAppInteractiveButton {
  type: "reply";
  reply: { id: string; title: string };
}

export interface WhatsAppInteractiveMessage {
  to: string;
  bodyText: string;
  buttons: WhatsAppInteractiveButton[];
  headerText?: string;
  footerText?: string;
}

export interface WhatsAppMessageResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

export class WhatsAppService {
  private client: AxiosInstance;
  private phoneNumberId: string;
  private wabaId: string;
  private customerWaId: string;

  constructor(config: WhatsAppConfig) {
    this.phoneNumberId = config.phoneNumberId;
    this.wabaId = config.wabaId;
    this.customerWaId = config.customerWaId;

    this.client = axios.create({
      baseURL: WHATSAPP_API_BASE,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  // ─── Token Resolution ──────────────────────────────────────────────────────

  private async getAccessToken(): Promise<string> {
    const integration = await prisma.whatsappIntegration.findFirst({
      where: {
        wabaId: this.wabaId,
      },
      select: {
        accessToken: true,
      },
    });

    if (!integration) {
      throw new Error(
        `No WhatsApp integration found for WABA ID: ${this.wabaId}`,
      );
    }

    return integration.accessToken;
  }

  private async post<T = WhatsAppMessageResponse>(
    payload: unknown,
  ): Promise<T> {
    const accessToken = await this.getAccessToken();
    const { data } = await this.client.post<T>(
      `/${this.phoneNumberId}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    return data;
  }

  // ─── Text ──────────────────────────────────────────────────────────────────

  async sendTextMessage(
    messageOrObj: string | { to: string; body: string },
  ): Promise<WhatsAppMessageResponse> {
    const to =
      typeof messageOrObj === "string" ? this.customerWaId : messageOrObj.to;
    const body =
      typeof messageOrObj === "string" ? messageOrObj : messageOrObj.body;

    return this.post({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: false, body },
    });
  }

  // ─── Interactive Buttons ───────────────────────────────────────────────────

  async sendInteractiveButtons({
    to,
    bodyText,
    buttons,
    headerText,
    footerText,
  }: {
    to: string;
    bodyText: string;
    buttons: WhatsAppInteractiveButton[];
    headerText?: string;
    footerText?: string;
  }): Promise<WhatsAppMessageResponse> {
    return this.post({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        ...(headerText && { header: { type: "text", text: headerText } }),
        body: { text: bodyText },
        ...(footerText && { footer: { text: footerText } }),
        action: {
          buttons: buttons.map((btn) => ({
            type: btn.type,
            reply: btn.reply,
          })),
        },
      },
    });
  }

  // ─── Interactive List ──────────────────────────────────────────────────────

  async sendInteractiveListMessage({
    to,
    body,
    button,
    sections,
    header,
    footer,
  }: {
    to: string;
    body: string;
    button: string;
    sections: {
      title?: string;
      rows: {
        id: string;
        title: string;
        description?: string;
      }[];
    }[];
    header?: {
      type: "text";
      text: string;
    };
    token?: string; // legacy compat — token is now resolved internally
    footer?: string;
  }): Promise<WhatsAppMessageResponse> {
    return this.post({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "interactive",
      interactive: {
        type: "list",
        ...(header && { header }),
        body: { text: body },
        ...(footer && { footer: { text: footer } }),
        action: {
          button,
          sections: sections.map((section) => ({
            ...(section.title && { title: section.title }),
            rows: section.rows.map((row) => ({
              id: row.id,
              title: row.title,
              ...(row.description && { description: row.description }),
            })),
          })),
        },
      },
    });
  }

  // ─── WhatsApp Native Flow ──────────────────────────────────────────────────

  /**
   * Sends a WhatsApp native Flow (created in the Meta Flow Builder).
   */
  async sendWhatsAppFlow({
    flowId,
    flowToken,
    headerText,
    bodyText,
    cta,
    flowAction = "navigate",
    to,
  }: {
    flowId: string;
    flowToken: string;
    headerText?: string;
    bodyText: string;
    cta: string;
    flowAction?: string;
    to?: string;
  }): Promise<WhatsAppMessageResponse> {
    return this.post({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: to ?? this.customerWaId,
      type: "interactive",
      interactive: {
        type: "flow",
        ...(headerText && { header: { type: "text", text: headerText } }),
        body: { text: bodyText },
        action: {
          name: "flow",
          parameters: {
            flow_message_version: "3",
            flow_token: flowToken,
            flow_id: flowId,
            flow_cta: cta,
            flow_action: flowAction,
          },
        },
      },
    });
  }

  // ─── Template ──────────────────────────────────────────────────────────────

  async sendTemplateMessage(
    message: WhatsAppTemplateMessage,
  ): Promise<WhatsAppMessageResponse> {
    return this.post({
      messaging_product: "whatsapp",
      to: message.to,
      type: "template",
      template: {
        name: message.templateName,
        language: { code: message.languageCode || "en_US" },
        components: message.components || [],
      },
    });
  }

  // ─── Legacy list helper (used by old worker) ───────────────────────────────

  async sendList({
    headerMessage,
    footerMessage,
    listItems,
    title,
    actionText,
    type,
  }: {
    headerMessage: string;
    footerMessage: string;
    listItems: Array<{
      id: string;
      title: string;
      price: string;
    }>;
    title: string;
    actionText: string;
    type: string;
  }) {
    try {
      return {
        success: true,
        data: await this.sendInteractiveListMessage({
          to: this.customerWaId,
          header: { type: "text", text: headerMessage },
          body: title,
          footer: footerMessage,
          button: actionText,
          sections: [
            {
              title: type,
              rows: listItems.map((item) => ({
                id: item.id,
                title: item.title.slice(0, 24),
                description: item.price,
              })),
            },
          ],
        }),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data,
      };
    }
  }
}
