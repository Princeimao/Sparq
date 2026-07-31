import { BaseRepository } from "./base.repository";
import { WorkflowType } from "../types/workflow";

export class FlowRepository extends BaseRepository {
  async findPublishedFlowById(userId: string, type: WorkflowType) {
    return this.prisma.flow.findFirst({
      where: {
        userId,
        status: "PUBLISHED",
      },
    });
  }

  async findPublishedFlowByNumberId(phoneNumberId: string) {
    return this.prisma.flow.findFirst({
      where: {
        user: {
          whatsappIntegrations: {
            phoneNumberId,
          },
        },
        status: "PUBLISHED",
      },
    });
  }
}
