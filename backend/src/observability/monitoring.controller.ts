import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from './guards/api-key.guard';
import { ObservabilityService } from './observability.service';
import { DatabaseMetricsService } from './database-metrics.service';
import { QueueMetricsService } from './queue-metrics.service';

@Controller('monitoring')
@UseGuards(ApiKeyGuard)
export class MonitoringController {
  constructor(
    private readonly observabilityService: ObservabilityService,
    private readonly dbMetrics: DatabaseMetricsService,
    private readonly queueMetrics: QueueMetricsService,
  ) {}

  @Get('status')
  async getStatus() {
    return {
      timestamp: new Date().toISOString(),
      ...(this.observabilityService.getAppHealth()),
      database: this.dbMetrics.getPoolStats(),
      redis: await this.queueMetrics.getQueueStats(),
    };
  }
}
