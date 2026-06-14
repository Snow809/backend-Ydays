import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { AbsenceStatus } from '@prisma/client';

export class ImportAbsenceRowDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiProperty({ required: false, example: 'employee@demo.local' })
  @IsOptional()
  @IsEmail()
  employeeEmail?: string;

  @ApiProperty({ required: false, example: 'EMP-001' })
  @IsOptional()
  @IsString()
  employeeMatricule?: string;

  @ApiProperty({ example: 'Conges annuels' })
  @IsString()
  absenceType: string;

  @ApiProperty({ example: '2026-06-01' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-06-03' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ required: false, example: 3 })
  @IsOptional()
  @IsNumber()
  durationDays?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ required: false, enum: AbsenceStatus })
  @IsOptional()
  @IsEnum(AbsenceStatus)
  status?: AbsenceStatus;
}
