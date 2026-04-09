import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class QueueMetricsService {
  constructor(
    @InjectQueue('audit') private readonly auditQueue: Queue,
  ) {}

  async getQueueStats() {
    const counts = await this.auditQueue.getJobCounts(
      'wait',
      'active',
      'completed',
      'failed',
      'delayed',
      'paused'
    );

    return {
      queueName: 'audit',
      backlog: counts.wait,
      active: counts.active,
      completed: counts.completed,
      failed: counts.failed,
      delayed: counts.delayed,
    };
  }
}
