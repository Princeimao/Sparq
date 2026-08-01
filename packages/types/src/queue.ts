export interface WhatsAppJobData {
  /** WhatsApp message ID from the webhook */
  messageId: string;
  /** The business phone number ID */
  phoneNumberId: string;
  /** WhatsApp Business Account ID */
  wabaId: string;
  /** The customer's WhatsApp number */
  customerWaId: string;
  /** Customer's display name from WhatsApp profile */
  customerName: string;
  /** Raw message text (empty string for non-text messages) */
  text: string;
  /** Type of the incoming message */
  messageType?: "text" | "interactive" | "button";
  /** The button/list reply ID when messageType is interactive or button */
  interactiveId?: string;
  /**
   * The SaaS user (organization) ID who owns this WhatsApp number.
   * Populated by the API when enqueuing — avoids an extra DB lookup in the worker.
   */
  userId?: string;
  /** Unix timestamp (ms) of the original WhatsApp message */
  timestamp?: number;
}
