export type MessageChannel = "WHATSAPP" | "INSTAGRAM";

export interface IncomingMessage {
  /** Absent in legacy payloads — always WHATSAPP there. */
  channel?: MessageChannel;
  messageId: string;
  /** WhatsApp wa_id or Instagram IGSID, depending on channel. */
  customerWaId: string;
  customerName: string;
  /** WhatsApp phone_number_id or Instagram Page ID. */
  phoneNumberId: string;
  wabaId: string;
  userId: string;
  text: string;
  interactiveId?: string;
  messageType?: "text" | "interactive" | "button";
  timestamp: number;
}
