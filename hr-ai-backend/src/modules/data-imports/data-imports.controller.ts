import { Body, Controller, Get, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { DataImportsService } from './data-imports.service';
import { ImportAbsencesDto } from './dto/import-absences.dto';
import { ImportKpiSnapshotsDto } from './dto/import-kpi-snapshots.dto';
import { UploadAbsencesCsvDto } from './dto/upload-absences-csv.dto';

@ApiTags('data-imports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('data-imports')
export class DataImportsController {
  constructor(private readonly dataImportsService: DataImportsService) {}

  @Roles(UserRole.ADMIN, UserRole.HR)
  @Post('absences')
  importAbsences(@Body() dto: ImportAbsencesDto, @CurrentUser() user: AuthenticatedUser) {
    return this.dataImportsService.importAbsences(dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.HR)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @Post('absences/upload')
  uploadAbsencesCsv(
    @Body() dto: UploadAbsencesCsvDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.dataImportsService.uploadAbsencesCsv(dto, file, user);
  }

  @Roles(UserRole.ADMIN, UserRole.HR)
  @Post('kpi-snapshots')
  importKpiSnapshots(@Body() dto: ImportKpiSnapshotsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.dataImportsService.importKpiSnapshots(dto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.DIRECTION)
  @Get()
  findAll() {
    return this.dataImportsService.findAll();
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.DIRECTION)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dataImportsService.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.DIRECTION)
  @Get(':id/quality-report')
  qualityReport(@Param('id') id: string) {
    return this.dataImportsService.qualityReport(id);
  }
}
