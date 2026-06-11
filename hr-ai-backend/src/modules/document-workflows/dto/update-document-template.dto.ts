import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateDocumentTemplateDto {
  @ApiProperty({ required: false, example: 'Attestation de travail' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false, example: 'ATTESTATION_TRAVAIL' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    required: false,
    example: 'employee_name,employee_position,department,manager_name,date',
  })
  @IsOptional()
  @IsString()
  variables?: string;

  @ApiProperty({ required: false, example: 'true' })
  @IsOptional()
  @IsString()
  isActive?: string;
}
