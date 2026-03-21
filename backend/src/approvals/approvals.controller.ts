import { Controller, Get, Post, Param, UseGuards, Req } from '@nestjs/common';
import { ApprovalsService } from './approvals.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Permissions } from '../common/constants/permissions';

@Controller('approvals')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get()
  @RequirePermissions(Permissions.APPROVE_REGISTRATIONS)
  findAll(@Req() req: any) {
    return this.approvalsService.findAll(req.user);
  }

  @Get(':id')
  @RequirePermissions(Permissions.APPROVE_REGISTRATIONS)
  findOne(@Param('id') id: string) {
    return this.approvalsService.findOne(id);
  }

  @Post(':id/approve')
  @RequirePermissions(Permissions.APPROVE_REGISTRATIONS)
  approve(@Param('id') id: string, @Req() req: any) {
    return this.approvalsService.approve(id, req.user);
  }

  @Post(':id/reject')
  @RequirePermissions(Permissions.APPROVE_REGISTRATIONS)
  reject(@Param('id') id: string, @Req() req: any) {
    return this.approvalsService.reject(id, req.user);
  }
}
