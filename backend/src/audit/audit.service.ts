import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
    @InjectQueue('audit')
    private readonly auditQueue: Queue,
  ) {}

  @OnEvent('audit.log', { async: true }) // async: true ensures it runs in a separate promise chain
  async handleAuditLog(payload: any) {
    try {
      // Performance/Stability: Push to persistent Redis-backed queue instead of immediate DB write.
      // This prevents App RAM growth and allows the DB to process logs at its own pace.
      await this.auditQueue.add('log', payload, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
      });
    } catch (err) {
      console.error('AuditService: Failed to queue background log:', err);
    }
  }

  async findAll(actor: any, queryParams: any): Promise<{ data: AuditLog[], meta: any }> {
    const { action, actorId, startDate, endDate, page = 1, limit = 10 } = queryParams;

    const query = this.auditLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.actor', 'actor')
      .leftJoinAndSelect('log.team', 'team')
      .select([
        'log.id', 'log.actionType', 'log.targetEntity', 'log.details', 'log.timestamp',
        'actor.id', 'actor.name', 'actor.email',
        'team.id', 'team.name',
      ])
      .orderBy('log.timestamp', 'DESC');

    // 1. Enforce Scope
    if (actor.level !== 0 && actor.teamId) {
      query.where('team.id = :teamId', { teamId: actor.teamId });
    }

    // 2. Apply Optional Filters
    if (action) {
      query.andWhere('log.actionType LIKE :action', { action: `%${action}%` });
    }

    if (actorId) {
      query.andWhere('actor.id = :actorId', { actorId });
    }

    if (startDate && endDate) {
      query.andWhere('log.timestamp BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });
    }

    const skipAmount = (page - 1) * limit;
    query.skip(skipAmount).take(limit);

    const [data, total] = await query.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<AuditLog> {
    const log = await this.auditLogRepository.findOne({
      where: { id },
      relations: ['actor', 'team'],
    });

    if (!log) {
      throw new NotFoundException(`Audit Log with ID "${id}" not found.`);
    }

    return log;
  }
}
