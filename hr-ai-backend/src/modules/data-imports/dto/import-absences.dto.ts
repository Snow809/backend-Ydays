import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { ImportAbsenceRowDto } from './import-absence-row.dto';

export class ImportAbsencesDto {
  @ApiProperty({ type: [ImportAbsenceRowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportAbsenceRowDto)
  rows: ImportAbsenceRowDto[];
}
