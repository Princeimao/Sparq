import cron from "node-cron";
import { prisma } from "../config/prisma";
import { initiateReorderConversation } from "./conversation-engine";

let isRunning = false;

export async function checkReorderEligibility(): Promise<void> {
  if (isRunning) {
    console.log("Campaign engine already running, skipping...");
    return;
  }

  isRunning = true;
  console.log("Campaign engine: checking reorder eligibility...");

  try {
    const campaigns = await prisma.campaign.findMany({
      where: { isActive: true },
      include: {
        organization: {
          include: {
            integrations: {
              where: { type: "WHATSAPP", isActive: true },
              take: 1,
            },
          },
        },
      },
    });

    for (const campaign of campaigns) {
      // Skip orgs without active WhatsApp integration
      if (campaign.organization.integrations.length === 0) continue;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - campaign.reorderAfterDays);

      // Find completed orders older than the reorder threshold
      // that DON'T already have an active conversation
      const eligibleOrders = await prisma.order.findMany({
        where: {
          organizationId: campaign.organizationId,
          campaignId: campaign.id,
          status: "COMPLETED",
          purchaseDate: { lte: cutoffDate },
          customer: {
            optedIn: true,
          },
          // No active conversation for this order
          conversation: null,
        },
        include: {
          customer: true,
        },
      });

      console.log(
        `Campaign "${campaign.name}": ${eligibleOrders.length} eligible customers`
      );

      for (const order of eligibleOrders) {
        // Check if customer already has an active conversation
        const activeConversation = await prisma.conversationState.findFirst({
          where: {
            customerId: order.customerId,
            step: { notIn: ["COMPLETED", "CANCELLED"] },
          },
        });

        if (activeConversation) {
          console.log(`Skipping customer ${order.customer.phone} (active conversation)`);
          continue;
        }

        // Create a new pending order for the reorder
        const newOrder = await prisma.order.create({
          data: {
            organizationId: campaign.organizationId,
            customerId: order.customerId,
            campaignId: campaign.id,
            productName: campaign.productName || order.productName,
            amount: order.amount,
            currency: order.currency,
            status: "PENDING",
          },
        });

        // Initiate the reorder conversation
        await initiateReorderConversation(
          order.customerId,
          newOrder.id,
          campaign.productName || order.productName
        );

        console.log(
          `Reorder initiated for ${order.customer.phone} - ${campaign.productName || order.productName}`
        );

        // Rate limiting: small delay between messages
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  } catch (error) {
    console.error("Campaign engine error:", error);
  } finally {
    isRunning = false;
  }
}

/**
 * Start the campaign engine cron job.
 * Runs every hour by default.
 */
export function startCampaignEngine(): void {
  // Run every hour at minute 0
  cron.schedule("0 * * * *", async () => {
    await checkReorderEligibility();
  });

  console.log("Campaign engine started (runs every hour)");
}

/**
 * Manually trigger the campaign engine (for testing / admin API).
 */
export async function triggerCampaignEngine(): Promise<{ message: string }> {
  await checkReorderEligibility();
  return { message: "Campaign engine check completed" };
}
