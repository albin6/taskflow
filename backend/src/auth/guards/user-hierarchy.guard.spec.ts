import { UserHierarchyGuard } from './user-hierarchy.guard';
import { ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';

const createMockExecutionContext = (actor: any, params: any = {}) => {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        user: actor,
        params,
      }),
    }),
  } as unknown as ExecutionContext;
};

describe('UserHierarchyGuard', () => {
  let guard: UserHierarchyGuard;
  let mockUserRepository: Partial<Record<keyof Repository<User>, jest.Mock>>;

  beforeEach(() => {
    mockUserRepository = {
      findOne: jest.fn(),
    };
    guard = new UserHierarchyGuard(mockUserRepository as any);
  });

  it('should allow access for Global Admin (level 0)', async () => {
    const context = createMockExecutionContext({ level: 0 });
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('should allow access if no targetUserId is in params', async () => {
    const context = createMockExecutionContext({ level: 1 }, {});
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('should throw NotFoundException if target user does not exist', async () => {
    mockUserRepository.findOne.mockResolvedValue(null);
    const context = createMockExecutionContext({ level: 1 }, { id: 'target-123' });

    await expect(guard.canActivate(context)).rejects.toThrow(NotFoundException);
  });

  it('should throw ForbiddenException if target is from a different team', async () => {
    mockUserRepository.findOne.mockResolvedValue({
      id: 'target-123',
      team: { id: 'team-B' },
      role: { level: 2 },
    });
    const context = createMockExecutionContext({ level: 1, teamId: 'team-A' }, { id: 'target-123' });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should allow access if actor level < target level (higher authority)', async () => {
    mockUserRepository.findOne.mockResolvedValue({
      id: 'target-123',
      team: { id: 'team-A' },
      role: { level: 2 },
    });
    const context = createMockExecutionContext({ level: 1, teamId: 'team-A' }, { id: 'target-123' });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('should throw ForbiddenException if actor level >= target level', async () => {
    mockUserRepository.findOne.mockResolvedValue({
      id: 'target-123',
      team: { id: 'team-A' },
      role: { level: 1 },
    });
    const context = createMockExecutionContext({ level: 2, teamId: 'team-A' }, { id: 'target-123' });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });
});
