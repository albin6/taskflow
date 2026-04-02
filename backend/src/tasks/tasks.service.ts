import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { User } from '../users/entities/user.entity';
import { Team } from '../teams/entities/team.entity';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { Permissions } from '../common/constants/permissions';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
  ) {}

  async create(createTaskDto: CreateTaskDto, actor: any): Promise<Task> {
    const { title, description, status, priority, dueDate, assigneeId } = createTaskDto;

    // 1. Determine Team
    // If actor is Admin (level 0), they can skip having a teamId generally, but tasks MUST belong to a team.
    // For now we assume creators have a team or actor has teamId attached from decorator context.
    const teamId = actor.teamId; 
    if (!teamId) {
       throw new ForbiddenException('Global Admins must specify or act within a team scope context for tasks.');
    }

    const team = await this.teamRepository.findOne({ where: { id: teamId } });
    if (!team) throw new NotFoundException('Team not found for task setup.');

    let assignee: User | null = null;
    if (assigneeId) {
       assignee = await this.userRepository.findOne({ where: { id: assigneeId }, relations: ['role', 'team'] });
       if (!assignee) throw new NotFoundException(`Assignee with ID "${assigneeId}" not found.`);
       if (assignee.team?.id !== teamId) {
          throw new ConflictException('Assignee must belong to the same team.');
       }

       // Hierarchy Check: Cannot assign to higher hierarchy levels (lower number)
       const assigneeLevel = assignee.role?.level ?? 99;
       if (assigneeLevel < actor.level) {
          throw new ForbiddenException('Cannot assign tasks to members with a higher role level.');
       }
    }

    const task = this.taskRepository.create({
      title,
      description,
      status: status || undefined,
      priority: priority || undefined,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      assignee,
      assigner: assignee ? ({ id: actor.userId } as any) : null,
      creator: { id: actor.userId } as any,
      team,
    });

    return this.taskRepository.save(task);
  }

  async findAll(actor: any, page = 1, limit = 20): Promise<{ tasks: Task[], total: number }> {
    const skip = (page - 1) * limit;
    
    const query = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.assignee', 'assignee')
      .leftJoinAndSelect('task.creator', 'creator')
      .leftJoinAndSelect('creator.role', 'creator_role')
      .leftJoinAndSelect('task.assigner', 'assigner')
      .leftJoinAndSelect('task.team', 'team')
      .select([
        'task.id', 'task.title', 'task.description', 'task.status', 'task.priority', 'task.dueDate', 'task.createdAt',
        'assignee.id', 'assignee.name', 'assignee.email',
        'assigner.id', 'assigner.name',
        'creator.id', 'creator.name', 'creator_role.level',
        'team.id', 'team.name',
      ])
      .orderBy('task.createdAt', 'DESC');

    if (actor.level !== 0 && actor.teamId) {
       // All users (Heads, Leads, Members) only see tasks they created or are assigned to
       query.where('team.id = :teamId AND (creator.id = :userId OR assignee.id = :userId)', { 
           teamId: actor.teamId, 
           userId: actor.userId 
       });
    }

    query.andWhere('task.status != :approved', { approved: 'APPROVED' });
    
    const [tasks, total] = await query
      .skip(skip)
      .take(limit)
      .getManyAndCount();
    
    return { tasks, total };
  }

  async findOne(id: string): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['assignee', 'assigner', 'creator', 'creator.role', 'team'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID "${id}" not found.`);
    }

    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, actor: any): Promise<Task> {
    const task = await this.findOne(id);

    // Validate Team Scope (Actor cannot edit other team's tasks unless level 0)
    if (actor.level !== 0 && task.team?.id !== actor.teamId) {
      throw new ForbiddenException('You cannot update tasks outside your team.');
    }

    const isOwner = task.creator?.id === actor.userId;
    const hasPermission = actor.permissions?.includes(Permissions.EDIT_TASK);
    const isManager = actor.level <= 2 && task.team?.id === actor.teamId;

    const isAssignee = task.assignee?.id === actor.userId;

    if (actor.level !== 0 && !isOwner && !hasPermission && !isManager && !isAssignee) {
      throw new ForbiddenException('You can only update tasks you created or are assigned to.');
    }

    // Role Restriction: Metadata (Title/Desc/Priority/Assignee/Deadline) can only be edited by the creator.
    const isMetadataChanged = updateTaskDto.title || updateTaskDto.description !== undefined || updateTaskDto.priority || updateTaskDto.dueDate !== undefined || updateTaskDto.assigneeId !== undefined;
    if (actor.level !== 0 && isMetadataChanged && !isOwner) {
      throw new ForbiddenException('Only the task creator can edit task details.');
    }

    // Assignee Restriction: Assignees who aren't owners can ONLY update status (implied by previous rule, but explicit here for safety)
    if (isAssignee && !isOwner) {
      const updateKeys = Object.keys(updateTaskDto).filter(k => updateTaskDto[k as keyof typeof updateTaskDto] !== undefined);
      if (updateKeys.some(k => k !== 'status')) {
        throw new ForbiddenException('Assignees can only update task status.');
      }
    }

    if (updateTaskDto.status && ['APPROVED', 'REJECTED'].includes(updateTaskDto.status as any)) {
      throw new ForbiddenException('Status transitions to APPROVED or REJECTED must use explicit approval actions.');
    }

    if (updateTaskDto.status && updateTaskDto.status !== task.status) {
       // User requirement: "i only want the status updation of a task to be done by the user who created the task and the user who got assigned the task."
       if (actor.level !== 0 && !isOwner && !isAssignee) {
          throw new ForbiddenException('Only the task creator or assignee can update the task status.');
       }

       // User requirement: "they can change the status to previous... it shouldnt happend like that."
       const statusOrder: Record<string, number> = { 'TODO': 1, 'IN_PROGRESS': 2, 'BLOCKED': 2, 'DONE': 3, 'APPROVED': 4, 'REJECTED': 5 };
       const currentStatusLevel = statusOrder[task.status] || 0;
       const newStatusLevel = statusOrder[updateTaskDto.status as any] || 0;
       
       if (newStatusLevel < currentStatusLevel) {
          throw new ConflictException('Task status cannot be moved backwards manually.');
       }
    }

    if (updateTaskDto.title) task.title = updateTaskDto.title;
    if (updateTaskDto.description !== undefined) task.description = updateTaskDto.description;
    if (updateTaskDto.status) task.status = updateTaskDto.status;
    if (updateTaskDto.priority) task.priority = updateTaskDto.priority;
    if (updateTaskDto.dueDate !== undefined) task.dueDate = updateTaskDto.dueDate ? new Date(updateTaskDto.dueDate) : null;

    if (updateTaskDto.assigneeId !== undefined) {
      if (updateTaskDto.assigneeId === null) {
          task.assignee = null;
          task.assigner = null;
      } else {
          const assignee = await this.userRepository.findOne({ where: { id: updateTaskDto.assigneeId }, relations: ['role', 'team'] });
          if (!assignee) throw new NotFoundException(`Assignee with ID "${updateTaskDto.assigneeId}" not found.`);
          if (assignee.team?.id !== task.team?.id) {
             throw new ConflictException('Assignee must belong to the same team.');
          }

          // Hierarchy Check
          const assigneeLevel = assignee.role?.level ?? 99;
          if (assigneeLevel < actor.level) {
             throw new ForbiddenException('Cannot assign tasks to members with a higher role level.');
          }

          task.assignee = assignee;
          task.assigner = { id: actor.userId } as any; // Record new assigner
      }
    }
    return this.taskRepository.save(task);
  }

  async remove(id: string, actor: any): Promise<{ message: string }> {
    const task = await this.findOne(id);

    if (actor.level !== 0 && task.team?.id !== actor.teamId) {
      throw new ForbiddenException('You cannot delete tasks outside your team.');
    }

    const isOwner = task.creator?.id === actor.userId;

    if (actor.level !== 0 && !isOwner) {
      throw new ForbiddenException('Only the task creator can delete this task.');
    }

    await this.taskRepository.remove(task);
    return { message: `Task "${task.title}" deleted successfully.` };
  }

  async approve(id: string, actor: any) {
    const task = await this.findOne(id);
    const isAssigner = task.assigner?.id === actor.userId;
    const isManager = actor.level <= 2 && task.team?.id === actor.teamId;

    if (!isAssigner && !isManager && actor.level !== 0) {
      throw new ForbiddenException('Only the assigner or a manager can approve tasks.');
    }

    const isSelfAssigned = task.assignee?.id === task.creator?.id;
    if (isSelfAssigned) {
      const approverLevel = actor.level;
      const creatorLevel = task.creator?.role?.level ?? 99;
      if (approverLevel >= creatorLevel && actor.level !== 0) {
         throw new ForbiddenException('Self-assigned tasks require approval from a user with a higher role in the hierarchy.');
      }
    }

    if (task.status !== 'DONE' as any) {
      throw new ConflictException('Task is not in DONE status to approve.');
    }

    task.status = 'APPROVED' as any;
    return this.taskRepository.save(task);
  }

  async reject(id: string, actor: any) {
    const task = await this.findOne(id);
    const isAssigner = task.assigner?.id === actor.userId;
    const isManager = actor.level <= 2 && task.team?.id === actor.teamId;

    if (!isAssigner && !isManager && actor.level !== 0) {
      throw new ForbiddenException('Only the assigner or a manager can reject tasks.');
    }

    const isSelfAssigned = task.assignee?.id === task.creator?.id;
    if (isSelfAssigned) {
      const approverLevel = actor.level;
      const creatorLevel = task.creator?.role?.level ?? 99;
      if (approverLevel >= creatorLevel && actor.level !== 0) {
         throw new ForbiddenException('Self-assigned tasks require approval from a user with a higher role in the hierarchy.');
      }
    }

    if (task.status !== 'DONE' as any) {
      throw new ConflictException('Task is not in DONE status to reject.');
    }

    task.status = 'IN_PROGRESS' as any;
    return this.taskRepository.save(task);
  }
}
