import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KpiService } from './kpi.service';
import { KpiController } from './kpi.controller';
import { KpiSnapshot } from './entities/kpi-snapshot.entity';
import { Task } from '../tasks/entities/task.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([KpiSnapshot, Task, User]),
  ],
  controllers: [KpiController],
  providers: [KpiService],
  exports: [KpiService],
})
export class KpiModule {}
