import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ApprovalsService } from './approvals.service';
import { ApprovalRequest } from './entities/approval-request.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Permissions } from '../common/constants/permissions';
import { ApprovalStatus, UserStatus } from '../common/enums';

describe('ApprovalsService (Hierarchy & Escalation)', () => {
  let service: ApprovalsService;
  let approvalRepo: Record<string, jest.Mock>;
  let userRepo: Record<string, jest.Mock>;
  let roleRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalsService,
        {
          provide: getRepositoryToken(ApprovalRequest),
          useValue: {
            create: jest.fn().mockImplementation(dto => dto),
            save: jest.fn().mockImplementation(req => Promise.resolve({ ...req, id: 'req-id' })),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            count: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn().mockImplementation(dto => dto),
          },
        },
        {
          provide: getRepositoryToken(Role),
          useValue: {
            find: jest.fn(),
            create: jest.fn().mockImplementation(dto => dto),
          },
        },
      ],
    }).compile();

    service = module.get<ApprovalsService>(ApprovalsService);
    approvalRepo = module.get(getRepositoryToken(ApprovalRequest));
    userRepo = module.get(getRepositoryToken(User));
    roleRepo = module.get(getRepositoryToken(Role));
  });

  describe('findNearestApproverRole', () => {
    it('should find the nearest role with approval permission and active users', async () => {
      const teamId = 'team-1';
      
      roleRepo.find.mockImplementation((params) => {
        const where = params.where as any;
        if (where?.level === 2) return Promise.resolve([{ id: 'role-2', level: 2, permissions: [], name: 'Lead' }]);
        if (where?.level === 1) return Promise.resolve([{ id: 'role-1', level: 1, permissions: [Permissions.APPROVE_REGISTRATIONS], name: 'Head' }]);
        return Promise.resolve([]);
      });

      userRepo.count.mockImplementation((params) => {
        const where = params.where as any;
        if (where?.role?.id === 'role-1') return Promise.resolve(1);
        return Promise.resolve(0);
      });

      const result = await service.findNearestApproverRole(teamId, 2);
      expect(result!.id).toBe('role-1');
      expect(result!.name).toBe('Head');
    });

    it('should return null if no role has permissions or active users', async () => {
      roleRepo.find.mockResolvedValue([]);
      const result = await service.findNearestApproverRole('team-1', 2);
      expect(result).toBeNull();
    });
  });

  describe('createApprovalRequest', () => {
    it('should assign correct initial role and level', async () => {
      const user = { id: 'u1', team: { id: 't1' } } as unknown as User;
      const requestedRole = { id: 'r1', level: 3 } as unknown as Role;

      jest.spyOn(service, 'findNearestApproverRole').mockResolvedValue({ 
        id: 'r2', level: 1, name: 'Head' 
      } as unknown as Role);

      const result = await service.createApprovalRequest(user, requestedRole);
      expect(result.currentApproverLevel).toBe(1);
      expect(result.assignedApproverRoleName).toBe('Head');
    });

    it('should fallback to System Admin if no team approver found', async () => {
      const user = { id: 'u1', team: { id: 't1' } } as unknown as User;
      const requestedRole = { id: 'r1', level: 2 } as unknown as Role;

      jest.spyOn(service, 'findNearestApproverRole').mockResolvedValue(null);

      const result = await service.createApprovalRequest(user, requestedRole);
      expect(result.currentApproverLevel).toBe(0);
      expect(result.assignedApproverRoleName).toBe('System Admin');
    });
  });

  describe('escalatePendingRequests', () => {
    it('should move request up the hierarchy if 24h passed', async () => {
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000);
      const req = { 
        id: 'req1', 
        status: ApprovalStatus.PENDING, 
        currentApproverLevel: 2, 
        createdAt: oldDate,
        requester: { team: { id: 't1' } }
      } as unknown as ApprovalRequest;

      approvalRepo.find.mockResolvedValue([req]);
      jest.spyOn(service, 'findNearestApproverRole').mockResolvedValue({ 
        id: 'r-head', level: 1, name: 'Head' 
      } as unknown as Role);

      await service.escalatePendingRequests();

      expect(approvalRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        currentApproverLevel: 1,
        assignedApproverRoleName: 'Head'
      }));
    });
  });
});
