import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApprovalsService } from './approvals.service';
import { ApprovalsController } from './approvals.controller';
import { ApprovalRequest } from './entities/approval-request.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { ApprovalsCron } from './approvals.cron';

@Module({
  imports: [TypeOrmModule.forFeature([ApprovalRequest, User, Role])],
  controllers: [ApprovalsController],
  providers: [ApprovalsService, ApprovalsCron],
  exports: [ApprovalsService],
})
export class ApprovalsModule {}
