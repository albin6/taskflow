import { TeamScopeGuard } from './team-scope.guard';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

const createMockExecutionContext = (actor: any, body: any = {}, query: any = {}) => {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        user: actor,
        body,
        query,
      }),
    }),
  } as unknown as ExecutionContext;
};

describe('TeamScopeGuard', () => {
  let guard: TeamScopeGuard;

  beforeEach(() => {
    guard = new TeamScopeGuard();
  });

  it('should allow access for Global Admin (level 0)', () => {
    const context = createMockExecutionContext({ level: 0 });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if no targetTeamId is in body or query', () => {
    const context = createMockExecutionContext({ level: 1, teamId: 'team-A' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if targetTeamId matches actor teamId (body)', () => {
    const context = createMockExecutionContext({ level: 1, teamId: 'team-A' }, { teamId: 'team-A' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if targetTeamId matches actor teamId (query)', () => {
    const context = createMockExecutionContext({ level: 1, teamId: 'team-A' }, {}, { teamId: 'team-A' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException if targetTeamId does not match (body)', () => {
    const context = createMockExecutionContext({ level: 1, teamId: 'team-A' }, { teamId: 'team-B' });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if targetTeamId does not match (query)', () => {
    const context = createMockExecutionContext({ level: 1, teamId: 'team-A' }, {}, { teamId: 'team-B' });
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
