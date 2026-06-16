import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { ImportEmployeesDto } from './dto/import-employees.dto';

@Injectable()
export class EmployeesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateEmployeeDto) {
    const nameParts = dto.fullName ? dto.fullName.trim().split(/\s+/) : ['Utilisateur'];
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || 'Utilisateur';

    let finalManagerId = dto.managerId;
    if (!finalManagerId && dto.department) {
      const dept = await this.prisma.department.findUnique({
        where: { id: dto.department },
      });
      if (dept && dept.managerId) {
        finalManagerId = dept.managerId;
      }
    }

    return this.prisma.employee.create({
      data: {
        employeeNumber: dto.matricule,
        email: dto.email,
        firstName,
        lastName,
        location: dto.site,
        hireDate: dto.hiredAt ? new Date(dto.hiredAt) : new Date(),
        salary: dto.salary ? Number(dto.salary) : 0,
        managerId: finalManagerId || undefined,
        departmentId: dto.department || undefined,
        positionId: dto.position || undefined,
      },
    });
  }

  findAll() {
    return this.prisma.employee.findMany({
      include: {
        department: true,
        position: true,
      }
    });
  }

  findOne(id: string) {
    return this.prisma.employee.findUnique({ where: { id } });
  }

  update(id: string, dto: UpdateEmployeeDto) {
    const data: any = {};
    if (dto.matricule) data.employeeNumber = dto.matricule;
    if (dto.email) data.email = dto.email;
    if (dto.fullName) {
      const nameParts = dto.fullName.trim().split(/\s+/);
      data.firstName = nameParts[0];
      data.lastName = nameParts.slice(1).join(' ') || 'Utilisateur';
    }
    if (dto.site) data.location = dto.site;
    if (dto.hiredAt) data.hireDate = new Date(dto.hiredAt);
    if (dto.managerId) data.managerId = dto.managerId;
    if (dto.department) data.departmentId = dto.department;
    if (dto.position) data.positionId = dto.position;
    if (dto.salary !== undefined) data.salary = Number(dto.salary);

    return this.prisma.employee.update({
      where: { id },
      data,
    });
  }

  importEmployees(dto: ImportEmployeesDto) {
    return {
      status: 'placeholder',
      format: dto.format ?? 'csv-or-xlsx',
      message: 'Employee import skeleton. CSV/XLSX parsing and validation will be implemented later.',
    };
  }

  async getMyVacationRequests(email: string) {
    const employee = await this.prisma.employee.findUnique({ where: { email } });
    if (!employee) return [];
    return this.prisma.hrRequest.findMany({
      where: { employeeId: employee.id, kind: 'VACATION' },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createVacationRequest(email: string, dto: any) {
    const employee = await this.prisma.employee.findUnique({ where: { email } });
    if (!employee) throw new Error('Employee not found');
    
    return this.prisma.hrRequest.create({
      data: {
        employeeId: employee.id,
        kind: 'VACATION',
        requestType: dto.type,
        detail: dto.reason || `${dto.startDate} - ${dto.endDate}`,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        durationDays: dto.durationDays || 1,
        status: 'PENDING',
        priority: 'NORMAL',
      }
    });
  }

  async updateRequestStatus(id: string, status: 'APPROVED' | 'REJECTED', reviewerId: string) {
    const req = await this.prisma.hrRequest.update({
      where: { id },
      data: {
        status,
        reviewedBy: reviewerId,
        reviewedAt: new Date()
      }
    });

    if (status === 'APPROVED' && req.kind === 'VACATION') {
      await this.prisma.absence.create({
        data: {
          employeeId: req.employeeId,
          absenceType: req.requestType,
          startDate: req.startDate || new Date(),
          endDate: req.endDate || new Date(),
          durationDays: req.durationDays || 1,
          status: 'APPROVED',
        }
      });
      
      if (req.requestType === 'Congés payés' && req.durationDays) {
         await this.prisma.employee.update({
           where: { id: req.employeeId },
           data: {
             vacationBalanceDays: { decrement: Math.ceil(Number(req.durationDays)) }
           }
         });
      } else if (req.requestType === 'RTT' && req.durationDays) {
         await this.prisma.employee.update({
           where: { id: req.employeeId },
           data: {
             rttBalanceDays: { decrement: Math.ceil(Number(req.durationDays)) }
           }
         });
      }
    }

    return req;
  }

  async createAbsence(dto: any) {
    if (!dto.employeeId || !dto.absenceType || !dto.startDate || !dto.endDate) {
      throw new Error('Missing required fields for absence');
    }
    
    return this.prisma.absence.create({
      data: {
        employeeId: dto.employeeId,
        absenceType: dto.absenceType,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        durationDays: dto.durationDays || 1,
        status: 'APPROVED',
      }
    });
  }

  getDepartments() {
    return this.prisma.department.findMany({ select: { id: true, name: true } });
  }

  getPositions() {
    return this.prisma.jobPosition.findMany({ select: { id: true, title: true } });
  }
}
