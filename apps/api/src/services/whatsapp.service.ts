import axios, { AxiosError, AxiosInstance } from "axios";
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
        `No WhatsApp integration found for WABA ID: ${this.wabaId}`
      );
    }

    return integration.accessToken;
  }

  async sendTextMessage(
    messageOrObj: string | { to: string; body: string }
  ): Promise<WhatsAppMessageResponse> {
    const accessToken = await this.getAccessToken();
    const to = typeof messageOrObj === "string" ? this.customerWaId : messageOrObj.to;
    const body = typeof messageOrObj === "string" ? messageOrObj : messageOrObj.body;

    const { data } = await this.client.post<WhatsAppMessageResponse>(
      `/${this.phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { preview_url: false, body },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    return data;
  }

  async sendTemplateMessage(message: WhatsAppTemplateMessage): Promise<WhatsAppMessageResponse> {
    const { data } = await this.client.post<WhatsAppMessageResponse>(
      `/${this.phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to: message.to,
        type: "template",
        template: {
          name: message.templateName,
          language: { code: message.languageCode || "en_US" },
          components: message.components || [],
        },
      }
    );
    return data;
  }

  async sendInteractiveButtons(
    message: WhatsAppInteractiveMessage
  ): Promise<WhatsAppMessageResponse> {
    const { data } = await this.client.post<WhatsAppMessageResponse>(
      `/${this.phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: message.to,
        type: "interactive",
        interactive: {
          type: "button",
          ...(message.headerText && {
            header: { type: "text", text: message.headerText },
          }),
          body: { text: message.bodyText },
          ...(message.footerText && {
            footer: { text: message.footerText },
          }),
          action: {
            buttons: message.buttons.map((btn) => ({
              type: btn.type,
              reply: btn.reply,
            })),
          },
        },
      }
    );
    return data;
  }

  async sendList({ headerMessage, footerMessage, listItems, title, actionText, type }:
    {
      headerMessage: string; footerMessage: string; listItems: Array<{
        id: string; title: string; price: string;
      }>; title: string; actionText: string, type: string;
    }) {

    try {
      const accessToken = await this.getAccessToken();
      const buttonsRows = listItems.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.price
      }));

      const { data } = await this.client.post(`${this.phoneNumberId}/messages`, {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: this.customerWaId,
        type: "interactive",
        interactive: {
          type: "list",
          header: {
            type: "text",
            text: headerMessage,
          },
          body: {
            text: title,
          },
          footer: {
            text: footerMessage
          },
          action: {
            button: actionText,
            sections: [
              {
                title: type,
                rows: buttonsRows,
              },
            ],
          },
        },
      }, {
        headers: {
          Authorization: `Bearer ${accessToken} `
        }
      })

      console.log("here in the whatsapp", data)

      return {
        success: true,
        data
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data
      }
    }
  }
}
