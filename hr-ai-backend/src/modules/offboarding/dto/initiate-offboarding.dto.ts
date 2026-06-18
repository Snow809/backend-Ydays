import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class InitiateOffboardingDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsString()
  @IsOptional()
  leftAt?: string;
}
