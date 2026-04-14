import { IsString, IsOptional, IsEnum } from 'class-validator';

export enum TicketStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
}

export class UpdateTechSupportDto {
  @IsString()
  @IsOptional()
  assignedTo?: string;

  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @IsString()
  @IsOptional()
  remarks?: string;
}
