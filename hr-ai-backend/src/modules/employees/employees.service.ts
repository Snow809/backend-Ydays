import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { ImportEmployeesDto } from './dto/import-employees.dto';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateEmployeeDto) {
    return this.prisma.employee.create({
      data: {
        ...dto,
        hiredAt: dto.hiredAt ? new Date(dto.hiredAt) : undefined,
      },
    });
  }

  findAll() {
    return this.prisma.employee.findMany();
  }

  findOne(id: string) {
    return this.prisma.employee.findUnique({ where: { id } });
  }

  update(id: string, dto: UpdateEmployeeDto) {
    return this.prisma.employee.update({
      where: { id },
      data: {
        ...dto,
        hiredAt: dto.hiredAt ? new Date(dto.hiredAt) : undefined,
      },
    });
  }

  importEmployees(dto: ImportEmployeesDto) {
    return {
      status: 'placeholder',
      format: dto.format ?? 'csv-or-xlsx',
      message: 'Employee import skeleton. CSV/XLSX parsing and validation will be implemented later.',
    };
  }
}
