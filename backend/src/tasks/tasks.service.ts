import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { User } from '../users/entities/user.entity';
import { Team } from '../teams/entities/team.entity';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { Permissions } from '../common/constants/permissions';
import { UserStatus } from '../common/enums/index';

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

       // Hierarchy Check: Cannot assign to SUPERIORS (lower number)
       const assigneeLevel = assignee.role?.level ?? 99;
       if (assigneeLevel < actor.level && actor.level !== 0) {
          throw new ForbiddenException('Cannot assign tasks to members with a higher role level (Superiors).');
       }

       // Status Check: Cannot assign to PENDING/REJECTED/SUSPENDED users
       if (assignee.status !== UserStatus.ACTIVE) {
          throw new ConflictException('Cannot assign tasks to members who are not approved/active.');
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

  async findAll(actor: any, page = 1, limit = 20, filterByAssigneeId?: string, filterByCreatorId?: string): Promise<{ tasks: Task[], total: number }> {
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

    if (actor.level !== 0) {
      // Non-Admin: MUST have a team to see any tasks
      if (!actor.teamId) {
        return { tasks: [], total: 0 };
      }

      // Restrict to their own team
      query.andWhere('team.id = :teamId', { teamId: actor.teamId });

      // Role-Based Detail Visibility
      // Executive (Level 3+) sees only tasks they part of
      if (actor.level > 2) {
        query.andWhere('(creator.id = :userId OR assignee.id = :userId)', {
          userId: actor.userId
        });
      }
      // Manager/Head (Level 1-2) can see ALL tasks in their team
    }

    if (filterByAssigneeId) {
      query.andWhere('assignee.id = :filterByAssigneeId', { filterByAssigneeId });
    }

    if (filterByCreatorId) {
      query.andWhere('creator.id = :filterByCreatorId', { filterByCreatorId });
    }

    query.andWhere('task.status != :approved', { approved: 'APPROVED' });
    
    const [tasks, total] = await query
      .skip(skip)
      .take(limit)
      .getManyAndCount();
    
    return { tasks, total };
  }

  async findOne(id: string, actor: any): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id },
      relations: ['assignee', 'assigner', 'creator', 'creator.role', 'team'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID "${id}" not found.`);
    }

    if (actor.level !== 0) {
      // Must be same team
      if (task.team?.id !== actor.teamId) {
        throw new ForbiddenException('You cannot access tasks outside your team.');
      }

      // If Executive, must be involved
      if (actor.level > 2) {
        const isInvolved = task.creator?.id === actor.userId || task.assignee?.id === actor.userId;
        if (!isInvolved) {
          throw new ForbiddenException('You do not have permission to view this task.');
        }
      }
    }

    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, actor: any): Promise<Task> {
    const task = await this.findOne(id, actor);

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

    // Role Restriction: Metadata can only be edited by the creator.
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
        const assignee = await this.userRepository.findOne({ 
          where: { id: updateTaskDto.assigneeId }, 
          relations: ['role', 'team'] 
        });
        if (!assignee) throw new NotFoundException('Assignee not found');
        
        // Safety: ensure same team
        if (assignee.team?.id !== task.team?.id) {
           throw new ConflictException('New assignee must belong to the same team.');
        }

        // Hierarchy Check
        const assigneeLevel = assignee.role?.level ?? 99;
        if (assigneeLevel < actor.level && actor.level !== 0) {
           throw new ForbiddenException('Cannot assign tasks to superiors.');
        }

        // Status Check: Cannot assign to PENDING users
        if (assignee.status !== UserStatus.ACTIVE) {
           throw new ConflictException('Cannot assign tasks to members who are not approved/active.');
        }

        task.assignee = assignee;
        task.assigner = { id: actor.userId } as any;
      }
    }
    return this.taskRepository.save(task);
  }

  async remove(id: string, actor: any): Promise<{ message: string }> {
    const task = await this.findOne(id, actor);

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
    const task = await this.findOne(id, actor);
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
    const task = await this.findOne(id, actor);
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

  async getTeamTaskSummary(actor: any): Promise<any[]> {
    if (!actor.teamId) return [];

    const members = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('user.teamId = :teamId', { teamId: actor.teamId })
      .andWhere('user.id != :actorId', { actorId: actor.userId })
      .andWhere('role.level >= :actorLevel', { actorLevel: actor.level }) // Include same level (Peers) and lower (Subordinates)
      .andWhere('user.status = :status', { status: UserStatus.ACTIVE })
      .select(['user.id', 'user.name', 'role.name', 'role.level'])
      .getMany();

    const tasks = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoin('task.assignee', 'assignee')
      .where('task.teamId = :teamId', { teamId: actor.teamId })
      .andWhere('task.status IN (:...statuses)', { statuses: ['TODO', 'IN_PROGRESS'] })
      .select(['task.id', 'assignee.id'])
      .getMany();

    return members.map(member => {
      const activeTasks = tasks.filter(t => t.assignee?.id === member.id).length;
      return {
        id: member.id,
        name: member.name,
        role: member.role?.name || 'No Role',
        level: member.role?.level || 99,
        todoCount: activeTasks, // Simplified for now as TODO + IN_PROGRESS count
      };
    });
  }
}
