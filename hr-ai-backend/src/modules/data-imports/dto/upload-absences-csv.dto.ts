import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UploadAbsencesCsvDto {
  @ApiProperty({ required: false, example: ';' })
  @IsOptional()
  @IsString()
  delimiter?: string;
}
