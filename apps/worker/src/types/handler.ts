import { WorkflowContext } from "./workflowContext";
import { WhatsAppService } from "../services/whatsapp.service";

export interface WorkflowHandler {
  start(ctx: WorkflowContext): Promise<void>;

  resume(ctx: WorkflowContext): Promise<void>;
}
