import { Controller, Get, Param, UseGuards, Query, Req } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Permissions } from '../common/constants/permissions';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermissions(Permissions.VIEW_TEAM_AUDIT)
  findAll(
    @Req() req: any,
    @Query('action') action?: string,
    @Query('actorId') actorId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.auditService.findAll(req.user, { action, actorId, startDate, endDate, page, limit });
  }

  @Get(':id')
  @RequirePermissions(Permissions.VIEW_TEAM_AUDIT)
  findOne(@Param('id') id: string) {
    return this.auditService.findOne(id);
  }
}
