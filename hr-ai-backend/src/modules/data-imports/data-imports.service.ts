import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AbsenceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { ImportAbsenceRowDto } from './dto/import-absence-row.dto';
import { ImportAbsencesDto } from './dto/import-absences.dto';
import { ImportKpiSnapshotsDto } from './dto/import-kpi-snapshots.dto';
import { UploadAbsencesCsvDto } from './dto/upload-absences-csv.dto';

export interface ImportError {
  row: number;
  reason: string;
}

@Injectable()
export class DataImportsService {
  constructor(private readonly prisma: PrismaService) {}

  async importAbsences(dto: ImportAbsencesDto, user: AuthenticatedUser) {
    return this.processAbsenceRows(dto.rows, user, 'json', undefined);
  }

  async uploadAbsencesCsv(
    dto: UploadAbsencesCsvDto,
    file: Express.Multer.File | undefined,
    user: AuthenticatedUser,
  ) {
    if (!file) {
      throw new BadRequestException('A CSV file is required');
    }

    const delimiter = dto.delimiter || this.detectDelimiter(file.buffer.toString('utf8'));
    const rows = this.parseAbsenceCsv(file.buffer.toString('utf8'), delimiter);
    return this.processAbsenceRows(rows, user, 'csv', file.originalname);
  }

  async importKpiSnapshots(dto: ImportKpiSnapshotsDto, user: AuthenticatedUser) {
    const errors: ImportError[] = [];
    let created = 0;

    for (const [index, row] of dto.rows.entries()) {
      try {
        if (row.departmentId) {
          const department = await this.prisma.department.findUnique({ where: { id: row.departmentId } });
          if (!department) {
            throw new Error('Department not found');
          }
        }

        await this.prisma.kpiSnapshot.create({
          data: {
            departmentId: row.departmentId,
            kpiName: row.kpiName,
            kpiValue: row.kpiValue,
            periodStart: new Date(row.periodStart),
            periodEnd: new Date(row.periodEnd),
          },
        });
        created += 1;
      } catch (error) {
        errors.push({
          row: index + 1,
          reason: error instanceof Error ? error.message : 'Invalid KPI row',
        });
      }
    }

    return this.createImportRecord({
      importType: 'KPI_SNAPSHOTS',
      importedById: user.userId,
      fileName: undefined,
      totalRows: dto.rows.length,
      errorRows: errors.length,
      errors,
      createdRows: created,
    });
  }

  findAll() {
    return this.prisma.dataImport.findMany({
      orderBy: { importedAt: 'desc' },
      include: {
        importedBy: {
          select: { id: true, email: true, fullName: true, role: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const dataImport = await this.prisma.dataImport.findUnique({
      where: { id },
      include: {
        importedBy: {
          select: { id: true, email: true, fullName: true, role: true },
        },
      },
    });

    if (!dataImport) {
      throw new NotFoundException('Data import not found');
    }

    return dataImport;
  }

  async qualityReport(id: string) {
    const dataImport = await this.findOne(id);
    return {
      id: dataImport.id,
      importType: dataImport.importType,
      status: dataImport.status,
      totalRows: dataImport.totalRows,
      errorRows: dataImport.errorRows,
      validRows: (dataImport.totalRows ?? 0) - (dataImport.errorRows ?? 0),
      errorReport: dataImport.errorReport,
    };
  }

  private async processAbsenceRows(
    rows: ImportAbsenceRowDto[],
    user: AuthenticatedUser,
    sourceType: 'json' | 'csv',
    fileName: string | undefined,
  ) {
    const errors: ImportError[] = [];
    let created = 0;

    for (const [index, row] of rows.entries()) {
      try {
        const employee = await this.resolveEmployee(row);
        const startDate = new Date(row.startDate);
        const endDate = new Date(row.endDate);

        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
          throw new Error('Invalid date format');
        }

        if (endDate < startDate) {
          throw new Error('End date must be after start date');
        }

        await this.prisma.absence.create({
          data: {
            employeeId: employee.id,
            absenceType: row.absenceType,
            startDate,
            endDate,
            durationDays: row.durationDays ?? this.daysBetween(startDate, endDate),
            reason: row.reason,
            status: row.status ?? AbsenceStatus.RECORDED,
          },
        });
        created += 1;
      } catch (error) {
        errors.push({
          row: index + 1,
          reason: error instanceof Error ? error.message : 'Invalid absence row',
        });
      }
    }

    return this.createImportRecord({
      importType: `ABSENCES_${sourceType.toUpperCase()}`,
      importedById: user.userId,
      fileName,
      totalRows: rows.length,
      errorRows: errors.length,
      errors,
      createdRows: created,
    });
  }

  private async resolveEmployee(row: ImportAbsenceRowDto) {
    const employee = await this.prisma.employee.findFirst({
      where: {
        OR: [
          row.employeeId ? { id: row.employeeId } : undefined,
          row.employeeEmail ? { email: row.employeeEmail } : undefined,
          row.employeeMatricule ? { matricule: row.employeeMatricule } : undefined,
        ].filter(Boolean) as Prisma.EmployeeWhereInput[],
      },
    });

    if (!employee) {
      throw new Error('Employee not found');
    }

    return employee;
  }

  private async createImportRecord(input: {
    importType: string;
    importedById: string;
    fileName: string | undefined;
    totalRows: number;
    errorRows: number;
    errors: ImportError[];
    createdRows: number;
  }) {
    const status = input.errorRows === 0 ? 'PROCESSED' : input.createdRows === 0 ? 'FAILED' : 'PROCESSED';
    const errorReport = {
      createdRows: input.createdRows,
      errors: input.errors,
    };

    const dataImport = await this.prisma.dataImport.create({
      data: {
        importedById: input.importedById,
        importType: input.importType,
        fileName: input.fileName,
        status,
        totalRows: input.totalRows,
        errorRows: input.errorRows,
        errorReport: errorReport as unknown as Prisma.InputJsonValue,
      },
    });

    if (input.errorRows > 0) {
      await this.prisma.alert.create({
        data: {
          type: 'DATA_QUALITY',
          title: 'Data import contains invalid rows',
          message: `${input.errorRows} row(s) failed during ${input.importType} import.`,
          targetId: dataImport.id,
        },
      });
    }

    return {
      ...dataImport,
      createdRows: input.createdRows,
      errors: input.errors,
    };
  }

  private parseAbsenceCsv(content: string, delimiter: string): ImportAbsenceRowDto[] {
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
      const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
      return {
        employeeId: row.employeeId || undefined,
        employeeEmail: row.employeeEmail || undefined,
        employeeMatricule: row.employeeMatricule || undefined,
        absenceType: row.absenceType,
        startDate: row.startDate,
        endDate: row.endDate,
        durationDays: row.durationDays ? Number(row.durationDays) : undefined,
        reason: row.reason || undefined,
        status: (row.status || undefined) as AbsenceStatus | undefined,
      };
    });
  }

  private detectDelimiter(content: string) {
    const firstLine = content.split(/\r?\n/)[0] ?? '';
    return firstLine.includes(';') ? ';' : ',';
  }

  private daysBetween(start: Date, end: Date) {
    const millisecondsPerDay = 1000 * 60 * 60 * 24;
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / millisecondsPerDay) + 1);
  }
}
