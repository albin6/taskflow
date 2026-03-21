import { Injectable, CanActivate, ExecutionContext, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class UserHierarchyGuard implements CanActivate {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const actor = request.user; // populated by JwtAuthGuard

    if (!actor) {
      throw new ForbiddenException('User not authenticated.');
    }

    // 1. Global Admin bypass (Level 0 can manage any user)
    if (actor.level === 0) {
      return true;
    }

    const targetUserId = request.params.id;
    if (!targetUserId) {
      return true; // No target ID in params, skip (might be a list or create request handled by TeamScope)
    }

    // 2. Fetch Target User
    const targetUser = await this.userRepository.findOne({
      where: { id: targetUserId },
      relations: ['role', 'team'],
    });

    if (!targetUser) {
      throw new NotFoundException('Target user not found.');
    }

    // 3. Team Scope Check (must belong to same team)
    if (actor.teamId !== targetUser.team?.id) {
      throw new ForbiddenException('You can only manage users within your own team.');
    }

    // 4. Hierarchy Check
    const actorLevel = actor.level; // admin=0, head=1, lead=2, custom=3+
    const targetLevel = targetUser.role?.level ?? 99; // Assume generic member level if none assigned

    // Crucial rule: Actor can only manage users holding a role hierarchically LOWER (higher level number) than their own.
    // E.g., Head (1) can manage Lead (2) because 1 < 2.
    // Lead (2) cannot manage Head (1) because 2 is not < 1.
    if (actorLevel >= targetLevel) {
      throw new ForbiddenException('You do not have the hierarchical authority to manage this user.');
    }

    return true;
  }
}
