import { BadRequestException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
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
        leftAt: dto.leftAt ? new Date(dto.leftAt) : undefined,
      },
      include: this.employeeInclude(),
    });
  }

  findAll() {
    return this.prisma.employee.findMany({
      include: this.employeeInclude(),
      orderBy: { fullName: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.employee.findUnique({
      where: { id },
      include: this.employeeInclude(),
    });
  }

  update(id: string, dto: UpdateEmployeeDto) {
    return this.prisma.employee.update({
      where: { id },
      data: {
        ...dto,
        hiredAt: dto.hiredAt ? new Date(dto.hiredAt) : undefined,
        leftAt: dto.leftAt ? new Date(dto.leftAt) : undefined,
      },
      include: this.employeeInclude(),
    });
  }

  async importEmployees(dto: ImportEmployeesDto, file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('A file is required');
    }

    const content = file.buffer.toString('utf8');
    const delimiter = this.detectDelimiter(content);
    const rows = this.parseEmployeesCsv(content, delimiter);

    const createdUsers = [];
    const createdEmployees = [];
    const errors = [];

    // Phase 1: Validate and create users and employees
    for (const [index, row] of rows.entries()) {
      try {
        const matricule = row.matricule?.trim();
        const email = row.email?.trim();
        const fullName = row.fullName?.trim();

        if (!matricule || !email || !fullName) {
          throw new Error(`Matricule, Email and FullName are required.`);
        }

        // Check duplicates
        const existingEmployee = await this.prisma.employee.findFirst({
          where: {
            OR: [{ matricule }, { email }],
          },
        });

        if (existingEmployee) {
          throw new Error(`Duplicate email or matricule: ${email} / ${matricule}`);
        }

        // Check department
        let departmentId: string | undefined;
        if (row.department) {
          let dept = await this.prisma.department.findFirst({
            where: { name: { equals: row.department, mode: 'insensitive' } },
          });
          if (!dept) {
            dept = await this.prisma.department.create({
              data: { name: row.department },
            });
          }
          departmentId = dept.id;
        }

        // Check job position
        let positionId: string | undefined;
        if (row.position) {
          let pos = await this.prisma.jobPosition.findFirst({
            where: { title: { equals: row.position, mode: 'insensitive' } },
          });
          if (!pos) {
            pos = await this.prisma.jobPosition.create({
              data: { title: row.position },
            });
          }
          positionId = pos.id;
        }

        // Create user
        let user = await this.prisma.user.findUnique({ where: { email } });
        if (!user) {
          const passwordHash = await bcrypt.hash('password123', 10);
          const roleStr = row.role?.toUpperCase();
          const role = Object.values(UserRole).includes(roleStr as UserRole)
            ? (roleStr as UserRole)
            : UserRole.COLLABORATOR;

          user = await this.prisma.user.create({
            data: {
              email,
              passwordHash,
              role,
              fullName,
            },
          });
          createdUsers.push(user);
        }

        // Create employee
        const employee = await this.prisma.employee.create({
          data: {
            userId: user.id,
            matricule,
            email,
            fullName,
            firstName: row.firstName || null,
            lastName: row.lastName || null,
            phone: row.phone || null,
            position: row.position || null,
            department: row.department || null,
            site: row.site || null,
            hiredAt: row.hiredAt ? new Date(row.hiredAt) : null,
            leftAt: row.leftAt ? new Date(row.leftAt) : null,
            departmentId,
            positionId,
          },
        });
        createdEmployees.push(employee);
      } catch (err) {
        errors.push({
          row: index + 2,
          reason: err instanceof Error ? err.message : 'Unknown error during import',
        });
      }
    }

    // Phase 2: Link managers (after all employees are created)
    for (const row of rows) {
      const matricule = row.matricule?.trim();
      const managerMatricule = row.managerMatricule?.trim();

      if (matricule && managerMatricule) {
        try {
          const employee = await this.prisma.employee.findUnique({ where: { matricule } });
          const manager = await this.prisma.employee.findUnique({ where: { matricule: managerMatricule } });

          if (employee && manager) {
            await this.prisma.employee.update({
              where: { id: employee.id },
              data: { managerId: manager.id },
            });
          }
        } catch {
          // ignore or log manager link failure
        }
      }
    }

    // Record import in DataImport logs table
    const dataImport = await (this.prisma as any).dataImport.create({
      data: {
        importType: 'EMPLOYEES_CSV',
        fileName: file.originalname,
        status: errors.length === rows.length ? 'FAILED' : 'PROCESSED',
        totalRows: rows.length,
        errorRows: errors.length,
        errorReport: { errors } as any,
      },
    });

    if (errors.length > 0) {
      await (this.prisma as any).alert.create({
        data: {
          type: 'DATA_QUALITY',
          title: 'Employee import contains invalid rows',
          message: `${errors.length} row(s) failed during employee import.`,
          targetId: dataImport.id,
        },
      });
    }

    return {
      status: dataImport.status,
      totalRows: rows.length,
      createdCount: createdEmployees.length,
      errorsCount: errors.length,
      errors,
    };
  }

  private detectDelimiter(content: string): string {
    const firstLine = content.split(/\r?\n/)[0] ?? '';
    return firstLine.includes(';') ? ';' : ',';
  }

  private parseEmployeesCsv(content: string, delimiter: string): any[] {
    const lines = content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      throw new BadRequestException('CSV file must include a header and at least one data row');
    }

    const headers = lines[0].split(delimiter).map((header) => header.trim());
    return lines.slice(1).map((line) => {
      const values = line.split(delimiter).map((value) => value.trim());
      return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
    });
  }

  private employeeInclude() {
    return {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
        },
      },
      departmentEntity: true,
      positionEntity: true,
      manager: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      reports: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    };
  }
}
