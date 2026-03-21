import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApprovalRequest } from './entities/approval-request.entity';
import { User } from '../users/entities/user.entity';
import { ApprovalStatus, UserStatus } from '../common/enums';

@Injectable()
export class ApprovalsService {
  constructor(
    @InjectRepository(ApprovalRequest)
    private readonly approvalRepository: Repository<ApprovalRequest>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findAll(actor: any): Promise<ApprovalRequest[]> {
    const query = this.approvalRepository
      .createQueryBuilder('request')
      .leftJoinAndSelect('request.requester', 'requester')
      .leftJoinAndSelect('request.requestedRole', 'requestedRole')
      .leftJoinAndSelect('requester.team', 'team')
      .where('request.status = :status', { status: ApprovalStatus.PENDING });

    if (actor.level !== 0 && actor.teamId) {
       query.andWhere('team.id = :teamId', { teamId: actor.teamId });
    }

    const requests = await query.getMany();

    if (actor.level === 0) {
      return requests; // Global Admin sees all pending actions
    }

    const eligibleRequests: ApprovalRequest[] = [];

    // Roll-Up Loop: Validate if Actor is the highest available tier below the requested Level
    for (const req of requests) {
      const requestedLevel = req.requestedRole?.level ?? 99;

      // Find the Maximum Level (lowest tier index) of users in this team who are ACTIVE and strictly higher up than requestedLevel
      // E.g., if requested is level 3, and there is a Lead (2), MAX(level) is 2.
      const maxAvailableLevelResult = await this.userRepository
        .createQueryBuilder('u')
        .leftJoin('u.role', 'r')
        .where('u.teamId = :teamId', { teamId: actor.teamId })
        .andWhere('u.status = :status', { status: UserStatus.ACTIVE })
        .andWhere('r.level < :requestedLevel', { requestedLevel })
        .select('MAX(r.level)', 'max')
        .getRawOne();

      const maxLevel = maxAvailableLevelResult?.max;

      // Actor is the approver if their level matches the highest available tier gap
      if (maxLevel !== undefined && actor.level === maxLevel) {
        eligibleRequests.push(req);
      }
    }

    return eligibleRequests;
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

    const requestedLevel = request.requestedRole?.level ?? 99;

    const maxAvailableLevelResult = await this.userRepository
      .createQueryBuilder('u')
      .leftJoin('u.role', 'r')
      .where('u.teamId = :teamId', { teamId })
      .andWhere('u.status = :status', { status: UserStatus.ACTIVE })
      .andWhere('r.level < :requestedLevel', { requestedLevel })
      .select('MAX(r.level)', 'max')
      .getRawOne();

    const maxLevel = maxAvailableLevelResult?.max;

    if (maxLevel === undefined || actor.level !== maxLevel) {
      throw new ForbiddenException('You are not the eligible approver for this request due to hierarchy roll-up rules.');
    }
  }
}
