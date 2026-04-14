import { Module } from '@nestjs/common';
import { TechSupportController } from './tech-support.controller';
import { TechSupportService } from './tech-support.service';

@Module({
  controllers: [TechSupportController],
  providers: [TechSupportService],
  exports: [TechSupportService],
})
export class TechSupportModule {}
