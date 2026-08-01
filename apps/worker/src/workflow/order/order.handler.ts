import { CustomerRepository } from "../../repository/customer.repository";
import { ProductRepository } from "../../repository/product.repository";
import { OrderRepository } from "../../repository/order.repository";
import { FlowRepository } from "../../repository/flow.repository";
import { ConversationStore } from "../../services/store/conversation.store";
import { PaymentIntegrationManager } from "../../services/integrations";
import { WorkflowHandler } from "../../types/handler";
import { WorkflowContext } from "../../types/workflowContext";
import { Intent } from "../../types/intent";
import { OrderStep } from "./order.state";
import { WorkflowStep } from "../../types/workflowStep";

const TTL = 3600000; // 1 hour

export class OrderHandler implements WorkflowHandler {
  constructor(
    private productRepository: ProductRepository,
    private customerRepository: CustomerRepository,
    private orderRepository: OrderRepository,
    private flowRepository: FlowRepository,
    private conversationStore: ConversationStore,
  ) {}

  // ─── Entry Point ───────────────────────────────────────────────────────────

  async start(ctx: WorkflowContext): Promise<void> {
    const query = ctx.llm?.entities.productQuery;

    if (!query) {
      await ctx.whatsapp.sendTextMessage(
        "What product would you like to order? Just tell me the name! 🛒",
      );
      // Save state so next message triggers product search
      await this.conversationStore.set(this.key(ctx), {
        flowId: "ORDER",
        intent: Intent.ORDER_PRODUCT,
        step: WorkflowStep.WAITING_SELECTION,
        data: {},
        expiresAt: Date.now() + TTL,
      });
      return;
    }

    await this.searchAndShowProducts(ctx, query);
  }

  async resume(ctx: WorkflowContext): Promise<void> {
    const step = ctx.state?.step as OrderStep | WorkflowStep | undefined;

    switch (step) {
      // First message had no query – user now typed the product name
      case WorkflowStep.WAITING_SELECTION:
        return this.searchAndShowProducts(ctx, ctx.message.text);

      case OrderStep.WAITING_PRODUCT_SELECTION:
        return this.handleProductSelected(ctx);

      case OrderStep.WAITING_ADDRESS_CONFIRMATION:
        return this.handleAddressConfirmation(ctx);

      case OrderStep.WAITING_CUSTOMER_DETAILS:
        return this.handleCustomerDetailCollection(ctx);

      case OrderStep.WAITING_ORDER_CONFIRMATION:
        return this.handleOrderConfirmation(ctx);

      default:
        await this.conversationStore.delete(this.key(ctx));
        await ctx.whatsapp.sendTextMessage(
          "Your session expired or something went wrong. Please start over.",
        );
    }
  }

  // ─── Product Search & Display ───────────────────────────────────────────────

  private async searchAndShowProducts(
    ctx: WorkflowContext,
    query: string,
  ): Promise<void> {
    const products = await this.productRepository.search(
      ctx.message.phoneNumberId,
      query,
    );

    if (products.length === 0) {
      await ctx.whatsapp.sendTextMessage(
        `Sorry, I couldn't find any products matching "${query}". Try a different name or browse what's available.`,
      );
      await this.conversationStore.delete(this.key(ctx));
      return;
    }

    // Save state
    await this.conversationStore.set(this.key(ctx), {
      flowId: "ORDER",
      intent: Intent.ORDER_PRODUCT,
      step: OrderStep.WAITING_PRODUCT_SELECTION,
      data: {
        productIds: products.map((p) => p.id),
      },
      expiresAt: Date.now() + TTL,
    });

    if (products.length === 1) {
      // Single product – show as a simple interactive button message
      const p = products[0]!;
      await ctx.whatsapp.sendInteractiveButtons({
        to: ctx.message.customerWaId,
        bodyText: `*${p.name}*\n${p.description ?? ""}\n\n💰 Price: ₹${p.price}`,
        headerText: "Found a match!",
        footerText: "Tap below to order",
        buttons: [
          { type: "reply", reply: { id: p.id, title: "Order Now" } },
          { type: "reply", reply: { id: "CANCEL", title: "Never mind" } },
        ],
      });
    } else {
      // Multiple products – show as interactive list
      await ctx.whatsapp.sendInteractiveListMessage({
        to: ctx.message.customerWaId,
        header: { type: "text", text: "🛒 Products Found" },
        body: `Here are products matching "${query}". Tap to select one:`,
        button: "View Products",
        sections: [
          {
            title: "Available Products",
            rows: products.map((p) => ({
              id: p.id,
              title: p.name.slice(0, 24),
              description: `₹${p.price}${p.description ? ` · ${p.description.slice(0, 60)}` : ""}`,
            })),
          },
        ],
        token: "",       // token fetched internally by WhatsAppService
        footer: "Powered by Sparq",
      });
    }
  }

  // ─── Product Selected ───────────────────────────────────────────────────────

  private async handleProductSelected(ctx: WorkflowContext): Promise<void> {
    const selectedId = ctx.message.interactiveId;

    if (!selectedId || selectedId === "CANCEL") {
      await this.conversationStore.delete(this.key(ctx));
      await ctx.whatsapp.sendTextMessage(
        "No problem! Let me know if you need anything. 😊",
      );
      return;
    }

    const product = await this.productRepository.findById(selectedId);
    if (!product) {
      await ctx.whatsapp.sendTextMessage(
        "That product is no longer available. Please try again.",
      );
      await this.conversationStore.delete(this.key(ctx));
      return;
    }

    // Look up customer in the DB, linked to this WhatsApp account
    const customer = await this.customerRepository.findByPhone(
      ctx.message.customerWaId,
      ctx.message.phoneNumberId,
    );

    if (customer) {
      // Known customer → confirm their saved address
      const addresses = await this.customerRepository.getAddresses(customer.id);
      const primaryAddress = addresses[0];

      if (primaryAddress) {
        const addressText = [
          primaryAddress.line1,
          primaryAddress.line2,
          primaryAddress.city,
          primaryAddress.state,
          primaryAddress.pincode,
        ]
          .filter(Boolean)
          .join(", ");

        await this.conversationStore.set(this.key(ctx), {
          flowId: "ORDER",
          intent: Intent.ORDER_PRODUCT,
          step: OrderStep.WAITING_ADDRESS_CONFIRMATION,
          data: {
            selectedProductId: selectedId,
            customerId: customer.id,
            addressId: primaryAddress.id,
            userId: ctx.message.userId,
          },
          expiresAt: Date.now() + TTL,
        });

        await ctx.whatsapp.sendInteractiveButtons({
          to: ctx.message.customerWaId,
          bodyText: `Great choice! 🎉\n\nShip to:\n📍 ${addressText}`,
          headerText: `You selected: ${product.name}`,
          footerText: `Total: ₹${product.price}`,
          buttons: [
            {
              type: "reply",
              reply: { id: "CONFIRM_ADDRESS", title: "Yes, deliver here" },
            },
            {
              type: "reply",
              reply: { id: "CHANGE_ADDRESS", title: "Use different address" },
            },
          ],
        });
        return;
      }
    }

    // Unknown customer or no address → check for a published WhatsApp Flow
    await this.startCustomerOnboarding(ctx, selectedId, product.name);
  }

  // ─── New Customer Onboarding ────────────────────────────────────────────────

  private async startCustomerOnboarding(
    ctx: WorkflowContext,
    selectedProductId: string,
    productName: string,
  ): Promise<void> {
    // Check if the SaaS user has created a published WhatsApp Flow
    const flow = await this.flowRepository.findPublishedFlowByNumberId(
      ctx.message.phoneNumberId,
    );

    if (flow && flow.whatsappSchema) {
      // Send the WhatsApp native flow
      await ctx.whatsapp.sendWhatsAppFlow({
        flowId: (flow.whatsappSchema as any).flowId,
        flowToken: `order_${selectedProductId}_${Date.now()}`,
        headerText: "Complete your order",
        bodyText: "Please provide your details to continue.",
        cta: "Fill Details",
      });

      await this.conversationStore.set(this.key(ctx), {
        flowId: "ORDER",
        intent: Intent.ORDER_PRODUCT,
        step: OrderStep.WAITING_CUSTOMER_DETAILS,
        data: {
          selectedProductId,
          userId: ctx.message.userId,
          metadata: { usingWhatsAppFlow: true, flowId: flow.id },
        },
        expiresAt: Date.now() + TTL,
      });
    } else {
      // Fallback: collect details one by one
      const fields: Array<{ id: string; label: string; required?: boolean }> = [
        { id: "name", label: "What is your full name?", required: true },
        { id: "phone", label: "Your phone number (with country code)?", required: true },
        { id: "address_line1", label: "Street address (line 1)?", required: true },
        { id: "city", label: "City?", required: true },
        { id: "state", label: "State?", required: true },
        { id: "pincode", label: "Pincode / ZIP?", required: true },
      ];

      await this.conversationStore.set(this.key(ctx), {
        flowId: "ORDER",
        intent: Intent.ORDER_PRODUCT,
        step: OrderStep.WAITING_CUSTOMER_DETAILS,
        data: {
          selectedProductId,
          userId: ctx.message.userId,
          detailFields: fields,
          detailIndex: 0,
          collectedDetails: {},
        },
        expiresAt: Date.now() + TTL,
      });

      await ctx.whatsapp.sendTextMessage(
        `Welcome! I just need a few details to complete your order of *${productName}*.\n\n${fields[0]!.label}`,
      );
    }
  }

  // ─── Address Confirmation ────────────────────────────────────────────────────

  private async handleAddressConfirmation(ctx: WorkflowContext): Promise<void> {
    const reply = ctx.message.interactiveId ?? ctx.message.text.toLowerCase();
    const data = ctx.state!.data;

    if (reply === "CONFIRM_ADDRESS" || reply === "yes") {
      await this.createOrderAndSendPayment(ctx, {
        customerId: data.customerId!,
        addressId: data.addressId!,
        productId: data.selectedProductId!,
        userId: data.userId!,
      });
    } else if (reply === "CHANGE_ADDRESS") {
      // Collect new address sequentially
      const fields: Array<{ id: string; label: string; required?: boolean }> = [
        { id: "address_line1", label: "New street address (line 1)?", required: true },
        { id: "city", label: "City?", required: true },
        { id: "state", label: "State?", required: true },
        { id: "pincode", label: "Pincode?", required: true },
      ];

      await this.conversationStore.set(this.key(ctx), {
        flowId: "ORDER",
        intent: Intent.ORDER_PRODUCT,
        step: OrderStep.WAITING_CUSTOMER_DETAILS,
        data: {
          ...data,
          detailFields: fields,
          detailIndex: 0,
          collectedDetails: {},
          changingAddress: true,
        },
        expiresAt: Date.now() + TTL,
      });

      await ctx.whatsapp.sendTextMessage(fields[0]!.label);
    } else {
      await ctx.whatsapp.sendTextMessage(
        "Please tap one of the buttons — 'Yes, deliver here' or 'Use different address'.",
      );
    }
  }

  // ─── Sequential Detail Collection ───────────────────────────────────────────

  private async handleCustomerDetailCollection(
    ctx: WorkflowContext,
  ): Promise<void> {
    const data = ctx.state!.data;
    const fields = data.detailFields ?? [];
    const index = data.detailIndex ?? 0;
    const collected = data.collectedDetails ?? {};
    const currentField = fields[index];

    if (!currentField) {
      // All fields collected – proceed
      await this.finalizeAfterDetailCollection(ctx, collected, data);
      return;
    }

    // Save the answer to the current field
    collected[currentField.id] = ctx.message.text.trim();
    const nextIndex = index + 1;
    const nextField = fields[nextIndex];

    if (nextField) {
      // Ask the next field
      await this.conversationStore.set(this.key(ctx), {
        ...ctx.state!,
        data: {
          ...data,
          detailIndex: nextIndex,
          collectedDetails: collected,
        },
        expiresAt: Date.now() + TTL,
      });
      await ctx.whatsapp.sendTextMessage(nextField.label);
    } else {
      // All done
      await this.conversationStore.set(this.key(ctx), {
        ...ctx.state!,
        data: {
          ...data,
          detailIndex: nextIndex,
          collectedDetails: collected,
        },
        expiresAt: Date.now() + TTL,
      });
      await this.finalizeAfterDetailCollection(ctx, collected, data);
    }
  }

  private async finalizeAfterDetailCollection(
    ctx: WorkflowContext,
    collected: Record<string, string>,
    data: Record<string, any>,
  ): Promise<void> {
    const isChangingAddress = data.changingAddress;

    if (isChangingAddress) {
      // Create/update address and place order
      const customer = await this.customerRepository.findById(data.customerId!);
      if (!customer) {
        await ctx.whatsapp.sendTextMessage("Customer profile not found.");
        await this.conversationStore.delete(this.key(ctx));
        return;
      }

      const address = await this.customerRepository.createAddress(customer.id, {
        line1: collected["address_line1"]!,
        city: collected["city"]!,
        state: collected["state"]!,
        pincode: collected["pincode"]!,
      });

      await this.createOrderAndSendPayment(ctx, {
        customerId: customer.id,
        addressId: address.id,
        productId: data.selectedProductId!,
        userId: data.userId!,
      });
    } else {
      // New customer – create profile + address then place order
      const customer = await this.customerRepository.findOrCreate({
        phone: ctx.message.customerWaId,
        name: collected["name"] ?? ctx.message.customerName,
        phoneNumberId: ctx.message.phoneNumberId,
        userId: data.userId!,
      });

      const address = await this.customerRepository.createAddress(customer.id, {
        line1: collected["address_line1"]!,
        city: collected["city"]!,
        state: collected["state"]!,
        pincode: collected["pincode"]!,
      });

      await this.createOrderAndSendPayment(ctx, {
        customerId: customer.id,
        addressId: address.id,
        productId: data.selectedProductId!,
        userId: data.userId!,
      });
    }
  }

  // ─── Order Confirmation ─────────────────────────────────────────────────────

  private async handleOrderConfirmation(ctx: WorkflowContext): Promise<void> {
    const reply = (ctx.message.interactiveId ?? ctx.message.text).toLowerCase();

    if (reply === "CONFIRM_ORDER" || reply === "yes" || reply === "confirm") {
      const data = ctx.state!.data;
      await this.createOrderAndSendPayment(ctx, {
        customerId: data.customerId!,
        addressId: data.addressId!,
        productId: data.selectedProductId!,
        userId: data.userId!,
      });
    } else {
      await this.conversationStore.delete(this.key(ctx));
      await ctx.whatsapp.sendTextMessage(
        "Order cancelled. Let me know if there's anything else I can help with! 😊",
      );
    }
  }

  // ─── Create Order + Payment ─────────────────────────────────────────────────

  private async createOrderAndSendPayment(
    ctx: WorkflowContext,
    params: {
      customerId: string;
      addressId: string;
      productId: string;
      userId: string;
    },
  ): Promise<void> {
    const product = await this.productRepository.findById(params.productId);
    if (!product) {
      await ctx.whatsapp.sendTextMessage(
        "That product is no longer available. Sorry!",
      );
      await this.conversationStore.delete(this.key(ctx));
      return;
    }

    // Create the order in DB
    const order = await this.orderRepository.create({
      productName: product.name,
      amount: product.price,
      currency: "INR",
      status: "PENDING",
      customer: { connect: { id: params.customerId } },
      user: { connect: { id: params.userId } },
      shippingAddress: { connect: { id: params.addressId } },
    });

    try {
      // Try to get the active payment provider (Stripe / Razorpay / etc.)
      const provider = await PaymentIntegrationManager.getActiveProvider(
        params.userId,
      );

      const paymentLink = await provider.createPaymentLink({
        amount: Math.round(product.price * 100), // convert to paise/cents
        currency: "INR",
        productName: product.name,
        customerPhone: ctx.message.customerWaId,
        orderId: order.id,
        organizationId: params.userId,
      });

      // Update order with payment link
      await this.orderRepository.updatePaymentLink(order.id, paymentLink.url);

      await ctx.whatsapp.sendTextMessage(
        `✅ *Order Confirmed!*\n\n` +
          `📦 Product: ${product.name}\n` +
          `💰 Amount: ₹${product.price}\n` +
          `🆔 Order ID: ${order.id.slice(0, 8).toUpperCase()}\n\n` +
          `Complete your payment here:\n💳 ${paymentLink.url}\n\n` +
          `We'll ship once the payment is received!`,
      );
    } catch (paymentError) {
      console.warn("[OrderHandler] Payment provider error:", paymentError);

      // Fallback receipt without payment link
      await ctx.whatsapp.sendTextMessage(
        `✅ *Order Received!*\n\n` +
          `📦 Product: ${product.name}\n` +
          `💰 Amount: ₹${product.price}\n` +
          `🆔 Order ID: ${order.id.slice(0, 8).toUpperCase()}\n\n` +
          `Our team will contact you to arrange payment and delivery. Thank you! 🙏`,
      );
    }

    await this.conversationStore.delete(this.key(ctx));
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private key(ctx: WorkflowContext) {
    return `${ctx.message.phoneNumberId}:${ctx.message.customerWaId}`;
  }

  private askForCategory(ctx: WorkflowContext) {
    return ctx.whatsapp.sendTextMessage(
      "What product would you like to order? Type the product name and I'll search for it! 🛒",
    );
  }
}
