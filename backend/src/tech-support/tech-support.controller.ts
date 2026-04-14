import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Permissions } from '../common/constants/permissions';
import { TechSupportService } from './tech-support.service';
import { TechSupportQueryDto } from './dto/tech-support-query.dto';

@Controller('tech-support')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TechSupportController {
  constructor(private readonly techSupportService: TechSupportService) {}

  @Get()
  @RequirePermissions(Permissions.TECH_SUPPORT)
  findAll(@Query() query: TechSupportQueryDto) {
    return this.techSupportService.findAll(query);
  }
}
