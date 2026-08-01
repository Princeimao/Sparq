import { prisma } from "../config/prisma";

/**
 * FlowPublishService
 *
 * Handles publishing a Sparq Flow to the Meta WhatsApp Flow Builder.
 * When a flow is "published", we mark it PUBLISHED in the DB and
 * store the Meta flow ID in whatsappSchema for the worker to use.
 *
 * Note: Full Meta Flow Builder API integration requires an approved WABA
 * with the "Flows" feature. This service provides the scaffolding — replace
 * the marked section with your actual Meta API call when ready.
 */
export class FlowPublishService {
  async publishFlow(flowId: string, userId: string) {
    // 1. Load the flow + user's WhatsApp integration
    const flow = await prisma.flow.findFirst({
      where: { id: flowId, userId },
    });

    if (!flow) {
      throw new Error("Flow not found.");
    }

    const whatsappIntegration = await prisma.whatsappIntegration.findFirst({
      where: { userId },
    });

    if (!whatsappIntegration) {
      throw new Error(
        "No WhatsApp integration found. Please connect WhatsApp first.",
      );
    }

    // 2. ─── META FLOW BUILDER API CALL (stub) ─────────────────────────────
    //
    // In production, call the Meta Graph API to create/update the flow:
    //
    //   POST https://graph.facebook.com/v25.0/{wabaId}/flows
    //   { "name": flow.name, "categories": ["CUSTOMER_SUPPORT"] }
    //
    // Then upload the flow JSON via:
    //   POST https://graph.facebook.com/v25.0/{flowId}/assets
    //
    // For now, we generate a synthetic whatsapp flow ID so the worker
    // can reference it until the full Meta integration is wired.
    // ─────────────────────────────────────────────────────────────────────

    const syntheticMetaFlowId = `sparq_flow_${flow.id.slice(0, 8)}`;

    // 3. Persist published state
    const updated = await prisma.flow.update({
      where: { id: flowId },
      data: {
        status: "PUBLISHED",
        whatsappSchema: {
          flowId: syntheticMetaFlowId,
          wabaId: whatsappIntegration.wabaId,
          publishedAt: new Date().toISOString(),
        },
      },
    });

    return {
      flowId: updated.id,
      metaFlowId: syntheticMetaFlowId,
      status: updated.status,
    };
  }
}
