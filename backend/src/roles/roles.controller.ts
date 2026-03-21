import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import { ReorderRolesDto } from './dto/reorder-roles.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { TeamScopeGuard } from '../auth/guards/team-scope.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Permissions } from '../common/constants/permissions';

@Controller('roles')
@UseGuards(JwtAuthGuard, PermissionsGuard, TeamScopeGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @RequirePermissions(Permissions.MANAGE_ROLES)
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.create(createRoleDto);
  }

  @Get()
  @RequirePermissions(Permissions.MANAGE_ROLES)
  findByTeam(@Query('teamId') teamId: string) {
    return this.rolesService.findByTeam(teamId);
  }

  @Get(':id')
  @RequirePermissions(Permissions.MANAGE_ROLES)
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(Permissions.MANAGE_ROLES)
  update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.rolesService.update(id, updateRoleDto);
  }

  @Delete(':id')
  @RequirePermissions(Permissions.MANAGE_ROLES)
  remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }

  @Post(':teamId/reorder')
  @RequirePermissions(Permissions.REORDER_ROLES)
  reorder(@Param('teamId') teamId: string, @Body() reorderRolesDto: ReorderRolesDto) {
    return this.rolesService.reorder(teamId, reorderRolesDto);
  }
}
