import { PermissionsGuard } from './permissions.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

const createMockExecutionContext = (userLevel: number, permissions: string[], requiredPermissions: string[] | null) => {
  const mockContext = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({
        user: { level: userLevel, permissions },
      }),
    }),
  } as unknown as ExecutionContext;

  const mockReflector = {
    getAllAndOverride: jest.fn().mockReturnValue(requiredPermissions),
  } as unknown as Reflector;

  return { mockContext, mockReflector };
};

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;

  it('should allow access if no permissions are required', () => {
    const { mockContext, mockReflector } = createMockExecutionContext(3, [], null);
    guard = new PermissionsGuard(mockReflector);

    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should allow access for Global Admin (level 0) even if missing permissions', () => {
    const { mockContext, mockReflector } = createMockExecutionContext(0, [], ['MANAGE_USERS']);
    guard = new PermissionsGuard(mockReflector);

    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should allow access if user has the required permission', () => {
    const { mockContext, mockReflector } = createMockExecutionContext(3, ['MANAGE_USERS'], ['MANAGE_USERS']);
    guard = new PermissionsGuard(mockReflector);

    expect(guard.canActivate(mockContext)).toBe(true);
  });

  it('should throw ForbiddenException if user lacks required permission', () => {
    const { mockContext, mockReflector } = createMockExecutionContext(3, [], ['MANAGE_USERS']);
    guard = new PermissionsGuard(mockReflector);

    expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
  });
});
