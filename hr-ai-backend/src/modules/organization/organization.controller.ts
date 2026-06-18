import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { CreateJobPositionDto } from './dto/create-job-position.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { UpdateJobPositionDto } from './dto/update-job-position.dto';
import { OrganizationService } from './organization.service';

@ApiTags('organization')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('organization')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Roles(UserRole.ADMIN, UserRole.HR)
  @Post('departments')
  createDepartment(@Body() dto: CreateDepartmentDto) {
    return this.organizationService.createDepartment(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.DIRECTION)
  @Get('departments')
  findDepartments() {
    return this.organizationService.findDepartments();
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.DIRECTION)
  @Get('departments/:id')
  findDepartment(@Param('id') id: string) {
    return this.organizationService.findDepartment(id);
  }

  @Roles(UserRole.ADMIN, UserRole.HR)
  @Patch('departments/:id')
  updateDepartment(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.organizationService.updateDepartment(id, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.HR)
  @Delete('departments/:id')
  deleteDepartment(@Param('id') id: string) {
    return this.organizationService.deleteDepartment(id);
  }

  @Roles(UserRole.ADMIN, UserRole.HR)
  @Post('job-positions')
  createJobPosition(@Body() dto: CreateJobPositionDto) {
    return this.organizationService.createJobPosition(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.DIRECTION)
  @Get('job-positions')
  findJobPositions() {
    return this.organizationService.findJobPositions();
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.DIRECTION)
  @Get('job-positions/:id')
  findJobPosition(@Param('id') id: string) {
    return this.organizationService.findJobPosition(id);
  }

  @Roles(UserRole.ADMIN, UserRole.HR)
  @Patch('job-positions/:id')
  updateJobPosition(@Param('id') id: string, @Body() dto: UpdateJobPositionDto) {
    return this.organizationService.updateJobPosition(id, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.HR)
  @Delete('job-positions/:id')
  deleteJobPosition(@Param('id') id: string) {
    return this.organizationService.deleteJobPosition(id);
  }
}
