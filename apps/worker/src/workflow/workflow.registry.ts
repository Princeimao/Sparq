import { Intent } from "../types/intent";
import { WorkflowHandler } from "../types/handler";

export class WorkflowRegistry {
  private handlers = new Map<Intent, WorkflowHandler>();

  register(intent: Intent, handler: WorkflowHandler) {
    this.handlers.set(intent, handler);
  }

  get(intent: Intent) {
    return this.handlers.get(intent);
  }
}
