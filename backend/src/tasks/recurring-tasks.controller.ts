import { Controller, Get, Post, Body, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { RecurringTasksService } from './recurring-tasks.service';
import { CreateRecurringTaskDto } from './dto/recurring-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Permissions } from '../common/constants/permissions';

@Controller('tasks/recurring')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RecurringTasksController {
  constructor(private readonly recurringTasksService: RecurringTasksService) {}

  @Post()
  @RequirePermissions(Permissions.CREATE_TASK)
  create(@Body() dto: CreateRecurringTaskDto, @Req() req: any) {
    return this.recurringTasksService.create(dto, req.user);
  }

  @Get()
  @RequirePermissions(Permissions.VIEW_TASKS)
  findAll(@Req() req: any) {
    return this.recurringTasksService.findAll(req.user);
  }

  @Delete(':id')
  @RequirePermissions(Permissions.DELETE_TASK)
  remove(@Param('id') id: string, @Req() req: any) {
    return this.recurringTasksService.remove(id, req.user);
  }
}
