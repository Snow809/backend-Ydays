import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class ImportKpiSnapshotRowDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiProperty({ example: 'absenteeism_rate' })
  @IsString()
  kpiName: string;

  @ApiProperty({ example: 4.2 })
  @IsNumber()
  kpiValue: number;

  @ApiProperty({ example: '2026-06-01' })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ example: '2026-06-30' })
  @IsDateString()
  periodEnd: string;
}
