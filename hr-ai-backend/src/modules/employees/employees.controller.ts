import { Body, Controller, Get, Param, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
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

  @Roles(UserRole.ADMIN, UserRole.HR)
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
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @Post('import')
  importEmployees(
    @Body() dto: ImportEmployeesDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.employeesService.importEmployees(dto, file);
  }
}
