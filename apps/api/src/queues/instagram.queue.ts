import { Queue } from "bullmq";
import { redis } from "../config/redis";
import type { WhatsAppJobData } from "@sparq/types";

// Unified channel queue: the SAME "whatsapp-messages" queue and the SAME
// worker process Instagram jobs too — the job's `channel` field tells the
// worker which sender (WhatsAppService vs InstagramService) to reply with.
export const instagramQueue = new Queue<WhatsAppJobData>("whatsapp-messages", {
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

export async function enqueueInstagramMessage(
  data: WhatsAppJobData,
): Promise<void> {
  // jobId = stable message key: BullMQ drops duplicate adds, so webhook
  // retries and double-deliveries never create competing jobs.
  await instagramQueue.add(`message_${data.messageId}`, data, {
    jobId: `ig-msg-${data.messageId}`,
  });
  console.log(
    `Enqueued Instagram message ${data.messageId} from ${data.customerWaId} for background processing`,
  );
}
