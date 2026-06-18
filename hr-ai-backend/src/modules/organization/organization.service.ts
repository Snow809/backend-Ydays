import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { CreateJobPositionDto } from './dto/create-job-position.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { UpdateJobPositionDto } from './dto/update-job-position.dto';

@Injectable()
export class OrganizationService {
  constructor(private readonly prisma: PrismaService) {}

  createDepartment(dto: CreateDepartmentDto) {
    return this.prisma.department.create({
      data: dto,
      include: this.departmentInclude(),
    });
  }

  findDepartments() {
    return this.prisma.department.findMany({
      include: this.departmentInclude(),
      orderBy: { name: 'asc' },
    });
  }

  async findDepartment(id: string) {
    const department = await this.prisma.department.findUnique({
      where: { id },
      include: this.departmentInclude(),
    });

    if (!department) {
      throw new NotFoundException('Department not found');
    }

    return department;
  }

  async updateDepartment(id: string, dto: UpdateDepartmentDto) {
    await this.findDepartment(id);
    return this.prisma.department.update({
      where: { id },
      data: dto,
      include: this.departmentInclude(),
    });
  }

  async deleteDepartment(id: string) {
    await this.findDepartment(id);
    return this.prisma.department.delete({ where: { id } });
  }

  createJobPosition(dto: CreateJobPositionDto) {
    return this.prisma.jobPosition.create({ data: dto });
  }

  findJobPositions() {
    return this.prisma.jobPosition.findMany({
      include: { employees: { select: { id: true, fullName: true, email: true } } },
      orderBy: { title: 'asc' },
    });
  }

  async findJobPosition(id: string) {
    const jobPosition = await this.prisma.jobPosition.findUnique({
      where: { id },
      include: { employees: { select: { id: true, fullName: true, email: true } } },
    });

    if (!jobPosition) {
      throw new NotFoundException('Job position not found');
    }

    return jobPosition;
  }

  async updateJobPosition(id: string, dto: UpdateJobPositionDto) {
    await this.findJobPosition(id);
    return this.prisma.jobPosition.update({ where: { id }, data: dto });
  }

  async deleteJobPosition(id: string) {
    await this.findJobPosition(id);
    return this.prisma.jobPosition.delete({ where: { id } });
  }

  private departmentInclude() {
    return {
      manager: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      employees: {
        select: {
          id: true,
          fullName: true,
          email: true,
          position: true,
        },
      },
    };
  }
}
