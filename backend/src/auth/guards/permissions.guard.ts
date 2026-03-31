import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PermissionType } from '../../common/constants/permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<PermissionType[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true; // No permissions required for this route
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('User not authenticated for access control.');
    }

    // 1. Global Admin bypass (Level 0 usually has ALL access EXCEPT Tasks)
    if (user.level === 0) {
      const taskPermissions = ['VIEW_TASKS', 'CREATE_TASK', 'EDIT_TASK', 'DELETE_TASK', 'ASSIGN_TASK'];
      const isTaskAction = requiredPermissions.some(p => taskPermissions.includes(p));
      
      if (isTaskAction) {
        throw new ForbiddenException('System Admins are restricted from task management operations.');
      }
      return true;
    }

    // 2. Check permissions
    const userPermissions: string[] = user.permissions || [];
    const hasPermission = requiredPermissions.some(permission =>
      userPermissions.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException('You do not have the required permissions to access this resource.');
    }

    return true;
  }
}
