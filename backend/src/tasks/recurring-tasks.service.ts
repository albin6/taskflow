import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RecurringTask } from './entities/recurring-task.entity';
import { Task } from './entities/task.entity';
import { User } from '../users/entities/user.entity';
import { Team } from '../teams/entities/team.entity';
import { CreateRecurringTaskDto, UpdateRecurringTaskDto } from './dto/recurring-task.dto';
import { RecurrenceFrequency, TaskStatus } from '../common/enums';

@Injectable()
export class RecurringTasksService {
  private readonly logger = new Logger(RecurringTasksService.name);

  constructor(
    @InjectRepository(RecurringTask)
    private readonly recurringTaskRepository: Repository<RecurringTask>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
  ) {}

  async create(dto: CreateRecurringTaskDto, actor: any): Promise<RecurringTask> {
    const { assigneeIds, ...rest } = dto;
    
    const team = await this.teamRepository.findOne({ where: { id: actor.teamId } });
    if (!team) throw new NotFoundException('Team not found');

    const assignees = await this.userRepository.findByIds(assigneeIds);
    if (assignees.length === 0) throw new NotFoundException('No valid assignees found');

    const startDate = new Date(dto.startDate);
    const nextRunDate = this.calculateNextRunDate(startDate, dto.frequency, dto.daysOfWeek || []);

    const recurringTask = this.recurringTaskRepository.create({
      ...rest,
      startDate,
      nextRunDate,
      creator: { id: actor.userId } as any,
      team,
      assignees,
    });

    return this.recurringTaskRepository.save(recurringTask);
  }

  async findAll(actor: any): Promise<RecurringTask[]> {
    return this.recurringTaskRepository.find({
      where: { team: { id: actor.teamId } },
      relations: ['assignees', 'creator'],
    });
  }

  async remove(id: string, actor: any): Promise<void> {
    const task = await this.recurringTaskRepository.findOne({ 
      where: { id }, 
      relations: ['team'] 
    });
    if (!task) throw new NotFoundException();
    if (actor.level !== 0 && task.team.id !== actor.teamId) throw new ForbiddenException();

    await this.recurringTaskRepository.remove(task);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleCron() {
    this.logger.debug('Running recurring task generation cycle...');

    const now = new Date();
    const tasksToRun = await this.recurringTaskRepository.find({
      where: {
        isActive: true,
        nextRunDate: LessThanOrEqual(now),
      },
      relations: ['assignees', 'team', 'creator'],
    });

    for (const rt of tasksToRun) {
      try {
        await this.generateTaskInstances(rt);
        
        rt.lastRunDate = now;
        rt.nextRunDate = this.calculateNextRunDate(rt.nextRunDate, rt.frequency, rt.daysOfWeek);
        
        // Check if we passed the end date
        if (rt.endDate && rt.nextRunDate > rt.endDate) {
          rt.isActive = false;
        }

        await this.recurringTaskRepository.save(rt);
      } catch (err) {
        this.logger.error(`Failed to generate task for RT ${rt.id}`, err.stack);
      }
    }
  }

  private async generateTaskInstances(rt: RecurringTask) {
    for (const assignee of rt.assignees) {
      const task = this.taskRepository.create({
        title: rt.title,
        description: rt.description,
        priority: rt.priority,
        status: TaskStatus.TODO,
        assignee,
        creator: rt.creator,
        team: rt.team,
        dueDate: rt.nextRunDate, // Set due date to the scheduled execution time
      });
      await this.taskRepository.save(task);
    }
  }

  private calculateNextRunDate(current: Date, freq: RecurrenceFrequency, days: string[]): Date {
    const next = new Date(current);

    if (freq === RecurrenceFrequency.DAILY) {
      next.setDate(next.getDate() + 1);
    } else if (freq === RecurrenceFrequency.WEEKLY) {
      if (!days || days.length === 0) {
        next.setDate(next.getDate() + 7);
      } else {
        // Find next day in the list
        const dayMap: Record<string, number> = {
          'SUNDAY': 0, 'MONDAY': 1, 'TUESDAY': 2, 'WEDNESDAY': 3, 'THURSDAY': 4, 'FRIDAY': 5, 'SATURDAY': 6
        };
        const targetDays = days.map(d => dayMap[d.toUpperCase()]).sort();
        
        let found = false;
        for (let i = 1; i <= 7; i++) {
          const check = new Date(current);
          check.setDate(check.getDate() + i);
          if (targetDays.includes(check.getDay())) {
            return check;
          }
        }
        // Fallback
        next.setDate(next.getDate() + 7);
      }
    } else if (freq === RecurrenceFrequency.MONTHLY) {
      next.setMonth(next.getMonth() + 1);
    }

    return next;
  }
}
