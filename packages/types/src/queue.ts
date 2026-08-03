export interface WhatsAppJobData {
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
