import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { ImportEmployeesDto } from './dto/import-employees.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesService } from './employees.service';

@ApiTags('employees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.DIRECTION, UserRole.QVT)
  @Get()
  findAll() {
    return this.employeesService.findAll();
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.DIRECTION, UserRole.QVT)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeesService.findOne(id);
  }

  @Roles(UserRole.ADMIN, UserRole.HR)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(id, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.HR)
  @Post('import')
  importEmployees(@Body() dto: ImportEmployeesDto) {
    return this.employeesService.importEmployees(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.DIRECTION, UserRole.QVT, UserRole.COLLABORATOR)
  @Get('me/vacations')
  getMyVacations(@CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.getMyVacationRequests(user.email);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER, UserRole.DIRECTION, UserRole.QVT, UserRole.COLLABORATOR)
  @Post('me/vacations')
  createVacation(@CurrentUser() user: AuthenticatedUser, @Body() dto: any) {
    return this.employeesService.createVacationRequest(user.email, dto);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @Patch('requests/:id/status')
  updateRequestStatus(@Param('id') id: string, @Body() dto: { status: 'APPROVED' | 'REJECTED' }, @CurrentUser() user: AuthenticatedUser) {
    return this.employeesService.updateRequestStatus(id, dto.status, user.userId);
  }

  @Roles(UserRole.ADMIN, UserRole.HR, UserRole.MANAGER)
  @Post('absences')
  createAbsence(@Body() dto: any) {
    return this.employeesService.createAbsence(dto);
  }

  @Roles(UserRole.ADMIN, UserRole.HR)
  @Get('meta/departments')
  getDepartments() {
    return this.employeesService.getDepartments();
  }

  @Roles(UserRole.ADMIN, UserRole.HR)
  @Get('meta/positions')
  getPositions() {
    return this.employeesService.getPositions();
  }
}
