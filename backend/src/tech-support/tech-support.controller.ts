import { 
  Controller, 
  Get, 
  Patch, 
  Param, 
  Body, 
  Query, 
  UseGuards, 
  UseInterceptors, 
  UploadedFile, 
  ParseIntPipe 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { Permissions } from '../common/constants/permissions';
import { TechSupportService } from './tech-support.service';
import { TechSupportQueryDto } from './dto/tech-support-query.dto';
import { UpdateTechSupportDto } from './dto/update-tech-support.dto';

@Controller('tech-support')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TechSupportController {
  constructor(private readonly techSupportService: TechSupportService) {}

  @Get()
  @RequirePermissions(Permissions.TECH_SUPPORT)
  findAll(@Query() query: TechSupportQueryDto) {
    return this.techSupportService.findAll(query);
  }

  @Get('analytics')
  @RequirePermissions(Permissions.TECH_SUPPORT)
  getAnalytics() {
    return this.techSupportService.getAnalytics();
  }

  @Patch(':rowIndex')
  @RequirePermissions(Permissions.TECH_SUPPORT)
  @UseInterceptors(FileInterceptor('audio'))
  update(
    @Param('rowIndex', ParseIntPipe) rowIndex: number,
    @Body() updateDto: UpdateTechSupportDto,
    @UploadedFile() file?: any,
  ) {
    return this.techSupportService.update(rowIndex, updateDto, file);
  }
}
