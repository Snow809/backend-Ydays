import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateDocumentRequestDto {
  @ApiProperty()
  @IsString()
  templateId: string;

  @ApiProperty({
    required: false,
    description: 'Optional employee id for HR/Admin tests. Collaborators are resolved from the current user.',
  })
  @IsOptional()
  @IsString()
  employeeId?: string;
}
