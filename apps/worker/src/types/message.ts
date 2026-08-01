export interface IncomingMessage {
  messageId: string;
  customerWaId: string;
  customerName: string;
  phoneNumberId: string;
  wabaId: string;
  userId: string;
  text: string;
  interactiveId?: string;
  messageType?: "text" | "interactive" | "button";
  timestamp: number;
}
