import { Injectable, Logger, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RecurringTask } from './entities/recurring-task.entity';
import { Task } from './entities/task.entity';
import { User } from '../users/entities/user.entity';
import { Team } from '../teams/entities/team.entity';
import { CreateRecurringTaskDto, UpdateRecurringTaskDto } from './dto/recurring-task.dto';
import { RecurrenceFrequency, TaskStatus, UserStatus } from '../common/enums';
import { In } from 'typeorm';

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

    const assignees = await this.userRepository.find({
      where: { id: In(assigneeIds) },
      relations: ['role']
    });
    if (assignees.length === 0) throw new NotFoundException('No valid assignees found');

    for (const assignee of assignees) {
      // Status Check: Cannot assign to PENDING users
      if (assignee.status !== UserStatus.ACTIVE) {
        throw new ConflictException(`Cannot assign tasks to members who are not approved/active: ${assignee.name}`);
      }

      // Hierarchy Check: Cannot assign to peers or superiors
      if (actor.level !== 0) {
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
    const query = this.recurringTaskRepository.createQueryBuilder('rt')
      .leftJoinAndSelect('rt.assignees', 'assignee')
      .leftJoinAndSelect('rt.creator', 'creator')
      .leftJoinAndSelect('rt.team', 'team')
      .where('team.id = :teamId', { teamId: actor.teamId });

    if (actor.level !== 0 && actor.level > 2) {
      query.andWhere('(creator.id = :userId OR assignee.id = :userId)', {
        userId: actor.userId
      });
    }

    return query.getMany();
  }

  async remove(id: string, actor: any): Promise<void> {
    const task = await this.recurringTaskRepository.findOne({ 
      where: { id }, 
      relations: ['team', 'creator'] 
    });
    if (!task) throw new NotFoundException('Recurring task not found');
    
    if (actor.level !== 0) {
      if (task.team.id !== actor.teamId) throw new ForbiddenException('Task is outside your team');
      if (task.creator?.id !== actor.userId) throw new ForbiddenException('Only the creator can delete this recurring task');
    }

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

    const updatedRTs: RecurringTask[] = [];
    for (const rt of tasksToRun) {
      try {
        await this.generateTaskInstances(rt);
        
        rt.lastRunDate = now;
        rt.nextRunDate = this.calculateNextRunDate(rt.nextRunDate, rt.frequency, rt.daysOfWeek);
        
        // Check if we passed the end date
        if (rt.endDate && rt.nextRunDate > rt.endDate) {
          rt.isActive = false;
        }
        updatedRTs.push(rt);
      } catch (err) {
        this.logger.error(`Failed to generate task for RT ${rt.id}`, err.stack);
      }
    }

    if (updatedRTs.length > 0) {
      // Performance: Bulk save to reduce DB roundtrips from 2N to 1
      await this.recurringTaskRepository.save(updatedRTs);
    }
  }

  private async generateTaskInstances(rt: RecurringTask) {
    const tasks = rt.assignees.map(assignee => this.taskRepository.create({
      title: rt.title,
      description: rt.description,
      priority: rt.priority,
      status: TaskStatus.TODO,
      assignee,
      creator: rt.creator,
      team: rt.team,
      dueDate: rt.nextRunDate,
    }));

    if (tasks.length > 0) {
      // Performance: Bulk insert tasks instead of individual saves in a loop
      await this.taskRepository.insert(tasks);
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
