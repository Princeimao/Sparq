import { Intent } from "./intent";
import { WorkflowData } from "./workflowData";

export interface ConversationState {
  flowId: string;
  intent: Intent;
  /**
   * The current step in the workflow. Typed as `string` so that
   * individual handlers can use their own step enums (OrderStep,
   * AppointmentStep, ReservationStep, etc.) without widening to a
   * union type here.
   */
  step: string;
  data: WorkflowData;
  expiresAt: number;
}
