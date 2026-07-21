import { Worker, Job } from "bullmq";
import { redis } from "../config/redis";
import { prisma } from "../config/prisma";
import { WhatsAppService } from "../services/whatsapp.service";
import { PaymentIntegrationManager } from "../services/integrations";
import { llmService } from "../services/llm.service";
import { WhatsAppJobData } from "../queues/whatsapp.queue";

const getStateKey = (customerWaId: string) => `sparq:conversation:${customerWaId}`;

export function startWhatsAppWorker() {
  console.log("Initializing WhatsApp BullMQ worker...");

  const worker = new Worker<WhatsAppJobData>(
    "whatsapp-messages",
    async (job: Job<WhatsAppJobData>) => {
      const { messageId, phoneNumberId, wabaId, customerWaId, customerName, text } = job.data;

      console.log(`[Worker] Processing job ${job.id} for message: "${text}" from: ${customerWaId}`);

      try {
        const customer = await prisma.customer.findFirst({
          where: {
            phone: customerWaId,
            organization: {
              whatsappIntegrations: {
                some: {
                  wabaId: wabaId,
                  phoneNumberId: phoneNumberId,
                  isActive: true
                }
              }
            }
          },
          include: {
            conversations: true,
            organization: true,
            orders: true
          }
        })

        const whatsapp = new WhatsAppService({
          customerName, customerWaId, phoneNumberId, wabaId, messageId, text,
        })

        if (!customer) {
          // send message to LLM. 
          const redisState = await redis.get(getStateKey(customerWaId));
          if (!redisState) {
            const res = await llmService.findProduct(text);

            if (res.intent === "ORDER_PRODUCT" && res.productQuery) {
              const products = await prisma.product.findMany({
                take: 5,
                where: {
                  name: {
                    contains: res.productQuery,
                    mode: "insensitive",
                  },
                  organization: {
                    whatsappIntegrations: {
                      some: {
                        wabaId: wabaId,
                        phoneNumberId: phoneNumberId,
                        isActive: true
                      }
                    }
                  },
                }
              })

              // store state in redis
              await redis.set(getStateKey(customerWaId), JSON.stringify({
                intent: res.intent,
                productQuery: res.productQuery,
                quantity: res.quantity,
                products
              }));

              redis.expire(getStateKey(customerWaId), 60 * 60);

              const result = await whatsapp.sendList({
                headerMessage: res.headerMessage,
                actionText: res.actionText,
                type: res.type,
                listItems: products.map(prod => ({
                  id: prod.id,
                  title: prod.name.slice(0, 24),
                  price: prod.price.toString(),
                })),
                footerMessage: res.footerMessage,
                title: res.title
              })

              if (!result.success) {
                await whatsapp.sendTextMessage("I was unable to send you the list of products. Please try again.");
                console.log(result.error)
              }

            } else {
              await whatsapp.sendTextMessage("I was unable to understand your request. Please try again.");
            }
          }

        } else {
        }
      } catch (error) {
        console.error(`[Worker] Error processing job ${job.id}:`, error);
        throw error;
      }
    },
    {
      connection: redis,
      concurrency: 15,
      limiter: {
        max: 50,
        duration: 1000,
      },
    }
  );

  worker.on("completed", (job) => {
    console.log(`[Worker] Job ${job.id} completed successfully`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed with error:`, err);
  });

  return worker;
}

async function finalizeOrderAndNotify({
  prismaClient,
  organizationId,
  customer,
  pendingOrder,
  address,
  whatsappService,
}: {
  prismaClient: typeof prisma;
  organizationId: string;
  customer: any;
  pendingOrder: { productName: string; amount: number; currency: string };
  address: string;
  whatsappService: WhatsAppService;
}) {
  const order = await prismaClient.order.create({
    data: {
      organizationId,
      customerId: customer.id,
      productName: pendingOrder.productName,
      amount: pendingOrder.amount,
      currency: pendingOrder.currency,
      status: "PENDING",
    },
  });

  try {
    const paymentProvider = await PaymentIntegrationManager.getActiveProvider(organizationId);

    const paymentLink = await paymentProvider.createPaymentLink({
      amount: Math.round(pendingOrder.amount * 100),
      currency: pendingOrder.currency,
      productName: pendingOrder.productName,
      customerPhone: customer.phone,
      orderId: order.id,
      organizationId,
    });

    await prismaClient.order.update({
      where: { id: order.id },
      data: { paymentLink: paymentLink.url },
    });

    await whatsappService.sendTextMessage(
      `Thank you! Order placed for ${pendingOrder.productName}.\n\nDeliver to:\n📍 ${address}\n\nHere is your payment link to complete the order:\n💳 ${paymentLink.url}\n\nOnce paid, we will ship it out!`
    );

    await prismaClient.message.create({
      data: {
        customerId: customer.id,
        direction: "OUTBOUND",
        body: `Payment link sent: ${paymentLink.url}`,
        status: "SENT",
      },
    });

  } catch (paymentError: any) {
    console.warn(`[Worker] Payment connection not found or error:`, paymentError.message);

    // Fallback: If payment integration is not set up, send the receipt instead
    const receiptMessage = `Thank you! Order placed for ${pendingOrder.productName}.\n\n🧾 Order Receipt:\n- Order ID: ${order.id}\n- Product: ${pendingOrder.productName}\n- Amount: ${pendingOrder.currency} ${pendingOrder.amount}\n- Delivery Address: ${address}\n\n(Online payment is currently unavailable for this store. We will contact you to arrange payment/delivery!)`;

    await whatsappService.sendTextMessage(receiptMessage);

    await prismaClient.message.create({
      data: {
        customerId: customer.id,
        direction: "OUTBOUND",
        body: receiptMessage,
        status: "SENT",
      },
    });
  }
}
