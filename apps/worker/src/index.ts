import { startWhatsAppWorker } from "./workers/whatsapp.worker";

console.log("Starting workers...");

startWhatsAppWorker();

console.log("All workers are running.");
