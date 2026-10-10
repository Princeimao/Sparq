import { Queue } from "bullmq";
import { redis } from "../config/redis";
import type { WhatsAppJobData } from "@sparq/types";

export const whatsappQueue = new Queue<WhatsAppJobData>("whatsapp-messages", {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: { count: 100 },
  },
});

export async function enqueueWhatsAppMessage(
  data: WhatsAppJobData,
): Promise<void> {
  // jobId = stable message key: BullMQ drops duplicate adds, so webhook
  // retries and double-deliveries never create competing jobs.
  await whatsappQueue.add(`message_${data.messageId}`, data, {
    jobId: `wa-msg-${data.messageId}`,
  });
  console.log(
    `Enqueued message ${data.messageId} from ${data.customerWaId} for background processing`,
  );
}
