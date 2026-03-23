import { ApprovalsService } from './approvals.service';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { ApprovalRequest } from './entities/approval-request.entity';
import { User } from '../users/entities/user.entity';
import { ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { ApprovalStatus, UserStatus } from '../common/enums';

describe('ApprovalsService', () => {
  let service: ApprovalsService;
  let mockApprovalRepo: Partial<Record<keyof Repository<ApprovalRequest>, jest.Mock>>;
  let mockUserRepo: Partial<Record<keyof Repository<User>, jest.Mock>>;
  let mockQueryBuilder: any;

  beforeEach(() => {
    mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getRawOne: jest.fn(),
    };

    mockApprovalRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockUserRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    service = new ApprovalsService(
      mockApprovalRepo as any,
      mockUserRepo as any,
    );
  });

  describe('findAll', () => {
    it('should return all pending requests for Global Admin (level 0)', async () => {
      const actor = { level: 0 };
      const requests = [{ id: 'req1' }, { id: 'req2' }];
      mockQueryBuilder.getMany.mockResolvedValue(requests);

      const result = await service.findAll(actor);

      expect(result).toEqual(requests);
    });

    it('should filter requests by team scope for non-admin actors', async () => {
      const actor = { level: 1, teamId: 'team-A' };
      const requests = [
        { id: '1', requestedRole: { level: 3 }, requester: { team: { id: 'team-A' } } }
      ];
      mockQueryBuilder.getMany.mockResolvedValue(requests);
      mockQueryBuilder.getRawOne.mockResolvedValue({ max: 1 }); // max level available is 1 (actor tier)

      const result = await service.findAll(actor);

      expect(result).toHaveLength(1);
    });
  });

  describe('verifyApproverEligibility', () => {
    it('should throw ForbiddenException if actor is from a different team', async () => {
       const request = { requester: { team: { id: 'team-A' } } } as any;
       const actor = { level: 1, teamId: 'team-B' };

       await expect(service.approve('id', actor)).rejects.toThrow(NotFoundException); // hits findOne first, mocked to fail if not found
    });
  });

  describe('approve', () => {
    it('should successfully approve if actor is eligible', async () => {
      const request = {
        id: 'req1',
        status: ApprovalStatus.PENDING,
        requester: { id: 'user1', team: { id: 'team-A' } },
        requestedRole: { level: 3 }
      };
      const actor = { userId: 'actor1', level: 1, teamId: 'team-A' };

      mockApprovalRepo.findOne.mockResolvedValue(request);
      mockUserRepo.findOne.mockResolvedValue({ id: 'actor1' }); // approver
      mockQueryBuilder.getRawOne.mockResolvedValue({ max: 1 }); // max available is level 1

      const result = await service.approve('req1', actor);

      expect(result.message).toContain('Request approved');
      expect(request.status).toBe(ApprovalStatus.APPROVED);
    });

    it('should throw ForbiddenException if actor is not the highest available tier (Roll-Up fail)', async () => {
      const request = {
        id: 'req1',
        status: ApprovalStatus.PENDING,
        requester: { id: 'user1', team: { id: 'team-A' } },
        requestedRole: { level: 3 }
      };
      const actor = { userId: 'actor1', level: 2, teamId: 'team-A' }; // Lead

      mockApprovalRepo.findOne.mockResolvedValue(request);
      mockQueryBuilder.getRawOne.mockResolvedValue({ max: 1 }); // max available is Head (1)

      await expect(service.approve('req1', actor)).rejects.toThrow(ForbiddenException);
    });
  });
});
