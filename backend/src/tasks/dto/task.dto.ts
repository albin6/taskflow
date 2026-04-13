import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, IsDateString, IsArray } from 'class-validator';
import { IsNotPastDate } from '../../common/decorators/is-not-past-date.decorator';
import { TaskStatus, TaskPriority } from '../../common/enums';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @IsDateString()
  @IsNotPastDate({ message: 'Due date cannot be in the past' })
  @IsOptional()
  dueDate?: string;

  @IsUUID()
  @IsOptional()
  assigneeId?: string;

  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  assigneeIds?: string[];
}

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @IsDateString()
  @IsNotPastDate({ message: 'Due date cannot be in the past' })
  @IsOptional()
  dueDate?: string;

  @IsUUID()
  @IsOptional()
  @IsNotEmpty({ message: 'Task must have an assignee' })
  assigneeId?: string;
}
