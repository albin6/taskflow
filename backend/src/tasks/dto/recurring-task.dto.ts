import { IsEnum, IsNotEmpty, IsOptional, IsString, IsArray, IsUUID, IsDateString, IsBoolean } from 'class-validator';
import { RecurrenceFrequency, TaskPriority } from '../../common/enums';

export class CreateRecurringTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @IsEnum(RecurrenceFrequency)
  @IsNotEmpty()
  frequency: RecurrenceFrequency;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  daysOfWeek?: string[]; // e.g. ["MONDAY", "SATURDAY"]

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsArray()
  @IsUUID('all', { each: true })
  @IsNotEmpty({ message: 'Select at least one assignee' })
  assigneeIds: string[];
}

export class UpdateRecurringTaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @IsEnum(RecurrenceFrequency)
  @IsOptional()
  frequency?: RecurrenceFrequency;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  daysOfWeek?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  assigneeIds?: string[];
}
