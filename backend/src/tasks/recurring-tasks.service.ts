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

    // Hierarchy Check: Creator cannot assign to peers or superiors
    if (actor.level !== 0) {
      for (const assignee of assignees) {
        const assigneeLevel = assignee.role?.level ?? 99;
        if (assigneeLevel <= actor.level) {
          throw new ForbiddenException(`Cannot assign recurring tasks to peer or superior: ${assignee.name}`);
        }
      }
    }

    const now = new Date();
    const startDate = new Date(dto.startDate);
    startDate.setHours(0, 0, 0, 0); // Normalize to midnight
    
    // Initializing object
    const recurringTask = this.recurringTaskRepository.create({
      ...rest,
      startDate,
      creator: { id: actor.userId } as any,
      team,
      assignees,
      isActive: true,
    });

    // Immediate Execution Check: If startDate is today or past, generate first set now
    if (startDate <= now) {
      // We set nextRunDate to startDate initially for the generator to know the context (mostly due date)
      recurringTask.nextRunDate = startDate; 
      
      // Save it first to ensure we have an ID for relations if needed
      const savedRT = await this.recurringTaskRepository.save(recurringTask);
      
      // Generate the first instance immediately
      await this.generateTaskInstances(savedRT);
      
      // Move to the next interval
      savedRT.lastRunDate = now;
      savedRT.nextRunDate = this.calculateNextRunDate(startDate, dto.frequency, dto.daysOfWeek || []);
      
      return this.recurringTaskRepository.save(savedRT);
    } else {
      // Future start: Just set the first run to the startDate
      recurringTask.nextRunDate = startDate;
      return this.recurringTaskRepository.save(recurringTask);
    }
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
