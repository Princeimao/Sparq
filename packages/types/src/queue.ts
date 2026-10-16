export type MessageChannel = "WHATSAPP" | "INSTAGRAM";

export interface WhatsAppJobData {
  /**
   * Unified inbound-message job. One queue, one worker, both channels:
   * absent `channel` means WHATSAPP (back-compat with in-flight jobs).
   * For INSTAGRAM, `customerWaId` carries the IGSID, `phoneNumberId` is
   * unused and `pageId` identifies the connected Page instead.
   */
  channel?: MessageChannel;
  pageId?: string;
  messageId: string;
  phoneNumberId: string;
  wabaId: string;
  customerWaId: string;
  customerName: string;
  text: string;
  messageType?: "text" | "interactive" | "button";
  interactiveId?: string;
  userId?: string;
  timestamp?: number;
}
