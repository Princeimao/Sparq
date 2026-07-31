export { WhatsAppJobData as WhatsAppConfig } from "@sparq/types";

export type WhatsAppHeader =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image";
      image: {
        id?: string;
        link?: string;
      };
    }
  | {
      type: "video";
      video: {
        id?: string;
        link?: string;
      };
    }
  | {
      type: "document";
      document: {
        id?: string;
        link?: string;
      };
    };

export type WhatsAppReplyButton = {
  type: "reply";
  reply: {
    id: string;
    title: string;
  };
};

export type WhatsAppListSection = {
  title?: string;
  rows: {
    id: string;
    title: string;
    description?: string;
  }[];
};

export type WhatsAppCarouselCard = {
  card_index: number;
  type: "quick_reply";
  header: WhatsAppHeader;
  body: {
    text: string;
  };
  action: {
    buttons: {
      type: "quick_reply";
      quick_reply: {
        id: string;
        title: string;
      };
    }[];
  };
};

export type WhatsAppTextMessage = {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "text";
  text: {
    body: string;
  };
};

export type WhatsAppInteractiveButtonMessage = {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "interactive";
  interactive: {
    type: "button";
    header?: WhatsAppHeader;
    body: {
      text: string;
    };
    footer?: {
      text: string;
    };
    action: {
      buttons: WhatsAppReplyButton[];
    };
  };
};

export type WhatsAppInteractiveListMessage = {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "interactive";
  interactive: {
    type: "list";
    header?: WhatsAppHeader;
    body: {
      text: string;
    };
    footer?: {
      text: string;
    };
    action: {
      button: string;
      sections: WhatsAppListSection[];
    };
  };
};

export type WhatsAppInteractiveCarouselMessage = {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "interactive";
  interactive: {
    type: "carousel";
    body: {
      text: string;
    };
    action: {
      cards: WhatsAppCarouselCard[];
    };
  };
};
