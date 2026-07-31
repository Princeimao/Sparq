import { Queue } from "bullmq";
import { redis } from "../config/redis";
import type { WhatsAppJobData } from '@sparq/types'

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
  await whatsappQueue.add(`message_${data.messageId}`, data);
  console.log(
    `Enqueued message ${data.messageId} from ${data.customerWaId} for background processing`,
  );
}
