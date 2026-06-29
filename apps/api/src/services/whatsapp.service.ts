import axios, { AxiosInstance } from "axios";

const WHATSAPP_API_VERSION = "v21.0";
const WHATSAPP_API_BASE = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`;

export interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
}

export interface WhatsAppTextMessage {
  to: string;
  body: string;
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

/**
 * WhatsApp Cloud API Service — Direct integration with Meta's API.
 * Each organization has its own WhatsApp credentials stored in integrations.
 */
export class WhatsAppService {
  private client: AxiosInstance;
  private phoneNumberId: string;

  constructor(config: WhatsAppConfig) {
    this.phoneNumberId = config.phoneNumberId;
    this.client = axios.create({
      baseURL: WHATSAPP_API_BASE,
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Send a text message to a WhatsApp number.
   */
  async sendTextMessage(message: WhatsAppTextMessage): Promise<WhatsAppMessageResponse> {
    const { data } = await this.client.post<WhatsAppMessageResponse>(
      `/${this.phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: message.to,
        type: "text",
        text: { preview_url: false, body: message.body },
      }
    );
    return data;
  }

  /**
   * Send a template message (pre-approved by Meta).
   */
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

  /**
   * Send an interactive message with reply buttons.
   * WhatsApp supports up to 3 reply buttons.
   */
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

  /**
   * Mark a message as read (sends "read" receipt to user).
   */
  async markAsRead(messageId: string): Promise<void> {
    await this.client.post(`/${this.phoneNumberId}/messages`, {
      messaging_product: "whatsapp",
      status: "read",
      message_id: messageId,
    });
  }

  /**
   * Get WhatsApp Business Profile info.
   */
  async getBusinessProfile(): Promise<unknown> {
    const { data } = await this.client.get(
      `/${this.phoneNumberId}/whatsapp_business_profile`,
      { params: { fields: "about,address,description,email,profile_picture_url,websites,vertical" } }
    );
    return data;
  }
}

/**
 * Factory: Create a WhatsApp service from an organization's integration credentials.
 */
export function createWhatsAppService(credentials: {
  phoneNumberId: string;
  accessToken: string;
}): WhatsAppService {
  return new WhatsAppService({
    phoneNumberId: credentials.phoneNumberId,
    accessToken: credentials.accessToken,
  });
}
