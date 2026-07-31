import axios, { AxiosInstance } from "axios";
import {
  WhatsAppInteractiveButtonMessage,
  WhatsAppInteractiveCarouselMessage,
  WhatsAppInteractiveListMessage,
  WhatsAppTextMessage,
} from "../../types/whatsapp";
import { client } from "./whatsapp.client";
import { WhatsAppConfig } from "../whatsapp.service";

export class WhatsAppService {
  private client: AxiosInstance;
  private businessPhoneNumberId: string;
  private businessWabaId: string;
  private customerPhoneNumber: string;
  private mapper: WhatsAppMapper;

  constructor(config: WhatsAppConfig) {
    this.businessPhoneNumberId = config.phoneNumberId;
    this.businessWabaId = config.wabaId;
    this.customerPhoneNumber = config.customerWaId;
    this.client = client;
    this.mapper = new WhatsAppMapper();
  }

  async sendTextMessage({ text, token }: { text: string; token: string }) {
    const map = this.mapper.text(this.customerPhoneNumber, text);

    const { data } = await this.client.post(
      `${this.businessPhoneNumberId}/message`,
      map,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return data;
  }

  async sendInteractiveButtonMessage({
    body,
    buttons,
    header,
    token,
    footer,
  }: {
    body: string;
    buttons: {
      id: string;
      title: string;
    }[];
    header?: {
      type: "text";
      text: string;
    };
    token: string;
    footer?: string;
  }) {
    const map = this.mapper.replyButtons({
      to: this.customerPhoneNumber,
      body,
      buttons,
      header,
      footer,
    });

    const { data } = await this.client.post(
      `${this.businessPhoneNumberId}/message`,
      map,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return data;
  }

  async sendInteractiveListMessage({
    body,
    button,
    sections,
    header,
    token,
    footer,
  }: {
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
    token: string;
    footer?: string;
  }) {
    const map = this.mapper.list({
      to: this.customerPhoneNumber,
      body,
      button,
      sections,
      header,
      footer,
    });

    const { data } = await this.client.post(
      `${this.businessPhoneNumberId}/message`,
      map,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return data;
  }
}

export class WhatsAppMapper {
  text(to: string, body: string): WhatsAppTextMessage {
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: {
        body,
      },
    };
  }

  replyButtons(params: {
    to: string;
    body: string;
    buttons: {
      id: string;
      title: string;
    }[];
    header?: {
      type: "text";
      text: string;
    };
    footer?: string;
  }): WhatsAppInteractiveButtonMessage {
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: params.to,
      type: "interactive",
      interactive: {
        type: "button",

        ...(params.header && {
          header: params.header,
        }),

        body: {
          text: params.body,
        },

        ...(params.footer && {
          footer: {
            text: params.footer,
          },
        }),

        action: {
          buttons: params.buttons.map((button) => ({
            type: "reply",
            reply: {
              id: button.id,
              title: button.title,
            },
          })),
        },
      },
    };
  }

  list(params: {
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
    footer?: string;
  }): WhatsAppInteractiveListMessage {
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: params.to,
      type: "interactive",
      interactive: {
        type: "list",

        ...(params.header && {
          header: params.header,
        }),

        body: {
          text: params.body,
        },

        ...(params.footer && {
          footer: {
            text: params.footer,
          },
        }),

        action: {
          button: params.button,
          sections: params.sections.map((section) => ({
            ...(section.title && {
              title: section.title,
            }),
            rows: section.rows.map((row) => ({
              id: row.id,
              title: row.title,
              ...(row.description && {
                description: row.description,
              }),
            })),
          })),
        },
      },
    };
  }

  carousel(params: {
    to: string;
    body: string;
    cards: {
      mediaId: string;
      title: string;
      buttons: {
        id: string;
        title: string;
      }[];
    }[];
  }): WhatsAppInteractiveCarouselMessage {
    return {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: params.to,
      type: "interactive",
      interactive: {
        type: "carousel",
        body: {
          text: params.body,
        },
        action: {
          cards: params.cards.map((card, index) => ({
            card_index: index,
            type: "quick_reply",

            header: {
              type: "image",
              image: {
                id: card.mediaId,
              },
            },

            body: {
              text: card.title,
            },

            action: {
              buttons: card.buttons.map((button) => ({
                type: "quick_reply",
                quick_reply: {
                  id: button.id,
                  title: button.title,
                },
              })),
            },
          })),
        },
      },
    };
  }
}
