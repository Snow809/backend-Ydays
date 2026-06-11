import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateDocumentTemplateDto {
  @ApiProperty({ example: 'Attestation de travail' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'ATTESTATION_TRAVAIL' })
  @IsString()
  type: string;

  @ApiProperty({ required: false, example: 'Modele utilise pour generer une attestation de travail.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    required: false,
    example: 'employee_name,employee_position,department,manager_name,date',
    description: 'Comma-separated or JSON array of supported variables.',
  })
  @IsOptional()
  @IsString()
  variables?: string;

  @ApiProperty({ required: false, example: 'true' })
  @IsOptional()
  @IsString()
  isActive?: string;
}
