/**
 * ChannelSender — the channel-agnostic reply surface every workflow
 * handler programs against.
 *
 * Method names and parameter shapes intentionally mirror WhatsAppService,
 * so the 65+ existing call sites (`ctx.whatsapp.sendXxx(...)`) work
 * unchanged for Instagram: InstagramService translates each call into
 * the Messenger Platform equivalent (quick replies, plain text).
 *
 * The `whatsapp` property name on WorkflowContext is historical — it now
 * carries whichever channel the inbound message arrived on.
 */

export interface ChannelButtonReply {
  type: "reply";
  reply: { id: string; title: string };
}

export interface ChannelListSection {
  title?: string;
  rows: {
    id: string;
    title: string;
    description?: string;
  }[];
}

export interface ChannelSender {
  sendTextMessage(
    messageOrObj: string | { to: string; body: string },
  ): Promise<unknown>;

  sendInteractiveButtons(args: {
    to: string;
    bodyText: string;
    buttons: ChannelButtonReply[];
    headerText?: string;
    footerText?: string;
  }): Promise<unknown>;

  sendInteractiveListMessage(args: {
    to: string;
    body: string;
    button: string;
    sections: ChannelListSection[];
    header?: {
      type: "text";
      text: string;
    };
    token?: string;
    footer?: string;
  }): Promise<unknown>;

  sendWhatsAppFlow(args: {
    flowId: string;
    flowToken: string;
    headerText?: string;
    bodyText: string;
    cta: string;
    flowAction?: string;
    to?: string;
  }): Promise<unknown>;

  sendTemplateMessage(message: {
    to: string;
    templateName: string;
    languageCode?: string;
    components?: Array<{
      type: string;
      parameters: Array<{ type: string; text?: string }>;
    }>;
  }): Promise<unknown>;

  sendList(args: {
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
  }): Promise<unknown>;
}
