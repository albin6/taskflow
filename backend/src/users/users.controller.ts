import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto/user-management.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { UserHierarchyGuard } from '../auth/guards/user-hierarchy.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Permissions } from '../common/constants/permissions';

@Controller('users')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @RequirePermissions(Permissions.MANAGE_USERS)
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @RequirePermissions(Permissions.MANAGE_USERS)
  findAll(@Req() req: any) {
    return this.usersService.findAll(req.user, false);
  }

  @Get('roster')
  findRoster(@Req() req: any) {
    return this.usersService.findAll(req.user, true);
  }

  @Get(':id')
  @RequirePermissions(Permissions.MANAGE_USERS)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(UserHierarchyGuard) // Enforces that ActorLevel < TargetUserLevel
  @RequirePermissions(Permissions.MANAGE_USERS)
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @UseGuards(UserHierarchyGuard)
  @RequirePermissions(Permissions.MANAGE_USERS)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
