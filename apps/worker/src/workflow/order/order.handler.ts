import { CustomerRepository } from "../../repository/customer.repository";
import { ProductRepository } from "../../repository/product.repository";
import { ConversationStore } from "../../services/store/conversation.store";
import { WorkflowHandler } from "../../types/handler";
import { WorkflowContext } from "../../types/workflowContext";
import { OrderStep } from "./order.state";

export class OrderHandler implements WorkflowHandler {
  constructor(
    private productRepository: ProductRepository,
    private customerRepository: CustomerRepository,
    private conversationStore: ConversationStore,
    private whatsappService: WhatsAppService,
  ) {}

  async start(ctx: WorkflowContext) {
    const query = ctx.llm?.entities.productQuery;

    if (!query) {
      return this.askForCategory(ctx);
    }

    const products = await this.productRepository.search(
      ctx.message.phoneNumberId,
      query,
    );

    if (products.length === 0) {
      await this.whatsappService.sendTextMessage(
        "I couldn't find that product.",
      );

      return;
    }

    await this.conversationStore.set(this.key(ctx), {
      flowId: "ORDER",
      intent: "ORDER_PRODUCT",
      step: OrderStep.WAITING_PRODUCT_SELECTION,
      data: {
        productIds: products.map((p) => p.id),
      },
      expiresAt: Date.now() + 3600000,
    });

    await this.whatsappService.sendList({
      title: "Choose a product",
      items: products.map((product) => ({
        id: product.id,
        title: product.name,
        price: product.price.toString(),
      })),
    });
  }

  async resume(ctx: WorkflowContext) {
    switch (ctx.state?.step) {
      case OrderStep.WAITING_PRODUCT_SELECTION:
        return this.productSelected(ctx);

      case OrderStep.WAITING_ADDRESS_CONFIRMATION:
        return this.confirmAddress(ctx);

      default:
        throw new Error("Unknown order step");
    }
  }

  private async productSelected(ctx: WorkflowContext) {
    const productId = ctx.message.interactiveId;

    const customer = await this.customerRepository.findByPhone(
      ctx.message.customerWaId,
      ctx.message.phoneNumberId,
    );

    if (!customer) {
      return this.requestCustomerDetails(ctx);
    }

    return this.confirmCustomerAddress(ctx, customer);
  }

  private async requestCustomerDetails(ctx: WorkflowContext) {
    await this.whatsappService.sendFlow({
      flowId: "CUSTOMER_DETAILS",
    });
  }

  private async confirmAddress(ctx: WorkflowContext) {
    // create order here
  }

  private async confirmCustomerAddress(ctx, customer) {
    await this.whatsappService.sendButtons({
      text: `Deliver to ${customer.address}?`,

      buttons: [
        {
          id: "CONFIRM_ADDRESS",
          title: "Yes",
        },

        {
          id: "CHANGE_ADDRESS",
          title: "Change",
        },
      ],
    });
  }

  private key(ctx: WorkflowContext) {
    return `${ctx.message.phoneNumberId}:${ctx.message.customerWaId}`;
  }
}
