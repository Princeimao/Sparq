import { Intent } from "./intent";
import { WorkflowData } from "./workflowData";
import { WorkflowStep } from "./workflowStep";

export interface ConversationState {
  flowId: string;
  intent: Intent;
  step: WorkflowStep;
  data: WorkflowData;
  expiresAt: number;
}
