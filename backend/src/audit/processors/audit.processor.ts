import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

@Processor('audit')
export class AuditProcessor extends WorkerHost {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    try {
      const payload = job.data;
      const log = this.auditLogRepository.create(payload);
      await this.auditLogRepository.save(log);
    } catch (err) {
      console.error(`AuditProcessor: Failed to process job ${job.id}:`, err);
      throw err; // Allow BullMQ to retry if needed
    }
  }
}
