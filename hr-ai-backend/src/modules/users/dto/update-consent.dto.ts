import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateConsentDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  analyticsConsent: boolean;
}
