import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateDepartmentDto {
  @ApiProperty({ example: 'Ressources Humaines' })
  @IsString()
  name: string;

  @ApiProperty({ required: false, description: 'Employee id of the department manager.' })
  @IsOptional()
  @IsString()
  managerId?: string;
}
