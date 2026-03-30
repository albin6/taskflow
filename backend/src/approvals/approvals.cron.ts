import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ApprovalsService } from './approvals.service';

@Injectable()
export class ApprovalsCron {
  private readonly logger = new Logger(ApprovalsCron.name);

  constructor(private readonly approvalsService: ApprovalsService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleEscalation() {
    this.logger.log('Running registration approval escalation job...');
    try {
      await this.approvalsService.escalatePendingRequests();
    } catch (error) {
      this.logger.error('Error during registration escalation:', error.stack);
    }
  }
}
