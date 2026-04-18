import { Controller, Get, Param, UseGuards, Query, Req } from '@nestjs/common';
import { KpiService } from './kpi.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { TeamScopeGuard } from '../auth/guards/team-scope.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Permissions } from '../common/constants/permissions';

@Controller('kpi')
@UseGuards(JwtAuthGuard, PermissionsGuard, TeamScopeGuard)
export class KpiController {
  constructor(private readonly kpiService: KpiService) {}

  @Get('my')
  async getMyPerformance(@Req() req: any) {
    return this.kpiService.getMemberPerformance(req.user.userId);
  }

  @Get('team/:teamId')
  @RequirePermissions(Permissions.VIEW_KPI)
  async getTeamPerformance(@Param('teamId') teamId: string) {
    return this.kpiService.getTeamPerformance(teamId);
  }

  @Get('history/:userId')
  @RequirePermissions(Permissions.VIEW_KPI)
  async getHistory(
    @Param('userId') userId: string,
    @Query('days') days: string,
  ) {
    return this.kpiService.getPerformanceHistory(userId, parseInt(days) || 7);
  }

  @Get('global')
  @RequirePermissions(Permissions.VIEW_KPI)
  async getGlobalStats(@Req() req: any) {
    // Admin only logic (level 0) is inherently handled by PermissionsGuard 
    // and the fact that level 0 users can bypass TeamScopeGuard.
    if (req.user.level !== 0) {
      // For level 1/2, they should probably use the team endpoint.
      // But we can return a summary of their own team here if we wanted to be flexible.
      return this.kpiService.getTeamPerformance(req.user.teamId);
    }
    
    // In a real prod app, we'd add organization-wide aggregate logic in KpiService.
    return { message: 'Organization-wide analytics aggregate' };
  }
}
