import { prisma } from "@sparq/database";
import { decryptJson } from "../lib/encryption";
import { createWhatsAppService, WhatsAppService } from "./whatsapp.service";
import { createPaymentLink } from "./payment.service";
import type { ConversationStep, Customer, ConversationState, Order } from "@sparq/database";

/**
 * Conversation State Machine Engine.
 *
 * Handles the reorder conversation flow:
 *   INITIAL → WAITING_CONFIRMATION → WAITING_ADDRESS → WAITING_PAYMENT → COMPLETED
 *
 * Each state transition is driven by incoming WhatsApp messages/button clicks.
 */

interface ConversationContext {
  customer: Customer;
  conversation: ConversationState & { order: Order | null };
  whatsapp: WhatsAppService;
  organizationId: string;
}

/**
 * Process an incoming message and advance the state machine.
 */
export async function processMessage(
  customerId: string,
  messageText: string,
  buttonId?: string
): Promise<void> {
  // Find the customer and their active conversation
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { organization: true },
  });

  if (!customer) {
    console.error(`Customer not found: ${customerId}`);
    return;
  }

  // Get active conversation (most recent non-completed)
  const conversation = await prisma.conversationState.findFirst({
    where: {
      customerId,
      step: { notIn: ["COMPLETED", "CANCELLED"] },
    },
    include: { order: true },
    orderBy: { createdAt: "desc" },
  });

  if (!conversation) {
    console.log(`No active conversation for customer ${customerId}`);
    return;
  }

  // Get WhatsApp integration for this org
  const whatsapp = await getWhatsAppServiceForOrg(customer.organizationId);
  if (!whatsapp) {
    console.error(`No WhatsApp integration for org ${customer.organizationId}`);
    return;
  }

  const ctx: ConversationContext = {
    customer,
    conversation: conversation as ConversationContext["conversation"],
    whatsapp,
    organizationId: customer.organizationId,
  };

  // Route to the appropriate state handler
  const normalizedMessage = messageText.trim().toLowerCase();
  const action = buttonId || normalizedMessage;

  switch (conversation.step) {
    case "INITIAL":
    case "WAITING_CONFIRMATION":
      await handleConfirmation(ctx, action);
      break;
    case "WAITING_ADDRESS":
      await handleAddress(ctx, messageText);
      break;
    case "WAITING_PAYMENT":
      await handlePaymentCheck(ctx, action);
      break;
    default:
      console.log(`Unexpected state: ${conversation.step}`);
  }

  // Update lastMessageAt
  await prisma.conversationState.update({
    where: { id: conversation.id },
    data: { lastMessageAt: new Date() },
  });
}

/**
 * Handle INITIAL / WAITING_CONFIRMATION state.
 * Customer says "yes" to reorder → ask for address confirmation.
 */
async function handleConfirmation(
  ctx: ConversationContext,
  action: string
): Promise<void> {
  const { customer, conversation, whatsapp } = ctx;

  if (action === "confirm_reorder" || action === "yes" || action === "y") {
    // Move to address confirmation
    if (customer.address) {
      // Customer has an address on file — ask to confirm
      await whatsapp.sendInteractiveButtons({
        to: customer.phone,
        bodyText: `Great! Should we deliver to your saved address?\n\n📍 ${customer.address}`,
        buttons: [
          { type: "reply", reply: { id: "confirm_address", title: "✅ Yes, same address" } },
          { type: "reply", reply: { id: "new_address", title: "📝 New address" } },
        ],
      });

      await transitionTo(conversation.id, "WAITING_ADDRESS");
    } else {
      // No address on file — ask them to send one
      await whatsapp.sendTextMessage({
        to: customer.phone,
        body: "Please share your delivery address and we'll get your order on the way! 📦",
      });

      await transitionTo(conversation.id, "WAITING_ADDRESS");
    }
  } else if (action === "decline_reorder" || action === "no" || action === "n") {
    // Customer declined
    await whatsapp.sendTextMessage({
      to: customer.phone,
      body: "No worries! We'll check in again later. Have a great day! 😊",
    });

    await transitionTo(conversation.id, "CANCELLED");
  } else {
    // Unrecognized response — re-send the confirmation prompt
    await whatsapp.sendInteractiveButtons({
      to: customer.phone,
      bodyText: "Would you like to reorder? Please choose an option:",
      buttons: [
        { type: "reply", reply: { id: "confirm_reorder", title: "✅ Yes, reorder" } },
        { type: "reply", reply: { id: "decline_reorder", title: "❌ No, thanks" } },
      ],
    });
  }
}

/**
 * Handle WAITING_ADDRESS state.
 * Customer confirms or provides a new address → generate payment link.
 */
async function handleAddress(
  ctx: ConversationContext,
  messageText: string
): Promise<void> {
  const { customer, conversation, whatsapp, organizationId } = ctx;
  const action = messageText.trim().toLowerCase();

  if (action === "confirm_address") {
    // Address confirmed, proceed to payment
    await proceedToPayment(ctx);
  } else if (action === "new_address") {
    // Ask for the new address
    await whatsapp.sendTextMessage({
      to: customer.phone,
      body: "Please type your new delivery address:",
    });
  } else {
    // This is the new address text
    await prisma.customer.update({
      where: { id: customer.id },
      data: { address: messageText.trim() },
    });

    await whatsapp.sendTextMessage({
      to: customer.phone,
      body: `Address updated to:\n📍 ${messageText.trim()}\n\nPreparing your payment link...`,
    });

    await proceedToPayment(ctx);
  }
}

/**
 * Generate payment link and send to customer.
 */
async function proceedToPayment(ctx: ConversationContext): Promise<void> {
  const { customer, conversation, whatsapp, organizationId } = ctx;

  if (!conversation.order) {
    await whatsapp.sendTextMessage({
      to: customer.phone,
      body: "Something went wrong with your order. Please contact support.",
    });
    return;
  }

  try {
    // Generate payment link
    const { url } = await createPaymentLink({
      amount: Math.round((conversation.order.amount || 0) * 100), // Convert to paise/cents
      currency: conversation.order.currency || "INR",
      productName: conversation.order.productName,
      customerPhone: customer.phone,
      orderId: conversation.order.id,
      organizationId,
    });

    // Save payment link to order
    await prisma.order.update({
      where: { id: conversation.order.id },
      data: { paymentLink: url },
    });

    // Send payment link via WhatsApp
    await whatsapp.sendTextMessage({
      to: customer.phone,
      body: `Here's your payment link for ${conversation.order.productName}:\n\n💳 ${url}\n\nOnce payment is confirmed, we'll send you a confirmation!`,
    });

    await transitionTo(conversation.id, "WAITING_PAYMENT");
  } catch (error) {
    console.error("Payment link generation failed:", error);
    await whatsapp.sendTextMessage({
      to: customer.phone,
      body: "We had trouble generating your payment link. Our team will follow up shortly.",
    });
  }
}

/**
 * Handle WAITING_PAYMENT state.
 * This is mostly handled by the payment webhook, but handle customer messages.
 */
async function handlePaymentCheck(
  ctx: ConversationContext,
  action: string
): Promise<void> {
  const { customer, whatsapp, conversation } = ctx;

  if (conversation.order) {
    // Check if payment was already completed
    const order = await prisma.order.findUnique({
      where: { id: conversation.order.id },
    });

    if (order && order.status === "PAID") {
      await completeOrder(ctx);
      return;
    }
  }

  await whatsapp.sendTextMessage({
    to: customer.phone,
    body: "We're still waiting for your payment. If you've already paid, it might take a moment to process. If you need help, just reply here! 🙏",
  });
}

/**
 * Complete the order (called after payment success webhook).
 */
export async function completeOrder(ctx: ConversationContext): Promise<void>;
export async function completeOrder(conversationId: string): Promise<void>;
export async function completeOrder(
  ctxOrConversationId: ConversationContext | string
): Promise<void> {
  if (typeof ctxOrConversationId === "string") {
    // Called with conversation ID (from payment webhook)
    const conversation = await prisma.conversationState.findUnique({
      where: { id: ctxOrConversationId },
      include: { customer: true, order: true },
    });

    if (!conversation || !conversation.customer) return;

    const whatsapp = await getWhatsAppServiceForOrg(conversation.customer.organizationId);
    if (!whatsapp) return;

    await whatsapp.sendTextMessage({
      to: conversation.customer.phone,
      body: `🎉 Payment confirmed! Your order for ${conversation.order?.productName || "your product"} has been placed successfully.\n\nThank you for your purchase! We'll keep you updated on delivery.`,
    });

    await transitionTo(conversation.id, "COMPLETED");

    // Mark order as completed
    if (conversation.order) {
      await prisma.order.update({
        where: { id: conversation.order.id },
        data: { status: "COMPLETED" },
      });
    }
  } else {
    // Called with context
    const { customer, conversation, whatsapp } = ctxOrConversationId;

    await whatsapp.sendTextMessage({
      to: customer.phone,
      body: `🎉 Payment confirmed! Your order for ${conversation.order?.productName || "your product"} has been placed successfully.\n\nThank you for your purchase! We'll keep you updated on delivery.`,
    });

    await transitionTo(conversation.id, "COMPLETED");

    if (conversation.order) {
      await prisma.order.update({
        where: { id: conversation.order.id },
        data: { status: "COMPLETED" },
      });
    }
  }
}

/**
 * Initiate a reorder conversation for a customer.
 * Called by the campaign engine when reorder eligibility is detected.
 */
export async function initiateReorderConversation(
  customerId: string,
  orderId: string,
  productName: string
): Promise<void> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
  });

  if (!customer || !customer.optedIn) return;

  const whatsapp = await getWhatsAppServiceForOrg(customer.organizationId);
  if (!whatsapp) return;

  // Create conversation state
  const conversation = await prisma.conversationState.create({
    data: {
      customerId,
      orderId,
      step: "WAITING_CONFIRMATION",
      contextData: { productName },
    },
  });

  // Send reorder prompt
  await whatsapp.sendInteractiveButtons({
    to: customer.phone,
    headerText: "🔄 Time to Reorder?",
    bodyText: `Hi ${customer.name || "there"}! It looks like you might be running low on ${productName}. Would you like to reorder?`,
    buttons: [
      { type: "reply", reply: { id: "confirm_reorder", title: "✅ Yes, reorder" } },
      { type: "reply", reply: { id: "decline_reorder", title: "❌ No, thanks" } },
    ],
    footerText: "Powered by Sparq",
  });

  // Log the outbound message
  await prisma.message.create({
    data: {
      customerId,
      direction: "OUTBOUND",
      body: `Reorder prompt for ${productName}`,
      status: "SENT",
    },
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function transitionTo(conversationId: string, step: ConversationStep): Promise<void> {
  await prisma.conversationState.update({
    where: { id: conversationId },
    data: { step },
  });
}

async function getWhatsAppServiceForOrg(
  organizationId: string
): Promise<WhatsAppService | null> {
  const integration = await prisma.integration.findFirst({
    where: {
      organizationId,
      type: "WHATSAPP",
      isActive: true,
    },
  });

  if (!integration || !integration.credentials) return null;

  try {
    const credentials = typeof integration.credentials === "string"
      ? decryptJson<{ phoneNumberId: string; accessToken: string }>(integration.credentials)
      : integration.credentials as { phoneNumberId: string; accessToken: string };

    return createWhatsAppService(credentials);
  } catch {
    console.error(`Failed to decrypt WhatsApp credentials for org ${organizationId}`);
    return null;
  }
}
