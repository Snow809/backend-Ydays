import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateJobPositionDto {
  @ApiProperty({ example: 'Charge RH' })
  @IsString()
  title: string;

  @ApiProperty({ required: false, example: 'Junior' })
  @IsOptional()
  @IsString()
  level?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;
}
