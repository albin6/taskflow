import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class TeamScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const actor = request.user;

    if (!actor) {
      throw new ForbiddenException('User not authenticated.');
    }

    // 1. Global Admin bypass (Level 0 can access all teams)
    if (actor.level === 0) {
      return true;
    }

    // 2. Fetch target teamId from Body or Query
    const bodyTeamId = request.body?.teamId;
    const queryTeamId = request.query?.teamId;
    
    // We care if they are trying to SET or FILTER by a teamId
    const targetTeamId = bodyTeamId || queryTeamId;

    if (targetTeamId && actor.teamId !== targetTeamId) {
      throw new ForbiddenException('You are not authorized to access or create resources for another team.');
    }

    return true;
  }
}
