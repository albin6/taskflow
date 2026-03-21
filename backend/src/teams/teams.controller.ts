import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto, UpdateTeamDto } from './dto/team.dto';
import { AssignUserRoleDto } from './dto/assign-user-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Permissions } from '../common/constants/permissions';

@Controller('teams')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @RequirePermissions(Permissions.MANAGE_TEAMS)
  create(@Body() createTeamDto: CreateTeamDto) {
    return this.teamsService.create(createTeamDto);
  }

  @Get()
  @RequirePermissions(Permissions.MANAGE_TEAMS)
  findAll() {
    return this.teamsService.findAll();
  }

  @Get(':id')
  @RequirePermissions(Permissions.MANAGE_TEAMS)
  findOne(@Param('id') id: string) {
    return this.teamsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(Permissions.MANAGE_TEAMS)
  update(@Param('id') id: string, @Body() updateTeamDto: UpdateTeamDto) {
    return this.teamsService.update(id, updateTeamDto);
  }

  @Delete(':id')
  @RequirePermissions(Permissions.MANAGE_TEAMS)
  remove(@Param('id') id: string) {
    return this.teamsService.remove(id);
  }

  @Post(':id/assign-head')
  @RequirePermissions(Permissions.MANAGE_TEAMS) // Only Admin can assign the primary head
  assignHead(@Param('id') teamId: string, @Body() assignDto: AssignUserRoleDto) {
    return this.teamsService.assignHead(teamId, assignDto.userId);
  }

  @Post(':id/assign-lead')
  @RequirePermissions(Permissions.MANAGE_TEAMS) // Only Admin can assign the primary leads generally
  assignLead(@Param('id') teamId: string, @Body() assignDto: AssignUserRoleDto) {
    return this.teamsService.assignLead(teamId, assignDto.userId);
  }
}
