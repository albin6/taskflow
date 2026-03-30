import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull } from 'typeorm';
import { ApprovalRequest } from './entities/approval-request.entity';
import { User } from '../users/entities/user.entity';
import { ApprovalStatus, UserStatus } from '../common/enums';
import { Role } from '../roles/entities/role.entity';
import { Permissions } from '../common/constants/permissions';

@Injectable()
export class ApprovalsService {
  constructor(
    @InjectRepository(ApprovalRequest)
    private readonly approvalRepository: Repository<ApprovalRequest>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async createApprovalRequest(user: User, requestedRole: Role): Promise<ApprovalRequest> {
    const approverRole = await this.findNearestApproverRole(user.team?.id, requestedRole.level - 1);
    
    const request = this.approvalRepository.create({
      requester: user,
      requestedRole: requestedRole,
      status: ApprovalStatus.PENDING,
      currentApproverLevel: approverRole ? approverRole.level : 0, // Fallback to Admin (0)
      assignedApproverRoleName: approverRole ? approverRole.name : 'System Admin',
    });

    return this.approvalRepository.save(request);
  }

  /**
   * Traverses up the hierarchy to find the nearest role with APPROVE_REGISTRATIONS permission
   * and at least one active user in the team.
   */
  async findNearestApproverRole(teamId: string, startLevel: number): Promise<Role | null> {
    for (let level = startLevel; level > 0; level--) {
      const roles = await this.roleRepository.find({
        where: { team: { id: teamId }, level },
      });

      for (const role of roles) {
        if (role.permissions.includes(Permissions.APPROVE_REGISTRATIONS)) {
          // Check if at least one active user exists in this role
          const userCount = await this.userRepository.count({
            where: { team: { id: teamId }, role: { id: role.id }, status: UserStatus.ACTIVE },
          });

          if (userCount > 0) {
            return role;
          }
        }
      }
    }
    return null; // Fallback to Global Admin
  }

  async escalatePendingRequests() {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Find requests that haven't been escalated in 24h OR were created 24h ago and never escalated
    const requests = await this.approvalRepository.find({
      where: [
        { status: ApprovalStatus.PENDING, lastEscalationAt: LessThan(twentyFourHoursAgo) },
        { status: ApprovalStatus.PENDING, lastEscalationAt: IsNull(), createdAt: LessThan(twentyFourHoursAgo) },
      ],
      relations: ['requester', 'requester.team'],
    });

    for (const request of requests) {
      if (request.currentApproverLevel <= 0) continue; // Already at Admin level

      const nextApproverRole = await this.findNearestApproverRole(
        request.requester.team?.id,
        request.currentApproverLevel - 1,
      );

      request.currentApproverLevel = nextApproverRole ? nextApproverRole.level : 0;
      request.assignedApproverRoleName = nextApproverRole ? nextApproverRole.name : 'System Admin';
      request.lastEscalationAt = new Date();
      
      await this.approvalRepository.save(request);
      console.log(`Escalated Request ${request.id} to Level ${request.currentApproverLevel} (${request.assignedApproverRoleName})`);
    }
  }

  async findAll(actor: any): Promise<ApprovalRequest[]> {
    const query = this.approvalRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.requester', 'requester')
      .leftJoinAndSelect('request.requestedRole', 'requestedRole')
      .leftJoinAndSelect('requester.team', 'team')
      .where('request.status = :status', { status: ApprovalStatus.PENDING });

    // 1. Admin (Level 0) sees all pending requests
    // 2. Others see requests where their level matches the currentApproverLevel AND they belong to the same team
    if (actor.level !== 0) {
      query.andWhere('request.currentApproverLevel = :level', { level: actor.level });
      if (actor.teamId) {
        query.andWhere('team.id = :teamId', { teamId: actor.teamId });
      } else {
        return []; // Non-admin without a team cannot see team-specific requests
      }
    }

    return query.getMany();
  }

  async findOne(id: string): Promise<ApprovalRequest> {
    const req = await this.approvalRepository.findOne({
      where: { id },
      relations: ['requester', 'requestedRole', 'requester.team'],
    });

    if (!req) {
      throw new NotFoundException(`Approval Request with ID "${id}" not found.`);
    }

    return req;
  }

  async approve(id: string, actor: any): Promise<{ message: string }> {
    const request = await this.findOne(id);

    if (request.status !== ApprovalStatus.PENDING) {
      throw new ConflictException('This request is no longer pending.');
    }

    await this.verifyApproverEligibility(request, actor);

    // Update Request
    const approver = await this.userRepository.findOne({ where: { id: actor.userId } });
    if (!approver) {
      throw new NotFoundException('Approver profile not found.');
    }
    request.status = ApprovalStatus.APPROVED;
    request.approvedBy = approver;
    await this.approvalRepository.save(request);

    // Activate User
    const user = request.requester;
    user.status = UserStatus.ACTIVE;
    await this.userRepository.save(user);

    return { message: `Request approved. User "${user.name}" is now Active.` };
  }

  async reject(id: string, actor: any): Promise<{ message: string }> {
    const request = await this.findOne(id);

    if (request.status !== ApprovalStatus.PENDING) {
      throw new ConflictException('This request is no longer pending.');
    }

    await this.verifyApproverEligibility(request, actor);

    const approver = await this.userRepository.findOne({ where: { id: actor.userId } });
    if (!approver) {
      throw new NotFoundException('Approver profile not found.');
    }
    request.status = ApprovalStatus.REJECTED;
    request.approvedBy = approver;
    await this.approvalRepository.save(request);

    const user = request.requester;
    user.status = UserStatus.REJECTED;
    await this.userRepository.save(user);

    return { message: `Request rejected for user "${user.name}".` };
  }

  private async verifyApproverEligibility(request: ApprovalRequest, actor: any) {
    if (actor.level === 0) return; // Admin satisfies

    const teamId = request.requester?.team?.id;
    if (actor.teamId !== teamId) {
      throw new ForbiddenException('You cannot approve requests from another team.');
    }

    // Simplified eligibility: Must match the currently assigned level and have permissions
    if (actor.level !== request.currentApproverLevel) {
      throw new ForbiddenException('You are not the currently designated approver for this request.');
    }

    if (!actor.permissions?.includes(Permissions.APPROVE_REGISTRATIONS)) {
      throw new ForbiddenException('You do not have permission to approve registrations.');
    }
  }
}
