import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull, Not } from 'typeorm';
import { Task } from '../tasks/entities/task.entity';
import { User } from '../users/entities/user.entity';
import { KpiSnapshot, KpiMetricType } from './entities/kpi-snapshot.entity';
import { TaskStatus } from '../common/enums/index';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class KpiService {
  private readonly logger = new Logger(KpiService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(KpiSnapshot)
    private readonly kpiSnapshotRepository: Repository<KpiSnapshot>,
  ) {}

  async getMemberPerformance(userId: string) {
    const totalTasks = await this.taskRepository.count({ where: { assignee: { id: userId } } });
    const completedTasks = await this.taskRepository.count({ 
      where: { 
        assignee: { id: userId }, 
        status: TaskStatus.APPROVED 
      } 
    });
    
    // Proper Overdue Logic: Not Approved/Done AND DueDate is in the past
    const now = new Date();
    const overdueTasks = await this.taskRepository
      .createQueryBuilder('task')
      .where('task.assigneeId = :userId', { userId })
      .andWhere('task.status NOT IN (:...finishedStatuses)', { 
        finishedStatuses: [TaskStatus.APPROVED, TaskStatus.DONE] 
      })
      .andWhere('task.dueDate IS NOT NULL')
      .andWhere('task.dueDate < :now', { now })
      .getCount();

    const resolutionTimeQuery = await this.taskRepository
      .createQueryBuilder('task')
      .select('AVG(EXTRACT(EPOCH FROM (task.updatedAt - task.createdAt)))', 'avgTime')
      .where('task.assigneeId = :userId', { userId })
      .andWhere('task.status = :status', { status: TaskStatus.APPROVED })
      .getRawOne();

    const avgResolutionTimeSeconds = parseFloat(resolutionTimeQuery?.avgTime) || 0;

    const statusDistribution = await this.taskRepository
      .createQueryBuilder('task')
      .select('task.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('task.assigneeId = :userId', { userId })
      .groupBy('task.status')
      .getRawMany();

    return {
      totalTasks,
      completedTasks,
      overdueTasks,
      completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      avgResolutionTimeHours: avgResolutionTimeSeconds / 3600,
      statusDistribution: statusDistribution.map(d => ({
        status: d.status,
        count: parseInt(d.count)
      }))
    };
  }

  async getTeamPerformance(teamId: string) {
    const users = await this.userRepository.find({ where: { team: { id: teamId } } });
    const performances = await Promise.all(
      users.map(async (user) => ({
        user: { id: user.id, name: user.name, email: user.email },
        metrics: await this.getMemberPerformance(user.id),
      }))
    );

    return {
      teamId,
      memberCount: users.length,
      performances,
      teamAverageCompletionRate: performances.length > 0 
        ? performances.reduce((acc, p) => acc + p.metrics.completionRate, 0) / performances.length 
        : 0,
    };
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateDailySnapshots() {
    this.logger.log('Starting daily KPI snapshot generation...');
    const users = await this.userRepository.find({ relations: ['team'] });

    for (const user of users) {
      const stats = await this.getMemberPerformance(user.id);
      
      const snapshots = [
        this.kpiSnapshotRepository.create({
          user,
          team: user.team,
          metricType: KpiMetricType.TASK_COMPLETION_RATE,
          value: stats.completionRate,
        }),
        this.kpiSnapshotRepository.create({
          user,
          team: user.team,
          metricType: KpiMetricType.AVG_RESOLUTION_TIME_MS,
          value: stats.avgResolutionTimeHours * 3600 * 1000,
        }),
        this.kpiSnapshotRepository.create({
          user,
          team: user.team,
          metricType: KpiMetricType.OVERDUE_TASK_COUNT,
          value: stats.overdueTasks,
        })
      ];

      await this.kpiSnapshotRepository.save(snapshots);
    }
    this.logger.log('KPI snapshots generated successfully.');
  }

  async getPerformanceHistory(userId: string, days: number = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await this.kpiSnapshotRepository.find({
      where: {
        user: { id: userId },
        timestamp: Between(startDate, new Date()),
      },
      order: { timestamp: 'ASC' },
    });
  }
}
