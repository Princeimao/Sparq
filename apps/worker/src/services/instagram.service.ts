import axios, { AxiosInstance } from "axios";
import { prisma } from "../config/prisma";
import { decrypt } from "../lib/encryption";
import type { ChannelSender } from "../types/channel";

// Instagram API with Instagram Login (graph.instagram.com).
// Sends go to POST /<IG_ID>/messages with the account's own user token —
// no Facebook Page involved. Docs:
// https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/messaging-api
const GRAPH_API_VERSION = "v25.0";
const GRAPH_API_BASE = `https://graph.instagram.com/${GRAPH_API_VERSION}`;

// Instagram has no native buttons/lists/flows — everything interactive
// becomes quick replies (max 13, titles truncated to 20 chars).
const MAX_QUICK_REPLIES = 13;
const MAX_REPLY_TITLE = 20;

export interface InstagramConfig {
  /** The professional account's IG user ID (owns the thread). */
  igUserId: string;
  /** IGSID of the customer thread. */
  igsid: string;
  /**
   * Best-effort hook invoked after a message is accepted by the Meta API.
   * Used to persist outbound history — failures here must never fail sends.
   */
  onSend?: (info: { to: string; type: string; body?: string }) => void;
}

interface QuickReply {
  content_type: "text";
  title: string;
  payload: string;
}

export class InstagramService implements ChannelSender {
  private client: AxiosInstance;
  private igUserId: string;
  private igsid: string;
  private onSend?: InstagramConfig["onSend"];

  constructor(config: InstagramConfig) {
    this.igUserId = config.igUserId;
    this.igsid = config.igsid;
    this.onSend = config.onSend;

    this.client = axios.create({
      baseURL: GRAPH_API_BASE,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  private async getAccessToken(): Promise<string> {
    const integration = await prisma.instagramIntegration.findFirst({
      where: { igUserId: this.igUserId },
      select: { accessToken: true },
    });

    if (!integration) {
      throw new Error(
        `No Instagram integration found for IG user ID: ${this.igUserId}`,
      );
    }

    return decrypt(integration.accessToken);
  }

  private async post(message: {
    recipient: { id: string };
    message: {
      text: string;
      quick_replies?: QuickReply[];
    };
  }): Promise<unknown> {
    const token = await this.getAccessToken();
    const { data } = await this.client.post(
      `/${this.igUserId}/messages`,
      {
        recipient: message.recipient,
        message: message.message,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    this.notifySend(message);
    return data;
  }

  /** Best-effort outbound logging — never throws. */
  private notifySend(message: {
    recipient: { id: string };
    message: { text: string; quick_replies?: QuickReply[] };
  }) {
    if (!this.onSend) return;
    try {
      this.onSend({
        to: message.recipient.id,
        type: message.message.quick_replies ? "interactive" : "text",
        body: message.message.text,
      });
    } catch (err) {
      console.warn("[InstagramService] onSend hook failed:", err);
    }
  }

  private toQuickReplies(
    buttons: { reply: { id: string; title: string } }[],
  ): QuickReply[] {
    return buttons.slice(0, MAX_QUICK_REPLIES).map((btn) => ({
      content_type: "text",
      title: btn.reply.title.slice(0, MAX_REPLY_TITLE),
      payload: btn.reply.id,
    }));
  }

  async sendTextMessage(
    messageOrObj: string | { to: string; body: string },
  ): Promise<unknown> {
    const to =
      typeof messageOrObj === "string" ? this.igsid : messageOrObj.to;
    const text =
      typeof messageOrObj === "string" ? messageOrObj : messageOrObj.body;

    return this.post({
      recipient: { id: to },
      message: { text },
    });
  }

  async sendInteractiveButtons({
    to,
    bodyText,
    buttons,
    headerText,
  }: {
    to: string;
    bodyText: string;
    buttons: { type: "reply"; reply: { id: string; title: string } }[];
    headerText?: string;
    footerText?: string;
  }): Promise<unknown> {
    return this.post({
      recipient: { id: to || this.igsid },
      message: {
        text: headerText ? `${headerText}\n${bodyText}` : bodyText,
        quick_replies: this.toQuickReplies(buttons),
      },
    });
  }

  async sendInteractiveListMessage({
    to,
    body,
    sections,
    header,
  }: {
    to: string;
    body: string;
    button: string;
    sections: {
      title?: string;
      rows: { id: string; title: string; description?: string }[];
    }[];
    header?: { type: "text"; text: string };
    token?: string;
    footer?: string;
  }): Promise<unknown> {
    const rows = sections.flatMap((s) => s.rows);
    const enumerated = rows
      .map(
        (r, i) =>
          `${i + 1}. ${r.title}${r.description ? ` — ${r.description}` : ""}`,
      )
      .join("\n");
    const text = [header?.text, body, enumerated].filter(Boolean).join("\n");
    return this.post({
      recipient: { id: to || this.igsid },
      message: {
        text,
        quick_replies: this.toQuickReplies(
          rows.map((r) => ({ reply: { id: r.id, title: r.title } })),
        ),
      },
    });
  }

  async sendWhatsAppFlow({
    bodyText,
    cta,
    to,
  }: {
    flowId: string;
    flowToken: string;
    headerText?: string;
    bodyText: string;
    cta: string;
    flowAction?: string;
    to?: string;
  }): Promise<unknown> {
    // Instagram has no native Flows — fall back to guided text so the
    // conversation never dead-ends on this channel.
    return this.post({
      recipient: { id: to || this.igsid },
      message: { text: `${bodyText}\n${cta}: just reply here with the details.` },
    });
  }

  async sendTemplateMessage(message: {
    to: string;
    templateName: string;
    languageCode?: string;
    components?: Array<{
      type: string;
      parameters: Array<{ type: string; text?: string }>;
    }>;
  }): Promise<unknown> {
    // Templates are a WhatsApp construct — send their text parts as-is.
    const parts = (message.components ?? []).flatMap(
      (c) => c.parameters.map((p) => p.text).filter(Boolean) as string[],
    );
    const text = parts.length > 0 ? parts.join("\n") : message.templateName;
    return this.post({
      recipient: { id: message.to || this.igsid },
      message: { text },
    });
  }

  async sendList({
    headerMessage,
    footerMessage,
    listItems,
    title,
    actionText,
  }: {
    headerMessage: string;
    footerMessage: string;
    listItems: Array<{ id: string; title: string; price: string }>;
    title: string;
    actionText: string;
    type: string;
  }): Promise<unknown> {
    try {
      const data = await this.sendInteractiveListMessage({
        to: this.igsid,
        header: { type: "text", text: headerMessage },
        body: `${title}\n${footerMessage}`,
        button: actionText,
        sections: [
          {
            rows: listItems.map((item) => ({
              id: item.id,
              title: item.title.slice(0, 24),
              description: item.price,
            })),
          },
        ],
      });
      return { success: true, data };
    } catch (error: unknown) {
      const err = error as { response?: { data?: unknown } };
      return { success: false, error: err.response?.data };
    }
  }
}
