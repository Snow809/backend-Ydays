import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { ImportKpiSnapshotRowDto } from './import-kpi-snapshot-row.dto';

export class ImportKpiSnapshotsDto {
  @ApiProperty({ type: [ImportKpiSnapshotRowDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ImportKpiSnapshotRowDto)
  rows: ImportKpiSnapshotRowDto[];
}
