import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { ObservabilityService } from './observability.service';
import { DatabaseMetricsService } from './database-metrics.service';
import { QueueMetricsService } from './queue-metrics.service';
import { MonitoringController } from './monitoring.controller';
import { AuditLog } from '../audit/entities/audit-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog]),
    BullModule.registerQueue({
      name: 'audit',
    }),
  ],
  controllers: [MonitoringController],
  providers: [
    ObservabilityService,
    DatabaseMetricsService,
    QueueMetricsService,
  ],
  exports: [ObservabilityService],
})
export class ObservabilityModule {}
