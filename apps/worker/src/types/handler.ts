import { WorkflowContext } from "./workflowContext";

export interface WorkflowHandler {
  start(ctx: WorkflowContext): Promise<void>;

  resume(ctx: WorkflowContext): Promise<void>;
}
