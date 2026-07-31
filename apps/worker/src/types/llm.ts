import { Intent } from "./intent";
import { ExtractedEntities } from "./entries";

export interface LLMResponse {
  intent: Intent;
  confidence: number;
  needsSelection: boolean;
  entities: ExtractedEntities;
}
